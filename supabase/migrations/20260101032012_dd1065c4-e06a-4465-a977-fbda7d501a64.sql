-- First clear existing stream_subjects if any
DELETE FROM public.stream_subjects;

-- ============================================
-- A/L MATHS (Physical Science) STREAM
-- ============================================
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('maths', 'Combined Mathematics', 'CM', true, 'mandatory', 1),
('maths', 'Physics', 'PHY', true, 'mandatory', 2),
('maths', 'Chemistry', 'CHEM', false, 'optional', 3),
('maths', 'ICT', 'ICT', false, 'optional', 4),
('maths', 'Agricultural Science', 'AGS', false, 'restricted', 5);

-- ============================================
-- A/L BIOLOGY (Biological Science) STREAM
-- ============================================
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('biology', 'Biology', 'BIO', true, 'mandatory', 1),
('biology', 'Chemistry', 'CHEM', true, 'mandatory', 2),
('biology', 'Physics', 'PHY', false, 'optional', 3),
('biology', 'Agricultural Science', 'AGS', false, 'optional', 4),
('biology', 'ICT', 'ICT', false, 'restricted', 5);

-- ============================================
-- A/L COMMERCE STREAM
-- ============================================
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('commerce', 'Accounting', 'ACC', false, 'core', 1),
('commerce', 'Business Studies', 'BS', false, 'core', 2),
('commerce', 'Economics', 'ECON', false, 'optional', 3),
('commerce', 'Business Statistics', 'BSTAT', false, 'optional', 4),
('commerce', 'ICT', 'ICT', false, 'optional', 5);

-- ============================================
-- A/L TECHNOLOGY STREAM
-- ============================================
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('technology', 'Engineering Technology', 'ET', false, 'core', 1),
('technology', 'Science for Technology', 'SFT', false, 'core', 2),
('technology', 'Bio Systems Technology', 'BST', false, 'core', 3),
('technology', 'ICT', 'ICT', false, 'optional', 4);

-- ============================================
-- A/L ARTS STREAM - Basket 1 (Core Academic)
-- ============================================
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Economics', 'ECON', false, 'core', 1),
('arts', 'Geography', 'GEO', false, 'core', 2),
('arts', 'Political Science', 'POLS', false, 'core', 3),
('arts', 'Logic & Scientific Method', 'LOGIC', false, 'core', 4),
('arts', 'Mass Media & Communication Studies', 'MEDIA', false, 'core', 5),
('arts', 'Home Economics', 'HE', false, 'core', 6),
('arts', 'Sri Lankan History', 'HIST_SL', false, 'core', 7),
('arts', 'Indian History', 'HIST_IN', false, 'core', 8),
('arts', 'European History', 'HIST_EU', false, 'core', 9),
('arts', 'Modern World History', 'HIST_MW', false, 'core', 10);

-- A/L ARTS STREAM - Basket 2 (Religion/Civilization)
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Buddhism', 'BUD', false, 'religion', 11),
('arts', 'Buddhist Civilization', 'BUDCIV', false, 'religion', 12),
('arts', 'Hinduism', 'HIN', false, 'religion', 13),
('arts', 'Hindu Civilization', 'HINCIV', false, 'religion', 14),
('arts', 'Islam', 'ISL', false, 'religion', 15),
('arts', 'Islamic Civilization', 'ISLCIV', false, 'religion', 16),
('arts', 'Christianity', 'CHR', false, 'religion', 17),
('arts', 'Christian Civilization', 'CHRCIV', false, 'religion', 18),
('arts', 'Greek & Roman Civilization', 'GRCIV', false, 'religion', 19);

-- A/L ARTS STREAM - Basket 3 (Languages)
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Sinhala', 'SIN', false, 'language', 20),
('arts', 'Tamil', 'TAM', false, 'language', 21),
('arts', 'English', 'ENG', false, 'language', 22),
('arts', 'Pali', 'PALI', false, 'language', 23),
('arts', 'Sanskrit', 'SANS', false, 'language', 24),
('arts', 'Arabic', 'ARAB', false, 'language', 25),
('arts', 'Hindi', 'HINDI', false, 'language', 26),
('arts', 'Japanese', 'JAP', false, 'language', 27),
('arts', 'Chinese', 'CHI', false, 'language', 28),
('arts', 'French', 'FRE', false, 'language', 29),
('arts', 'German', 'GER', false, 'language', 30),
('arts', 'Russian', 'RUS', false, 'language', 31);

-- A/L ARTS STREAM - Basket 4 (Aesthetic)
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Art', 'ART', false, 'aesthetic', 32),
('arts', 'Music (Eastern)', 'MUS_E', false, 'aesthetic', 33),
('arts', 'Music (Western)', 'MUS_W', false, 'aesthetic', 34),
('arts', 'Dancing (Eastern)', 'DAN_E', false, 'aesthetic', 35),
('arts', 'Dancing (Western)', 'DAN_W', false, 'aesthetic', 36),
('arts', 'Drama & Theatre', 'DRAMA', false, 'aesthetic', 37);

