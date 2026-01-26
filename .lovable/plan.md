
# Comprehensive Print Request System & Dashboard Enhancement Plan

## Executive Summary
This plan addresses critical issues with the print request system, student dashboard UX, admin panel visibility, content organization, and creator dashboard improvements. The changes will create a fully-functional print request workflow with proper payment handling, admin management, and user notifications.

---

## Issues Identified

| Issue | Description | Priority |
|-------|-------------|----------|
| 1 | Print Requests page missing from CEO sidebar | Critical |
| 2 | Print request dialog needs Bank Transfer flow (bank details, reference, receipt upload) | Critical |
| 3 | Print request dialog needs Card Payment (PayHere) integration | Critical |
| 4 | Print request dialog needs COD confirmation screen | High |
| 5 | User Inbox not visible in `/dashboard` header | High |
| 6 | Print button should show existing orders status, not immediately open new request | High |
| 7 | Metrics showing 0 in `/admin/print-requests` (stats are populated from live data but UI needs refresh) | Medium |
| 8 | Subject page needs quizzes/flashcards under topics (not separate tabs) | Medium |
| 9 | Bank Signup page subject selection needs better UI | Medium |
| 10 | Content Management needs "Is Model Paper?" toggle | Medium |
| 11 | Creator Dashboard UI improvements | Low |
| 12 | Admin needs to send inbox notifications on print request approve/reject | High |

---

## Phase 1: Add Print Requests to CEO Sidebar

### File: `src/components/admin/AdminSidebar.tsx`

**Changes:**
1. Import `Printer` icon from lucide-react
2. Add new menu item under "Requests" group:
   - Label: "Print Requests"
   - Href: `/admin/print-requests`
   - Icon: `Printer`
   - Badge: `stats.pendingPrintRequests` (new stat)

3. Update `AdminSidebarProps` interface to include `pendingPrintRequests: number`

### File: `src/pages/admin/AdminDashboard.tsx`

**Changes:**
1. Add query to count pending print requests
2. Pass the count to AdminSidebar

---

## Phase 2: Redesign Print Request Dialog (Complete Overhaul)

### File: `src/components/dashboard/PrintRequestDialog.tsx`

**Current Behavior:** Opens a multi-step form to create new request
**New Behavior:** 
- First screen shows existing orders (if any) with status tracking
- "New Request" button to create additional orders
- Proper payment flows for each method

### 2.1 New Dialog Structure

**Screen 1: Order Status (Default View)**
```
[Your Print Orders]
- If no orders: "No print orders yet" + "Request Printouts" button
- If orders exist: 
  - List of orders with status badges (Pending/Processing/Shipped/Delivered)
  - Tracking number if available
  - Click to expand details
  - "+ New Request" button at bottom
```

**Screen 2-6: Create New Order (existing multi-step flow)**

### 2.2 Bank Transfer Flow Enhancement

When user selects "Bank Transfer" in Step 4:

**Step 4.1: Bank Details Screen**
```
Bank: [Bank Name from payment_settings]
Account: [Account Number]
Account Holder: [Account Holder Name]
Branch: [Branch Name]

Reference Number: PR-XXXXX (5-letter alphanumeric)
Amount: Rs. [Total Amount]

[Upload Receipt Button]
[File name once uploaded]

[Submit Request]
```

**Backend Changes:**
- Store `reference_number` in print_requests
- Store `receipt_url` in print_requests
- Set `payment_status` to 'pending_verification'

### 2.3 Card Payment Flow (PayHere Integration)

When user selects "Card Payment":

1. Call edge function to generate PayHere hash (similar to existing flow)
2. Create payment form and submit to PayHere sandbox
3. Handle return URL with success/failure
4. Update print_request payment_status accordingly

**Edge Function Update:** `supabase/functions/payhere-checkout/index.ts`
- Add handling for `payment_type: 'print_request'`
- Store `print_request_id` in payment record

### 2.4 COD Flow Enhancement

When user selects "Cash on Delivery":

**Confirmation Screen:**
```
[Truck Icon]
Cash on Delivery

Your order will be prepared and shipped.
Payment of Rs. [Total + COD Fee] will be collected upon delivery.

Delivery Address:
[Address]
[City]

Contact: [Phone]

[X] I understand that payment will be collected upon delivery

[Confirm Order]
```

---

## Phase 3: Add Inbox Button to Student Dashboard

### File: `src/pages/Dashboard.tsx`

