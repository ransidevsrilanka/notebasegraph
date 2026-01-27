-- Fix default status from 'unused' to 'active'
ALTER TABLE access_codes 
ALTER COLUMN status SET DEFAULT 'active';

-- Update existing 'unused' codes to 'active' (only if not already activated)
UPDATE access_codes 
SET status = 'active' 
WHERE status = 'unused' AND activated_by IS NULL;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_access_code_activation ON access_codes;

-- Fix the trigger function to properly handle all status transitions
CREATE OR REPLACE FUNCTION create_access_code_payment_attribution()
RETURNS TRIGGER AS $$
DECLARE
  tier_price NUMERIC;
  pricing_data JSONB;
BEGIN
  -- Trigger when code status becomes 'used' and has an activator
  -- Use IS DISTINCT FROM to handle NULL -> 'used' and 'active' -> 'used' and 'unused' -> 'used'
  IF NEW.status = 'used' AND NEW.activated_by IS NOT NULL 
     AND (OLD.status IS DISTINCT FROM 'used') THEN
    
    -- Get tier pricing from site_settings
    SELECT value INTO pricing_data
    FROM public.site_settings
    WHERE key = 'pricing';
    
    -- Get price for the tier (fallback to defaults if not found)
    tier_price := COALESCE(
      (pricing_data -> NEW.tier ->> 'price')::NUMERIC,
      CASE NEW.tier
        WHEN 'starter' THEN 1500
        WHEN 'standard' THEN 2500
        WHEN 'lifetime' THEN 4500
        ELSE 0
      END
    );
    
    -- Create payment attribution for access code revenue
    INSERT INTO public.payment_attributions (
      user_id,
      access_code_id,
      final_amount,
      original_amount,
      tier,
      payment_type,
      payment_month,
      created_at
    ) VALUES (
      NEW.activated_by,
      NEW.id,
      tier_price,
      tier_price,
      NEW.tier,
      'access_code',
      to_char(NOW(), 'YYYY-MM-DD'),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_access_code_activation
AFTER UPDATE ON access_codes
FOR EACH ROW
EXECUTE FUNCTION create_access_code_payment_attribution();