-- ============================================
-- O/L SUBJECTS (for 'ol' grade)
-- Stored in a different table or use 'ol' as stream
-- Let's add them as a pseudo-stream for now
-- ============================================

-- O/L Mandatory Subjects (fixed)
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'First Language (Sinhala)', 'FL_SIN', true, 'mandatory', 1),
('ol', 'First Language (Tamil)', 'FL_TAM', true, 'mandatory', 2),
('ol', 'English', 'ENG', true, 'mandatory', 3),
('ol', 'Mathematics', 'MATH', true, 'mandatory', 4),
('ol', 'Science', 'SCI', true, 'mandatory', 5),
('ol', 'History', 'HIST', true, 'mandatory', 6),
('ol', 'Buddhism', 'BUD', true, 'religion', 7),
('ol', 'Saivaneri (Hinduism)', 'SAIV', true, 'religion', 8),
('ol', 'Catholicism', 'CATH', true, 'religion', 9),
('ol', 'Christianity', 'CHR', true, 'religion', 10),
('ol', 'Islam', 'ISL', true, 'religion', 11);

-- O/L Basket 1 (Category I) - Choose 1
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Business & Accounting Studies', 'BAS', false, 'basket1', 12),
('ol', 'Geography', 'GEO', false, 'basket1', 13),
('ol', 'Civic Education', 'CIVIC', false, 'basket1', 14),
('ol', 'Entrepreneurship Studies', 'ENT', false, 'basket1', 15),
('ol', 'Second Language (Sinhala)', 'SL_SIN', false, 'basket1', 16),
('ol', 'Second Language (Tamil)', 'SL_TAM', false, 'basket1', 17),
('ol', 'Pali', 'PALI', false, 'basket1', 18),
('ol', 'Sanskrit', 'SANS', false, 'basket1', 19),
('ol', 'French', 'FRE', false, 'basket1', 20),
('ol', 'German', 'GER', false, 'basket1', 21),
('ol', 'Hindi', 'HINDI', false, 'basket1', 22),
('ol', 'Japanese', 'JAP', false, 'basket1', 23),
('ol', 'Arabic', 'ARAB', false, 'basket1', 24),
('ol', 'Korean', 'KOR', false, 'basket1', 25),
('ol', 'Chinese', 'CHI', false, 'basket1', 26),
('ol', 'Russian', 'RUS', false, 'basket1', 27);

-- O/L Basket 2 (Category II) - Choose 1
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Music (Oriental)', 'MUS_O', false, 'basket2', 28),
('ol', 'Music (Western)', 'MUS_W', false, 'basket2', 29),
('ol', 'Music (Carnatic)', 'MUS_C', false, 'basket2', 30),
('ol', 'Art', 'ART', false, 'basket2', 31),
('ol', 'Dancing (Oriental)', 'DAN_O', false, 'basket2', 32),
('ol', 'Dancing (Bharata)', 'DAN_B', false, 'basket2', 33),
('ol', 'Appreciation of English Literary Texts', 'LIT_ENG', false, 'basket2', 34),
('ol', 'Appreciation of Sinhala Literary Texts', 'LIT_SIN', false, 'basket2', 35),
('ol', 'Appreciation of Tamil Literary Texts', 'LIT_TAM', false, 'basket2', 36),
('ol', 'Appreciation of Arabic Literary Texts', 'LIT_ARAB', false, 'basket2', 37),
('ol', 'Drama and Theatre (Sinhala)', 'DRA_SIN', false, 'basket2', 38),
('ol', 'Drama and Theatre (Tamil)', 'DRA_TAM', false, 'basket2', 39),
('ol', 'Drama and Theatre (English)', 'DRA_ENG', false, 'basket2', 40);

-- O/L Basket 3 (Category III) - Choose 1
INSERT INTO public.stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Information & Communication Technology', 'ICT', false, 'basket3', 41),
('ol', 'Agriculture & Food Technology', 'AFT', false, 'basket3', 42),
('ol', 'Aquatic Bio-resources Technology', 'ABT', false, 'basket3', 43),
('ol', 'Arts & Crafts', 'AC', false, 'basket3', 44),
('ol', 'Home Economics', 'HE', false, 'basket3', 45),
('ol', 'Health & Physical Education', 'HPE', false, 'basket3', 46),
('ol', 'Communication & Media Studies', 'CMS', false, 'basket3', 47),
('ol', 'Design & Construction Technology', 'DCT', false, 'basket3', 48),
('ol', 'Design & Mechanical Technology', 'DMT', false, 'basket3', 49),
('ol', 'Design, Electrical & Electronic Technology', 'DEET', false, 'basket3', 50),
('ol', 'Electronic Writing & Shorthand (Sinhala)', 'EWS_SIN', false, 'basket3', 51),
('ol', 'Electronic Writing & Shorthand (Tamil)', 'EWS_TAM', false, 'basket3', 52),
('ol', 'Electronic Writing & Shorthand (English)', 'EWS_ENG', false, 'basket3', 53);