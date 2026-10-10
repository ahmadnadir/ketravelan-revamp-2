const SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const MAX_BODY_BYTES = 20_000;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin request rejected" }, 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return json({ error: "Authentication required" }, 401);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 415);
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) return json({ error: "Request body too large" }, 413);

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) return json({ error: "Request body too large" }, 413);

  const apikey = request.headers.get("apikey") ?? "";
  if (!apikey) return json({ error: "Supabase API key required" }, 400);
  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/admin-feedback-actions`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey,
        "Content-Type": "application/json",
      },
      body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return json({ error: "Feedback service is unavailable. Retry shortly." }, 502);
  }
}

export function onRequest(context) {
  if (context.request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return onRequestPost(context);
}