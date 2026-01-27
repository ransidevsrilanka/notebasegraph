-- Teacher testimonials table
CREATE TABLE public.teacher_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  photo_url TEXT,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student testimonials table  
CREATE TABLE public.student_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  stream TEXT,
  year TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.teacher_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_testimonials ENABLE ROW LEVEL SECURITY;

-- Public read access for active testimonials
CREATE POLICY "Public can view active teacher testimonials" ON public.teacher_testimonials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active student testimonials" ON public.student_testimonials
  FOR SELECT USING (is_active = true);

-- Admin full access using has_role function
CREATE POLICY "Admins can manage teacher testimonials" ON public.teacher_testimonials
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can manage student testimonials" ON public.student_testimonials
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Insert sample teacher testimonials
INSERT INTO public.teacher_testimonials (name, title, message, sort_order) VALUES
  ('Dr. Kamal Perera', 'Senior Physics Lecturer', 'Notebase provides exceptional study materials that align perfectly with the national curriculum. I recommend it to all my students.', 1),
  ('Mrs. Shalini Fernando', 'Mathematics Teacher', 'The quality of model papers and structured notes is outstanding. A must-have resource for serious students.', 2),
  ('Mr. Ranjan Silva', 'Chemistry Tutor', 'I''ve seen remarkable improvement in my students who use Notebase regularly. The content is comprehensive and well-organized.', 3),
  ('Dr. Nimal Jayawardena', 'Biology Professor', 'As an educator, I appreciate the accuracy and depth of the materials. Highly recommended for A/L Science students.', 4);

-- Insert sample student testimonials
INSERT INTO public.student_testimonials (name, grade, stream, year, message, rating, sort_order) VALUES
  ('Kavindi Perera', 'A/L', 'Science', '2024', 'The model papers helped me score 3 A''s. The AI tutor explained concepts I struggled with for months in just minutes!', 5, 1),
  ('Tharushi Fernando', 'O/L', NULL, '2025', 'Best study platform I''ve used. The notes are so well organized and easy to understand.', 5, 2),
  ('Dineth Silva', 'A/L', 'Maths', '2024', 'Finally passed Combined Maths with a B! The step-by-step solutions made everything click.', 5, 3),
  ('Nethmi Jayawardena', 'A/L', 'Commerce', '2024', 'The flashcards feature is amazing for memorizing accounting concepts. Saved me so much time!', 5, 4),
  ('Ravindu Wickramasinghe', 'O/L', NULL, '2025', 'I improved my Science grade from C to A in just 3 months. The quizzes really help test your knowledge.', 5, 5),
  ('Sanduni Dissanayake', 'A/L', 'Arts', '2024', 'The Sinhala medium notes are excellent. Finally a platform that caters to us properly!', 5, 6);