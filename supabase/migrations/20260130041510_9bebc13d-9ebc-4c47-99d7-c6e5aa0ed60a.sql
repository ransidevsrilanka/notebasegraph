-- Add storage provider columns to notes table for future multi-provider support
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS external_file_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN notes.storage_provider IS 'Storage provider: supabase, google_drive, mega, dropbox';
COMMENT ON COLUMN notes.external_file_id IS 'External file ID for non-Supabase storage providers';