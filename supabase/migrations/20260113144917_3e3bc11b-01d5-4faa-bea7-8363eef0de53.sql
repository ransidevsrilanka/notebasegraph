-- Backfill missing BANK payments + attributions from approved join/upgrade requests
-- Goal: make Admin Payments / Reconciliation reflect bank approvals.

-- 1) Backfill payments rows for approved join_requests
INSERT INTO public.payments (
  order_id,
  user_id,
  amount,
  currency,
  status,
  payment_method,
  tier,
  ref_creator,
  discount_code,
  enrollment_id,
  processed_at
)
SELECT
  'BANK-' || jr.reference_number AS order_id,
  jr.user_id,
  jr.amount,
  'LKR' AS currency,
  'completed' AS status,
  'bank' AS payment_method,
  jr.tier,
  upper(trim(coalesce(jr.ref_creator, jr.discount_code))) AS ref_creator,
  upper(trim(coalesce(jr.ref_creator, jr.discount_code))) AS discount_code,
  e.id AS enrollment_id,
  coalesce(jr.reviewed_at, now()) AS processed_at
FROM public.join_requests jr
LEFT JOIN public.enrollments e ON e.payment_order_id = ('BANK-' || jr.reference_number)
WHERE jr.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = ('BANK-' || jr.reference_number)
  );

-- 2) Backfill payment_attributions rows for approved join_requests
INSERT INTO public.payment_attributions (
  order_id,
  user_id,
  creator_id,
  enrollment_id,
  amount,
  original_amount,
  discount_applied,
  final_amount,
  creator_commission_rate,
  creator_commission_amount,
  payment_month,
  tier,
  payment_type,
  created_at
)
SELECT
  'BANK-' || jr.reference_number AS order_id,
  jr.user_id,
  cp.id AS creator_id,
  e.id AS enrollment_id,
  jr.amount AS amount,
  jr.amount AS original_amount,
  0 AS discount_applied,
  jr.amount AS final_amount,
  NULL AS creator_commission_rate,
  NULL AS creator_commission_amount,
  to_char(coalesce(jr.reviewed_at, now()), 'YYYY-MM-01') AS payment_month,
  jr.tier,
  'bank' AS payment_type,
  coalesce(jr.reviewed_at, now()) AS created_at
FROM public.join_requests jr
LEFT JOIN public.enrollments e ON e.payment_order_id = ('BANK-' || jr.reference_number)
LEFT JOIN public.creator_profiles cp
  ON cp.referral_code = upper(trim(coalesce(jr.ref_creator, jr.discount_code)))
  AND cp.is_active IS TRUE
WHERE jr.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_attributions pa
    WHERE pa.order_id = ('BANK-' || jr.reference_number)
  );

-- 3) Backfill payments rows for approved upgrade_requests (bank)
INSERT INTO public.payments (
  order_id,
  user_id,
  amount,
  currency,
  status,
  payment_method,
  tier,
  ref_creator,
  discount_code,
  enrollment_id,
  processed_at
)
SELECT
  'BANK-UPG-' || ur.reference_number AS order_id,
  ur.user_id,
  ur.amount,
  'LKR' AS currency,
  'completed' AS status,
  'bank' AS payment_method,
  ur.requested_tier AS tier,
  NULL AS ref_creator,
  NULL AS discount_code,
  ur.enrollment_id,
  coalesce(ur.reviewed_at, now()) AS processed_at
FROM public.upgrade_requests ur
WHERE ur.status = 'approved'
  AND ur.amount IS NOT NULL
  AND ur.reference_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = ('BANK-UPG-' || ur.reference_number)
  );

-- 4) Backfill payment_attributions rows for approved upgrade_requests (bank)
INSERT INTO public.payment_attributions (
  order_id,
  user_id,
  creator_id,
  enrollment_id,
  amount,
  original_amount,
  discount_applied,
  final_amount,
  creator_commission_rate,
  creator_commission_amount,
  payment_month,
  tier,
  payment_type,
  created_at
)
SELECT
  'BANK-UPG-' || ur.reference_number AS order_id,
  ur.user_id,
  NULL AS creator_id,
  ur.enrollment_id,
  ur.amount AS amount,
  ur.amount AS original_amount,
  0 AS discount_applied,
  ur.amount AS final_amount,
  NULL AS creator_commission_rate,
  NULL AS creator_commission_amount,
  to_char(coalesce(ur.reviewed_at, now()), 'YYYY-MM-01') AS payment_month,
  ur.requested_tier AS tier,
  'bank' AS payment_type,
  coalesce(ur.reviewed_at, now()) AS created_at
FROM public.upgrade_requests ur
WHERE ur.status = 'approved'
  AND ur.amount IS NOT NULL
  AND ur.reference_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_attributions pa
    WHERE pa.order_id = ('BANK-UPG-' || ur.reference_number)
  );
