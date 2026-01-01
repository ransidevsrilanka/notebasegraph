-- Add payment_order_id column to enrollments for tracking paid signups
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS payment_order_id text;

-- Populate stream_subjects table with Sri Lankan A/L subjects

-- MATHS STREAM
INSERT INTO public.stream_subjects (stream, subject_code, subject_name, basket, is_mandatory, sort_order) VALUES
('maths', 'MATH-C', 'Combined Mathematics', 'mandatory', true, 1),
('maths', 'PHYS', 'Physics', 'core', false, 2),
('maths', 'CHEM', 'Chemistry', 'core', false, 3),
('maths', 'ICT', 'Information & Communication Technology', 'optional', false, 4),
('maths', 'ECON', 'Economics', 'optional', false, 5),
('maths', 'SFT', 'Science for Technology', 'optional', false, 6),
('maths', 'ENG-GEN', 'General English', 'language', false, 7),
('maths', 'SIN-LIT', 'Sinhala Literature', 'language', false, 8),
('maths', 'BUD-CIV', 'Buddhist Civilization', 'religion', false, 9)
ON CONFLICT (id) DO NOTHING;

-- BIO STREAM
INSERT INTO public.stream_subjects (stream, subject_code, subject_name, basket, is_mandatory, sort_order) VALUES
('bio', 'BIO', 'Biology', 'mandatory', true, 1),
('bio', 'CHEM-B', 'Chemistry', 'core', false, 2),
('bio', 'PHYS-B', 'Physics', 'core', false, 3),
('bio', 'AGR', 'Agricultural Science', 'optional', false, 4),
('bio', 'ICT-B', 'Information & Communication Technology', 'optional', false, 5),
('bio', 'ENG-GEN-B', 'General English', 'language', false, 6),
('bio', 'SIN-LIT-B', 'Sinhala Literature', 'language', false, 7),
('bio', 'BUD-CIV-B', 'Buddhist Civilization', 'religion', false, 8)
ON CONFLICT (id) DO NOTHING;

-- COMMERCE STREAM
INSERT INTO public.stream_subjects (stream, subject_code, subject_name, basket, is_mandatory, sort_order) VALUES
('commerce', 'ACC', 'Accounting', 'mandatory', true, 1),
('commerce', 'ECON-C', 'Economics', 'core', false, 2),
('commerce', 'BS', 'Business Studies', 'core', false, 3),
('commerce', 'ICT-C', 'Information & Communication Technology', 'optional', false, 4),
('commerce', 'POL', 'Political Science', 'optional', false, 5),
('commerce', 'LOG', 'Logic', 'optional', false, 6),
('commerce', 'ENG-GEN-C', 'General English', 'language', false, 7),
('commerce', 'SIN-LIT-C', 'Sinhala Literature', 'language', false, 8),
('commerce', 'BUD-CIV-C', 'Buddhist Civilization', 'religion', false, 9)
ON CONFLICT (id) DO NOTHING;

-- ARTS STREAM
INSERT INTO public.stream_subjects (stream, subject_code, subject_name, basket, is_mandatory, sort_order) VALUES
('arts', 'SIN', 'Sinhala', 'core', false, 1),
('arts', 'HIST', 'History', 'core', false, 2),
('arts', 'GEO', 'Geography', 'core', false, 3),
('arts', 'POL-A', 'Political Science', 'optional', false, 4),
('arts', 'LOG-A', 'Logic', 'optional', false, 5),
('arts', 'ECON-A', 'Economics', 'optional', false, 6),
('arts', 'ENG-LIT', 'English Literature', 'language', false, 7),
('arts', 'TAM', 'Tamil', 'language', false, 8),
('arts', 'BUD', 'Buddhism', 'religion', false, 9),
('arts', 'HIN', 'Hinduism', 'religion', false, 10),
('arts', 'ARAB', 'Arabic', 'language', false, 11),
('arts', 'DANCE', 'Dancing', 'aesthetic', false, 12),
('arts', 'MUSIC', 'Music', 'aesthetic', false, 13),
('arts', 'ART', 'Art', 'aesthetic', false, 14)
ON CONFLICT (id) DO NOTHING;

-- TECH STREAM (Technology)
INSERT INTO public.stream_subjects (stream, subject_code, subject_name, basket, is_mandatory, sort_order) VALUES
('tech', 'ET', 'Engineering Technology', 'mandatory', true, 1),
('tech', 'SFT-T', 'Science for Technology', 'core', false, 2),
('tech', 'ICT-T', 'Information & Communication Technology', 'core', false, 3),
('tech', 'BST', 'Bio-Systems Technology', 'optional', false, 4),
('tech', 'ENG-GEN-T', 'General English', 'language', false, 5),
('tech', 'SIN-LIT-T', 'Sinhala Literature', 'language', false, 6),
('tech', 'BUD-CIV-T', 'Buddhist Civilization', 'religion', false, 7)
ON CONFLICT (id) DO NOTHING;