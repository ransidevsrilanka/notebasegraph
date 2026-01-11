-- ============================================================
-- PHASE 1 & 2: Critical Security Fixes (Fixed Syntax)
-- Fix RLS policies and secure database functions
-- ============================================================

-- ============================================================
-- PHASE 1: RLS POLICY FIXES
-- ============================================================

-- 1.1 FIX ACCESS_CODES EXPOSURE
DROP POLICY IF EXISTS "Anyone can read access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Authenticated users can read access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Users can read own activated codes" ON public.access_codes;
DROP POLICY IF EXISTS "Admins can read all access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Admins can manage access codes" ON public.access_codes;

CREATE POLICY "Users can read own activated codes"
ON public.access_codes
FOR SELECT
TO authenticated
USING (activated_by = auth.uid());

CREATE POLICY "Admins can read all access codes"
ON public.access_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage access codes"
ON public.access_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.2 FIX CMO_PROFILES EXPOSURE
DROP POLICY IF EXISTS "Anyone can read cmo profiles" ON public.cmo_profiles;
DROP POLICY IF EXISTS "Authenticated users can read CMO profiles" ON public.cmo_profiles;
DROP POLICY IF EXISTS "CMOs can read own profile" ON public.cmo_profiles;
DROP POLICY IF EXISTS "Creators can read assigned CMO" ON public.cmo_profiles;
DROP POLICY IF EXISTS "Admins can read all CMO profiles" ON public.cmo_profiles;
DROP POLICY IF EXISTS "Admins can manage CMO profiles" ON public.cmo_profiles;

CREATE POLICY "CMOs can read own profile"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Creators can read assigned CMO"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.cmo_id = cmo_profiles.id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all CMO profiles"
ON public.cmo_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage CMO profiles"
ON public.cmo_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.3 FIX DISCOUNT_CODES EXPOSURE
DROP POLICY IF EXISTS "Anyone can read discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can read discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Creators can read own discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can read all discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;

CREATE POLICY "Creators can read own discount codes"
ON public.discount_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.id = discount_codes.creator_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all discount codes"
ON public.discount_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.4 FIX CREATOR_PROFILES FINANCIAL DATA EXPOSURE
DROP POLICY IF EXISTS "Anyone can read creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Authenticated users can read creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Creators can read own profile" ON public.creator_profiles;
DROP POLICY IF EXISTS "CMOs can read assigned creators" ON public.creator_profiles;
DROP POLICY IF EXISTS "Admins can read all creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Admins can manage creator profiles" ON public.creator_profiles;

CREATE POLICY "Creators can read own profile"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "CMOs can read assigned creators"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cmo_profiles cp 
    WHERE cp.id = creator_profiles.cmo_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all creator profiles"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage creator profiles"
ON public.creator_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.5 FIX CMO_PAYOUTS EXPOSURE
DROP POLICY IF EXISTS "Anyone can read cmo payouts" ON public.cmo_payouts;
DROP POLICY IF EXISTS "Authenticated users can read CMO payouts" ON public.cmo_payouts;
DROP POLICY IF EXISTS "CMOs can read own payouts" ON public.cmo_payouts;
DROP POLICY IF EXISTS "Admins can read all CMO payouts" ON public.cmo_payouts;
DROP POLICY IF EXISTS "Admins can manage CMO payouts" ON public.cmo_payouts;

CREATE POLICY "CMOs can read own payouts"
ON public.cmo_payouts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cmo_profiles cp 
    WHERE cp.id = cmo_payouts.cmo_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all CMO payouts"
ON public.cmo_payouts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage CMO payouts"
ON public.cmo_payouts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.6 FIX COMMISSION_TIERS EXPOSURE
DROP POLICY IF EXISTS "Anyone can view commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Authenticated users can view commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Creators can view commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Admins can manage commission tiers" ON public.commission_tiers;

CREATE POLICY "Creators can view commission tiers"
ON public.commission_tiers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'creator') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can manage commission tiers"
ON public.commission_tiers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 1.7 ADD MISSING POLICIES FOR USER_SESSIONS AND DOWNLOAD_LOGS
DROP POLICY IF EXISTS "Admins can view user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view download logs" ON public.download_logs;

CREATE POLICY "Admins can view user sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view download logs"
ON public.download_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- PHASE 2: SECURE DATABASE FUNCTIONS
-- ============================================================

-- 2.1 Secure get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_students bigint,
  total_creators bigint,
  active_enrollments bigint,
  total_codes bigint,
  active_codes bigint,
  total_subjects bigint,
  pending_upgrades bigint,
  pending_join_requests bigint,
  pending_withdrawals bigint,
  total_revenue numeric,
  this_month_revenue numeric,
  last_month_revenue numeric,
  starter_count bigint,
  standard_count bigint,
  lifetime_count bigint,
  card_payments numeric,
  bank_payments numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  non_student_ids uuid[];
  current_month_start timestamp;
  last_month_start timestamp;
