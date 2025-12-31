-- Update set_creator_role to also create a discount code for the creator
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
DECLARE
  new_creator_id UUID;
  discount_code_str TEXT;
BEGIN
  -- Insert creator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Generate referral code if not provided
  IF _referral_code IS NULL THEN
    _referral_code := 'CRT' || UPPER(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;

  -- Create or update creator profile and get the ID
  INSERT INTO public.creator_profiles (user_id, cmo_id, display_name, referral_code, is_active)
  VALUES (_user_id, _cmo_id, _display_name, _referral_code, true)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.creator_profiles.display_name),
    cmo_id = COALESCE(EXCLUDED.cmo_id, public.creator_profiles.cmo_id)
  RETURNING id INTO new_creator_id;

  -- Generate a discount code for this creator (10% discount by default)
  discount_code_str := 'DC' || UPPER(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  INSERT INTO public.discount_codes (code, discount_percent, creator_id, is_active)
  VALUES (discount_code_str, 10, new_creator_id, true)
  ON CONFLICT (code) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'creator_id', new_creator_id,
    'referral_code', _referral_code,
    'discount_code', discount_code_str
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;