import { supabase } from '../lib/supabase';

export const STORAGE_BUCKETS = {
  COVER_PHOTOS: 'trip-cover-photos',
  GALLERY: 'trip-gallery',
  QR_CODES: 'trip-qr-codes',
  DOCUMENTS: 'trip-documents',
} as const;

export const uploadFile = async (
  bucket: string,
  file: File,
  path?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return null;
  }
};

export const uploadMultipleFiles = async (
  bucket: string,
  files: File[]
): Promise<Array<{ url: string; path: string }>> => {
  const uploadPromises = files.map(file => uploadFile(bucket, file));
  const results = await Promise.all(uploadPromises);
  return results.filter((result): result is { url: string; path: string } => result !== null);
};

export const deleteFile = async (
  bucket: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
};

export const getFileUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};
