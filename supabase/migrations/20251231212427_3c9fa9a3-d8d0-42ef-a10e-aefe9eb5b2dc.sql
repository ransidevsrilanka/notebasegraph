-- =============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================

-- Profiles: add missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abuse_flags INTEGER DEFAULT 0;

-- User subjects: add missing columns
ALTER TABLE public.user_subjects ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.user_subjects ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Stream subjects: add missing columns
ALTER TABLE public.stream_subjects ADD COLUMN IF NOT EXISTS basket TEXT;
ALTER TABLE public.stream_subjects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Creator profiles: add missing columns
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS lifetime_paid_users INTEGER DEFAULT 0;

-- =============================================
-- SUBJECTS TABLE
-- =============================================
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  grade TEXT,
  stream TEXT,
  subject_code TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subjects"
  ON public.subjects FOR SELECT
  USING (true);

-- =============================================
-- TOPICS TABLE
-- =============================================
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read topics"
  ON public.topics FOR SELECT
  USING (true);

-- =============================================
-- CONTENT/RESOURCES TABLE
-- =============================================
CREATE TABLE public.content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  tier_required TEXT DEFAULT 'starter',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read content metadata"
  ON public.content FOR SELECT
  USING (true);

-- =============================================
-- CMO PROFILES TABLE
-- =============================================
CREATE TABLE public.cmo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cmo_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cmo profiles"
  ON public.cmo_profiles FOR SELECT
  USING (true);

-- =============================================
-- SET CREATOR ROLE FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.set_creator_role(user_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_input, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;