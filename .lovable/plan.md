
# Comprehensive Platform Enhancement Plan

## Overview

This plan addresses multiple requests including border animations, commission notifications, tier system logic clarification, CEO dashboard performance optimization, Creator Dashboard redesign, CMO contact functionality, Demo Dashboard improvements, Footer affiliate link, and standalone creator signup.

---

## Part 1: Replace Glow with Loading Border Animation

### Current Issue
The Available Balance card uses `animate-pulse-glow` which creates an outer glow/shadow effect that the user wants removed.

### Solution
Create a new CSS class `animate-border-flow` that animates the border color in a loading/rotating pattern WITHOUT any outer glow or shadow.

**File: `src/index.css`**
```css
/* Animated border flow - no glow */
@keyframes border-flow {
  0% { border-color: hsl(var(--brand) / 0.3); }
  25% { border-color: hsl(var(--brand) / 0.6); }
  50% { border-color: hsl(var(--brand) / 1); }
  75% { border-color: hsl(var(--brand) / 0.6); }
  100% { border-color: hsl(var(--brand) / 0.3); }
}

.animate-border-flow {
  animation: border-flow 2s ease-in-out infinite;
  box-shadow: none !important;
}

/* Alternative: Rotating gradient border */
@keyframes rotating-border {
  0% { 
    background-position: 0% 50%;
  }
  50% { 
    background-position: 100% 50%;
  }
  100% { 
    background-position: 0% 50%;
  }
}

.animate-rotating-border {
  position: relative;
  background: linear-gradient(90deg, hsl(var(--brand)), hsl(var(--brand-light)), hsl(var(--brand)));
  background-size: 200% 200%;
  animation: rotating-border 2s ease infinite;
  padding: 2px;
  border-radius: var(--radius);
}

.animate-rotating-border > * {
  background: hsl(var(--card));
  border-radius: calc(var(--radius) - 2px);
}
```

**File: `src/pages/creator/CreatorDashboard.tsx`**
- Line 740: Replace `animate-pulse-glow` with `animate-border-flow`
- Remove any `hover:shadow-*` classes from the balance card

---

## Part 2: Creator Commission Notification System

### Current Flow
When a user makes a purchase via a creator's referral, `payment_attributions` is created with `creator_commission_amount`.

### Required Addition
Automatically send inbox notification to the creator when they earn a commission.

**Implementation Approach:**
Use a database trigger or update the payment processing edge function to insert a message into the `messages` table for the creator.

**Database Migration - Create Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION notify_creator_on_commission()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  tier_name TEXT;
  commission_amount NUMERIC;
