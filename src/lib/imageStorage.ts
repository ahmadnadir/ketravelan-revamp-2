import { supabase } from "./supabase";

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const SKIP_OPTIMIZE_MIME_TYPES = new Set([
  "image/gif",
  "image/svg+xml",
]);

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_MAX_BYTES = 1_500_000;
const DEFAULT_QUALITY_START = 0.82;
const DEFAULT_QUALITY_MIN = 0.58;

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

function isHeicMime(mime: string): boolean {
  return HEIC_MIME_TYPES.has(String(mime || "").toLowerCase());
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read converted image data."));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromDataUrl(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image."));
    img.src = data;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function dataUrlByteLength(data: string): number {
  const base64 = data.startsWith("data:") ? data.split(",")[1] : data;
  const padding = (base64.match(/=+$/)?.[0].length || 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function normalizeImageDataUrl(data: string): Promise<string> {
  const { mime } = guessMimeAndExt(data);
  if (!isHeicMime(mime)) return data;

  try {
    const sourceBlob = await (await fetch(data)).blob();
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: sourceBlob,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!(convertedBlob instanceof Blob)) {
      throw new Error("Unsupported converted HEIC payload.");
    }
    return await blobToDataUrl(convertedBlob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversion error";
    throw new Error(`HEIC conversion failed: ${message}`);
  }
}

export async function optimizeImageDataUrl(
  data: string,
  options?: { maxDimension?: number; maxBytes?: number; qualityStart?: number; qualityMin?: number }
): Promise<string> {
  const { mime } = guessMimeAndExt(data);
  if (SKIP_OPTIMIZE_MIME_TYPES.has(String(mime || "").toLowerCase())) {
    return data;
  }

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const qualityStart = options?.qualityStart ?? DEFAULT_QUALITY_START;
  const qualityMin = options?.qualityMin ?? DEFAULT_QUALITY_MIN;

  const image = await loadImageFromDataUrl(data);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) return data;

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return data;

  // Force opaque background to keep JPEG output consistent and storage-efficient.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  let quality = Math.min(0.95, Math.max(qualityMin, qualityStart));
  let optimizedData = canvasToDataUrl(canvas, quality);

  while (dataUrlByteLength(optimizedData) > maxBytes && quality > qualityMin) {
    quality = Math.max(qualityMin, Number((quality - 0.06).toFixed(2)));
    optimizedData = canvasToDataUrl(canvas, quality);
    if (quality <= qualityMin) break;
  }

  const originalBytes = dataUrlByteLength(data);
  const optimizedBytes = dataUrlByteLength(optimizedData);

  // Keep original when optimization is not beneficial and image was not resized.
  if (optimizedBytes >= originalBytes && scale === 1) {
    return data;
  }

  return optimizedData;
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
  const normalizedData = await normalizeImageDataUrl(data);
  const optimizedData = await optimizeImageDataUrl(normalizedData);
  const { bytes, mime, ext } = dataUrlToUint8Array(optimizedData);
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
