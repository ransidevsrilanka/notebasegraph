
-- ============================================================
-- Populate subjects table from stream_subjects for ALL streams
-- This creates content entries for every possible A/L subject
-- For both Grade 12 and Grade 13, English and Sinhala mediums
-- ============================================================

-- Create a function to bulk insert subjects
DO $$
DECLARE
  ss RECORD;
  grades TEXT[] := ARRAY['al_grade12', 'al_grade13'];
  mediums TEXT[] := ARRAY['english', 'sinhala'];
  g TEXT;
  m TEXT;
  stream_array JSONB;
BEGIN
  -- Loop through all stream_subjects
  FOR ss IN SELECT DISTINCT subject_code, subject_name, stream FROM stream_subjects LOOP
    -- Determine which streams this subject belongs to
    SELECT jsonb_agg(DISTINCT stream) INTO stream_array
    FROM stream_subjects
    WHERE subject_code = ss.subject_code;
    
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
          ss.stream,
          stream_array,
          true,
          CASE 
            WHEN ss.subject_code = 'CM' THEN 1
            WHEN ss.subject_code = 'PHYS' THEN 2
            WHEN ss.subject_code = 'CHEM' THEN 3
            WHEN ss.subject_code = 'BIO' THEN 4
            WHEN ss.subject_code = 'ICT' THEN 5
            WHEN ss.subject_code = 'ACC' THEN 6
            WHEN ss.subject_code = 'BS' THEN 7
            WHEN ss.subject_code = 'ECON' THEN 8
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

-- Update any subjects that have NULL subject_code but matching names
UPDATE subjects s
SET subject_code = ss.subject_code,
    streams = (SELECT jsonb_agg(DISTINCT stream) FROM stream_subjects WHERE subject_code = ss.subject_code)
FROM stream_subjects ss
WHERE s.name = ss.subject_name
  AND s.subject_code IS NULL;

-- Ensure all subjects have their streams array populated correctly
UPDATE subjects s
SET streams = (
  SELECT jsonb_agg(DISTINCT stream) 
  FROM stream_subjects 
  WHERE subject_code = s.subject_code
)
WHERE s.subject_code IS NOT NULL
  AND (s.streams IS NULL OR s.streams = '[]'::jsonb);
