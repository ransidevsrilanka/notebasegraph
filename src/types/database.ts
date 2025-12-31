export type GradeLevel = 'ol' | 'al_grade12' | 'al_grade13';
export type StreamType = 'maths' | 'biology' | 'commerce' | 'arts' | 'technology';
export type MediumType = 'english' | 'sinhala';
export type TierType = 'starter' | 'standard' | 'lifetime';
export type AppRole = 'super_admin' | 'content_admin' | 'support_admin' | 'student' | 'cmo' | 'content_creator';
export type CodeStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  device_fingerprint: string | null;
  max_devices: number;
  is_locked: boolean;
  abuse_flags: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  grade: GradeLevel;
  stream: StreamType;
  medium: MediumType;
  tier: TierType;
  duration_days: number;
  status: CodeStatus;
  activation_limit: number;
  activations_used: number;
  created_by: string | null;
  activated_by: string | null;
  activated_at: string | null;
  bound_email: string | null;
  bound_device: string | null;
  ip_history: string[];
  expires_at: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  access_code_id: string;
  grade: GradeLevel;
  stream: StreamType;
  medium: MediumType;
  tier: TierType;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  upgrade_celebrated?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  grade: GradeLevel;
  stream: StreamType; // Legacy field, kept for backwards compatibility
  streams: StreamType[]; // New multi-stream support
  medium: MediumType;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_size: number | null;
  min_tier: TierType;
  view_count: number;
  download_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandingSettings {
  siteName: string;
  logoText: string;
  logoImage: string | null;
  heading: string;
  tagline: string;
  pricingButtons: {
    starter: string;
    standard: string;
    lifetime: string;
  };
}

export const GRADE_LABELS: Record<GradeLevel, string> = {
  ol: 'O/L (Grade 11)',
  al_grade12: 'A/L Grade 12',
  al_grade13: 'A/L Grade 13',
};

export const STREAM_LABELS: Record<StreamType, string> = {
  maths: 'Mathematics',
  biology: 'Biology',
  commerce: 'Commerce',
  arts: 'Arts',
  technology: 'Technology',
};

export const MEDIUM_LABELS: Record<MediumType, string> = {
  english: 'English Medium',
  sinhala: 'Sinhala Medium',
};

// Updated tier labels: Silver, Gold, Platinum
export const TIER_LABELS: Record<TierType, string> = {
  starter: 'Silver',
  standard: 'Gold',
  lifetime: 'Platinum',
};

export const STREAM_SUBJECTS: Record<StreamType, string[]> = {
  maths: ['Combined Mathematics', 'Physics', 'Chemistry', 'ICT'],
  biology: ['Biology', 'Physics', 'Chemistry'],
  commerce: ['Accounting', 'Business Studies', 'Economics'],
  arts: ['Political Science', 'Geography', 'History', 'Logic'],
  technology: ['Engineering Technology', 'Science for Technology', 'ICT'],
};
