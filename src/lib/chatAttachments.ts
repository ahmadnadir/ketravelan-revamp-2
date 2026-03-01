import { supabase } from "./supabase";

function randomName(base: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  return `${base}-${now}-${rand}.${ext}`;
}

export async function uploadChatFile(file: File): Promise<{ url: string; name: string; mime: string; size: number; type: 'image' | 'document'; }> {
  const envBucket: string | undefined = (import.meta as unknown as { env?: { VITE_CHAT_ATTACHMENTS_BUCKET?: string } }).env?.VITE_CHAT_ATTACHMENTS_BUCKET;
  const envFolder: string | undefined = (import.meta as unknown as { env?: { VITE_CHAT_ATTACHMENTS_FOLDER?: string } }).env?.VITE_CHAT_ATTACHMENTS_FOLDER;
  const bucket = envBucket ?? "chat-attachments";
  const folder = envFolder ?? "uploads";
  const mime = file.type || "application/octet-stream";
  const size = file.size || 0;
  const ext = file.name.split('.').pop() || 'bin';
  const base = file.name.replace(/\.[^.]+$/, '') || 'file';
  const path = `${folder}/${randomName(base, ext)}`;
  const { data: uploaded, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: mime, upsert: false });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("not found") || msg.includes("no such bucket")) {
      throw new Error(`Storage bucket "${bucket}" not found. Create it in Supabase Storage or set VITE_CHAT_ATTACHMENTS_BUCKET to an existing bucket.`);
    }
    throw error;
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  const url = pub.publicUrl;
  const isImage = mime.startsWith('image/');
  return { url, name: file.name, mime, size, type: isImage ? 'image' : 'document' };
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number; address?: string } | null> {
  if (!('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        resolve({ lat, lng });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
