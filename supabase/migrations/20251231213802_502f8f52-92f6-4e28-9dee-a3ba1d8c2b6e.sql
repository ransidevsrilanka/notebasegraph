-- =============================================
-- FIX RLS POLICIES FOR PUBLIC ACCESS
-- =============================================

-- Allow anyone to read CMO profiles (needed for creator signup validation)
DROP POLICY IF EXISTS "Anyone can read cmo profiles" ON public.cmo_profiles;
CREATE POLICY "Anyone can read cmo profiles"
  ON public.cmo_profiles FOR SELECT
  USING (true);

-- Allow anyone to read creator profiles (needed for referral link validation)
DROP POLICY IF EXISTS "Anyone can read creator profiles" ON public.creator_profiles;
CREATE POLICY "Anyone can read creator profiles"
  ON public.creator_profiles FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own creator profile
DROP POLICY IF EXISTS "Users can insert own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can insert own creator profile"
  ON public.creator_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own roles (needed for signup flows)
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow anyone to read all discount codes (for validation at checkout)
DROP POLICY IF EXISTS "Anyone can read active discount codes" ON public.discount_codes;
CREATE POLICY "Anyone can read discount codes"
  ON public.discount_codes FOR SELECT
  USING (true);

-- Allow authenticated users to insert discount codes (for creators)
DROP POLICY IF EXISTS "Authenticated can insert discount codes" ON public.discount_codes;
CREATE POLICY "Authenticated can insert discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own discount codes
DROP POLICY IF EXISTS "Creators can update own discount codes" ON public.discount_codes;
CREATE POLICY "Creators can update own discount codes"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (creator_id IN (
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
  ));

-- Allow public insert to payment_attributions (needed for tracking)
DROP POLICY IF EXISTS "Users can insert own payment attribution" ON public.payment_attributions;
CREATE POLICY "Anyone can insert payment attribution"
  ON public.payment_attributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow public insert to user_attributions
DROP POLICY IF EXISTS "Users can insert own attribution" ON public.user_attributions;
CREATE POLICY "Anyone can insert user attribution"
  ON public.user_attributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);