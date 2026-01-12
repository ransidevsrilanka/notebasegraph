-- ================================================
-- FIX RLS RECURSION: cmo_profiles <-> creator_profiles
-- ================================================

-- Step 1: Create SECURITY DEFINER helper functions to break recursion

-- Function to get current user's CMO profile ID (for use in creator_profiles policies)
CREATE OR REPLACE FUNCTION public.get_my_cmo_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.cmo_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Function to get current user's creator's cmo_id (for use in cmo_profiles policies)
CREATE OR REPLACE FUNCTION public.get_my_creator_cmo_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cmo_id FROM public.creator_profiles WHERE user_id = auth.uid() AND cmo_id IS NOT NULL LIMIT 1
$$;

-- Step 2: Drop the problematic recursive policies

DROP POLICY IF EXISTS "Creators can read assigned CMO" ON public.cmo_profiles;
DROP POLICY IF EXISTS "CMOs can read assigned creators" ON public.creator_profiles;

-- Also drop duplicate/overly-permissive policies
DROP POLICY IF EXISTS "Admins can manage cmo_profiles" ON public.cmo_profiles;
DROP POLICY IF EXISTS "CMOs can update own profile" ON public.cmo_profiles;
DROP POLICY IF EXISTS "Admins can update creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Users can update own creator profile" ON public.creator_profiles;

-- Step 3: Recreate policies using the SECURITY DEFINER functions (no recursion)

-- Creators can read their assigned CMO (uses function instead of subquery)
CREATE POLICY "Creators can read assigned CMO"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (id = public.get_my_creator_cmo_id());

-- CMOs can read creators assigned to them (uses function instead of subquery)
CREATE POLICY "CMOs can read assigned creators"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (cmo_id = public.get_my_cmo_profile_id());

-- Recreate update policies with proper role (authenticated, not public)
CREATE POLICY "CMOs can update own profile"
ON public.cmo_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can update creator profiles"
ON public.creator_profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

CREATE POLICY "Users can update own creator profile"
ON public.creator_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());