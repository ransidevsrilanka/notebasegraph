
# Comprehensive Feature Enhancement Plan

## Overview
This plan addresses multiple feature requests spanning admin functionality, student UX, content organization, and a new print request system with backend support.

---

## Phase 1: Enrollments Page - Delete All Button

### File: `src/pages/admin/Enrollments.tsx`

**Changes:**
1. Add a "Delete All Enrollments" button in the header section (line ~203)
2. Create a confirmation dialog requiring the admin to type "DELETE ALL" to confirm
3. Implement cascading delete logic:
   - Delete related `user_subjects` records first
   - Delete `enrollments` records
   - Optionally: Clear related `profiles` (but not auth.users)

**Security Considerations:**
- Require 2FA/OTP verification (reuse existing `OTPVerificationDialog`)
- Add Telegram notification when bulk delete is executed
- Log the action to an audit table

---

## Phase 2: Payment Dialog - Logged-In User Experience

### File: `src/components/PaymentMethodDialog.tsx`

**Issue:** Logged-in users with existing enrollment see payment options when they should just return to dashboard.

**Changes:**
1. Accept new prop `hasExistingEnrollment: boolean`
2. If user is logged in AND has an active enrollment:
   - Show "You're already enrolled!" message
   - Display "Back to Dashboard" button
   - Hide payment method buttons
3. PricingSection should pass `useAuth()` enrollment status to the dialog

```tsx
// New condition check at start of dialog content:
if (hasExistingEnrollment) {
  return (
    <div>
      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
      <h2>You're Already Enrolled!</h2>
      <p>You have an active {tierName} subscription.</p>
      <Button onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
```

---

## Phase 3: Integrate Quizzes & Flashcards Under Topics

### File: `src/pages/Subject.tsx`

**Current Structure:** Three separate tabs (Notes, Flashcards, Quizzes)
**New Structure:** Single unified view where each topic expands to show Notes, then Flashcards, then Quizzes

**Implementation:**

1. **Remove the Tabs component entirely** (lines 265-280)

2. **Restructure the topic expansion** (lines 295-390):
   - When a topic expands, show three sections:
     - **Notes Section** (existing)
     - **Flashcards Section** (filtered by `topic_id`)
     - **Quizzes Section** (filtered by `topic_id`)

3. **Add topic-specific filtering:**
```tsx
// Inside the expanded topic view:
const topicFlashcards = flashcardSets.filter(fc => fc.topic_id === topic.id);
const topicQuizzes = quizzes.filter(q => q.topic_id === topic.id);
```

4. **UI Layout for expanded topic:**
```
[Topic Header - Click to expand]
├── Notes (with locked/unlocked badges)
│   ├── Note 1 [View] or [Locked]
│   └── Note 2 [View] or [Locked]
├── Flashcards (if any for this topic)
│   └── Flashcard Set 1 - 20 cards [Study] or [Locked]
└── Quizzes (if any for this topic)
    └── Quiz 1 - 15 questions [Start] or [Locked]
```

5. **Show locked/unlocked status** based on tier (already have `canAccess()` function)

---

## Phase 4: Bank Transfer Subject Selection - UI Enhancement

### File: `src/pages/BankSignup.tsx`

**Issue:** The subjects step (step='subjects') is visually basic compared to card payment flow.

**Changes (lines 500-705):**

1. **Add visual styling matching PaidSignup:**
   - Add decorative gradients and blur orbs
   - Use glass-card styling for subject selection
   - Add animated checkmarks for selected subjects

2. **Enhance subject cards:**
```tsx
<div className={`
  relative overflow-hidden rounded-xl p-4 border-2 transition-all cursor-pointer
  ${isSelected ? 'border-brand bg-brand/10' : 'border-border bg-card hover:border-brand/50'}
`}>
  {/* Subject icon based on basket */}
  {/* Subject name with description */}
  {/* Checkmark animation when selected */}
</div>
```

3. **Add validation feedback section:**
   - Show basket requirements
   - Show warnings/errors in styled cards

---

## Phase 5: PDF Viewer - Get from Play Store Banner

### File: `src/components/PDFViewer/PDFViewer.tsx`

**Changes:**

Add a banner below the PDF canvas (after line 325):

