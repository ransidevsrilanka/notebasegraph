-- Add policy for admins to insert enrollments for any user
CREATE POLICY "Admins can insert enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Add policy for admins to update any enrollment
CREATE POLICY "Admins can update enrollments" 
ON public.enrollments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Add policy for admins to view all enrollments
CREATE POLICY "Admins can view all enrollments" 
ON public.enrollments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Add policy for admins to insert user_subjects
CREATE POLICY "Admins can insert user_subjects" 
ON public.user_subjects 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Add policy for admins to view all profiles (needed to get user info)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'content_admin'::app_role) OR 
  has_role(auth.uid(), 'support_admin'::app_role)
);