-- CMO Profiles (linked to user)
CREATE TABLE public.cmo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Content Creator Profiles (linked to user and CMO)
CREATE TABLE public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cmo_id uuid NOT NULL REFERENCES public.cmo_profiles(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  lifetime_paid_users integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Discount Codes (CMO assigns to creators)
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  discount_percent integer DEFAULT 10,
  usage_count integer DEFAULT 0,
  paid_conversions integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Attributions (which creator brought which user - PERMANENT)
CREATE TABLE public.user_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  referral_source text NOT NULL CHECK (referral_source IN ('link', 'discount_code')),
  created_at timestamp with time zone DEFAULT now()
);

-- Payment Attributions (track each payment for commission calculation)
CREATE TABLE public.payment_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  original_amount numeric NOT NULL,
  discount_applied numeric DEFAULT 0,
  final_amount numeric NOT NULL,
  creator_commission_rate numeric NOT NULL,
  creator_commission_amount numeric NOT NULL,
  payment_month date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Creator Payouts (monthly earnings tracking)
CREATE TABLE public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  payout_month date NOT NULL,
  paid_users_count integer DEFAULT 0,
  gross_revenue numeric DEFAULT 0,
  commission_rate numeric NOT NULL,
  commission_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'paid')),
  paid_at timestamp with time zone,
  paid_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(creator_id, payout_month)
);

-- CMO Payouts (monthly earnings tracking)
CREATE TABLE public.cmo_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cmo_id uuid NOT NULL REFERENCES public.cmo_profiles(id) ON DELETE CASCADE,
  payout_month date NOT NULL,
  total_creators integer DEFAULT 0,
  total_paid_users integer DEFAULT 0,
  net_revenue numeric DEFAULT 0,
  base_commission_rate numeric DEFAULT 0.08,
  base_commission_amount numeric DEFAULT 0,
  bonus_rate numeric DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'paid')),
  paid_at timestamp with time zone,
  paid_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(cmo_id, payout_month)
);

-- Platform financials (for CEO overview)
CREATE TABLE public.platform_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_revenue numeric DEFAULT 0,
  total_discounts numeric DEFAULT 0,
  net_revenue numeric DEFAULT 0,
  gateway_fees numeric DEFAULT 0,
  infra_costs numeric DEFAULT 0,
  creator_commissions numeric DEFAULT 0,
  cmo_commissions numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  total_users integer DEFAULT 0,
  paid_users integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.cmo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmo_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_financials ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is CMO
CREATE OR REPLACE FUNCTION public.is_cmo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'cmo'
  )
$$;

-- Helper function to check if user is content creator
CREATE OR REPLACE FUNCTION public.is_content_creator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'content_creator'
  )
$$;

-- RLS Policies for cmo_profiles
CREATE POLICY "Admins can manage CMO profiles" ON public.cmo_profiles
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view own profile" ON public.cmo_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "CMOs can update own profile" ON public.cmo_profiles
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for creator_profiles
CREATE POLICY "Admins can manage creator profiles" ON public.creator_profiles
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view their creators" ON public.creator_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cmo_profiles 
    WHERE id = creator_profiles.cmo_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view own profile" ON public.creator_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Creators can update own profile" ON public.creator_profiles
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for discount_codes
CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can manage their creators discount codes" ON public.discount_codes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cmo.id = cp.cmo_id
    WHERE cp.id = discount_codes.creator_id AND cmo.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view own discount codes" ON public.discount_codes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles 
    WHERE id = discount_codes.creator_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can validate active discount codes" ON public.discount_codes
FOR SELECT USING (is_active = true);

-- RLS Policies for user_attributions
CREATE POLICY "Admins can manage user attributions" ON public.user_attributions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view their creators attributions" ON public.user_attributions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cmo.id = cp.cmo_id
    WHERE cp.id = user_attributions.creator_id AND cmo.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view own attributions" ON public.user_attributions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles 
    WHERE id = user_attributions.creator_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own attribution" ON public.user_attributions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment_attributions
CREATE POLICY "Admins can manage payment attributions" ON public.payment_attributions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view their creators payment attributions" ON public.payment_attributions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cmo.id = cp.cmo_id
    WHERE cp.id = payment_attributions.creator_id AND cmo.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view own payment attributions" ON public.payment_attributions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles 
    WHERE id = payment_attributions.creator_id AND user_id = auth.uid()
  )
);

-- RLS Policies for creator_payouts
CREATE POLICY "Admins can manage creator payouts" ON public.creator_payouts
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view their creators payouts" ON public.creator_payouts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cmo.id = cp.cmo_id
    WHERE cp.id = creator_payouts.creator_id AND cmo.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view own payouts" ON public.creator_payouts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.creator_profiles 
    WHERE id = creator_payouts.creator_id AND user_id = auth.uid()
  )
);

-- RLS Policies for cmo_payouts
CREATE POLICY "Admins can manage CMO payouts" ON public.cmo_payouts
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "CMOs can view own payouts" ON public.cmo_payouts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cmo_profiles 
    WHERE id = cmo_payouts.cmo_id AND user_id = auth.uid()
  )
);

-- RLS Policies for platform_financials
CREATE POLICY "Only admins can access platform financials" ON public.platform_financials
FOR ALL USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_creator_profiles_cmo_id ON public.creator_profiles(cmo_id);
CREATE INDEX idx_creator_profiles_referral_code ON public.creator_profiles(referral_code);
CREATE INDEX idx_cmo_profiles_referral_code ON public.cmo_profiles(referral_code);
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_creator_id ON public.discount_codes(creator_id);
CREATE INDEX idx_user_attributions_creator_id ON public.user_attributions(creator_id);
CREATE INDEX idx_payment_attributions_creator_id ON public.payment_attributions(creator_id);
CREATE INDEX idx_payment_attributions_month ON public.payment_attributions(payment_month);
CREATE INDEX idx_creator_payouts_month ON public.creator_payouts(payout_month);
CREATE INDEX idx_cmo_payouts_month ON public.cmo_payouts(payout_month);

-- Triggers for updated_at
CREATE TRIGGER update_cmo_profiles_updated_at
  BEFORE UPDATE ON public.cmo_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_payouts_updated_at
  BEFORE UPDATE ON public.creator_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cmo_payouts_updated_at
  BEFORE UPDATE ON public.cmo_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_financials_updated_at
  BEFORE UPDATE ON public.platform_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();