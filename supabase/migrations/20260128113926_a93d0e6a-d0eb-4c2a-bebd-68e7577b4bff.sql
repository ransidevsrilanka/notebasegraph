-- Add print cost per page field to print_settings for profit calculation
ALTER TABLE print_settings
ADD COLUMN IF NOT EXISTS print_cost_per_page NUMERIC DEFAULT 4;

COMMENT ON COLUMN print_settings.print_cost_per_page IS 'Actual cost to print one page (for profit calculation)';