```tsx
{/* App Download Banner */}
<div className="mt-4 p-4 bg-gradient-to-r from-brand/10 to-primary/10 rounded-lg border border-brand/20">
  <div className="flex items-center gap-4 justify-center">
    <img 
      src="/google-play-badge.png" 
      alt="Get it on Google Play"
      className="h-12 cursor-pointer hover:scale-105 transition-transform"
      onClick={() => window.open('https://play.google.com/store/apps/details?id=YOUR_APP_ID', '_blank')}
    />
    <div className="text-left">
      <p className="font-medium text-foreground text-sm">📱 View Offline on Our App</p>
      <p className="text-xs text-muted-foreground">
        Download documents and study without internet
      </p>
    </div>
  </div>
</div>
```

**Assets Required:**
- Add Google Play badge image to `public/google-play-badge.png`

---

## Phase 6: Content Management - Model Paper Toggle

### File: `src/pages/admin/ContentManagement.tsx`

### Database: Add new column to `notes` table

**Migration:**
```sql
ALTER TABLE public.notes ADD COLUMN is_model_paper BOOLEAN DEFAULT false;
```

**UI Changes (around lines 430-475 in the note upload form):**

Add a toggle switch:
```tsx
<div className="flex items-center space-x-2">
  <Switch
    id="is-model-paper"
    checked={isModelPaper}
    onCheckedChange={setIsModelPaper}
  />
  <Label htmlFor="is-model-paper">
    This is a Model Paper
  </Label>
</div>
```

**Update the insert query:**
```tsx
.insert({
  // ... existing fields
  is_model_paper: isModelPaper,
})
```

---

## Phase 7: Print Request System

This is a comprehensive new feature requiring multiple components.

### 7.1 Database Schema

**New Tables:**

```sql
-- Print Request Settings (for admin pricing)
CREATE TABLE public.print_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notes_price_per_page NUMERIC DEFAULT 5,      -- LKR per page
  model_paper_price_per_page NUMERIC DEFAULT 8,
  base_delivery_fee NUMERIC DEFAULT 200,
  cod_extra_fee NUMERIC DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Print Requests
CREATE TABLE public.print_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, confirmed, processing, shipped, delivered, cancelled
  
  -- Delivery Info
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  
  -- Order Details
  print_type TEXT NOT NULL,  -- notes_only, model_papers_only, both
  subject TEXT NOT NULL,
  topic TEXT,
  
  -- Pricing
  estimated_pages INTEGER DEFAULT 0,
  estimated_price NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  
  -- Payment
  payment_method TEXT NOT NULL,  -- card, bank_transfer, cod
  payment_status TEXT DEFAULT 'pending',  -- pending, paid, refunded
  order_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Print Request Items (what's being printed)
CREATE TABLE public.print_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES print_requests(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id),
  topic_id UUID REFERENCES topics(id),
  item_type TEXT NOT NULL,  -- note, model_paper
  title TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  price_per_page NUMERIC DEFAULT 5,
  subtotal NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 7.2 Dashboard - Print Request Button

**File: `src/pages/Dashboard.tsx`**

Add new stat card or button (around line ~395):

```tsx
<div 
  className="glass-card p-5 cursor-pointer hover:border-brand/30 transition-all"
  onClick={() => setShowPrintRequestDialog(true)}
>
  <div className="flex items-center gap-3 mb-2">
    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
      <Printer className="w-4 h-4 text-orange-500" />
    </div>
  </div>
  <p className="text-lg font-display font-bold text-foreground">Request Printouts</p>
  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
    Notes & Model Papers
  </p>
