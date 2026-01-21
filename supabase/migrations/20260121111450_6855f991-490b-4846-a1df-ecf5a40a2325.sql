-- =====================================================
-- Part 1: Add access_code_id to payment_attributions with CASCADE delete
-- =====================================================
ALTER TABLE payment_attributions
ADD COLUMN IF NOT EXISTS access_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE;

-- =====================================================
-- Part 2: Function to create payment attribution when access code is activated
-- =====================================================
CREATE OR REPLACE FUNCTION create_access_code_payment_attribution()
RETURNS TRIGGER AS $$
DECLARE
  tier_price NUMERIC;
  pricing_data JSONB;
BEGIN
  -- Only trigger when code is newly activated
  IF NEW.status = 'used' AND (OLD.status IS NULL OR OLD.status != 'used') AND NEW.activated_by IS NOT NULL THEN
    -- Get tier pricing from site_settings
    SELECT value INTO pricing_data
    FROM site_settings
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
    
    -- Create payment attribution
    INSERT INTO payment_attributions (
      user_id,
      access_code_id,
      final_amount,
      tier,
      payment_type,
      payment_month,
      created_at
    ) VALUES (
      NEW.activated_by,
      NEW.id,
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

-- Create trigger on access_codes update
DROP TRIGGER IF EXISTS on_access_code_activation ON access_codes;
CREATE TRIGGER on_access_code_activation
  AFTER UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION create_access_code_payment_attribution();

-- =====================================================
-- Part 3: Allow admins to read ALL ai_credits records
-- =====================================================
CREATE POLICY "Admins can read all ai_credits"
ON public.ai_credits FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- =====================================================
-- Part 4: Allow admins to read all user_attributions
-- =====================================================
CREATE POLICY "Admins can read all user_attributions"
ON public.user_attributions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- Allow admins to read all payment_attributions
CREATE POLICY "Admins can read all payment_attributions"
ON public.payment_attributions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'support_admin'::app_role)
);

-- =====================================================
-- Part 5: Add per-subject medium columns to user_subjects
-- =====================================================
ALTER TABLE user_subjects
ADD COLUMN IF NOT EXISTS subject_1_medium TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subject_2_medium TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subject_3_medium TEXT DEFAULT NULL;

-- =====================================================
-- Part 6: Create subject_medium_requests table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subject_medium_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  user_subjects_id UUID REFERENCES user_subjects(id),
  subject_1_new_medium TEXT,
  subject_2_new_medium TEXT,
  subject_3_new_medium TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subject_medium_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subject_medium_requests
CREATE POLICY "Users can create own medium requests"
ON subject_medium_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own medium requests"
ON subject_medium_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all medium requests"
ON subject_medium_requests FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_subject_medium_requests_updated_at
BEFORE UPDATE ON subject_medium_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();