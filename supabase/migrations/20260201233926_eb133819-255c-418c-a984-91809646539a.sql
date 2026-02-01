-- 1. Create trigger for access code payment attributions (runs when access code is marked as 'used')
DROP TRIGGER IF EXISTS trigger_access_code_payment_attribution ON access_codes;
CREATE TRIGGER trigger_access_code_payment_attribution
  AFTER UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION create_access_code_payment_attribution();

-- 2. Create/update trigger for creator stats updates when payment_attributions are inserted
CREATE OR REPLACE FUNCTION update_creator_stats_on_attribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if creator_id is set
  IF NEW.creator_id IS NOT NULL THEN
    -- Update lifetime_paid_users (always increment by 1)
    -- Monthly stats are already handled by existing trigger but this is a backup
    UPDATE creator_profiles
    SET 
      lifetime_paid_users = COALESCE(lifetime_paid_users, 0) + 1,
      monthly_paid_users = CASE 
        WHEN to_char(NEW.created_at, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
        THEN COALESCE(monthly_paid_users, 0) + 1
        ELSE monthly_paid_users
      END,
      available_balance = COALESCE(available_balance, 0) + COALESCE(NEW.creator_commission_amount, 0)
    WHERE id = NEW.creator_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if any and create new one
DROP TRIGGER IF EXISTS trigger_update_creator_stats ON payment_attributions;
CREATE TRIGGER trigger_update_creator_stats
  AFTER INSERT ON payment_attributions
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_stats_on_attribution();

-- 3. Create trigger to notify creator when they get a commission
CREATE OR REPLACE FUNCTION notify_creator_on_referral_payment()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  tier_name TEXT;
BEGIN
  -- Only process if creator_id and commission are set
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
      
      -- Insert notification message to creator inbox
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
        TO_CHAR(NEW.creator_commission_amount, 'FM999,999,999.00') || ' in commission!',
        'success',
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the notification trigger
DROP TRIGGER IF EXISTS trigger_notify_creator_commission ON payment_attributions;
CREATE TRIGGER trigger_notify_creator_commission
  AFTER INSERT ON payment_attributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_on_referral_payment();