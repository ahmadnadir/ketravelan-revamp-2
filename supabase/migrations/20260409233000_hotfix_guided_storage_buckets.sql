/*
  # Hotfix: Ensure guided storage buckets exist

  Fixes 404 "Bucket not found" errors for guided trip media uploads.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('trip-cover-photos', 'trip-cover-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('trip-gallery', 'trip-gallery', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('trip-qr-codes', 'trip-qr-codes', true, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('trip-documents', 'trip-documents', true, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Guided media public read" ON storage.objects;
CREATE POLICY "Guided media public read"
ON storage.objects
FOR SELECT
USING (
  bucket_id IN ('trip-cover-photos', 'trip-gallery', 'trip-qr-codes', 'trip-documents')
);

DROP POLICY IF EXISTS "Guided media upload by authenticated" ON storage.objects;
CREATE POLICY "Guided media upload by authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('trip-cover-photos', 'trip-gallery', 'trip-qr-codes', 'trip-documents')
);

DROP POLICY IF EXISTS "Guided media update by authenticated" ON storage.objects;
CREATE POLICY "Guided media update by authenticated"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('trip-cover-photos', 'trip-gallery', 'trip-qr-codes', 'trip-documents')
)
WITH CHECK (
  bucket_id IN ('trip-cover-photos', 'trip-gallery', 'trip-qr-codes', 'trip-documents')
);

DROP POLICY IF EXISTS "Guided media delete by authenticated" ON storage.objects;
CREATE POLICY "Guided media delete by authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('trip-cover-photos', 'trip-gallery', 'trip-qr-codes', 'trip-documents')
);
