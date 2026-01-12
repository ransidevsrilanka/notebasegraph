-- ============================================
-- Phase 2: Fix Monthly vs Lifetime Stats
-- Add trigger to update creator stats on payment
-- ============================================

-- Create function to update creator stats on new payment attribution
CREATE OR REPLACE FUNCTION update_creator_stats_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  payment_month TEXT;
  current_month TEXT;
BEGIN
  -- Only process if creator_id is set
  IF NEW.creator_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get month of the payment
  payment_month := to_char(NEW.created_at, 'YYYY-MM');
  current_month := to_char(CURRENT_DATE, 'YYYY-MM');
  
  -- Update lifetime_paid_users
  UPDATE creator_profiles
  SET lifetime_paid_users = COALESCE(lifetime_paid_users, 0) + 1
  WHERE id = NEW.creator_id;
  
  -- Update monthly_paid_users only if payment is in current month
  IF payment_month = current_month THEN
    UPDATE creator_profiles
    SET monthly_paid_users = COALESCE(monthly_paid_users, 0) + 1
    WHERE id = NEW.creator_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_payment_attribution_insert ON payment_attributions;
CREATE TRIGGER on_payment_attribution_insert
AFTER INSERT ON payment_attributions
FOR EACH ROW
EXECUTE FUNCTION update_creator_stats_on_payment();

-- ============================================
-- Phase 3: Add trial_expires_at for creators
-- ============================================

-- Add trial_expires_at column to creator_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'creator_profiles' 
    AND column_name = 'trial_expires_at'
  ) THEN
    ALTER TABLE creator_profiles 
    ADD COLUMN trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
  END IF;
END $$;

-- Set trial_expires_at for existing creators that don't have it set
UPDATE creator_profiles 
SET trial_expires_at = created_at + INTERVAL '30 days'
WHERE trial_expires_at IS NULL;

-- ============================================
-- Phase 5: Fix Existing Data
-- ============================================

-- Fix monthly_paid_users for all creators based on current month's payment_attributions
UPDATE creator_profiles cp
SET monthly_paid_users = (
  SELECT COUNT(*)
  FROM payment_attributions pa
  WHERE pa.creator_id = cp.id
  AND date_trunc('month', pa.created_at) = date_trunc('month', CURRENT_DATE)
);

-- Set expires_at for existing paid enrollments that don't have it set
-- Users get 365 days from creation, except lifetime/platinum users
UPDATE enrollments
SET expires_at = created_at + INTERVAL '365 days'
WHERE tier NOT IN ('lifetime', 'platinum')
  AND expires_at IS NULL
  AND is_active = true;

-- ============================================
-- Create function to reset monthly_paid_users (to be called on 1st of each month)
-- ============================================
CREATE OR REPLACE FUNCTION reset_monthly_paid_users()
RETURNS void AS $$
BEGIN
  UPDATE creator_profiles SET monthly_paid_users = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;