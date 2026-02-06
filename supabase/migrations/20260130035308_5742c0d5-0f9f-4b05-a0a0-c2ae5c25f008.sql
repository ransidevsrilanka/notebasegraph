-- Add grade levels mode setting (al_only or both)
INSERT INTO site_settings (key, value)
VALUES ('grade_levels_enabled', '"al_only"')
ON CONFLICT (key) DO NOTHING;