-- Make access_code_id nullable for paid enrollments (direct payments don't need access codes)
ALTER TABLE public.enrollments ALTER COLUMN access_code_id DROP NOT NULL;

-- Add payment_order_id to track paid enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_order_id TEXT;

-- Add RLS policy to allow users to insert their own enrollments without access_code
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
CREATE POLICY "Users can insert own enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);