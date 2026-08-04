// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface BroadcastPushRequest {
  title: string;
  body: string;
  actionUrl?: string;
  limit?: number;
  dryRun?: boolean;
  skipExistingNotification?: boolean;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function truncate(text: string, max = 160) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

async function collectTargetUserIds(opts: {
  admin: ReturnType<typeof createClient>;
  limit: number;
  title: string;
  body: string;
  skipExistingNotification: boolean;
}) {
  const targetIds: string[] = [];
  let offset = 0;
  const pageSize = 200;
  const storedMessage = truncate(opts.body);

  while (targetIds.length < opts.limit) {
    const { data: users, error: usersErr } = await opts.admin
      .from("profiles")
      .select("id")
      .neq("push_notifications", false)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (usersErr) {
      throw usersErr;
    }

    const pageUserIds = (users || []).map((u) => u.id).filter(Boolean);
    if (pageUserIds.length === 0) {
      break;
    }

    let candidateIds = pageUserIds;

    if (opts.skipExistingNotification) {
      const { data: existingRows, error: existingErr } = await opts.admin
        .from("notifications")
        .select("user_id")
        .in("user_id", pageUserIds)
        .eq("type", "broadcast_announcement")
        .eq("title", opts.title)
        .eq("message", storedMessage);

      if (existingErr) {
        throw existingErr;
      }

      const existingUserIds = new Set((existingRows || []).map((row) => row.user_id).filter(Boolean));
      candidateIds = pageUserIds.filter((userId) => !existingUserIds.has(userId));
    }

    for (const userId of candidateIds) {
      if (targetIds.length >= opts.limit) break;
      targetIds.push(userId);
    }

    if (pageUserIds.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return targetIds;
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ketravelan.com",
    "http://10.0.2.2:5173",
    "capacitor://localhost",
  ]);
  const allowOrigin = allowedOrigins.has(origin) ? origin : "*";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  const allowHeaders = requestedHeaders && requestedHeaders.length > 0
    ? requestedHeaders
    : "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-requested-with";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "content-type, content-length, etag, date",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function formatError(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const payload = await req.json() as BroadcastPushRequest;
    if (!payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: "Missing title or body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestedLimit = Math.max(1, Math.min(payload.limit || 5000, 5000));
    const userIds = await collectTargetUserIds({
      admin,
      limit: requestedLimit,
      title: payload.title,
      body: payload.body,
      skipExistingNotification: payload.skipExistingNotification === true,
    });

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No push-enabled users found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (payload.dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          preview: {
            recipientCount: userIds.length,
            title: payload.title,
            body: payload.body,
            actionUrl: payload.actionUrl || "/",
            skipExistingNotification: payload.skipExistingNotification === true,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const batches = chunkArray(userIds, 200);
    let totalSent = 0;
    let totalFailed = 0;
    let totalTokens = 0;
    let totalPushEnabledRecipients = 0;
    let totalStaleTokensPruned = 0;
    const batchErrors: string[] = [];

    for (const batch of batches) {
      const pushResult = await admin.functions.invoke("send-system-push", {
        body: {
          userIds: batch,
          type: "broadcast_announcement",
          title: payload.title,
          body: payload.body,
          actionUrl: payload.actionUrl || "/",
          priority: "high",
        },
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      });

      if (pushResult.error) {
        batchErrors.push(pushResult.error.message || "Unknown batch invoke error");
        continue;
      }

      const result = (pushResult.data || {}) as Record<string, any>;
      totalSent += Number(result.sent || 0);
      totalFailed += Number(result.failed || 0);
      totalTokens += Number(result.total || 0);
      totalPushEnabledRecipients += Number(result.push_enabled_recipients || 0);
      totalStaleTokensPruned += Number(result.stale_tokens_pruned || 0);

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        batchErrors.push(...result.errors.map((e: unknown) => String(e)));
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        targetUserCount: userIds.length,
        batches: batches.length,
        sendResult: {
          sent: totalSent,
          failed: totalFailed,
          total: totalTokens,
          push_enabled_recipients: totalPushEnabledRecipients,
          stale_tokens_pruned: totalStaleTokensPruned,
          errors: batchErrors.slice(0, 20),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err: unknown) {
    const message = formatError(err) || "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