**Changes:**
1. Import `InboxButton` from `@/components/inbox/InboxButton`
2. Add `<InboxButton />` to the header section next to the Logout button

```tsx
<div className="flex items-center gap-4">
  {/* Tier Badge */}
  <div className={...}>...</div>
  
  <InboxButton />  {/* ADD THIS */}
  
  <Button variant="ghost" size="icon" onClick={signOut}>
    <LogOut className="w-5 h-5" />
  </Button>
</div>
```

---

## Phase 4: Admin Print Request Management Enhancements

### File: `src/pages/admin/PrintRequests.tsx`

**Changes:**

### 4.1 Fix Metrics Display
The metrics currently filter from `requests` array which is correct. The issue is the initial fetch may return 0 if no print_settings exist. Add fallback:

```tsx
// Ensure stats are calculated from actual data
const pendingCount = requests.filter(r => r.status === 'pending').length;
const processingCount = requests.filter(r => r.status === 'processing').length;
// etc.
```

### 4.2 Add Approve/Reject Actions for Bank Transfer Requests

When a bank transfer request is pending:
- Show "Approve" and "Reject" buttons
- On Approve:
  - Update status to 'confirmed'
  - Update payment_status to 'paid'
  - Send inbox notification to user
  - Send Telegram notification
- On Reject:
  - Update status to 'cancelled'
  - Require rejection reason
  - Send inbox notification with reason

### 4.3 Receipt Viewer

Add ability to view/download uploaded receipts:
```tsx
{request.receipt_url && (
  <Button variant="outline" size="sm" onClick={() => viewReceipt(request.receipt_url)}>
    <Download className="w-4 h-4 mr-1" />
    Receipt
  </Button>
)}
```

---

## Phase 5: Print Request Inbox Notifications

### Notification Templates

**On Bank Transfer Approval:**
```
Subject: Print Order Confirmed - PR-XXXXX
Body: Great news! Your print request (PR-XXXXX) has been approved and is now being processed. You will receive tracking information once your order ships.
```

**On Bank Transfer Rejection:**
```
Subject: Print Order Update - PR-XXXXX
Body: Unfortunately, we couldn't verify your payment for print request PR-XXXXX. Reason: [Admin Notes]. Please contact support if you believe this is an error.
```

**On Status Update (Shipped):**
```
Subject: Your Order Has Shipped! - PR-XXXXX
Body: Your print order (PR-XXXXX) is on its way! Tracking number: [TRACKING]. Expected delivery in 3-5 business days.
```

**On Card Payment Success:**
```
Subject: Payment Confirmed - PR-XXXXX
Body: Your payment has been received! Your print order (PR-XXXXX) is now being processed.
```

---

## Phase 6: Database Schema Updates

### Add Missing Columns to print_requests

```sql
ALTER TABLE print_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE print_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

### Update RLS Policy for Receipt Upload

```sql
-- Allow users to update their own print requests (for receipt upload)
CREATE POLICY "Users can update own print requests"
  ON print_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Phase 7: Content Management - Model Paper Toggle

### File: `src/pages/admin/ContentManagement.tsx`

**Changes in Note Upload Section (around line 432):**

1. Add state for model paper toggle:
```tsx
const [isModelPaper, setIsModelPaper] = useState(false);
```

2. Add toggle UI below tier selection:
```tsx
<div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
  <Switch
    id="is-model-paper"
    checked={isModelPaper}
    onCheckedChange={setIsModelPaper}
  />
  <Label htmlFor="is-model-paper" className="flex flex-col">
    <span className="font-medium">Model Paper</span>
    <span className="text-xs text-muted-foreground">Mark as past paper/practice exam</span>
  </Label>
</div>
```

3. Update insert query:
```tsx
.insert({
  // ... existing fields
  is_model_paper: isModelPaper,
})
```

4. Reset after upload:
```tsx
setIsModelPaper(false);
```

---

## Phase 8: Subject Page - Integrate Quizzes & Flashcards Under Topics

### File: `src/pages/Subject.tsx`

**Major Restructure:**

Remove the Tabs component. Instead, when a topic expands, show three collapsible sections:

```
[Topic Name] [Click to expand]
├── Notes Section
│   ├── Note 1 [View] or [Locked]
│   └── Note 2 [View] or [Locked]
├── Flashcards Section (if any for this topic)
│   └── Set 1 - 20 cards [Study] or [Locked]
└── Quizzes Section (if any for this topic)
    └── Quiz 1 - 15 questions [Start] or [Locked]
```