</div>
```

### 7.3 Print Request Dialog Component

**New File: `src/components/dashboard/PrintRequestDialog.tsx`**

Multi-step dialog:

**Step 1: Select Content Type**
- [ ] Notes Only
- [ ] Model Papers Only  
- [ ] Both Notes & Model Papers

**Step 2: Select Subject & Topics**
- Dropdown: Select Subject (from user's enrolled subjects)
- Multi-select: Select Topics (or "All Topics")
- Shows estimated page count and price preview

**Step 3: Delivery Information**
- Full Name (pre-filled from profile)
- Address (textarea)
- Phone Number
- City

**Step 4: Payment Method**
- Card Payment (via PayHere)
- Bank Transfer (shows account details)
- Cash on Delivery (COD) - additional fee noted

**Step 5: Confirmation**
- Order summary
- Total price breakdown
- Submit button

### 7.4 CEO Dashboard - Print Settings Panel

**File: `src/pages/admin/AdminDashboard.tsx` OR new file `src/pages/admin/PrintSettings.tsx`**

Add a new section/page for managing print pricing:

```tsx
<div className="glass-card p-6">
  <h3 className="font-semibold mb-4 flex items-center gap-2">
    <Printer className="w-5 h-5 text-brand" />
    Print Request Pricing
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label>Notes Price (per page)</Label>
      <Input type="number" value={notesPrice} onChange={...} />
      <span className="text-xs text-muted-foreground">LKR</span>
    </div>
    
    <div>
      <Label>Model Paper Price (per page)</Label>
      <Input type="number" value={modelPaperPrice} onChange={...} />
    </div>
    
    <div>
      <Label>Base Delivery Fee</Label>
      <Input type="number" value={deliveryFee} onChange={...} />
    </div>
    
    <div>
      <Label>COD Extra Fee</Label>
      <Input type="number" value={codFee} onChange={...} />
    </div>
  </div>
  
  <Button onClick={saveSettings}>Save Pricing</Button>
</div>
```

### 7.5 Admin Panel - Print Requests Management

**New File: `src/pages/admin/PrintRequests.tsx`**

Features:
- List all print requests with status filtering
- View request details
- Update status (Processing, Shipped, Delivered)
- Add tracking number
- Print request summary for fulfillment

---

## Phase 8: Additional Files to Create/Modify

### New Files:
1. `src/components/dashboard/PrintRequestDialog.tsx`
2. `src/pages/admin/PrintRequests.tsx`

### Modified Files:
1. `src/pages/admin/Enrollments.tsx` - Delete all button
2. `src/components/PaymentMethodDialog.tsx` - Logged-in check
3. `src/components/PricingSection.tsx` - Pass enrollment status
4. `src/pages/Subject.tsx` - Restructure tabs to unified view
5. `src/pages/BankSignup.tsx` - Enhance subject selection UI
6. `src/components/PDFViewer/PDFViewer.tsx` - Add app banner
7. `src/pages/admin/ContentManagement.tsx` - Model paper toggle
8. `src/pages/Dashboard.tsx` - Print request button
9. `src/pages/admin/AdminDashboard.tsx` - Link to print settings

### Database Migrations:
1. Add `is_model_paper` column to `notes` table
2. Create `print_settings` table
3. Create `print_requests` table
4. Create `print_request_items` table
5. Add RLS policies for new tables

---

## Implementation Order

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Payment Dialog - Logged-in check | 30 min |
| 2 | Enrollments - Delete all button | 1 hour |
| 3 | Subject Page - Integrate quizzes/flashcards under topics | 2 hours |
| 4 | Content Management - Model paper toggle | 30 min |
| 5 | PDF Viewer - Play Store banner | 30 min |
| 6 | Bank Signup - UI enhancement | 1 hour |
| 7 | Database - Print system tables | 30 min |
| 8 | Dashboard - Print request button + dialog | 3 hours |
| 9 | Admin - Print settings panel | 1 hour |
| 10 | Admin - Print requests management | 2 hours |

---

## Technical Notes

### Security for Delete All Enrollments:
- Wrap in transaction via edge function
- Require OTP verification
- Send Telegram notification
- Log to audit table

### Print Request Pricing Logic:
```typescript
const calculateTotal = (items, deliveryFee, codFee, paymentMethod) => {
  const itemsTotal = items.reduce((sum, item) => 
    sum + (item.page_count * item.price_per_page), 0
  );
  const codCharge = paymentMethod === 'cod' ? codFee : 0;
  return itemsTotal + deliveryFee + codCharge;
};
```

### Subject Page Restructure:
The key change is removing the Tabs wrapper and moving content inside each topic's expanded section. This provides a more intuitive flow where students can:
1. Expand a topic
2. Read the notes
3. Practice with flashcards
4. Test knowledge with quiz

All without switching tabs or losing context.
