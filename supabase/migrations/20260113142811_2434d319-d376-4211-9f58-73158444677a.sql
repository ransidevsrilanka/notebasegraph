-- Fix Tier 4 commission rate to 20%
UPDATE commission_tiers 
SET commission_rate = 20.00 
WHERE tier_level = 4;

-- Add unique constraint on referral_code (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS creator_profiles_referral_code_unique_ci 
ON creator_profiles (UPPER(referral_code));

-- Update set_creator_role to NOT create separate discount codes
-- The referral_code IS the discount code
CREATE OR REPLACE FUNCTION public.set_creator_role(
  _user_id uuid, 
  _cmo_id uuid DEFAULT NULL, 
  _display_name text DEFAULT NULL, 
  _referral_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_creator_id UUID;
BEGIN
  -- Insert creator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Generate referral code if not provided
  IF _referral_code IS NULL THEN
    _referral_code := 'CRT' || UPPER(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;

  -- Create creator profile with 30-day tier protection (Tier 2 = 12%)
  INSERT INTO public.creator_profiles (
    user_id, 
    cmo_id, 
    display_name, 
    referral_code, 
    is_active,
    current_tier_level,
    tier_protection_until
  )
  VALUES (
    _user_id, 
    _cmo_id, 
    _display_name, 
    _referral_code, 
    true,
    2,  -- Start at Tier 2
    (NOW() + INTERVAL '30 days')  -- 30-day protection
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, creator_profiles.display_name),
    cmo_id = COALESCE(EXCLUDED.cmo_id, creator_profiles.cmo_id)
  RETURNING id INTO new_creator_id;

  -- NO separate discount_codes creation
  -- The referral_code IS the discount code (10% discount)

  RETURN jsonb_build_object(
    'success', true,
    'creator_id', new_creator_id,
    'referral_code', _referral_code
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;