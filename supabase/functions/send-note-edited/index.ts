// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Only one "edited" notification per editor/note inside this window.
const DEDUPE_WINDOW_MINUTES = 10;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendSystemPush(payload: Record<string, unknown>) {
  try {
    await admin.functions.invoke("send-system-push", {
      body: payload,
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
  } catch (err) {
    console.warn("Failed to send system push", err);
  }
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

interface NoteEditedRequest {
  noteId: string;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const accessToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return json({ error: "Missing authorization" }, 401);
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    const editorId = authData?.user?.id;
    if (authErr || !editorId) {
      return json({ error: "Invalid authorization" }, 401);
    }

    const body = await req.json() as NoteEditedRequest;
    if (!body?.noteId) {
      return json({ error: "Missing noteId" }, 400);
    }

    const { data: note, error: noteErr } = await admin
      .from("trip_notes")
      .select("id, trip_id, title")
      .eq("id", body.noteId)
      .maybeSingle();

    if (noteErr) throw noteErr;
    if (!note) return json({ error: "Note not found" }, 404);

    // Access to a note is trip membership.
    const { data: members, error: membersErr } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", note.trip_id)
      .is("left_at", null);

    if (membersErr) throw membersErr;

    const memberIds = (members || []).map((m: any) => String(m.user_id));
    if (!memberIds.includes(editorId)) {
      return json({ error: "Not a member of this trip" }, 403);
    }

    const since = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recentActivity } = await admin
      .from("note_activity")
      .select("id")
      .eq("note_id", note.id)
      .eq("user_id", editorId)
      .eq("action", "edited")
      .gte("created_at", since)
      .limit(1);

    const alreadyNotified = (recentActivity || []).length > 0;

    const { data: activity, error: activityErr } = await admin
      .from("note_activity")
      .insert({
        note_id: note.id,
        user_id: editorId,
        action: "edited",
        metadata: { note_title: note.title, trip_id: note.trip_id },
      })
      .select("id")
      .single();

    if (activityErr) throw activityErr;

    if (alreadyNotified) {
      return json({ ok: true, skipped: true, reason: "Recently notified", activityId: activity.id });
    }

    const recipientIds = memberIds.filter((id) => id !== editorId);
    if (recipientIds.length === 0) {
      return json({ ok: true, skipped: true, reason: "No recipients", activityId: activity.id });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", editorId)
      .maybeSingle();

    const editorName = profile?.full_name || profile?.username || "Someone";
    const noteTitle = (note.title || "Untitled").trim();
    const actionUrl = `/trip/${note.trip_id}/hub?tab=notes&note=${note.id}`;

    await sendSystemPush({
      userIds: recipientIds,
      type: "note_edited",
      title: "Note updated",
      body: `${editorName} edited ${noteTitle} notes`,
      actionUrl,
      priority: "normal",
      metadata: {
        trip_id: note.trip_id,
        note_id: note.id,
        activity_id: activity.id,
        editor_id: editorId,
        note_title: noteTitle,
      },
    });

    return json({ ok: true, notifiedCount: recipientIds.length, activityId: activity.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
