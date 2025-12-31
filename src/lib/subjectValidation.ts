import type { StreamType } from '@/types/database';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StreamSubject {
  id: string;
  stream: StreamType;
  subject_name: string;
  subject_code: string | null;
  is_mandatory: boolean;
  basket: string;
  sort_order: number;
}

// ============================================
// MATHS STREAM (Physical Science)
// ============================================
// Mandatory: Combined Mathematics, Physics
// 3rd subject: Chemistry, ICT, or Agricultural Science (restricted)
function validateMathsStream(selected: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length !== 3) {
    errors.push('You must select exactly 3 subjects.');
    return { valid: false, errors, warnings };
  }

  // Check mandatory subjects
  if (!selected.includes('Combined Mathematics')) {
    errors.push('Combined Mathematics is mandatory for the Maths stream.');
  }
  if (!selected.includes('Physics')) {
    errors.push('Physics is mandatory for the Maths stream.');
  }

  // Check for invalid combinations
  if (selected.includes('Biology')) {
    errors.push('Biology cannot be combined with Combined Mathematics.');
  }
  if (selected.includes('Economics') && !selected.includes('ICT')) {
    errors.push('Economics is not valid for the Maths stream.');
  }

  // Check valid third subjects
  const validThird = ['Chemistry', 'ICT', 'Agricultural Science'];
  const thirdSubject = selected.find(s => s !== 'Combined Mathematics' && s !== 'Physics');
  
  if (thirdSubject && !validThird.includes(thirdSubject)) {
    errors.push(`${thirdSubject} is not a valid subject for the Maths stream.`);
  }

  // Warnings for restricted combinations
  if (selected.includes('Agricultural Science')) {
    warnings.push('Agricultural Science is a restricted choice with limited recognition. Confirm with your school.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// BIOLOGY STREAM (Biological Science)
// ============================================
// Mandatory: Biology, Chemistry
// 3rd subject: Physics, Agricultural Science, or ICT (restricted)
function validateBiologyStream(selected: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length !== 3) {
    errors.push('You must select exactly 3 subjects.');
    return { valid: false, errors, warnings };
  }

  // Check mandatory subjects
  if (!selected.includes('Biology')) {
    errors.push('Biology is mandatory for the Biology stream.');
  }
  if (!selected.includes('Chemistry')) {
    errors.push('Chemistry is mandatory for the Biology stream.');
  }

  // Check for invalid combinations
  if (selected.includes('Combined Mathematics')) {
    errors.push('Combined Mathematics cannot be combined with Biology.');
  }

  // Check valid third subjects
  const validThird = ['Physics', 'Agricultural Science', 'ICT'];
  const thirdSubject = selected.find(s => s !== 'Biology' && s !== 'Chemistry');
  
  if (thirdSubject && !validThird.includes(thirdSubject)) {
    errors.push(`${thirdSubject} is not a valid subject for the Biology stream.`);
  }

  // Warnings
  if (selected.includes('ICT')) {
    warnings.push('ICT is accepted mainly for private universities and IT crossover paths.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// COMMERCE STREAM
// ============================================
// At least ONE of Accounting or Business Studies is mandatory
// Valid pool: Accounting, Business Studies, Economics, Business Statistics, ICT
function validateCommerceStream(selected: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length !== 3) {
    errors.push('You must select exactly 3 subjects.');
    return { valid: false, errors, warnings };
  }

  const validPool = ['Accounting', 'Business Studies', 'Economics', 'Business Statistics', 'ICT'];
  const coreSubjects = ['Accounting', 'Business Studies'];

  // Check at least one core subject
  const hasCore = selected.some(s => coreSubjects.includes(s));
  if (!hasCore) {
    errors.push('You must select at least one of Accounting or Business Studies.');
  }

  // Check all subjects are valid
  for (const subject of selected) {
    if (!validPool.includes(subject)) {
      errors.push(`${subject} is not a valid Commerce stream subject.`);
    }
  }

  // Warnings for less common combinations
  const hasAccounting = selected.includes('Accounting');
  const hasBusinessStudies = selected.includes('Business Studies');
  if (!hasAccounting || !hasBusinessStudies) {
    warnings.push('Most Commerce students take both Accounting and Business Studies.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// TECHNOLOGY STREAM
// ============================================
// At least ONE technology core subject
// Core: Engineering Technology, Science for Technology, Bio Systems Technology
// Optional: ICT
function validateTechnologyStream(selected: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length !== 3) {
    errors.push('You must select exactly 3 subjects.');
    return { valid: false, errors, warnings };
  }

  const coreSubjects = ['Engineering Technology', 'Science for Technology', 'Bio Systems Technology'];
  const validPool = [...coreSubjects, 'ICT'];

  // Check at least one core subject
  const coreCount = selected.filter(s => coreSubjects.includes(s)).length;
  if (coreCount === 0) {
    errors.push('You must select at least one Technology core subject.');
  }

  // Check all subjects are valid
  for (const subject of selected) {
    if (!validPool.includes(subject)) {
      errors.push(`${subject} is not a valid Technology stream subject.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// ARTS STREAM
// ============================================
// Complex basket validation:
// - At least 1 core subject (Basket 1)
// - Max 2 language subjects (Basket 3)
// - Max 2 aesthetic subjects (Basket 4)
function validateArtsStream(selected: string[], allSubjects: StreamSubject[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length !== 3) {
    errors.push('You must select exactly 3 subjects.');
    return { valid: false, errors, warnings };
  }

  // Categorize selected subjects by basket
  const selectedWithBasket = selected.map(name => {
    const subj = allSubjects.find(s => s.subject_name === name);
    return { name, basket: subj?.basket || 'unknown' };
  });

  const coreCount = selectedWithBasket.filter(s => s.basket === 'core').length;
  const religionCount = selectedWithBasket.filter(s => s.basket === 'religion').length;
  const languageCount = selectedWithBasket.filter(s => s.basket === 'language').length;
  const aestheticCount = selectedWithBasket.filter(s => s.basket === 'aesthetic').length;

  // Must have at least 1 core subject
  if (coreCount === 0) {
    errors.push('You must select at least one core academic subject (Economics, Geography, Political Science, History, etc.).');
  }

  // Max 2 language subjects
  if (languageCount > 2) {
    errors.push('You cannot select more than 2 language subjects.');
  }

  // Max 2 aesthetic subjects (but 3 is blocked)
  if (aestheticCount > 2) {
    errors.push('You cannot select more than 2 aesthetic subjects.');
  }

  // Check all subjects are valid arts subjects
  const artsSubjectNames = allSubjects.filter(s => s.stream === 'arts').map(s => s.subject_name);
  for (const subject of selected) {
    if (!artsSubjectNames.includes(subject)) {
      errors.push(`${subject} is not a valid Arts stream subject.`);
    }
  }

  // Warnings
  if (aestheticCount === 2) {
    warnings.push('Selecting 2 aesthetic subjects is unusual. Please confirm this is your intended choice.');
  }
  if (languageCount === 2) {
    warnings.push('Selecting 2 language subjects limits your core subject options.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// Main Validation Function
// ============================================
export function validateSubjectSelection(
  stream: StreamType,
  selected: string[],
  allSubjects: StreamSubject[] = []
): ValidationResult {
  switch (stream) {
    case 'maths':
      return validateMathsStream(selected);
    case 'biology':
      return validateBiologyStream(selected);
    case 'commerce':
      return validateCommerceStream(selected);
    case 'technology':
      return validateTechnologyStream(selected);
    case 'arts':
      return validateArtsStream(selected, allSubjects);
    default:
      return { valid: false, errors: ['Unknown stream type.'], warnings: [] };
  }
}

// ============================================
// Helper to get mandatory subjects for a stream
// ============================================
export function getMandatorySubjects(stream: StreamType, allSubjects: StreamSubject[]): string[] {
  return allSubjects
    .filter(s => s.stream === stream && s.is_mandatory)
    .map(s => s.subject_name);
}

// ============================================
// Helper to group subjects by basket
// ============================================
export function groupSubjectsByBasket(subjects: StreamSubject[]): Record<string, StreamSubject[]> {
  return subjects.reduce((acc, subject) => {
    const basket = subject.basket;
    if (!acc[basket]) acc[basket] = [];
    acc[basket].push(subject);
    return acc;
  }, {} as Record<string, StreamSubject[]>);
}

// Basket display labels
export const BASKET_LABELS: Record<string, string> = {
  mandatory: 'Mandatory Subjects',
  core: 'Core Subjects',
  optional: 'Optional Subjects',
  religion: 'Religion & Civilization',
  language: 'Languages',
  aesthetic: 'Aesthetic Subjects',
};
