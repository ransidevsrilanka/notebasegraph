
# Comprehensive Platform Enhancement Plan

## Overview

This plan addresses multiple interconnected issues requiring a systematic site-wide audit and implementation:

1. **CEO Dashboard Optimization** - Speed improvements via parallel queries
2. **Demo Dashboard Fixes** - Proper filtering by grade, stream, medium
3. **Demo Tour Fixes** - Replace "Zen Notes" with branding, remove tracking claims, fix button overflow
4. **Onboarding Tour Fixes** - Fix button overflow issues
5. **Payment Error Fix** - Remove "No payment found" error for new signups
6. **Site-Wide Grade Toggle** - CEO option to enable/disable O/L content globally
7. **Signup Flow UX Improvements** - Step-by-step grade/stream selection, consistent styling
8. **Site Audit** - Identify all pages affected by grade selection changes

---

## Part 1: CEO Dashboard Performance Optimization

### Current Problem
The `fetchStats` function in `AdminDashboard.tsx` makes approximately 20+ sequential database queries, causing 3-5 second load times.

### Solution
Wrap all independent queries in `Promise.all()` blocks for parallel execution.

**Current Sequential Pattern (slow):**
```typescript
const { data: allEnrollments } = await supabase.from('enrollments')...
const { count: activeEnrollments } = await supabase.from('enrollments')...
const { count: totalCodes } = await supabase.from('access_codes')...
// ...20+ more sequential calls
```

**Optimized Parallel Pattern (fast):**
```typescript
const [
  { data: allEnrollments },
  { count: activeEnrollments },
  { count: totalCodes },
  { count: activeCodes },
  { count: totalSubjects },
  // ... all initial queries
] = await Promise.all([
  supabase.from('enrollments').select('user_id').eq('is_active', true),
  supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('access_codes').select('*', { count: 'exact', head: true }),
  // ...
]);

// Second batch for queries that depend on first batch results
const [
  { data: userRefAttributions },
  { data: creatorsData },
  // ...
] = await Promise.all([
  // Second batch queries
]);
```

### Additional Optimizations
1. Add loading skeleton components to show immediate feedback
2. Cache results with React Query's `staleTime: 60000` (1 minute)
3. Consolidate redundant payment queries into single batch

---

## Part 2: Demo Dashboard - Filtering Fixes

### Current Problem
Shows 20 subjects mixing all grades (10, 11, 12, 13) and mediums (English, Sinhala) making it confusing.

### Solution
Add explicit Grade and Medium selectors to `DemoSelection.tsx`:

**New Selection Flow:**
1. Select Grade (Grade 12 or Grade 13) - Only A/L if O/L is disabled
2. Select Stream (Physical Science, Biology, etc.)
3. Select Medium (English or Sinhala)
4. Pick Subjects (filtered by all above)

**File: `src/pages/DemoSelection.tsx`**

Key changes:
- Add `selectedGrade` state: `'al_grade12' | 'al_grade13'` (or O/L grades if enabled)
- Add `selectedMedium` state: `'english' | 'sinhala'`
- Update filter logic:
```typescript
const filteredSubjects = subjects.filter(s => {
  // Grade filter
  if (s.grade !== selectedGrade) return false;
  
  // Medium filter
  if (s.medium !== selectedMedium) return false;
  
  // Stream filter (A/L only)
  if (selectedStream) {
    const subjectStreams = s.streams || [s.stream];
    return subjectStreams.includes(selectedStream);
  }
  
  return true;
});
```

**Remove "Choose your level" step** since O/L is conditionally hidden based on site settings.

---

## Part 3: Demo Tour Fixes

### Current Problems
1. Title says "Zen Notes" instead of actual site name
2. Step 3 says "Track Your Progress" - we don't track journeys yet
3. Buttons overflow outside card container on mobile

### Solution

**File: `src/components/demo/DemoTour.tsx`**

1. **Use branding hook:**
```typescript
import { useBranding } from '@/hooks/useBranding';

const DemoTour = ({ onComplete }: DemoTourProps) => {
  const { branding } = useBranding();
  
  const tourSteps = [
    {
      id: 'welcome',
      title: `Welcome to ${branding.siteName}!`,
      description: 'Your personalized dashboard for accessing study materials and acing your exams.',
      // ...
    },
    // ...
  ];
```

2. **Replace "Track Your Progress" step:**
```typescript
{
  id: 'ai-tutor',
  title: '24/7 AI Tutor',
  description: 'Get instant help with any topic. Our AI tutor is available around the clock to answer your questions.',
  icon: <Sparkles className="w-6 h-6" />,
  position: 'center'
}
```

3. **Fix button overflow:**
```tsx
{/* Actions - fix overflow */}
<div className="flex items-center gap-3 flex-wrap">
  {!isFirstStep && (
    <Button variant="ghost" onClick={handlePrev} size="sm" className="gap-1">
      <ChevronLeft className="w-4 h-4" />
      Back
    </Button>
  )}
  <div className="flex-1 min-w-0" />
  {isLastStep ? (
    <div className="flex gap-2 flex-wrap justify-end">
      <Button variant="outline" size="sm" onClick={handleComplete}>
        Explore
      </Button>
      <Button variant="brand" size="sm" onClick={handleSignUp} className="gap-1">
        <Sparkles className="w-4 h-4" />
        Sign Up
      </Button>
    </div>
  ) : (
    <Button variant="brand" size="sm" onClick={handleNext} className="gap-1">
      Next
      <ChevronRight className="w-4 h-4" />
    </Button>
  )}
</div>
```

