-- Allow users to check payment status of users they referred
-- This is needed for the referral reward tracking
CREATE POLICY "Users can view payments of users they referred"
ON payment_attributions FOR SELECT
USING (
  user_id IN (
    SELECT ua.user_id 
    FROM user_attributions ua
    JOIN profiles p ON p.referral_code = ua.referral_source
    WHERE p.user_id = auth.uid()
  )
);