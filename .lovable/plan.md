

# Comprehensive Platform Enhancement Plan

## Overview

This plan addresses the following requirements:
1. **Demo Dashboard Fixes** - Show notes as locked properly
2. **Demo Tour Simplification** - Remove "Sign Up Now" button, keep only "Explore Now"
3. **Marketing Landing Page** - Bilingual (English/Sinhala) emotional storytelling page with QR code focus
4. **Bug Audit & Fixes** - Identify and fix broken metrics and referral links
5. **External Storage Integration** - Architecture for Mega/Dropbox/Google Drive to solve future storage scaling

---

## Part 1: Demo Dashboard - Show Notes as Locked

### Current Issue
From the screenshot, notes like "11" and "Algebra" under "Measurements" are showing without lock indicators. The `isNoteLocked` function exists but notes with `min_tier: 'starter'` return `false` since demo users simulate `starter` tier.

### Root Cause
The current logic only locks notes that require HIGHER than starter tier. But if ALL notes in demo are `starter`, no locks appear.

### Solution
Modify demo to show SOME notes as locked to demonstrate the tier system. Two options:

**Option A (Recommended): Force demo to simulate "free" tier (below starter)**
```typescript
// In DemoDashboard.tsx - line 68
const simulatedEnrollment = {
  tier: 'free' as const, // NEW: tier below starter for demo purposes
  // ...
};

// Update tier order to include 'free'
const tierOrder = ['free', 'starter', 'standard', 'lifetime'];
```
This way, starter notes appear locked in demo.

**Option B: Add visual indicators for ALL notes in demo**
Show lock overlay on all notes with "Sign up to access" message, regardless of tier.

### Recommended Approach
Use **Option B** - In demo mode, ALL notes should show as "preview locked" since no one has an account. This creates urgency.

**File: `src/pages/DemoDashboard.tsx`**
```typescript
// Line 78-83: Change isNoteLocked to always return true for demo
const isNoteLocked = (noteMinTier: string | null) => {
  // In demo mode, ALL notes are locked to encourage signup
  return true;
};
```

Also update the note row styling to show a blur preview with lock icon overlay.

---

## Part 2: Demo Tour - Remove "Sign Up Now" Button

### Current Issue
At the end of the demo tour, there are two buttons: "Explore" and "Sign Up". Since users just started exploring, the "Sign Up" feels pushy.

### Solution

**File: `src/components/demo/DemoTour.tsx`**

Change lines 142-151:
```typescript
{isLastStep ? (
  <Button variant="brand" size="sm" onClick={handleComplete} className="gap-1">
    <Sparkles className="w-4 h-4" />
    Explore Now
  </Button>
) : (
  <Button variant="brand" size="sm" onClick={handleNext} className="gap-1">
    Next
    <ChevronRight className="w-4 h-4" />
  </Button>
)}
```

Remove the entire `handleSignUp` function since it's no longer needed.

---

## Part 3: Marketing Landing Page - Bilingual Emotional Hook

### Purpose
Create a new page at `/start` (or `/get-started`) designed for QR code distribution. This page uses fear-based storytelling to connect with students' exam anxiety, then presents Notebase as the solution.

### Design Structure

