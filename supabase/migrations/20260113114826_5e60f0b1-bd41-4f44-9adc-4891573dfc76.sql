-- Add/update RLS policy for discount codes - ensure creators can manage their own codes
-- First, check if the policies exist and drop them if so

DROP POLICY IF EXISTS "Creators can view own discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Creators can insert own discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Creators can update own discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Creators can delete own discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage all discount codes" ON public.discount_codes;

-- Enable RLS on discount_codes if not already
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Allow creators to view their own discount codes
CREATE POLICY "Creators can view own discount codes" ON public.discount_codes
FOR SELECT TO authenticated
USING (
  creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  )
);

-- Allow creators to insert their own discount codes
CREATE POLICY "Creators can insert own discount codes" ON public.discount_codes
FOR INSERT TO authenticated
WITH CHECK (
  creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  )
);

-- Allow creators to update their own discount codes
CREATE POLICY "Creators can update own discount codes" ON public.discount_codes
FOR UPDATE TO authenticated
USING (
  creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  )
);

-- Allow creators to delete their own discount codes
CREATE POLICY "Creators can delete own discount codes" ON public.discount_codes
FOR DELETE TO authenticated
USING (
  creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  )
);

-- Allow anyone (including anonymous) to check if a discount code is valid (for applying at checkout)
CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Allow admins to manage all discount codes
CREATE POLICY "Admins can manage all discount codes" ON public.discount_codes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);