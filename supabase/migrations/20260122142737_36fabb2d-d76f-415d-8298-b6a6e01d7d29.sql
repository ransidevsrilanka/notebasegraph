-- ============================================
-- DOUBLE-OPERATION PREVENTION: Add unique constraint for pending withdrawals
-- ============================================

-- Add unique index to prevent multiple pending withdrawal requests per creator
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_withdrawal_per_creator 
ON withdrawal_requests (creator_id) 
WHERE status = 'pending';

-- Add reviewed_by column if it doesn't exist (for tracking who approved)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'withdrawal_requests' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add reviewed_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'withdrawal_requests' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add paid_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'withdrawal_requests' 
    AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add idempotency_key column for preventing duplicate operations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'withdrawal_requests' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_idempotency_key ON withdrawal_requests (idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;