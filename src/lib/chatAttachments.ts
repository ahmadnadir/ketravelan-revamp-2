import { supabase } from "./supabase";

function randomName(base: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  return `${base}-${now}-${rand}.${ext}`;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION = 1920;

/**
 * Compress an image File to under 2 MB using canvas.
 * Resizes to max 1920px on longest side, encodes as JPEG.
 * Falls back to original file if compression isn't possible (e.g. SVG).
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress raster images
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  // Already small enough
  if (file.size <= MAX_BYTES) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate scaled dimensions
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Try JPEG at decreasing quality levels until under 2 MB
      const qualities = [0.85, 0.75, 0.65, 0.55];
      let blob: Blob | null = null;

      const tryQuality = (i: number) => {
        canvas.toBlob(
          (b) => {
            if (!b) { resolve(file); return; }
            if (b.size <= MAX_BYTES || i >= qualities.length - 1) {
              blob = b;
              const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              tryQuality(i + 1);
            }
          },
          "image/jpeg",
          qualities[i]
        );
      };

      tryQuality(0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback
    };

    img.src = objectUrl;
  });
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