---

## Part 4: Onboarding Tour Button Fix

### Current Problem
Creator onboarding tour buttons overflow outside container on small screens.

### Solution

**File: `src/components/onboarding/CreatorOnboardingTour.tsx`**

Update navigation buttons (lines 466-494):
```tsx
{/* Navigation - with proper flex wrap */}
<div className="flex items-center gap-3 flex-wrap">
  {currentStep > 0 && (
    <Button
      variant="outline"
      onClick={handleBack}
      className="flex-1 min-w-[100px]"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  )}
  <Button
    variant="brand"
    onClick={handleNext}
    className="flex-1 min-w-[100px]"
  >
    {currentStep === steps.length - 1 ? (
      <>
        Let's Go!
        <Rocket className="w-4 h-4 ml-2" />
      </>
    ) : (
      <>
        Next
        <ArrowRight className="w-4 h-4 ml-2" />
      </>
    )}
  </Button>
</div>
```

---

## Part 5: Fix "No Payment Found" Error

### Current Problem
When a user navigates to `/paid-signup` without coming from pricing (no pending_payment in localStorage), they see "No payment found" error even if they just want to create an account.

### Solution

**File: `src/pages/PaidSignup.tsx`**

Instead of redirecting immediately, show a better UX:
```tsx
// In useEffect checking for payment
useEffect(() => {
  const storedPayment = localStorage.getItem('pending_payment');
  if (!storedPayment) {
    // Don't show error, redirect silently to pricing
    navigate('/pricing', { replace: true });
    return;
  }
  // ... rest of logic
}, [navigate]);
```

This removes the jarring toast.error message.

---

## Part 6: Site-Wide Grade Level Toggle (CEO Panel)

