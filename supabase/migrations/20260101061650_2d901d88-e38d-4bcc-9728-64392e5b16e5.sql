-- Fix: Add admin policies for upgrade_requests table
CREATE POLICY "Admins can view all upgrade requests" 
ON public.upgrade_requests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

CREATE POLICY "Admins can update all upgrade requests" 
ON public.upgrade_requests 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Fix: Add admin policy for payment_attributions to allow viewing
CREATE POLICY "Admins can view all payment attributions" 
ON public.payment_attributions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);