-- Fix 1: Allow users to update their own upgrade requests (specifically for receipt_url)
CREATE POLICY "Users can update own upgrade requests"
ON public.upgrade_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Add a trigger to restrict what users can update (only receipt_url when status is pending)
CREATE OR REPLACE FUNCTION validate_upgrade_request_update()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'content_admin', 'support_admin')
  ) INTO is_admin;
  
  -- If admin, allow all updates
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, only allow updating receipt_url when status is pending
  IF OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot modify a request that is not pending';
  END IF;
  
  -- Block changes to sensitive fields
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status';
  END IF;
  
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'Cannot modify admin_notes';
  END IF;
  
  IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Cannot modify reviewed_at';
  END IF;
  
  IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
    RAISE EXCEPTION 'Cannot modify reviewed_by';
  END IF;
  
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'Cannot modify amount';
  END IF;
  
  IF NEW.requested_tier IS DISTINCT FROM OLD.requested_tier THEN
    RAISE EXCEPTION 'Cannot modify requested_tier';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_upgrade_request_update_trigger ON upgrade_requests;
CREATE TRIGGER validate_upgrade_request_update_trigger
BEFORE UPDATE ON upgrade_requests
FOR EACH ROW
EXECUTE FUNCTION validate_upgrade_request_update();