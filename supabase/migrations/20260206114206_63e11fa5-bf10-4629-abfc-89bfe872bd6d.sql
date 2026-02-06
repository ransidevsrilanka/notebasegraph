-- Add columns for storing paper selection details for audit and display
ALTER TABLE print_requests 
ADD COLUMN IF NOT EXISTS selected_paper_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_paper_titles TEXT[] DEFAULT '{}';