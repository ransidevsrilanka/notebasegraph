-- Table for creator withdrawal methods (bank & crypto)
CREATE TABLE public.withdrawal_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('bank', 'crypto')),
  -- Bank fields
  bank_name text,
  account_number text,
  account_holder_name text,
  branch_name text,
  -- Crypto fields
  crypto_type text,
  wallet_address text,
  network text,
  -- Common
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index for bank accounts
CREATE UNIQUE INDEX withdrawal_methods_bank_unique ON public.withdrawal_methods (creator_id, account_number) WHERE method_type = 'bank' AND account_number IS NOT NULL;

-- Create unique index for crypto wallets
CREATE UNIQUE INDEX withdrawal_methods_crypto_unique ON public.withdrawal_methods (creator_id, wallet_address) WHERE method_type = 'crypto' AND wallet_address IS NOT NULL;

ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own withdrawal methods"
ON public.withdrawal_methods FOR SELECT
USING (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Creators can insert own withdrawal methods"
ON public.withdrawal_methods FOR INSERT
WITH CHECK (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Creators can update own withdrawal methods"
ON public.withdrawal_methods FOR UPDATE
USING (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Creators can delete own withdrawal methods"
ON public.withdrawal_methods FOR DELETE
USING (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

-- Table for withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  withdrawal_method_id uuid REFERENCES public.withdrawal_methods(id),
  amount numeric NOT NULL CHECK (amount > 0),
  fee_percent numeric NOT NULL DEFAULT 3,
  fee_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  rejection_reason text,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Creators can insert own withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (creator_id IN (
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_admin') OR public.has_role(auth.uid(), 'support_admin'));

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_admin') OR public.has_role(auth.uid(), 'support_admin'));

-- Add available_balance column to creator_profiles
ALTER TABLE public.creator_profiles 
ADD COLUMN IF NOT EXISTS available_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawn numeric DEFAULT 0;