**Section 1: The Problem (Fear/Trauma Hook)**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [🇱🇰 English | සිංහල toggle]                                          │
│                                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                         │
│  ENGLISH VERSION:                                                       │
│  ─────────────────                                                      │
│  "It's 2 AM. Your exam is in 12 hours.                                 │
│   You've been staring at the same page for 3 hours.                    │
│   The notes don't make sense.                                          │
│   Your friends are already asleep.                                      │
│   Your heart is racing.                                                 │
│   You're not ready."                                                    │
│                                                                         │
│  62% of A/L students say they felt                                     │
│  "completely unprepared" the night before their exam.                  │
│                                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                         │
│  SINHALA VERSION:                                                       │
│  ─────────────────                                                      │
│  "රාත්‍රී 2 යි. පරීක්ෂණය පැය 12 කින්.                                   │
│   ඔබ පැය 3ක් එකම පිටුවට බලාගෙන ඉන්නවා.                               │
│   සටහන් තේරෙන්නේ නැහැ.                                                │
│   ඔබේ යාළුවෝ දැනටමත් නිදාගෙන.                                         │
│   ඔබේ හදවත වේගයෙන් ගැහෙනවා.                                          │
│   ඔබ සූදානම් නැහැ."                                                    │
│                                                                         │
│  උසස් පෙළ සිසුන්ගෙන් 62%ක් පවසන්නේ                                    │
│  පරීක්ෂණයට පෙර රාත්‍රියේ "සම්පූර්ණයෙන්ම සූදානම් නොවූ" බවයි.           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Section 2: The Pain Points**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Sound familiar?                                                        │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 📚 Scattered    │  │ 💸 Expensive    │  │ ⏰ No Time      │         │
│  │ Notes           │  │ Tuition         │  │                 │         │
│  │                 │  │                 │  │                 │         │
│  │ Notes from      │  │ Monthly tuition │  │ You have to     │         │
│  │ different       │  │ fees of LKR     │  │ work, help at   │         │
│  │ sources that    │  │ 50,000+ that    │  │ home, and still │         │
│  │ don't connect   │  │ your family     │  │ find time to    │         │
│  │                 │  │ can't afford    │  │ study           │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │ 😰 Exam Stress  │  │ 🎯 No           │                              │
│  │                 │  │ Direction       │                              │
│  │                 │  │                 │                              │
│  │ Panic attacks,  │  │ You don't know  │                              │
│  │ sleepless       │  │ what to study   │                              │
│  │ nights, crying  │  │ first or how    │                              │
│  │ before exams    │  │ to prioritize   │                              │
│  └─────────────────┘  └─────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Section 3: The Solution Reveal**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  That's why we created Notebase.                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │  [Notebase Logo]                                                    ││
│  │                                                                     ││
│  │  One platform. All your notes.                                     ││
│  │  Organized by topic. Available 24/7.                               ││
│  │                                                                     ││
│  │  ✓ Curated notes by top teachers                                   ││
│  │  ✓ 24/7 AI Tutor for instant help                                  ││
│  │  ✓ Starting at just LKR 1,990 (one-time)                           ││
│  │  ✓ That's less than ONE tuition class                              ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  "For the price of 2 kottu roti, you get access to                     │
│   everything you need to pass your exams."                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Section 4: CTA**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│           Don't let exam night terror be your reality.                 │
│                                                                         │
│                    [ Try Demo Free →]                                  │
│                                                                         │
│           No account needed. See exactly what you get.                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**New File: `src/pages/GetStarted.tsx`**

Key features:
- Language toggle (English/Sinhala) stored in localStorage
- Emotional storytelling with typewriter effect
- Statistics with animation on scroll
- Pain point cards with subtle animations
- Solution reveal with premium glass card styling
- Single CTA to `/demo`
- Mobile-optimized for QR code scanning

**Route Addition to `src/App.tsx`**:
```typescript
<Route path="/start" element={<GetStarted />} />
<Route path="/get-started" element={<GetStarted />} /> // Alias
```

---

## Part 4: Bug Audit & Fixes

### Identified Issues

**Bug 1: ApplyAffiliate.tsx - Missing referral_code parameter**
In `ApplyAffiliate.tsx` line 123-127, the RPC call doesn't include `_referral_code`:
```typescript
const { error: roleError } = await supabase.rpc('set_creator_role', {
  _user_id: authData.user.id,
  _cmo_id: null,
  _display_name: name,
  // MISSING: _referral_code parameter
});
```

The `set_creator_role` function expects 4 parameters and will auto-generate if not provided, but it's better to be explicit.

**Fix:**
```typescript
const creatorRefCode = `CRT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

const { error: roleError } = await supabase.rpc('set_creator_role', {
  _user_id: authData.user.id,
  _cmo_id: null,
  _display_name: name,
  _referral_code: creatorRefCode,
});
```

**Bug 2: ToS/Privacy links in ApplyAffiliate.tsx**
Lines 335-337 link to `/terms` and `/privacy` but correct routes are `/terms-of-service` and `/privacy-policy`.

**Fix:**
```typescript
<Link to="/terms-of-service" className="text-brand hover:underline">Terms of Service</Link>
<Link to="/privacy-policy" className="text-brand hover:underline">Privacy Policy</Link>
```

**Bug 3: Student Referral Link Format**
In `Dashboard.tsx`, the referral link uses `?ref=` but should clarify it's a student referral:
- Current: `/signup?ref=${referralCode}`  
- The `Signup.tsx` page correctly handles this and stores in `userReferrer`

This is working correctly but could be renamed for clarity.

**Bug 4: Missing error handling in DemoDashboard**
If `subjects` query fails, there's no error state shown.

**Fix:** Add error state handling in `DemoDashboard.tsx`.

---

## Part 5: External Storage Integration Architecture

### Current Storage Situation
- Notes are stored in Supabase Storage bucket `notes`
- File URLs are stored as relative paths like `{topic_id}/{timestamp}.pdf`
- `serve-pdf` edge function generates signed URLs for access

### Future Scalability Problem
- Supabase Storage has egress and storage limits
- As user base grows, costs will increase significantly
- Need hybrid storage solution

### Proposed Architecture

**Phase 1: Abstract Storage Layer (Immediate)**

Create a storage abstraction that can route to different providers:

**New File: `src/lib/storageProvider.ts`**
```typescript
export type StorageProvider = 'supabase' | 'google_drive' | 'mega' | 'dropbox';

