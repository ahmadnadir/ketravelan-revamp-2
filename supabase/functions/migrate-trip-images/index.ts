// Supabase Edge Function: Migrate base64 images to Storage and update URLs
// Requires env: PROJECT_URL, SERVICE_ROLE_KEY (avoid SUPABASE_* names)
// Bucket: trip-images (public)

// Use Deno npm spec for supabase-js
import { createClient } from "npm:@supabase/supabase-js";

type TripRow = {
  id: string;
  cover_image: string | null;
  images: string[] | null;
};

function isUrl(s: string | null | undefined): boolean {
  const v = String(s || "").trim();
  return /^https?:\/\//.test(v) || /^data:image\//.test(v) || /^blob:/.test(v) || v.startsWith("/");
}

function guessMimeAndExt(data: string): { mime: string; ext: string } {
  const m = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (m) {
    const mime = m[1];
    const ext = mime.split("/")[1] || "jpeg";
    return { mime, ext };
  }
  return { mime: "image/jpeg", ext: "jpeg" };
}

function base64ToUint8Array(data: string): { bytes: Uint8Array; mime: string; ext: string } {
  const { mime, ext } = guessMimeAndExt(data);
  const base64 = data.startsWith("data:") ? data.split(",")[1] : data;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime, ext };
}

function randomName(ext: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  return `${now}-${rand}.${ext}`;
}

async function ensureUploaded(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  pathPrefix: string,
  value: string | null
): Promise<string | null> {
  if (!value) return null;
  if (isUrl(value)) {
    // If it's a data URL, we still want to upload to storage to avoid inline data
    if (value.startsWith("data:image/")) {
      const { bytes, mime, ext } = base64ToUint8Array(value);
      const filename = randomName(ext);
      const path = `${pathPrefix}/${filename}`;
      const { data: uploaded, error } = await supabase.storage.from(bucket).upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
      return pub.publicUrl;
    }
    return value; // already http(s)/blob/path URL
  }
  // Bare base64 -> upload
  const { bytes, mime, ext } = base64ToUint8Array(value);
  const filename = randomName(ext);
  const path = `${pathPrefix}/${filename}`;
  const { data: uploaded, error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  return pub.publicUrl;
}

Deno.serve(async (req) => {
  try {
    // Supabase CLI disallows env names starting with SUPABASE_
    const url = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bucketFromEnv = Deno.env.get("BUCKET_NAME");
    const limitEnv = Deno.env.get("MIGRATE_LIMIT");
    const onlyUpdateIfChangedEnv = Deno.env.get("ONLY_UPDATE_IF_CHANGED");
    if (!url || !key) {
      return new Response(JSON.stringify({ error: "Missing env PROJECT_URL or SERVICE_ROLE_KEY" }), { status: 500 });
    }
    const supabase = createClient(url, key);

    // Config from env with sensible defaults
    const bucket = bucketFromEnv && bucketFromEnv.trim().length > 0 ? bucketFromEnv.trim() : "trip-images";
    const migrateLimit = limitEnv ? Math.max(1, Number(limitEnv)) : 2000;
    const onlyUpdateIfChanged = String(onlyUpdateIfChangedEnv || "true").toLowerCase() === "true";

    // Fetch trips
    // Optional request body: { ids: string[] }
    let ids: string[] | null = null;
    try {
      const body = await req.json();
      if (body && Array.isArray(body.ids)) {
        ids = body.ids.filter((x: unknown) => typeof x === 'string');
      }
    } catch(_){ /* no JSON body */ }

    const baseQuery = supabase
      .from("trips")
      .select("id, cover_image, images")
      .order("id")
      .limit(migrateLimit);

    const { data: trips, error } = ids && ids.length > 0
      ? await baseQuery.in('id', ids)
      : await baseQuery;

    if (error) throw error;

    const results: Array<{ id: string; coverUpdated: boolean; imagesUpdated: number }> = [];

    for (const t of (trips || [])) {
      const prefix = `trips/${t.id}`;
      let coverUrl = t.cover_image;
      const imageUrls = t.images || [];

      let coverUpdated = false;
      let imagesUpdated = 0;

      // Process cover_image
      const newCover = await ensureUploaded(supabase, bucket, `${prefix}/cover`, coverUrl);
      if (newCover && newCover !== coverUrl) {
        coverUrl = newCover;
        coverUpdated = true;
      }

      // Process images array
      const processed: string[] = [];
      for (const img of imageUrls) {
        const newUrl = await ensureUploaded(supabase, bucket, `${prefix}/gallery`, img);
        processed.push(newUrl || img);
        if (newUrl && newUrl !== img) imagesUpdated++;
      }

      // Update row if changed (or if override disabled)
      if (!onlyUpdateIfChanged || coverUpdated || imagesUpdated > 0) {
        const { error: upErr } = await supabase
          .from("trips")
          .update({ cover_image: coverUrl, images: processed })
          .eq("id", t.id);
        if (upErr) throw upErr;
      }

      results.push({ id: t.id, coverUpdated, imagesUpdated });
    }

    return new Response(JSON.stringify({ count: results.length, results }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
