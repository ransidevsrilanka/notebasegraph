-- Phase 1: Fix Referral System RLS and add security function
-- Create a SECURITY DEFINER function to safely count referral stats
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS TABLE (signups bigint, paid_referrals bigint, referral_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_referral_code TEXT;
BEGIN
  -- Get the user's referral code
  SELECT p.referral_code INTO user_referral_code
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  IF user_referral_code IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, ''::text;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT ua.user_id) FROM user_attributions ua WHERE ua.referral_source = user_referral_code)::bigint as signups,
    (SELECT COUNT(DISTINCT pa.user_id) 
     FROM payment_attributions pa
     WHERE pa.user_id IN (
       SELECT ua2.user_id FROM user_attributions ua2 WHERE ua2.referral_source = user_referral_code
     ))::bigint as paid_referrals,
    user_referral_code;
END;
$$;

-- Phase 2: Add medium change limit tracking
ALTER TABLE user_subjects ADD COLUMN IF NOT EXISTS medium_change_count INTEGER DEFAULT 0;
ALTER TABLE user_subjects ADD COLUMN IF NOT EXISTS max_medium_changes INTEGER DEFAULT 3;

-- Phase 3: Ensure messages table supports student recipients and add inbox notification types
-- Add recipient_user_id for direct user messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_user_id') THEN
    ALTER TABLE messages ADD COLUMN recipient_user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'notification_type') THEN
    ALTER TABLE messages ADD COLUMN notification_type TEXT; -- 'upgrade_approved', 'upgrade_rejected', 'medium_approved', 'medium_rejected', 'system', 'admin'
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'filter_grade') THEN
    ALTER TABLE messages ADD COLUMN filter_grade TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'filter_stream') THEN
    ALTER TABLE messages ADD COLUMN filter_stream TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'filter_medium') THEN
    ALTER TABLE messages ADD COLUMN filter_medium TEXT;
  END IF;
END$$;

-- Add RLS policy for users to read their own messages (inbox)
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages" ON messages
FOR SELECT USING (
  recipient_user_id = auth.uid()
  OR (recipient_type = 'student' AND EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.user_id = auth.uid() 
    AND e.is_active = true
    AND (filter_grade IS NULL OR e.grade = filter_grade)
    AND (filter_stream IS NULL OR e.stream = filter_stream)
    AND (filter_medium IS NULL OR e.medium = filter_medium)
  ))
);

-- Add RLS policy for admins to insert messages
DROP POLICY IF EXISTS "Admins can insert messages" ON messages;
CREATE POLICY "Admins can insert messages" ON messages
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Enable RLS on messages if not already
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add index for faster inbox queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_user_id ON messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_notification_type ON messages(notification_type);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_type ON messages(recipient_type);