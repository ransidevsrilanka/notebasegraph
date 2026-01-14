-- Public RPC to validate/resolve referral & legacy discount codes without exposing creator_profiles via RLS

CREATE OR REPLACE FUNCTION public.resolve_referral_code(p_code text)
RETURNS TABLE (
  referral_code text,
  creator_id uuid,
  creator_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- 1) Direct creator referral code
  RETURN QUERY
  SELECT
    cp.referral_code,
    cp.id,
    COALESCE(cp.display_name, 'Creator')
  FROM public.creator_profiles cp
  WHERE upper(cp.referral_code) = upper(p_code)
    AND (cp.is_active IS NULL OR cp.is_active = true)
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 2) Legacy discount_codes -> creator
  RETURN QUERY
  SELECT
    cp.referral_code,
    cp.id,
    COALESCE(cp.display_name, 'Creator')
  FROM public.discount_codes dc
  JOIN public.creator_profiles cp ON cp.id = dc.creator_id
  WHERE upper(dc.code) = upper(p_code)
    AND (dc.is_active IS NULL OR dc.is_active = true)
    AND (cp.is_active IS NULL OR cp.is_active = true)
  LIMIT 1;

  RETURN;
END;
$$;

-- Allow client to call it
GRANT EXECUTE ON FUNCTION public.resolve_referral_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_referral_code(text) TO authenticated;