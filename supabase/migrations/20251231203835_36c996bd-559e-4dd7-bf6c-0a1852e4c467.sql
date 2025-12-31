-- Allow anyone to look up CMO profiles by referral_code for creator signup validation
CREATE POLICY "Anyone can validate CMO referral codes"
ON public.cmo_profiles
FOR SELECT
USING (is_active = true);