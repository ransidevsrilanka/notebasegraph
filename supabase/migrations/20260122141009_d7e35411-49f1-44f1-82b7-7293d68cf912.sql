-- ============================================
-- SECURITY FIX: Ensure access_codes RLS policies are restricted
-- ============================================

-- Drop overly permissive policies on access_codes (if they exist)
DROP POLICY IF EXISTS "Anyone can read access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Authenticated can update access codes" ON public.access_codes;

-- Ensure authenticated users can update codes they are activating
DROP POLICY IF EXISTS "Authenticated users can update codes for activation" ON public.access_codes;
CREATE POLICY "Authenticated users can update codes for activation" 
ON public.access_codes FOR UPDATE 
TO authenticated
USING (
  -- Allow update if code is unused or user is the one who activated it
  (status = 'unused' OR activated_by = auth.uid())
)
WITH CHECK (
  -- Only allow setting activated_by to self
  (activated_by = auth.uid())
);

-- ============================================
-- SECURITY FIX: Drop overly permissive payments insert policy
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;