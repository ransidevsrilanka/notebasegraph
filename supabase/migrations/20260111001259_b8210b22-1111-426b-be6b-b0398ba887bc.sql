-- Phase 1: Fix subjects table to use subject_code for linking with stream_subjects

-- First, update subjects table to have correct subject_code values
-- This links subjects (content) to stream_subjects (curriculum) via subject_code

-- Update subjects with matching names to stream_subjects
UPDATE public.subjects s
SET subject_code = ss.subject_code
FROM public.stream_subjects ss
WHERE LOWER(s.name) = LOWER(ss.subject_name)
   OR s.name = ss.subject_code
   OR (s.name = 'CM' AND ss.subject_code = 'CM')
   OR (s.name = 'Combined Mathematics' AND ss.subject_code = 'CM')
   OR (s.name ILIKE '%physics%' AND ss.subject_code = 'PHYS')
   OR (s.name ILIKE '%chemistry%' AND ss.subject_code = 'CHEM')
   OR (s.name ILIKE '%biology%' AND ss.subject_code = 'BIO')
   OR (s.name ILIKE '%ict%' AND ss.subject_code = 'ICT')
   OR (s.name ILIKE '%agricultural%' AND ss.subject_code = 'AGRI');

-- For subjects named as codes (like 'CM'), update directly
UPDATE public.subjects SET subject_code = 'CM' WHERE name = 'CM';
UPDATE public.subjects SET subject_code = 'PHYS' WHERE name ILIKE '%physics%' AND subject_code IS NULL;
UPDATE public.subjects SET subject_code = 'CHEM' WHERE name ILIKE '%chemistry%' AND subject_code IS NULL;
UPDATE public.subjects SET subject_code = 'BIO' WHERE name ILIKE '%biology%' AND subject_code IS NULL;
UPDATE public.subjects SET subject_code = 'ICT' WHERE name ILIKE '%ict%' AND subject_code IS NULL;

-- Add subject_code columns to user_subjects for storing codes
ALTER TABLE public.user_subjects 
ADD COLUMN IF NOT EXISTS subject_1_code TEXT,
ADD COLUMN IF NOT EXISTS subject_2_code TEXT,
ADD COLUMN IF NOT EXISTS subject_3_code TEXT;

-- Backfill subject codes from stream_subjects based on subject names
UPDATE public.user_subjects us
SET 
  subject_1_code = (SELECT subject_code FROM public.stream_subjects ss WHERE ss.subject_name = us.subject_1 LIMIT 1),
  subject_2_code = (SELECT subject_code FROM public.stream_subjects ss WHERE ss.subject_name = us.subject_2 LIMIT 1),
  subject_3_code = (SELECT subject_code FROM public.stream_subjects ss WHERE ss.subject_name = us.subject_3 LIMIT 1)
WHERE subject_1_code IS NULL OR subject_2_code IS NULL OR subject_3_code IS NULL;

-- Ensure default commission tier for new creators is Tier 2 (12%)
-- Update commission_tiers if needed to ensure tier 2 is 12%
UPDATE public.commission_tiers SET commission_rate = 12 WHERE tier_level = 2 AND commission_rate != 12;

-- Make sure Tier 1 is 8%
UPDATE public.commission_tiers SET commission_rate = 8 WHERE tier_level = 1 AND commission_rate != 8;