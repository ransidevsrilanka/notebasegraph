-- Add page_count column to notes table for print request pricing
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.notes.page_count IS 'Number of pages in the document, used for print request pricing';