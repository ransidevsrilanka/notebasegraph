-- Add policy for admins to view all join requests
CREATE POLICY "Admins can view all join requests" 
ON public.join_requests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Add policy for admins to update all join requests
CREATE POLICY "Admins can update all join requests" 
ON public.join_requests 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);