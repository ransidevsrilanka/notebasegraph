
-- ============================================================
-- PHASE 1: Fix subjects table - add missing subjects for maths stream
-- ============================================================

-- Ensure subject_code is set correctly for existing subjects
UPDATE subjects 
SET subject_code = 'CM' 
WHERE name IN ('CM', 'Combined Mathematics') AND subject_code IS NULL;

UPDATE subjects 
SET subject_code = 'PHYS' 
WHERE name ILIKE '%physics%' AND subject_code IS NULL;

UPDATE subjects 
SET subject_code = 'CHEM' 
WHERE name ILIKE '%chemistry%' AND subject_code IS NULL;

UPDATE subjects 
SET subject_code = 'ICT' 
WHERE name ILIKE '%ict%' AND subject_code IS NULL;

UPDATE subjects 
SET subject_code = 'BIO' 
WHERE name ILIKE '%biology%' AND subject_code IS NULL;

UPDATE subjects 
SET subject_code = 'AGRI' 
WHERE (name ILIKE '%agricultural%' OR name ILIKE '%agri%') AND subject_code IS NULL;

-- Deactivate duplicate 'Combined Mathematics' without code (keep only 'CM')
UPDATE subjects 
SET is_active = false 
WHERE name = 'Combined Mathematics' 
  AND (subject_code IS NULL OR subject_code != 'CM')
  AND grade = 'al_grade13';

-- Insert missing subjects for maths stream (Physics, ICT) if they don't exist
INSERT INTO subjects (name, subject_code, grade, medium, stream, streams, is_active, sort_order)
SELECT 'Physics', 'PHYS', 'al_grade13', 'english', 'maths', '["maths", "bio_maths"]'::jsonb, true, 2
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE subject_code = 'PHYS' 
    AND grade = 'al_grade13' 
    AND medium = 'english'
    AND is_active = true
);

INSERT INTO subjects (name, subject_code, grade, medium, stream, streams, is_active, sort_order)
SELECT 'ICT', 'ICT', 'al_grade13', 'english', 'maths', '["maths", "bio_maths", "commerce", "arts"]'::jsonb, true, 3
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE subject_code = 'ICT' 
    AND grade = 'al_grade13' 
    AND medium = 'english'
    AND is_active = true
);

INSERT INTO subjects (name, subject_code, grade, medium, stream, streams, is_active, sort_order)
SELECT 'Chemistry', 'CHEM', 'al_grade13', 'english', 'maths', '["maths", "bio_maths"]'::jsonb, true, 4
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE subject_code = 'CHEM' 
    AND grade = 'al_grade13' 
    AND medium = 'english'
    AND is_active = true
);

-- ============================================================
-- PHASE 2: Backfill user_subjects codes from stream_subjects
-- ============================================================

-- Backfill subject_1_code
UPDATE user_subjects us
SET subject_1_code = ss.subject_code
FROM stream_subjects ss
WHERE ss.subject_name = us.subject_1
  AND us.subject_1_code IS NULL
  AND us.subject_1 IS NOT NULL;

-- Backfill subject_2_code  
UPDATE user_subjects us
SET subject_2_code = ss.subject_code
FROM stream_subjects ss
WHERE ss.subject_name = us.subject_2
  AND us.subject_2_code IS NULL
  AND us.subject_2 IS NOT NULL;

-- Backfill subject_3_code
UPDATE user_subjects us
SET subject_3_code = ss.subject_code
FROM stream_subjects ss
WHERE ss.subject_name = us.subject_3
  AND us.subject_3_code IS NULL
  AND us.subject_3 IS NOT NULL;

-- ============================================================
-- PHASE 3: Create trigger to auto-fill subject codes on insert/update
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_fill_subject_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-fill subject_1_code if subject_1 is set but code is NULL
  IF NEW.subject_1 IS NOT NULL AND NEW.subject_1_code IS NULL THEN
    SELECT subject_code INTO NEW.subject_1_code
    FROM stream_subjects
    WHERE subject_name = NEW.subject_1
    LIMIT 1;
  END IF;

  -- Auto-fill subject_2_code if subject_2 is set but code is NULL
  IF NEW.subject_2 IS NOT NULL AND NEW.subject_2_code IS NULL THEN
    SELECT subject_code INTO NEW.subject_2_code
    FROM stream_subjects
    WHERE subject_name = NEW.subject_2
    LIMIT 1;
  END IF;

  -- Auto-fill subject_3_code if subject_3 is set but code is NULL
  IF NEW.subject_3 IS NOT NULL AND NEW.subject_3_code IS NULL THEN
    SELECT subject_code INTO NEW.subject_3_code
    FROM stream_subjects
    WHERE subject_name = NEW.subject_3
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS auto_fill_subject_codes_trigger ON user_subjects;
CREATE TRIGGER auto_fill_subject_codes_trigger
BEFORE INSERT OR UPDATE ON user_subjects
FOR EACH ROW
EXECUTE FUNCTION public.auto_fill_subject_codes();

-- ============================================================
-- PHASE 4: Add Admin SELECT policy for user_subjects
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all user_subjects" ON user_subjects;
CREATE POLICY "Admins can view all user_subjects"
ON user_subjects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'support_admin')
  )
);

-- Also add admin UPDATE policy for unlock flows
DROP POLICY IF EXISTS "Admins can update user_subjects" ON user_subjects;
CREATE POLICY "Admins can update user_subjects"
ON user_subjects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);
