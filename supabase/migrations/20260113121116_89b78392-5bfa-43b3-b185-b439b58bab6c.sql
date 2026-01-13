-- Admin-readable policies for core finance/analytics tables
-- NOTE: public.has_role signature is ( _user_id uuid, _role app_role )

-- creator_profiles
DROP POLICY IF EXISTS "Admins can read all creator profiles" ON public.creator_profiles;
CREATE POLICY "Admins can read all creator profiles"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- cmo_profiles
DROP POLICY IF EXISTS "Admins can read all cmo profiles" ON public.cmo_profiles;
CREATE POLICY "Admins can read all cmo profiles"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- payment_attributions
DROP POLICY IF EXISTS "Admins can read all payment attributions" ON public.payment_attributions;
CREATE POLICY "Admins can read all payment attributions"
ON public.payment_attributions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- payments
DROP POLICY IF EXISTS "Admins can read all payments" ON public.payments;
CREATE POLICY "Admins can read all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- join_requests
DROP POLICY IF EXISTS "Admins can read all join requests" ON public.join_requests;
CREATE POLICY "Admins can read all join requests"
ON public.join_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- upgrade_requests
DROP POLICY IF EXISTS "Admins can read all upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Admins can read all upgrade requests"
ON public.upgrade_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'content_admin'::public.app_role) OR
  public.has_role(auth.uid(), 'support_admin'::public.app_role)
);

-- Public-safe validation for CMO creator-invite links (avoid anon SELECT on cmo_profiles)
CREATE OR REPLACE FUNCTION public.validate_cmo_referral(_code text)
RETURNS TABLE(id uuid, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, COALESCE(c.display_name, 'CMO')
  FROM public.cmo_profiles c
  WHERE c.referral_code = upper(trim(_code))
    AND c.is_active IS TRUE
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_cmo_referral(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_cmo_referral(text) TO authenticated;
