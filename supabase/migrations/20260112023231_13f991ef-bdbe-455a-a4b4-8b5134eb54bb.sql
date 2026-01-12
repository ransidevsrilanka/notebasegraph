-- Phase 1: Fix RLS Infinite Recursion

-- Fix cmo_profiles: Creators can read their assigned CMO (avoid querying creator_profiles with a subquery that could recurse)
DROP POLICY IF EXISTS "Creators can read assigned CMO" ON cmo_profiles;
CREATE POLICY "Creators can read assigned CMO" ON cmo_profiles
FOR SELECT USING (
  id IN (SELECT cmo_id FROM creator_profiles WHERE user_id = auth.uid() AND cmo_id IS NOT NULL)
);

-- Fix creator_profiles: CMOs can read assigned creators (avoid querying cmo_profiles with a subquery that could recurse)
DROP POLICY IF EXISTS "CMOs can read assigned creators" ON creator_profiles;
CREATE POLICY "CMOs can read assigned creators" ON creator_profiles
FOR SELECT USING (
  cmo_id IN (SELECT id FROM cmo_profiles WHERE user_id = auth.uid())
);

-- Phase 2: Fix Foreign Key Cascade Rules

-- topics → subjects: CASCADE (delete topics when subject deleted)
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_subject_id_fkey;
ALTER TABLE topics ADD CONSTRAINT topics_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- notes → topics: CASCADE (delete notes when topic deleted)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_topic_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- content → topics: CASCADE
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_topic_id_fkey;
ALTER TABLE content ADD CONSTRAINT content_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- download_logs → notes: SET NULL (preserve logs, unlink note)
ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_note_id_fkey;
ALTER TABLE download_logs ADD CONSTRAINT download_logs_note_id_fkey 
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL;

-- flashcard_sets → topics: CASCADE
ALTER TABLE flashcard_sets DROP CONSTRAINT IF EXISTS flashcard_sets_topic_id_fkey;
ALTER TABLE flashcard_sets ADD CONSTRAINT flashcard_sets_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- flashcards → flashcard_sets: CASCADE
ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_set_id_fkey;
ALTER TABLE flashcards ADD CONSTRAINT flashcards_set_id_fkey 
  FOREIGN KEY (set_id) REFERENCES flashcard_sets(id) ON DELETE CASCADE;

-- question_bank → topics: CASCADE
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_topic_id_fkey;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- quizzes → topics: CASCADE
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_topic_id_fkey;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- quiz_attempts → quizzes: CASCADE
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_fkey;
ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_quiz_id_fkey 
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

-- flashcard_progress → flashcards: CASCADE
ALTER TABLE flashcard_progress DROP CONSTRAINT IF EXISTS flashcard_progress_flashcard_id_fkey;
ALTER TABLE flashcard_progress ADD CONSTRAINT flashcard_progress_flashcard_id_fkey 
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;