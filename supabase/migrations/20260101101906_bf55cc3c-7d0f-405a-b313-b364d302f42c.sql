-- Allow admins to delete cmo_payouts (for purge functionality)
CREATE POLICY "Admins can delete cmo payouts" 
ON public.cmo_payouts 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);