BEGIN
  -- Only process if there's a creator_id and commission
  IF NEW.creator_id IS NOT NULL AND NEW.creator_commission_amount > 0 THEN
    -- Get creator's user_id
    SELECT user_id INTO creator_user_id
    FROM creator_profiles
    WHERE id = NEW.creator_id;
    
    IF creator_user_id IS NOT NULL THEN
      -- Get tier name
      tier_name := CASE NEW.tier
        WHEN 'starter' THEN 'Silver'
        WHEN 'standard' THEN 'Gold'
        WHEN 'lifetime' THEN 'Platinum'
        ELSE NEW.tier
      END;
      
      commission_amount := NEW.creator_commission_amount;
      
      -- Insert notification message
      INSERT INTO messages (user_id, title, content, type, is_read)
      VALUES (
        creator_user_id,
        '💰 New Commission Earned!',
        'A user just purchased ' || tier_name || ' Access. You earned LKR ' || 
        TO_CHAR(commission_amount, 'FM9,999,999.00') || ' in commission!',
        'success',
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_creator_commission ON payment_attributions;
CREATE TRIGGER trigger_notify_creator_commission
  AFTER INSERT ON payment_attributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_on_commission();
```

---

## Part 3: Commission Tier System Logic Clarification

### Current Understanding (from edge function):
- Start at Tier 2 (12%) with 30-day protection
- After protection expires, evaluate based on rolling 30-day performance
- Promote if threshold met, demote if not

### User's Desired Logic:
1. **Initial State**: Creator starts at Tier 2 (12%) with 30-day protection
2. **After 30 days, evaluate performance:**
   - If 100+ users in rolling 30 days → KEEP 12% for NEXT 30 days
   - If <100 users → DEMOTE to 8% for NEXT 30 days  
   - If 250+ users → PROMOTE to 15% for NEXT 30 days
   - If 500+ users → PROMOTE to 20% for NEXT 30 days
3. **After each evaluation**, the new tier applies for the NEXT 30-day period

### Required Updates to `evaluate-creator-tiers/index.ts`:

**Key Logic Changes:**
```typescript
// The tier change takes effect for the NEXT 30-day period
// Whether promoted or demoted, give them 30 days at the new tier
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

// Update the creator's tier
const { error: updateError } = await supabase
  .from('creator_profiles')
  .update({
    current_tier_level: newTierLevel,
    monthly_paid_users: monthlyCount,
    // ALWAYS give 30-day protection for the new tier (both promotion AND demotion)
    tier_protection_until: thirtyDaysFromNow,
  })
  .eq('id', creator.id);
```

This ensures:
- Demoted creators stay at lower tier for full 30 days before re-evaluation
- Promoted creators stay at higher tier for full 30 days before re-evaluation
- "Rolling 30 days" is effectively a month-to-month evaluation cycle

---

## Part 4: CEO Dashboard Performance Optimization

### Current Issues
The `fetchStats` function in `AdminDashboard.tsx` makes too many sequential database calls, causing slow loading.

### Optimization Strategy

**1. Parallel Query Execution:**
Group all independent queries into `Promise.all()` blocks.

**2. Add RPC Function for Dashboard Stats:**
Create a single database function that returns all stats in one call:

```sql
-- Already exists: get_admin_dashboard_stats()
-- We need to ensure it returns all needed fields efficiently
```

**3. Add Loading Skeleton States:**
Show skeleton placeholders while data loads instead of blank state.

**4. Use React Query Caching:**
The existing QueryClient already has `refetchOnWindowFocus: false`, but we should add:
- `staleTime: 60000` (1 minute cache)
- Optimistic updates where possible

**5. Reduce Redundant Queries:**
Currently fetching print data separately. Consolidate into single batch.

**File Changes to `src/pages/admin/AdminDashboard.tsx`:**
```typescript
// Wrap all independent queries in Promise.all
const [
  enrollmentResults,
  paymentData,
  printData,
  // ... etc
] = await Promise.all([
  // All queries here
]);

// Add skeleton loading state
if (isLoading) {
  return (
    <AdminDashboardSkeleton />
  );
}
```

---

## Part 5: Creator Dashboard Complete Redesign

### Current Issues (from screenshot):
- Basic card styling
- Unprofessional layout
- Glow effects instead of clean borders
- Missing CMO contact functionality
- Cluttered visual hierarchy

### Design Improvements:

**1. Premium Background**
Add `.creator-premium-bg` class with subtle floating orbs (similar to admin).

**2. Enhanced Header**
- Gradient overlay
- Better badge styling
- Add "Contact Support" button linking to CMO

**3. Stats Cards Redesign**
- Remove outer glows
- Use clean animated borders
- Better icon badges with ring styling
- Consistent color scheme per card type

**4. Visual Hierarchy**
- Larger section headings
- Better card grouping
- Improved spacing (gap-8 instead of gap-6)

**5. Contact CMO Section**
New card at bottom of stats row with:
- CMO name display
- Contact buttons: Email, WhatsApp, Instagram, In-app Chat
- Professional styling

**File: `src/pages/creator/CreatorDashboard.tsx`**

Key UI Changes:
- Replace `animate-pulse-glow` with `animate-border-flow`
- Add Contact CMO card
- Improve stat card styling
- Add premium background class
- Better mobile responsiveness

**New Contact CMO Component Structure:**
```tsx
{creatorData?.cmo_id && creatorData?.cmo_name && (
  <div className="glass-card p-6 mb-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <HeadphonesIcon className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Need Support?</h3>
          <p className="text-sm text-muted-foreground">Contact your CMO: {creatorData.cmo_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {cmoContactInfo?.email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${cmoContactInfo.email}`}>
              <Mail className="w-4 h-4" />
            </a>
          </Button>
        )}
        {cmoContactInfo?.whatsapp && (
          <Button variant="outline" size="sm" asChild>
            <a href={`https://wa.me/${cmoContactInfo.whatsapp}`} target="_blank">
              <MessageCircle className="w-4 h-4" />
            </a>
          </Button>
        )}
        {cmoContactInfo?.instagram && (
          <Button variant="outline" size="sm" asChild>
            <a href={`https://instagram.com/${cmoContactInfo.instagram}`} target="_blank">
              <Instagram className="w-4 h-4" />
            </a>
          </Button>
        )}
        <Button variant="brand" size="sm" onClick={() => openInboxChat(cmoUserId)}>
          <MessageSquare className="w-4 h-4 mr-1" />
          Chat
        </Button>
      </div>
    </div>
  </div>
)}
```

**Database Change - Add CMO Contact Fields:**
```sql
ALTER TABLE cmo_profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;
```

---

## Part 6: Demo Dashboard Overhaul

### Current Issues:
- Hardcoded "Zen Notes" branding
- Basic UI not matching real dashboard
- Doesn't reflect actual `/dashboard` structure
- Not professional enough

### New Requirements:
1. Mirror the exact `/dashboard` UI and styling
2. Same topics, subjects, notes structure
3. Notes are locked based on demo tier simulation
4. No account required to view
5. Professional high-end design

### Implementation:

**Create New `/demo` Route Structure:**
- `/demo` - Selection page (keep current)
- `/demo/dashboard` - Mirrors `/dashboard` exactly

**File: `src/pages/DemoDashboard.tsx` - Complete Rewrite:**

1. **Import and use the same components as Dashboard:**
   - Same header structure with branding hook
   - Same stats cards layout
   - Same subject/topic display

2. **Simulated Enrollment State:**
```typescript
const simulatedEnrollment = {
  tier: 'starter', // Demo users see starter tier view
  grade: selectedGrade,
  stream: selectedStream,
  medium: 'english',
};
```

3. **Topic/Note Access Logic:**
```typescript
// Notes have tier requirements
// In demo mode, show all notes but lock those above starter tier
const isNoteLocked = (noteMinTier: string) => {
  const tierOrder = ['starter', 'standard', 'lifetime'];
  const demoTierIndex = tierOrder.indexOf(simulatedEnrollment.tier);
  const noteTierIndex = tierOrder.indexOf(noteMinTier);
  return noteTierIndex > demoTierIndex;
};
```

4. **UI Elements:**
- Show "Demo Mode" badge in header
- Use same glass cards, stat cards, subject cards
- Add lock icons on premium-tier notes
- CTA buttons to sign up scattered throughout
- Floating CTA at bottom

5. **Professional Styling:**
- Premium background orbs
- Smooth animations
- Proper loading states
- Responsive design

---

## Part 7: Footer - Add Affiliate Program Link

### Current Footer Structure:
- Quick Links: Home, Pricing, About, Enter Code
- Legal: Privacy, Terms, Refund

### Required Addition:
Add "Apply for Affiliate Program" under Quick Links that navigates to `/apply-affiliate`

**File: `src/components/Footer.tsx`**

```tsx
const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
  { name: "About", path: "/about" },
  { name: "Enter Code", path: "/access" },
  { name: "Become an Affiliate", path: "/apply-affiliate" }, // NEW
];
```

---

## Part 8: Standalone Creator Signup (Without CMO)

### Current System:
- Creators MUST have a CMO referral link (`ref_cmo=XXXXXX`)
- If no valid ref_cmo, they see "Invalid Referral Link" error

### Required Change:
Allow creators to sign up independently through `/apply-affiliate` page.

**New Page: `src/pages/ApplyAffiliate.tsx`**

Features:
1. Professional landing page explaining the affiliate/creator program
2. Benefits listed (12% starting commission, tiered system, etc.)
3. Signup form (name, email, password)
4. NO CMO required - cmo_id will be NULL
5. After signup, redirect to onboarding

**Key Differences from CMO-referred signup:**
- No `ref_cmo` validation needed
- `cmo_id` is set to NULL in creator_profiles
- Same referral code generation
- Same role assignment via `set_creator_role` RPC (with `_cmo_id` = NULL)

**File Structure:**
```tsx
// ApplyAffiliate.tsx
const ApplyAffiliate = () => {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    // Sign up user
    // Call set_creator_role with _cmo_id: null
    // Redirect to onboarding
  };
  
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">Affiliate Program</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Earn Money Sharing <span className="text-brand-gradient">Notebase</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Join our affiliate program and earn up to 20% commission on every sale you refer.
            </p>
          </div>
        </div>
      </section>
      
      {/* Benefits Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <BenefitCard 
              icon={DollarSign}
              title="12-20% Commission"
              description="Start at 12% and unlock higher tiers as you grow"
            />
            <BenefitCard 
              icon={Users}
              title="Lifetime Attribution"
              description="Earn from all purchases by your referrals"
            />
            <BenefitCard 
              icon={Wallet}
              title="Easy Withdrawals"
              description="Request payouts anytime with low minimum threshold"
            />
          </div>
        </div>
      </section>
      
      {/* Signup Form */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto glass-card p-6">
            <h2 className="font-display text-xl font-bold text-center mb-6">
              Apply Now
            </h2>
            <form onSubmit={handleSubmit}>
              {/* Form fields */}
            </form>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
};
```

**Update App.tsx:**
```tsx
import ApplyAffiliate from "./pages/ApplyAffiliate";
// ...
<Route path="/apply-affiliate" element={<ApplyAffiliate />} />
```

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `src/pages/ApplyAffiliate.tsx` | Standalone creator signup page |

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add `animate-border-flow` CSS animation |
| `src/pages/creator/CreatorDashboard.tsx` | Complete UI redesign, add Contact CMO, replace glows with border animation |
| `src/pages/admin/AdminDashboard.tsx` | Performance optimization with parallel queries |
| `src/pages/DemoDashboard.tsx` | Complete rewrite to mirror real dashboard |
| `src/pages/DemoSelection.tsx` | Use branding hook, professional styling |
| `src/components/Footer.tsx` | Add "Become an Affiliate" link |
| `src/App.tsx` | Add `/apply-affiliate` route |
| `supabase/functions/evaluate-creator-tiers/index.ts` | Update tier logic for 30-day periods on both promotion AND demotion |

## Database Migrations

1. **Add CMO contact fields:**
```sql
ALTER TABLE cmo_profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;
```

2. **Create commission notification trigger:**
```sql
CREATE OR REPLACE FUNCTION notify_creator_on_commission()
RETURNS TRIGGER AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_creator_commission
  AFTER INSERT ON payment_attributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_on_commission();