### Requirement
Add option in CEO panel to toggle between:
- A/L Only (default for now - Sri Lanka hasn't released new O/L syllabus)
- Both A/L and O/L

### Database Change

**Add to `site_settings` table:**
```sql
INSERT INTO site_settings (key, value)
VALUES ('grade_levels_enabled', '"al_only"')
ON CONFLICT (key) DO NOTHING;

-- Possible values: "al_only" or "both"
```

### New Hook: `useGradeLevels`

**File: `src/hooks/useGradeLevels.ts`**
```typescript
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
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'grade_levels_enabled')
      .maybeSingle();
    
    if (data?.value) {
      setMode(data.value as GradeLevelMode);
    }
    setIsLoading(false);
  };

  const isOLEnabled = mode === 'both';
  const defaultGrade = 'al_grade12';

  return { mode, isOLEnabled, isLoading, defaultGrade, refetch: fetchMode };
};
```

### Admin UI for Toggle

**File: `src/pages/admin/PricingSettings.tsx`** (or new BrandingSettings.tsx)

Add section:
```tsx
<div className="glass-card p-6 mt-6">
  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
    <GraduationCap className="w-5 h-5" />
    Grade Levels Available
  </h3>
  <p className="text-sm text-muted-foreground mb-4">
    Control which grade levels are shown on signup, demo, and content pages.
  </p>
  <RadioGroup value={gradeMode} onValueChange={handleGradeModeChange}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="al_only" id="al_only" />
      <Label htmlFor="al_only">A/L Only (Advanced Level - Grades 12 & 13)</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="both" id="both" />
      <Label htmlFor="both">Both A/L and O/L (All Grades 10-13)</Label>
    </div>
  </RadioGroup>
  <p className="text-xs text-muted-foreground mt-3">
    Note: Set to A/L Only until O/L content is available.
  </p>
</div>
```

---

## Part 7: Site-Wide Audit - Pages Affected by Grade Toggle

### All Pages Requiring Grade/Level Handling:

| Page | File | Current Behavior | Required Change |
|------|------|------------------|-----------------|
| Demo Selection | `src/pages/DemoSelection.tsx` | Shows O/L and A/L buttons | Hide O/L when mode = al_only |
| Demo Dashboard | `src/pages/DemoDashboard.tsx` | Shows all grades | Default to al_grade12 |
| Bank Signup | `src/pages/BankSignup.tsx` | Shows all grades | Hide O/L options when disabled |
| Paid Signup | `src/pages/PaidSignup.tsx` | Shows all grades | Hide O/L options when disabled |
| Access Code Entry | `src/pages/Access.tsx` | May allow O/L codes | Validate against enabled levels |
| Subject Selection | `src/pages/SubjectSelection.tsx` | Shows based on enrollment | Already respects enrollment grade |
| Content Management | `src/pages/admin/ContentManagement.tsx` | Shows all grades | Admin can still manage all |
| Access Codes Admin | `src/pages/admin/AccessCodes.tsx` | Creates codes for all grades | Warn if O/L disabled |

### Implementation Pattern

Each affected page should:
```typescript
import { useGradeLevels } from '@/hooks/useGradeLevels';

const MyPage = () => {
  const { isOLEnabled, isLoading } = useGradeLevels();
  
  // Filter grade options
  const availableGrades = isOLEnabled 
    ? GRADE_GROUPS 
    : { al: GRADE_GROUPS.al };
  
  // Or for specific grades
  const gradeOptions = isOLEnabled
    ? ['ol_grade10', 'ol_grade11', 'al_grade12', 'al_grade13']
    : ['al_grade12', 'al_grade13'];
};
```

---

## Part 8: Signup Flow UX Improvements

### Current Problem
Bank signup shows grade and stream on same page with basic radio buttons. Card signup is similar but with different styling on subjects.

### Solution - Step-by-Step Flow

Break the enrollment step into sub-steps with smooth transitions:

**Step 2a: Select Grade**
```
┌────────────────────────────────────────┐
│  [GraduationCap Icon]                  │
│                                        │
│  What grade are you in?                │
│                                        │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  Grade 12   │  │  Grade 13   │      │
│  │  (1st Year) │  │  (2nd Year) │      │
│  └─────────────┘  └─────────────┘      │
│                                        │
│             [Continue →]               │
└────────────────────────────────────────┘
```

**Step 2b: Select Stream**
```
┌────────────────────────────────────────┐
│  [BookOpen Icon]                       │
│                                        │
│  Choose your stream                    │
│                                        │
│  ┌─────────────────────────────┐       │
│  │ 🔬 Physical Science         │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 🧬 Biological Science       │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 💼 Commerce                 │       │
│  └─────────────────────────────┘       │
│  ... (more streams)                    │
│                                        │
│  [← Back]           [Continue →]       │
└────────────────────────────────────────┘
```

**Step 2c: Select Medium**
```
┌────────────────────────────────────────┐
│  [Languages Icon]                      │
│                                        │
│  Preferred medium of instruction       │
│                                        │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  English    │  │  සිංහල     │      │
│  └─────────────┘  └─────────────┘      │
│                                        │
│  [← Back]      [Select Subjects →]     │
└────────────────────────────────────────┘
```

### Implementation

**Update step state:**
```typescript
type EnrollmentStep = 'grade' | 'stream' | 'medium' | 'subjects';
const [enrollmentStep, setEnrollmentStep] = useState<EnrollmentStep>('grade');
```

**Consistent Card Styling:**
Use the same `glass-card` with gradient orbs for all steps:
```tsx
<div className="glass-card p-6 relative overflow-hidden">
  {/* Decorative gradient orbs */}
  <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand/20 rounded-full blur-3xl" />
  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
  
  <div className="relative z-10">
    {/* Step content */}
  </div>
</div>
```

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useGradeLevels.ts` | Hook for grade level mode settings |

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminDashboard.tsx` | Parallel query optimization |
| `src/pages/DemoSelection.tsx` | Add grade/medium selectors, hide O/L when disabled |
| `src/pages/DemoDashboard.tsx` | Use grade/medium from URL params |
| `src/components/demo/DemoTour.tsx` | Use branding, fix AI tutor step, fix button overflow |
| `src/components/onboarding/CreatorOnboardingTour.tsx` | Fix button overflow |
| `src/pages/PaidSignup.tsx` | Silent redirect, step-by-step enrollment UI |
| `src/pages/BankSignup.tsx` | Step-by-step enrollment UI, hide O/L when disabled |
| `src/pages/admin/BrandingSettings.tsx` | Add grade level toggle UI |

## Database Migration

```sql
-- Add grade levels mode setting
INSERT INTO site_settings (key, value)
VALUES ('grade_levels_enabled', '"al_only"')
ON CONFLICT (key) DO NOTHING;
```

---

## Technical Notes

1. **Performance**: Parallel queries should reduce CEO dashboard load from 3-5s to under 1s
2. **Backward Compatibility**: Default to `al_only` so current users see no change
3. **Admin Override**: Content admins can still manage O/L content even when hidden from public
4. **Mobile First**: All UI changes tested for small screens with flex-wrap patterns
5. **Progressive Enhancement**: Grade toggle affects frontend only; all data remains accessible

---

## Testing Checklist

- [ ] CEO dashboard loads in under 1 second
- [ ] Demo shows only A/L grades by default
- [ ] Demo filters by grade, stream, AND medium correctly
- [ ] Demo tour uses "Notebase" instead of "Zen Notes"
- [ ] Demo tour mentions AI Tutor, not progress tracking
- [ ] Demo tour buttons don't overflow on mobile
- [ ] Creator onboarding buttons don't overflow on mobile
- [ ] No "No payment found" error when navigating directly to /paid-signup
- [ ] Grade level toggle saves and affects all public pages
- [ ] Bank signup uses step-by-step flow with premium styling
- [ ] Card signup uses consistent step-by-step flow
- [ ] All pages hide O/L when mode is `al_only`
- [ ] All features work on mobile devices
