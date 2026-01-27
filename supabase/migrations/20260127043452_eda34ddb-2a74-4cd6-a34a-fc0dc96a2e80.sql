-- Fix validate_access_code function to check for 'active' status instead of 'unused'
CREATE OR REPLACE FUNCTION public.validate_access_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  access_code_record RECORD;
BEGIN
  -- Changed from 'unused' to 'active' to match new default status
  SELECT * INTO access_code_record
  FROM public.access_codes
  WHERE code = UPPER(_code)
  AND status = 'active'
  AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    -- Check if code exists but has different status
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
$function$;