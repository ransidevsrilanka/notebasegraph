-- Add CMO contact fields for creator support
ALTER TABLE cmo_profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Create notification trigger for creator commissions
CREATE OR REPLACE FUNCTION notify_creator_on_commission()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  tier_name TEXT;
  commission_amount NUMERIC;
BEGIN
  -- Only process if there's a creator_id and commission
  IF NEW.creator_id IS NOT NULL AND NEW.creator_commission_amount > 0 THEN
    -- Get creator's user_id
    SELECT user_id INTO creator_user_id
    FROM creator_profiles
    WHERE id = NEW.creator_id;
    
    IF creator_user_id IS NOT NULL THEN
      -- Get tier name
      tier_name := CASE NEW.tier
        WHEN 'starter' THEN 'Silver'
        WHEN 'standard' THEN 'Gold'
        WHEN 'lifetime' THEN 'Platinum'
        ELSE NEW.tier
      END;
      
      commission_amount := NEW.creator_commission_amount;
      
      -- Insert notification message to creator
      INSERT INTO messages (
        recipient_id,
        recipient_type,
        recipient_user_id,
        sender_id,
        subject,
        body,
        notification_type,
        is_read,
        created_at
      )
      VALUES (
        NEW.creator_id,
        'creator',
        creator_user_id,
        NULL,
        '💰 New Commission Earned!',
        'A user just purchased ' || tier_name || ' Access. You earned LKR ' || 
        TO_CHAR(commission_amount, 'FM999,999,999.00') || ' in commission!',
        'success',
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS trigger_notify_creator_commission ON payment_attributions;
CREATE TRIGGER trigger_notify_creator_commission
  AFTER INSERT ON payment_attributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_on_commission();