BEGIN
  -- SECURITY CHECK: Only admins can access this function
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT ARRAY_AGG(user_id) INTO non_student_ids
  FROM user_roles 
  WHERE role IN ('admin', 'super_admin', 'content_admin', 'support_admin', 'creator', 'cmo');
  
  current_month_start := date_trunc('month', CURRENT_DATE);
  last_month_start := date_trunc('month', CURRENT_DATE - interval '1 month');
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e 
     WHERE e.is_active = true 
     AND (non_student_ids IS NULL OR e.user_id != ALL(COALESCE(non_student_ids, ARRAY[]::uuid[]))))::bigint,
    (SELECT COUNT(*) FROM creator_profiles)::bigint,
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true)::bigint,
    (SELECT COUNT(*) FROM access_codes)::bigint,
    (SELECT COUNT(*) FROM access_codes WHERE status = 'active')::bigint,
    (SELECT COUNT(*) FROM subjects)::bigint,
    (SELECT COUNT(*) FROM upgrade_requests WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM join_requests WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending')::bigint,
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions), 0::numeric),
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE created_at >= current_month_start), 0::numeric),
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE created_at >= last_month_start AND created_at < current_month_start), 0::numeric),
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'starter')::bigint,
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'standard')::bigint,
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'lifetime')::bigint,
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE payment_type = 'card'), 0::numeric),
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE payment_type = 'bank'), 0::numeric);
END;
$$;

-- 2.2 Secure get_creator_monthly_data
CREATE OR REPLACE FUNCTION public.get_creator_monthly_data(p_creator_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month text, earnings numeric, referrals bigint, conversions bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY CHECK: Only the creator owner or admins can access this data
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles 
    WHERE id = p_creator_id AND user_id = auth.uid()
  ) AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied: You can only view your own creator data';
  END IF;

  RETURN QUERY
  SELECT 
    to_char(month_start, 'Mon') as month,
    COALESCE(SUM(pa.creator_commission_amount), 0::numeric) as earnings,
    COALESCE((
      SELECT COUNT(*) FROM user_attributions ua 
      WHERE ua.creator_id = p_creator_id 
      AND ua.created_at >= month_start 
      AND ua.created_at < month_start + interval '1 month'
    ), 0::bigint) as referrals,
    COUNT(pa.id)::bigint as conversions
  FROM generate_series(
    date_trunc('month', CURRENT_DATE - ((p_months - 1) || ' months')::interval),
    date_trunc('month', CURRENT_DATE),
    '1 month'::interval
  ) AS month_start
  LEFT JOIN payment_attributions pa ON 
    pa.creator_id = p_creator_id AND
    pa.created_at >= month_start AND
    pa.created_at < month_start + interval '1 month'
  GROUP BY month_start
  ORDER BY month_start;
END;
$$;

-- 2.3 Secure get_cmo_monthly_data
CREATE OR REPLACE FUNCTION public.get_cmo_monthly_data(p_cmo_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month text, creators bigint, paid_users bigint, revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY CHECK: Only the CMO owner or admins can access this data
  IF NOT EXISTS (
    SELECT 1 FROM cmo_profiles 
    WHERE id = p_cmo_id AND user_id = auth.uid()
  ) AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied: You can only view your own CMO data';
  END IF;

  RETURN QUERY
  SELECT 
    to_char(month_start, 'Mon') as month,
    (
      SELECT COUNT(*) FROM creator_profiles cp 
      WHERE cp.cmo_id = p_cmo_id 
      AND cp.created_at < month_start + interval '1 month'
    )::bigint as creators,
    COALESCE((
      SELECT COUNT(*) FROM payment_attributions pa
      JOIN creator_profiles cp ON pa.creator_id = cp.id
      WHERE cp.cmo_id = p_cmo_id
      AND pa.created_at >= month_start 
      AND pa.created_at < month_start + interval '1 month'
    ), 0::bigint) as paid_users,
    COALESCE((
      SELECT SUM(pa.final_amount) FROM payment_attributions pa
      JOIN creator_profiles cp ON pa.creator_id = cp.id
      WHERE cp.cmo_id = p_cmo_id
      AND pa.created_at >= month_start 
      AND pa.created_at < month_start + interval '1 month'
    ), 0::numeric) as revenue
  FROM generate_series(
    date_trunc('month', CURRENT_DATE - ((p_months - 1) || ' months')::interval),
    date_trunc('month', CURRENT_DATE),
    '1 month'::interval
  ) AS month_start
  ORDER BY month_start;
END;
$$;

-- ============================================================
-- PHASE 5: ADMIN AUDIT TRAIL
-- ============================================================

-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Super admins can view audit trail" ON public.admin_actions;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can insert own audit logs" ON public.admin_actions;

-- Only super_admins can view audit trail
CREATE POLICY "Super admins can view audit trail"
ON public.admin_actions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins can insert their own audit logs
CREATE POLICY "Admins can insert own audit logs"
ON public.admin_actions
FOR INSERT
TO authenticated
WITH CHECK (
  admin_id = auth.uid() AND 
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON public.admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);