export interface StorageConfig {
  provider: StorageProvider;
  credentials?: {
    apiKey?: string;
    folderId?: string;  // For Google Drive
    accessToken?: string;
  };
}

export interface StorageFile {
  id: string;
  url: string;
  provider: StorageProvider;
  expiresAt?: Date;
}

export const getSignedUrl = async (
  fileUrl: string, 
  config: StorageConfig
): Promise<StorageFile> => {
  switch (config.provider) {
    case 'supabase':
      return getSupabaseSignedUrl(fileUrl);
    case 'google_drive':
      return getGoogleDriveUrl(fileUrl, config.credentials!);
    case 'mega':
      return getMegaUrl(fileUrl, config.credentials!);
    case 'dropbox':
      return getDropboxUrl(fileUrl, config.credentials!);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
};
```

**Phase 2: Database Schema Update**

Add `storage_provider` field to notes table:
```sql
ALTER TABLE notes 
ADD COLUMN storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN external_file_id TEXT;
```

**Phase 3: Update serve-pdf Edge Function**

Modify `serve-pdf/index.ts` to handle multiple storage providers:
```typescript
// Check storage provider
const storageProvider = note.storage_provider || 'supabase';

let signedUrl: string;

switch (storageProvider) {
  case 'supabase':
    // Existing logic
    const { data: signedData } = await supabaseAdmin.storage...
    signedUrl = signedData.signedUrl;
    break;
    
  case 'google_drive':
    // Google Drive direct link with view-only embed
    signedUrl = `https://drive.google.com/uc?export=view&id=${note.external_file_id}`;
    break;
    
  case 'mega':
    // MEGA.nz link (requires MEGA API for ephemeral links)
    signedUrl = await getMegaEphemeralLink(note.external_file_id);
    break;
    
  case 'dropbox':
    // Dropbox direct link
    signedUrl = note.file_url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    break;
}
```

**Phase 4: Admin Upload Interface**

Update Content Management to support multiple upload destinations:
- Upload to Supabase (default, small files)
- Paste Google Drive link (for large files)
- Paste MEGA link
- Paste Dropbox link

### Recommended Providers by Use Case

| Provider | Best For | Pros | Cons |
|----------|----------|------|------|
| Supabase | Small files (<10MB), active files | Native integration, RLS | Limited free tier |
| Google Drive | Large PDFs, model papers | 15GB free, familiar | Sharing limits, manual upload |
| MEGA | Very large files, archives | 20GB free, E2E encrypted | API complexity |
| Dropbox | Team collaboration files | 2GB free, good API | Limited free storage |

### Migration Strategy
1. Keep existing files on Supabase
2. New large files (>5MB) upload to Google Drive
3. Add `storage_provider` column with default 'supabase'
4. Update serve-pdf to handle both

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `src/pages/GetStarted.tsx` | Marketing landing page with bilingual emotional hook |
| `src/lib/storageProvider.ts` | Storage abstraction layer for future multi-provider support |

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DemoDashboard.tsx` | Lock all notes in demo mode |
| `src/components/demo/DemoTour.tsx` | Remove "Sign Up" button, keep only "Explore Now" |
| `src/pages/ApplyAffiliate.tsx` | Fix missing referral_code, fix ToS/Privacy links |
| `src/App.tsx` | Add `/start` and `/get-started` routes |

## Database Changes
Future migration for storage provider support:
```sql
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS external_file_id TEXT;
```

---

## Technical Notes

1. **Marketing Page**: Uses CSS animations for typewriter effect, no external libraries
2. **Language Toggle**: Stored in localStorage for persistence across visits
3. **Storage Abstraction**: Designed for gradual migration, no breaking changes
4. **QR Code Focus**: Page optimized for mobile-first since users will scan QR codes
5. **Bilingual Content**: All strings stored in a translations object for easy maintenance

---

## Testing Checklist

- [ ] Demo dashboard shows ALL notes as locked
- [ ] Demo tour ends with only "Explore Now" button
- [ ] Marketing page displays correctly in both English and Sinhala
- [ ] Language toggle persists across page refreshes
- [ ] Marketing page CTA correctly routes to /demo
- [ ] ApplyAffiliate signup creates creator with referral code
- [ ] ToS/Privacy links work correctly
- [ ] Storage abstraction layer compiles without errors
- [ ] Mobile responsiveness on marketing page (QR code scanning)

