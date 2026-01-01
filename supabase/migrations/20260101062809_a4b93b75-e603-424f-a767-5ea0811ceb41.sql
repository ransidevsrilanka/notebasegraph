-- Fix: Allow CMOs to view payment attributions for creators under them
CREATE POLICY "CMOs can view payment attributions for their creators" 
ON public.payment_attributions 
FOR SELECT 
USING (
  creator_id IN (
    SELECT cp.id FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cp.cmo_id = cmo.id
    WHERE cmo.user_id = auth.uid()
  )
);

-- Fix: Allow CMOs to view user attributions for creators under them
CREATE POLICY "CMOs can view user attributions for their creators" 
ON public.user_attributions 
FOR SELECT 
USING (
  creator_id IN (
    SELECT cp.id FROM public.creator_profiles cp
    JOIN public.cmo_profiles cmo ON cp.cmo_id = cmo.id
    WHERE cmo.user_id = auth.uid()
  )
);