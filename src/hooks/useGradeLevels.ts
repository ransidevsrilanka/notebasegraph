import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GradeLevelMode = 'al_only' | 'both';

export const useGradeLevels = () => {
  const [mode, setMode] = useState<GradeLevelMode>('al_only');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMode();
  }, []);

  const fetchMode = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'grade_levels_enabled')
        .maybeSingle();
      
      if (!error && data?.value) {
        // Handle both quoted and unquoted string values
        const value = typeof data.value === 'string' 
          ? data.value.replace(/"/g, '') 
          : data.value;
        setMode(value as GradeLevelMode);
      }
    } catch (error) {
      console.error('Error fetching grade level mode:', error);
    }
    setIsLoading(false);
  };

  const isOLEnabled = mode === 'both';
  const defaultGrade = 'al_grade12';
  
  // Available grades based on mode
  const availableGrades = isOLEnabled
    ? ['ol_grade10', 'ol_grade11', 'al_grade12', 'al_grade13']
    : ['al_grade12', 'al_grade13'];

  return { 
    mode, 
    isOLEnabled, 
    isLoading, 
    defaultGrade, 
    availableGrades,
    refetch: fetchMode 
  };
};
