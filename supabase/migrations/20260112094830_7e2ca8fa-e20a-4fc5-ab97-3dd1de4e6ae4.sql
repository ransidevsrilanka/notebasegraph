-- ================================================
-- ADD HEAD OF OPS ACCESS POLICIES
-- ================================================

-- Function to check if current user is Head of Ops
CREATE OR REPLACE FUNCTION public.is_head_ops()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cmo_profiles 
    WHERE user_id = auth.uid() AND is_head_ops = true
  )
$$;

-- Head of Ops can read all CMO profiles
CREATE POLICY "Head of Ops can read all CMO profiles"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (public.is_head_ops());

-- Head of Ops can read all creator profiles
CREATE POLICY "Head of Ops can read all creator profiles"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (public.is_head_ops());

-- Head of Ops can read all payment_attributions
CREATE POLICY "Head of Ops can read payment_attributions"
ON public.payment_attributions
FOR SELECT
TO authenticated
USING (public.is_head_ops());