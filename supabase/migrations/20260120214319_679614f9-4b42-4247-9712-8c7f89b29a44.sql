-- Allow users to see who they referred (where their referral code was used)
CREATE POLICY "Users can view attributions for people they referred"
ON user_attributions FOR SELECT
USING (
  referral_source IN (
    SELECT referral_code 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);