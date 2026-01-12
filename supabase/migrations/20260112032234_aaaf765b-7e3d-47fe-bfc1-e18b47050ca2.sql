-- Fix A/L subject stream classifications
-- This migration:
-- 1. Updates incorrect stream assignments for A/L subjects
-- 2. Removes invalid 'bio_maths' stream from streams arrays
-- 3. Fixes subjects that have 'ol' in streams but are A/L subjects

-- First, let's fix Chemistry - should be in both maths and biology streams
UPDATE subjects
SET stream = 'maths', streams = '["maths", "biology"]'::jsonb
WHERE name = 'Chemistry' AND grade LIKE 'al%';

-- Fix Physics - should be in both maths and biology streams  
UPDATE subjects
SET stream = 'maths', streams = '["maths", "biology"]'::jsonb
WHERE name = 'Physics' AND grade LIKE 'al%';

-- Fix ICT - should be available in maths, biology, commerce, arts, technology
UPDATE subjects
SET stream = 'maths', streams = '["maths", "biology", "commerce", "arts", "technology"]'::jsonb
WHERE name = 'ICT' AND grade LIKE 'al%';

-- Fix CM (Combined Mathematics) - only maths stream
UPDATE subjects
SET stream = 'maths', streams = '["maths"]'::jsonb
WHERE name IN ('CM', 'Combined Mathematics') AND grade LIKE 'al%';

-- Fix Biology - only biology stream
UPDATE subjects
SET stream = 'biology', streams = '["biology"]'::jsonb
WHERE name = 'Biology' AND grade LIKE 'al%';

-- Fix Agricultural Science - biology and maths
UPDATE subjects
SET stream = 'biology', streams = '["biology", "maths"]'::jsonb
WHERE name = 'Agricultural Science' AND grade LIKE 'al%';

-- Commerce stream subjects
UPDATE subjects
SET stream = 'commerce', streams = '["commerce"]'::jsonb
WHERE name IN ('Accounting', 'Business Studies', 'Business Statistics') AND grade LIKE 'al%';

-- Technology stream subjects
UPDATE subjects
SET stream = 'technology', streams = '["technology"]'::jsonb
WHERE name IN ('Engineering Technology', 'Science for Technology', 'Bio Systems Technology') AND grade LIKE 'al%';

-- Arts stream subjects - fix any that have 'ol' incorrectly in streams
UPDATE subjects
SET stream = 'arts', streams = '["arts"]'::jsonb
WHERE name IN (
  'Arabic', 'Buddhism', 'Buddhist Civilization', 'Chinese', 'Christian Civilization', 'Christianity',
  'English', 'European History', 'French', 'Geography', 'German', 'Greek & Roman Civilization',
  'Hindi', 'Hindu Civilization', 'Hinduism', 'History', 'Indian History', 'Islam', 'Islamic Civilization',
  'Japanese', 'Logic & Scientific Method', 'Mass Media & Communication', 'Modern World History',
  'Pali', 'Political Science', 'Russian', 'Sanskrit', 'Sinhala', 'Sri Lankan History', 'Tamil'
) AND grade LIKE 'al%';

-- Arts subjects that can be in arts AND ol (but for AL, just arts)
UPDATE subjects
SET stream = 'arts', streams = '["arts"]'::jsonb
WHERE name IN ('Art', 'Home Economics', 'Music (Eastern)', 'Music (Western)', 'Dancing (Eastern)', 'Dancing (Western)', 'Drama & Theatre')
AND grade LIKE 'al%';

-- Economics is in both arts and commerce
UPDATE subjects
SET stream = 'commerce', streams = '["commerce", "arts"]'::jsonb
WHERE name = 'Economics' AND grade LIKE 'al%';

-- Remove any subjects that are clearly O/L subjects but ended up with A/L grades
DELETE FROM subjects
WHERE grade LIKE 'al%' 
AND stream = 'ol' 
AND name IN (
  'Agriculture & Food Technology', 'Aquatic Bio Resources Technology', 'Business & Accounting Studies',
  'Commerce', 'Design & Construction Technology', 'Design & Mechanical Technology', 
  'Electrical, Electronic & IT Technology', 'Electronic Technology', 'Food & Hospitality',
  'Health & Physical Education', 'Literature (English)', 'Literature (Sinhala)', 'Literature (Tamil)',
  'Second Language (Sinhala)', 'Second Language (Tamil)', 'Tourism'
);