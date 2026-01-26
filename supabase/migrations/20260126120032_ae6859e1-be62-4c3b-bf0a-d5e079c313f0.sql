-- Create print-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-receipts', 'print-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload print receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'print-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to read their own receipts
CREATE POLICY "Users can view own print receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow admins to view all print receipts
CREATE POLICY "Admins can view all print receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'support_admin')
  )
);

-- Allow admins to delete print receipts
CREATE POLICY "Admins can delete print receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);