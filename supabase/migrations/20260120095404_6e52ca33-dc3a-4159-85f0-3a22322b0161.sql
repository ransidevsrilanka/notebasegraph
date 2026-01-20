-- Add referral_code to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Generate referral codes for existing users
UPDATE profiles 
SET referral_code = 'USR' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Trigger to auto-generate referral codes for new users
CREATE OR REPLACE FUNCTION generate_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'USR' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_referral_code ON profiles;
CREATE TRIGGER set_user_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION generate_user_referral_code();

-- Create pending_payments table for secure payment tracking (replaces localStorage)
CREATE TABLE IF NOT EXISTS pending_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id),
  tier TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  original_amount NUMERIC,
  ref_creator TEXT,
  discount_code TEXT,
  payment_type TEXT DEFAULT 'card',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_payments
CREATE POLICY "Users can view own pending payments"
ON pending_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending payments"
ON pending_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending payments"
ON pending_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all pending payments"
ON pending_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_pending_payments_updated_at
BEFORE UPDATE ON pending_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();