-- Add missing columns to payment_attributions table
ALTER TABLE public.payment_attributions
ADD COLUMN IF NOT EXISTS enrollment_id uuid REFERENCES public.enrollments(id),
ADD COLUMN IF NOT EXISTS original_amount numeric,
ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount numeric,
ADD COLUMN IF NOT EXISTS creator_commission_rate numeric,
ADD COLUMN IF NOT EXISTS creator_commission_amount numeric,
ADD COLUMN IF NOT EXISTS payment_month text,
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'card';

-- Create join_requests table for bank transfer pending signups
CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_number text NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'starter',
  grade text,
  stream text,
  medium text,
  subject_1 text,
  subject_2 text,
  subject_3 text,
  amount numeric NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  ref_creator text,
  discount_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on join_requests
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for join_requests
CREATE POLICY "Users can view own join requests"
  ON public.join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create join requests"
  ON public.join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own join requests"
  ON public.join_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view and update all join requests (via service role, not RLS)

-- Add trigger for updated_at on join_requests
CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for join request receipts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('join-receipts', 'join-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for join-receipts bucket
CREATE POLICY "Users can upload own join receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'join-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own join receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'join-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all join receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'join-receipts' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'content_admin', 'support_admin', 'admin')
  ));