
-- Deactivate duplicate entries for Combined Mathematics (keep only 'CM' row)
UPDATE subjects 
SET is_active = false 
WHERE name = 'Combined Mathematics' 
  AND grade = 'al_grade13'
  AND id != '507d8d32-6d63-4969-87e3-bd4f8f8ed2c0';