**Implementation:**
1. Remove TabsList and TabsTrigger components
2. Remove TabsContent wrappers
3. Inside expanded topic section, add:
   - Notes list (existing)
   - Flashcards filtered by `topic_id === topic.id`
   - Quizzes filtered by `topic_id === topic.id`

---

## Phase 9: Bank Signup UI Enhancement

### File: `src/pages/BankSignup.tsx`

**Changes to Subjects Step (step === 'subjects'):**

1. Add decorative gradient orbs (matching PaidSignup)
2. Enhance subject cards with:
   - Glass morphism effect
   - Animated checkmarks
   - Hover states
   - Icon based on basket type

```tsx
<div className={`
  relative overflow-hidden rounded-xl p-4 border-2 transition-all cursor-pointer
  ${isSelected 
    ? 'border-brand bg-brand/10 shadow-lg shadow-brand/20' 
    : 'border-border bg-card hover:border-brand/50'
  }
`}>
  <div className="absolute top-2 right-2">
    {isSelected && (
      <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    )}
  </div>
  {/* Subject content */}
</div>
```

---

## Phase 10: Creator Dashboard UI Tweaks

### File: `src/pages/creator/CreatorDashboard.tsx`

**Improvements:**
1. Add subtle gradient background to stat cards
2. Improve mobile responsiveness for charts
3. Add skeleton loading states
4. Enhance color contrast on dark mode
5. Add tooltip explanations for complex metrics

---

## Implementation Order

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1 | Add Print Requests to CEO sidebar | AdminSidebar.tsx, AdminDashboard.tsx | 30 min |
| 2 | Add InboxButton to student Dashboard | Dashboard.tsx | 15 min |
| 3 | Database migration for receipt_url, rejection_reason | New migration | 15 min |
| 4 | Overhaul PrintRequestDialog (order status view) | PrintRequestDialog.tsx | 2 hours |
| 5 | Implement Bank Transfer flow (reference, receipt) | PrintRequestDialog.tsx | 1.5 hours |
| 6 | Implement Card Payment (PayHere) flow | PrintRequestDialog.tsx, payhere-checkout | 2 hours |
| 7 | Implement COD confirmation | PrintRequestDialog.tsx | 30 min |
| 8 | Enhance admin PrintRequests (approve/reject/notifications) | PrintRequests.tsx | 1.5 hours |
| 9 | Add Model Paper toggle to ContentManagement | ContentManagement.tsx | 30 min |
| 10 | Restructure Subject page (quizzes/flashcards under topics) | Subject.tsx | 2 hours |
| 11 | Enhance BankSignup subject selection UI | BankSignup.tsx | 1 hour |
| 12 | Creator Dashboard UI tweaks | CreatorDashboard.tsx | 1 hour |

---

## Technical Details

### PayHere Integration for Print Requests

The existing `payhere-checkout` edge function will be extended to handle print requests:

```typescript
// In generate-hash handler, check for print_request_id
if (print_request_id) {
  // Store in custom_2 field as "print_XXXX"
  custom_2 = `print_${print_request_id}`;
}

// In notify handler, check for print payment
if (custom_2?.startsWith('print_')) {
  const printRequestId = custom_2.replace('print_', '');
  // Update print_request payment_status
  await supabase
    .from('print_requests')
    .update({ 
      payment_status: status_code === '2' ? 'paid' : 'failed',
      order_id: order_id 
    })
    .eq('id', printRequestId);
}
```

### Bank Transfer Reference Number Generation

```typescript
function generateReferenceNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PR-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

### Inbox Notification Function

```typescript
async function sendPrintNotification(
  userId: string, 
  subject: string, 
  body: string
) {
  await supabase.from('messages').insert({
    recipient_id: userId,
    recipient_type: 'student',
    subject,
    body,
    is_read: false
  });
}
```

---

## Testing Checklist

- [ ] Print Requests visible in CEO sidebar with badge count
- [ ] Student dashboard shows Inbox button in header
- [ ] Clicking print button shows existing orders (if any)
- [ ] Bank transfer shows bank details, generates reference, allows receipt upload
- [ ] Card payment opens PayHere popup, handles success/failure
- [ ] COD shows confirmation screen with terms
- [ ] Admin can approve/reject bank transfer requests
- [ ] Inbox notifications sent on all status changes
- [ ] Model paper toggle works in content management
- [ ] Quizzes/flashcards appear under topics in subject page
- [ ] Bank signup subject selection has improved UI
