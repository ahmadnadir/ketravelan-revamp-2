import { supabase } from "./supabase";

function guessMimeAndExt(data: string): { mime: string; ext: string } {
  const headerMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (headerMatch) {
    const mime = headerMatch[1];
    const ext = mime.split("/")[1] || "jpeg";
    return { mime, ext };
  }
  // Default when bare base64 provided
  return { mime: "image/jpeg", ext: "jpeg" };
}

export function dataUrlToUint8Array(data: string): { bytes: Uint8Array; mime: string; ext: string } {
  const { mime, ext } = guessMimeAndExt(data);
  const base64 = data.startsWith("data:") ? data.split(",")[1] : data;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime, ext };
}

function randomName(ext: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  return `${now}-${rand}.${ext}`;
}

export async function uploadImageFromDataUrl(
  data: string,
  options?: { bucket?: string; folder?: string; filename?: string }
): Promise<string> {
  const envBucket: string | undefined = (import.meta as unknown as { env?: { VITE_TRIP_IMAGES_BUCKET?: string } }).env?.VITE_TRIP_IMAGES_BUCKET;
  const bucket = options?.bucket ?? envBucket ?? "trip-images"; // default to 'trip-images'
  const folder = options?.folder ?? "uploads";
  const { bytes, mime, ext } = dataUrlToUint8Array(data);
  const fileName = options?.filename ?? randomName(ext);
  const path = `${folder}/${fileName}`;
  const { data: uploaded, error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  return pub.publicUrl;
}

export function isUrl(str: string): boolean {
  const s = String(str || "").trim();
  return /^https?:\/\//.test(s) || /^data:image\//.test(s) || /^blob:/.test(s) || s.startsWith("/");
}
