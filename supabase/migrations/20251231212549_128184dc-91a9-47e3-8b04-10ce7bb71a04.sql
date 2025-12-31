-- Drop and recreate validate_access_code with correct parameter name
DROP FUNCTION IF EXISTS public.validate_access_code(TEXT);

CREATE OR REPLACE FUNCTION public.validate_access_code(_code TEXT)
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
  WHERE code = UPPER(_code)
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

-- Drop and recreate set_creator_role with all expected parameters
DROP FUNCTION IF EXISTS public.set_creator_role(UUID);

CREATE OR REPLACE FUNCTION public.set_creator_role(
  _user_id UUID,
  _cmo_id UUID DEFAULT NULL,
  _display_name TEXT DEFAULT NULL,
  _referral_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert creator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create or update creator profile
  INSERT INTO public.creator_profiles (user_id, cmo_id, display_name, referral_code)
  VALUES (_user_id, _cmo_id, _display_name, COALESCE(_referral_code, 'CRT' || substr(gen_random_uuid()::text, 1, 8)))
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.creator_profiles.display_name),
    cmo_id = COALESCE(EXCLUDED.cmo_id, public.creator_profiles.cmo_id);

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Add student to app_role enum if not exists (we need to recreate the enum)
-- First check what values exist and add missing ones
DO $$
BEGIN
  -- Try to add 'student' to enum
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_admin';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_admin';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_creator';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;