-- Fix critical RLS issues

-- 1. Drop the dangerous "Users can insert own roles" policy
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- 2. Add admin-only INSERT policy for user_roles
CREATE POLICY "Admins can manage user_roles"
ON public.user_roles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
);

-- 3. Fix site_settings - remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can modify site_settings" ON public.site_settings;

-- 4. Add admin-only modify policy for site_settings
CREATE POLICY "Admins can manage site_settings"
ON public.site_settings
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
);

-- 5. Add admin policies for cmo_profiles management
CREATE POLICY "Admins can manage cmo_profiles"
ON public.cmo_profiles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'content_admin') OR
  public.has_role(auth.uid(), 'support_admin')
);

-- 6. Allow CMOs to update their own profile
CREATE POLICY "CMOs can update own profile"
ON public.cmo_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- 7. Add unique constraint on cmo_profiles.referral_code to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS cmo_profiles_referral_code_unique ON public.cmo_profiles(referral_code) WHERE referral_code IS NOT NULL;

-- 8. Add partial unique index on payment_attributions.order_id to prevent double-counting
CREATE UNIQUE INDEX IF NOT EXISTS payment_attributions_order_id_unique ON public.payment_attributions(order_id) WHERE order_id IS NOT NULL;