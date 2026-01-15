-- Patch validate_creator_profile_update() to allow service_role/backend updates
-- This fixes the conflict where payment_attributions trigger couldn't update creator stats

CREATE OR REPLACE FUNCTION public.validate_creator_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin BOOLEAN;
  jwt_role TEXT;
BEGIN
  -- Allow service_role (backend/edge functions) to update anything
  -- This is critical for triggers and edge functions to work properly
  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Also allow if there's no auth context (trigger context from SECURITY DEFINER functions)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user is admin/super_admin/content_admin/support_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'content_admin', 'support_admin')
  ) INTO is_admin;
  
  -- If admin, allow all updates
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- For regular creators, block changes to sensitive columns
  IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify commission_rate';
  END IF;
  
  IF NEW.available_balance IS DISTINCT FROM OLD.available_balance THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify available_balance';
  END IF;
  
  IF NEW.lifetime_paid_users IS DISTINCT FROM OLD.lifetime_paid_users THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify lifetime_paid_users';
  END IF;
  
  IF NEW.monthly_paid_users IS DISTINCT FROM OLD.monthly_paid_users THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify monthly_paid_users';
  END IF;
  
  IF NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify total_withdrawn';
  END IF;
  
  IF NEW.current_tier_level IS DISTINCT FROM OLD.current_tier_level THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify current_tier_level';
  END IF;
  
  IF NEW.tier_protection_until IS DISTINCT FROM OLD.tier_protection_until THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify tier_protection_until';
  END IF;
  
  IF NEW.cmo_id IS DISTINCT FROM OLD.cmo_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify cmo_id';
  END IF;
  
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify is_active';
  END IF;
  
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify referral_code';
  END IF;
  
  IF NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify trial_expires_at';
  END IF;
  
  -- Only display_name can be modified by creators
  RETURN NEW;
END;
$function$;