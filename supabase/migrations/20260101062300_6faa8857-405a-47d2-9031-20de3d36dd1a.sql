-- Fix: Allow creators to view payment attributions linked to them
CREATE POLICY "Creators can view own payment attributions" 
ON public.payment_attributions 
FOR SELECT 
USING (
  creator_id IN (
    SELECT id FROM public.creator_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Fix: Allow creators to view user attributions linked to them
CREATE POLICY "Creators can view own user attributions" 
ON public.user_attributions 
FOR SELECT 
USING (
  creator_id IN (
    SELECT id FROM public.creator_profiles 
    WHERE user_id = auth.uid()
  )
);