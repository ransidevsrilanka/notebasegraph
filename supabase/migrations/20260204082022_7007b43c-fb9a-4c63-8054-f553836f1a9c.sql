-- Add Telegram Chat ID field for creators
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN creator_profiles.telegram_chat_id IS 'Telegram chat ID for receiving creator notifications via dedicated bot';