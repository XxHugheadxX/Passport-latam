-- Storage policies for product-images bucket
-- Run in: https://supabase.com/dashboard/project/hvaqujxehapctugwrvxo/sql/new

DROP POLICY IF EXISTS "public_read_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_update_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "public_read_certifications"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_certifications"   ON storage.objects;
DROP POLICY IF EXISTS "auth_read_certifications"     ON storage.objects;

-- product-images: public read, authenticated write
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "auth_upload_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "auth_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "auth_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- certifications: authenticated read/write only
CREATE POLICY "auth_read_certifications" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certifications');

CREATE POLICY "auth_upload_certifications" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certifications');
