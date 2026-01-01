-- Create a payments table to track payment status from webhooks
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  amount NUMERIC,
  currency TEXT DEFAULT 'LKR',
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  tier TEXT,
  enrollment_id UUID REFERENCES public.enrollments(id),
  payment_method TEXT DEFAULT 'card',
  ref_creator TEXT,
  discount_code TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments table
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update payments"
ON public.payments
FOR UPDATE
USING (true);

-- Admins can view all
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'content_admin') OR
  has_role(auth.uid(), 'support_admin')
);