```

---

## Technical Notes

1. **Border Animation**: Using CSS only, no JavaScript, for smooth 60fps animation
2. **Demo Dashboard**: Shares logic with real dashboard but with simulated enrollment
3. **Tier System**: 30-day rolling period applies to BOTH promotions and demotions
4. **CMO Contact**: Falls back gracefully if CMO has no contact info set
5. **Performance**: Admin dashboard queries consolidated for faster loading
6. **Affiliate Signup**: Uses existing `set_creator_role` RPC with null CMO

---

## Testing Checklist

- [ ] Balance card has animated border without glow/shadow
- [ ] Creators receive inbox notification when earning commission
- [ ] Tier demotion applies 30-day lock at new tier
- [ ] Tier promotion applies 30-day protection at new tier
- [ ] CEO dashboard loads metrics significantly faster
- [ ] Creator Dashboard has professional, clean appearance
- [ ] Contact CMO buttons work (email, WhatsApp, Instagram, chat)
- [ ] Demo dashboard mirrors real dashboard exactly
- [ ] Demo notes show lock icons based on tier
- [ ] Footer shows "Become an Affiliate" link
- [ ] `/apply-affiliate` page allows signup without CMO
- [ ] Creators signed up via affiliate page have cmo_id = NULL
- [ ] All features work on mobile devices
