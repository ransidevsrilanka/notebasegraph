
-- ============================================================
-- Populate O/L subjects from stream_subjects
-- O/L grades: ol_grade10, ol_grade11
-- Mediums: english, sinhala, tamil
-- ============================================================

DO $$
DECLARE
  ss RECORD;
  grades TEXT[] := ARRAY['ol_grade10', 'ol_grade11'];
  mediums TEXT[] := ARRAY['english', 'sinhala', 'tamil'];
  g TEXT;
  m TEXT;
BEGIN
  -- Loop through all O/L stream_subjects
  FOR ss IN 
    SELECT DISTINCT subject_code, subject_name 
    FROM stream_subjects 
    WHERE stream = 'ol'
  LOOP
    -- For each grade and medium combination
    FOREACH g IN ARRAY grades LOOP
      FOREACH m IN ARRAY mediums LOOP
        -- Insert if not exists
        INSERT INTO subjects (name, subject_code, grade, medium, stream, streams, is_active, sort_order)
        SELECT 
          ss.subject_name,
          ss.subject_code,
          g,
          m,
          NULL, -- O/L has no stream
          '["ol"]'::jsonb,
          true,
          CASE 
            WHEN ss.subject_code = 'ICT' THEN 1
            WHEN ss.subject_code = 'BAS' THEN 2
            WHEN ss.subject_code = 'COM' THEN 3
            WHEN ss.subject_code = 'ART' THEN 4
            ELSE 10
          END
        WHERE NOT EXISTS (
          SELECT 1 FROM subjects 
          WHERE subject_code = ss.subject_code 
            AND grade = g 
            AND medium = m
            AND is_active = true
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Also add the core/compulsory O/L subjects that may not be in stream_subjects
-- These are the main subjects every O/L student takes
INSERT INTO subjects (name, subject_code, grade, medium, stream, streams, is_active, sort_order)
SELECT name, code, grade, medium, NULL, '["ol"]'::jsonb, true, sort_order
FROM (
  VALUES 
    ('Mathematics', 'MATH', 1),
    ('Science', 'SCI', 2),
    ('English', 'ENG', 3),
    ('Sinhala', 'SIN', 4),
    ('Tamil', 'TAM', 5),
    ('History', 'HIST', 6),
    ('Religion', 'REL', 7),
    ('Citizenship Education', 'CIT', 8),
    ('Geography', 'GEO', 9)
) AS core_subjects(name, code, sort_order)
CROSS JOIN (VALUES ('ol_grade10'), ('ol_grade11')) AS grades(grade)
CROSS JOIN (VALUES ('english'), ('sinhala'), ('tamil')) AS mediums(medium)
WHERE NOT EXISTS (
  SELECT 1 FROM subjects s 
  WHERE s.subject_code = core_subjects.code 
    AND s.grade = grades.grade 
    AND s.medium = mediums.medium
    AND s.is_active = true
);

-- Clean up test entries
UPDATE subjects SET is_active = false WHERE name = 'TEST';
