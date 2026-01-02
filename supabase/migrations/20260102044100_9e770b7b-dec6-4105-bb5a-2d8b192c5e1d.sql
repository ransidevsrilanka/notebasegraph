-- First, clean up duplicate user_attributions (keep earliest)
DELETE FROM user_attributions a
USING user_attributions b
WHERE a.created_at > b.created_at 
AND a.user_id = b.user_id;

-- Add unique constraint on user_attributions.user_id
ALTER TABLE user_attributions 
ADD CONSTRAINT user_attributions_user_id_unique UNIQUE (user_id);

-- Recalculate creator_profiles.lifetime_paid_users from actual payment_attributions
UPDATE creator_profiles cp
SET lifetime_paid_users = (
  SELECT COUNT(*) FROM payment_attributions pa 
  WHERE pa.creator_id = cp.id
);

-- Recalculate creator_profiles.available_balance from payment_attributions minus withdrawals
UPDATE creator_profiles cp
SET available_balance = (
  SELECT COALESCE(SUM(creator_commission_amount), 0) 
  FROM payment_attributions pa 
  WHERE pa.creator_id = cp.id
) - COALESCE(cp.total_withdrawn, 0);

-- Reset monthly_paid_users based on current month's payment_attributions
UPDATE creator_profiles cp
SET monthly_paid_users = (
  SELECT COUNT(*) FROM payment_attributions pa 
  WHERE pa.creator_id = cp.id 
  AND pa.payment_month >= date_trunc('month', CURRENT_DATE)::date::text
);

-- Delete all existing cmo_payouts to recalculate from scratch
DELETE FROM cmo_payouts;

-- Recalculate cmo_payouts from payment_attributions
INSERT INTO cmo_payouts (cmo_id, payout_month, total_paid_users, base_commission_amount, bonus_amount, total_commission, status)
SELECT 
  cmo.id as cmo_id,
  pa.payment_month,
  COUNT(pa.id)::integer as total_paid_users,
  SUM(pa.final_amount * 0.08) as base_commission_amount,
  0 as bonus_amount,
  SUM(pa.final_amount * 0.08) as total_commission,
  'pending' as status
FROM cmo_profiles cmo
JOIN creator_profiles cp ON cp.cmo_id = cmo.id
JOIN payment_attributions pa ON pa.creator_id = cp.id
WHERE pa.payment_month IS NOT NULL
GROUP BY cmo.id, pa.payment_month;

-- Recalculate discount_codes paid_conversions from actual payment_attributions
UPDATE discount_codes dc
SET paid_conversions = (
  SELECT COUNT(*) FROM user_attributions ua 
  WHERE ua.discount_code_id = dc.id
  AND EXISTS (
    SELECT 1 FROM payment_attributions pa 
    WHERE pa.user_id = ua.user_id
  )
);