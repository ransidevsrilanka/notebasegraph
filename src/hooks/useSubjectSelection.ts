import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  validateSubjectSelection, 
  getMandatorySubjects, 
  groupSubjectsByBasket,
  type StreamSubject,
  type ValidationResult 
} from '@/lib/subjectValidation';
import type { StreamType } from '@/types/database';

export interface UserSubjects {
  id: string;
  user_id: string;
  enrollment_id: string;
  subject_1: string;
  subject_2: string;
  subject_3: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubjectSelection() {
  const { user, enrollment } = useAuth();
  const [streamSubjects, setStreamSubjects] = useState<StreamSubject[]>([]);
  const [userSubjects, setUserSubjects] = useState<UserSubjects | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({ valid: false, errors: [], warnings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const stream = enrollment?.stream as StreamType | undefined;

  // Fetch stream subjects and user's existing selection
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !enrollment || !stream) return;

      setIsLoading(true);

      // Fetch subjects for this stream
      const { data: subjects, error: subjectsError } = await supabase
        .from('stream_subjects')
        .select('*')
        .eq('stream', stream)
        .order('sort_order');

      if (subjectsError) {
        console.error('Error fetching stream subjects:', subjectsError);
        setIsLoading(false);
        return;
      }

      setStreamSubjects(subjects as StreamSubject[]);

      // Fetch user's existing subject selection
      const { data: existingSelection, error: selectionError } = await supabase
        .from('user_subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('enrollment_id', enrollment.id)
        .maybeSingle();

      if (selectionError) {
        console.error('Error fetching user subjects:', selectionError);
      }

      if (existingSelection) {
        setUserSubjects(existingSelection as UserSubjects);
        setSelectedSubjects([
          existingSelection.subject_1,
          existingSelection.subject_2,
          existingSelection.subject_3,
        ]);
      } else {
        // Pre-select mandatory subjects
        const mandatory = getMandatorySubjects(stream, subjects as StreamSubject[]);
        setSelectedSubjects(mandatory);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user, enrollment, stream]);

  // Validate whenever selection changes
  useEffect(() => {
    if (!stream) return;
    const result = validateSubjectSelection(stream, selectedSubjects, streamSubjects);
    setValidation(result);
  }, [selectedSubjects, stream, streamSubjects]);

  // Toggle subject selection
  const toggleSubject = useCallback((subjectName: string) => {
    if (!stream) return;

    // Check if subject is mandatory (can't deselect)
    const mandatory = getMandatorySubjects(stream, streamSubjects);
    if (mandatory.includes(subjectName) && selectedSubjects.includes(subjectName)) {
      return; // Can't deselect mandatory subjects
    }

    setSelectedSubjects(prev => {
      if (prev.includes(subjectName)) {
        return prev.filter(s => s !== subjectName);
      } else if (prev.length < 3) {
        return [...prev, subjectName];
      }
      return prev;
    });
  }, [stream, streamSubjects, selectedSubjects]);

  // Save and lock subject selection
  const saveSelection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !enrollment || selectedSubjects.length !== 3) {
      return { success: false, error: 'Invalid selection' };
    }

    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    setIsSaving(true);

    try {
      const payload = {
        user_id: user.id,
        enrollment_id: enrollment.id,
        subject_1: selectedSubjects[0],
        subject_2: selectedSubjects[1],
        subject_3: selectedSubjects[2],
        is_locked: true,
        locked_at: new Date().toISOString(),
      };

      if (userSubjects) {
        // Update existing
        const { error } = await supabase
          .from('user_subjects')
          .update(payload)
          .eq('id', userSubjects.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_subjects')
          .insert(payload);

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error saving subject selection:', error);
      return { success: false, error: error.message || 'Failed to save selection' };
    } finally {
      setIsSaving(false);
    }
  }, [user, enrollment, selectedSubjects, validation, userSubjects]);

  // Group subjects by basket for display
  const subjectsByBasket = groupSubjectsByBasket(streamSubjects);
  const mandatorySubjects = stream ? getMandatorySubjects(stream, streamSubjects) : [];

  return {
    streamSubjects,
    subjectsByBasket,
    userSubjects,
    selectedSubjects,
    mandatorySubjects,
    validation,
    isLoading,
    isSaving,
    isLocked: userSubjects?.is_locked ?? false,
    toggleSubject,
    saveSelection,
  };
}
