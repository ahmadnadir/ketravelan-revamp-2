import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(name: string): string | undefined } };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const allowedOrigins = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ketravelan.com",
  "capacitor://localhost",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://ketravelan.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json(request, { error: "Authentication required" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(request, { error: "Invalid session" }, 401);

  const { data: allowed, error: permissionError } = await userClient.rpc(
    "admin_has_permission",
    { p_permission: "users.manage" },
  );
  if (permissionError || allowed !== true) return json(request, { error: "users.manage permission required" }, 403);

  let body: { userId?: string; action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }

  const userId = body.userId?.trim();
  const action = body.action;
  const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!userId || !validUuid.test(userId)) return json(request, { error: "A valid userId is required" }, 400);
  if (!action || !["suspend", "restore", "verify", "unverify"].includes(action)) {
    return json(request, { error: "Invalid user action" }, 400);
  }
  if (action === "suspend" && !body.reason?.trim()) {
    return json(request, { error: "A suspension reason is required" }, 400);
  }
  if (["suspend", "restore"].includes(action) && userId === authData.user.id) {
    return json(request, { error: "You cannot suspend or restore your own account" }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authBanChanged = false;
  let previousBannedUntil: string | null = null;
  try {
    if (action === "suspend" || action === "restore") {
      const { data: target, error: targetError } = await serviceClient.auth.admin.getUserById(userId);
      if (targetError || !target.user) throw targetError ?? new Error("User not found in Auth");
      previousBannedUntil = target.user.banned_until ?? null;
    }

    if (action === "suspend") {
      const { error } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) throw error;
      authBanChanged = true;
    } else if (action === "restore") {
      const { error } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (error) throw error;
      authBanChanged = true;
    }

    const { error: mutationError } = await serviceClient.rpc("admin_manage_user", {
      p_actor_id: authData.user.id,
      p_user_id: userId,
      p_action: action,
      p_reason: body.reason?.trim() || null,
    });
    if (mutationError) throw mutationError;

    return json(request, { ok: true });
  } catch (error) {
    if (authBanChanged) {
      const previousRemaining = previousBannedUntil
        ? Math.max(0, Math.ceil((new Date(previousBannedUntil).getTime() - Date.now()) / 1000))
        : 0;
      const rollbackDuration = action === "suspend"
        ? (previousRemaining > 0 ? `${previousRemaining}s` : "none")
        : "876000h";
      const { error: rollbackError } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: rollbackDuration,
      });
      if (rollbackError) console.error("Failed to roll back auth ban state", rollbackError);
    }
    console.error("Admin user action failed", error);
    return json(request, { error: error instanceof Error ? error.message : "User action failed" }, 400);
  }
});
