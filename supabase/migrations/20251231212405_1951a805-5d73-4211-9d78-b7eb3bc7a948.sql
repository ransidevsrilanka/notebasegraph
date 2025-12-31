-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  device_fingerprint TEXT,
  max_devices INTEGER DEFAULT 3,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (for admin/CMO/creator)
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'cmo', 'creator', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- ACCESS CODES TABLE
-- =============================================
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'unused',
  grade TEXT,
  stream TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read access codes"
  ON public.access_codes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can update access codes"
  ON public.access_codes FOR UPDATE
  TO authenticated
  USING (true);

-- =============================================
-- ENROLLMENTS TABLE
-- =============================================
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_code_id UUID REFERENCES public.access_codes(id),
  grade TEXT,
  stream TEXT,
  tier TEXT NOT NULL DEFAULT 'starter',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollment"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollment"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment"
  ON public.enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- STREAM SUBJECTS TABLE
-- =============================================
CREATE TABLE public.stream_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stream subjects"
  ON public.stream_subjects FOR SELECT
  USING (true);

-- =============================================
-- USER SUBJECTS TABLE
-- =============================================
CREATE TABLE public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  subject_1 TEXT,
  subject_2 TEXT,
  subject_3 TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subjects"
  ON public.user_subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects"
  ON public.user_subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
  ON public.user_subjects FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- DISCOUNT CODES TABLE
-- =============================================
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER DEFAULT 10,
  creator_id UUID,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  paid_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active discount codes"
  ON public.discount_codes FOR SELECT
  USING (is_active = true);

-- =============================================
-- CREATOR PROFILES TABLE
-- =============================================
CREATE TABLE public.creator_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read creator profiles"
  ON public.creator_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own creator profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- USER ATTRIBUTIONS TABLE
-- =============================================
CREATE TABLE public.user_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_id UUID REFERENCES public.creator_profiles(id),
  discount_code_id UUID REFERENCES public.discount_codes(id),
  referral_source TEXT DEFAULT 'link',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attributions"
  ON public.user_attributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attribution"
  ON public.user_attributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- PAYMENT ATTRIBUTIONS TABLE
-- =============================================
CREATE TABLE public.payment_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_id UUID REFERENCES public.creator_profiles(id),
  amount DECIMAL(10,2),
  tier TEXT,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own payment attribution"
  ON public.payment_attributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- VALIDATE ACCESS CODE FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_access_code(code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_code_record RECORD;
BEGIN
  SELECT * INTO access_code_record
  FROM public.access_codes
  WHERE code = UPPER(code_input)
  AND status = 'unused'
  AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access code');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', access_code_record.id,
    'tier', access_code_record.tier,
    'grade', access_code_record.grade,
    'stream', access_code_record.stream
  );
END;
$$;

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();