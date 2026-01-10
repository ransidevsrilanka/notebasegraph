-- Fix validate_access_code to return ALL required fields including medium and duration_days
CREATE OR REPLACE FUNCTION public.validate_access_code(_code text)
RETURNS jsonb
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
    -- Check if code exists but is used/expired
    SELECT * INTO access_code_record
    FROM public.access_codes
    WHERE code = UPPER(_code);
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid', false, 'error', 'INVALID_CODE', 'message', 'Access code not found');
    ELSIF access_code_record.status = 'used' THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_FULLY_USED', 'message', 'This access code has already been used');
    ELSIF access_code_record.status = 'revoked' THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_NOT_ACTIVE', 'message', 'This access code is no longer active');
    ELSIF access_code_record.valid_until IS NOT NULL AND access_code_record.valid_until <= now() THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_EXPIRED', 'message', 'This access code has expired');
    ELSE
      RETURN jsonb_build_object('valid', false, 'error', 'INVALID_CODE', 'message', 'Invalid access code');
    END IF;
  END IF;

  -- Return ALL required fields including medium and duration_days
  RETURN jsonb_build_object(
    'valid', true,
    'code_id', access_code_record.id,
    'tier', access_code_record.tier,
    'grade', access_code_record.grade,
    'stream', access_code_record.stream,
    'medium', COALESCE(access_code_record.medium, 'english'),
    'duration_days', COALESCE(access_code_record.duration_days, 365)
  );
END;
$$;

-- Fix existing enrollments with null medium
UPDATE enrollments 
SET medium = 'english' 
WHERE medium IS NULL;

-- Fix O/L enrollments with incorrect stream (O/L shouldn't have stream)
UPDATE enrollments 
SET stream = NULL 
WHERE grade LIKE 'ol_%' AND stream IS NOT NULL;

-- Ensure all access codes have a medium default
UPDATE access_codes
SET medium = 'english'
WHERE medium IS NULL;

-- Update O/L subjects to not require stream
UPDATE subjects
SET stream = NULL, streams = '[]'::jsonb
WHERE grade LIKE 'ol_%' AND (stream IS NOT NULL OR streams IS NOT NULL);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();