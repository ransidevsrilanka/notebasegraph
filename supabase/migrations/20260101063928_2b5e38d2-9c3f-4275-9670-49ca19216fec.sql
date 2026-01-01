-- Add receipt_url column to withdrawal_requests for admin uploads
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS receipt_url text DEFAULT NULL;

-- Create storage bucket for withdrawal receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('withdrawal-receipts', 'withdrawal-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for withdrawal receipts
CREATE POLICY "Anyone can view withdrawal receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'withdrawal-receipts');

CREATE POLICY "Admins can upload withdrawal receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'withdrawal-receipts' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'support_admin')
  )
);

CREATE POLICY "Admins can delete withdrawal receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'withdrawal-receipts' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'support_admin')
  )
);