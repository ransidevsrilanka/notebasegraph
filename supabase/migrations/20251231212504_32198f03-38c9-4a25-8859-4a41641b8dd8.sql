-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_size INTEGER,
  min_tier TEXT DEFAULT 'starter',
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active notes"
  ON public.notes FOR SELECT
  USING (is_active = true);

-- =============================================
-- UPGRADE REQUESTS TABLE
-- =============================================
CREATE TABLE public.upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  current_tier TEXT,
  requested_tier TEXT NOT NULL,
  amount DECIMAL(10,2),
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upgrade requests"
  ON public.upgrade_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create upgrade requests"
  ON public.upgrade_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- DOWNLOAD LOGS TABLE
-- =============================================
CREATE TABLE public.download_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note_id UUID REFERENCES public.notes(id),
  file_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own download logs"
  ON public.download_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create download logs"
  ON public.download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER SESSIONS TABLE
-- =============================================
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- CMO PAYOUTS TABLE
-- =============================================
CREATE TABLE public.cmo_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cmo_id UUID,
  amount DECIMAL(10,2),
  total_commission DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cmo_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cmo payouts"
  ON public.cmo_payouts FOR SELECT
  USING (true);

-- =============================================
-- ADD MISSING COLUMNS TO ACCESS CODES
-- =============================================
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS activated_by UUID;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS medium TEXT;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 365;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS activation_limit INTEGER DEFAULT 1;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS activations_used INTEGER DEFAULT 0;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS bound_email TEXT;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS bound_device TEXT;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS ip_history JSONB DEFAULT '[]';

-- =============================================
-- ADD MISSING COLUMNS TO SUBJECTS
-- =============================================
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS streams JSONB DEFAULT '[]';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS medium TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- =============================================
-- ADD MISSING COLUMNS TO TOPICS
-- =============================================
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- =============================================
-- ADD MISSING COLUMNS TO ENROLLMENTS
-- =============================================
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS medium TEXT;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS upgrade_celebrated BOOLEAN DEFAULT false;

-- =============================================
-- ADD MISSING COLUMNS TO CMO PROFILES
-- =============================================
ALTER TABLE public.cmo_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.cmo_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upgrade_requests_updated_at
  BEFORE UPDATE ON public.upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();