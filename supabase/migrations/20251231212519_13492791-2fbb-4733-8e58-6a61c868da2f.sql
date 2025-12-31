-- =============================================
-- CREATOR PAYOUTS TABLE
-- =============================================
CREATE TABLE public.creator_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.creator_profiles(id),
  payout_month TEXT,
  paid_users_count INTEGER DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own payouts"
  ON public.creator_payouts FOR SELECT
  USING (creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  ));

-- =============================================
-- ADD MISSING COLUMNS TO CMO PAYOUTS
-- =============================================
ALTER TABLE public.cmo_payouts ADD COLUMN IF NOT EXISTS payout_month TEXT;
ALTER TABLE public.cmo_payouts ADD COLUMN IF NOT EXISTS total_paid_users INTEGER DEFAULT 0;
ALTER TABLE public.cmo_payouts ADD COLUMN IF NOT EXISTS base_commission_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.cmo_payouts ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0;

-- =============================================
-- ADD MISSING COLUMNS TO UPGRADE REQUESTS
-- =============================================
ALTER TABLE public.upgrade_requests ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE public.upgrade_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- =============================================
-- ADD MISSING COLUMNS TO CREATOR PROFILES
-- =============================================
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS cmo_id UUID;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS monthly_paid_users INTEGER DEFAULT 0;