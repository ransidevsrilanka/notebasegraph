

# Comprehensive Fix Plan: Print Requests, Security, Admin Dashboard & More

## Issues Identified & Root Causes

### 1. Card Payment Error "Failed to initiate payment"
**Root Cause:** The `initiateCardPayment` function in `PrintRequestDialog.tsx` calls the edge function but doesn't pass the required path. The edge function expects `payhere-checkout/generate-hash` but it's being called without the path.

**Current Code (line 354):**
```typescript
await supabase.functions.invoke('payhere-checkout', { body: {...} })
```

**Fix:** Call with the correct endpoint path or handle the default routing in the edge function.

### 2. OTP Verification Failing for Delete All Enrollments
**Root Cause:** The code calls `admin-finance/verify-refund-otp` (line 477 in Enrollments.tsx) but this endpoint DOESN'T EXIST in the `admin-finance` edge function! The function has no `verify-refund-otp` handler.

**Fix:** Add a `verify-refund-otp` endpoint to the `admin-finance` edge function that checks against `REFUND_OTP_CODE` secret.

### 3. Print Requests Page Layout - Vertical Dialog Too Tall
**Issue:** The detail dialog shows content vertically making it hard to see everything.

**Fix:** Redesign the detail view to use a horizontal/grid layout that fits better on screen.

### 4. Receipt Handling - Send to Telegram Instead of Storing
**Issue:** Currently receipts are uploaded to storage bucket. User wants them sent directly to Telegram without database storage.

**Fix:** 
- Create a new edge function or extend `send-telegram-notification` to accept file attachments
- Use Telegram's `sendDocument` API instead of `sendMessage`
- Remove storage upload logic from print request dialog
- Apply same pattern to join requests and upgrade requests

### 5. Missing sitemap.xml
**Issue:** No sitemap.xml exists for SEO.

**Fix:** Create `public/sitemap.xml` with proper structure.

### 6. Print Revenue Missing from CEO Dashboard
**Issue:** Print request revenue isn't tracked or displayed.

**Fix:** 
- Track print request payments in `payment_attributions` or a new `print_payments` table
- Add print revenue metrics to admin dashboard stats

### 7. CEO Dashboard Metric Cards Too Large
**Issue:** Current layout uses 5 large cards that limit adding more metrics.

**Fix:** Create a compact grid layout with smaller stat cards (2-3 rows, 6-8 columns) to show more metrics including:
- Total Revenue, This Month, Last Month
- Profit (if cost data available)
- Print Revenue
- Card vs Bank breakdown
- Students, Creators, CMOs
- Pending requests counts

### 8. Users Shouldn't Choose Page Count
**Issue:** Users currently input `estimatedPages` manually, allowing manipulation.

**Fix:**
- Add `page_count` column to `notes` table (entered by admin when uploading)
- Remove page estimation from user-facing print request
- Calculate price server-side based on actual note page counts
- Store pricing in database, not frontend

### 9. Remove Notes from Print Requests - Only Sell Papers
**Issue:** Current system allows both notes and model papers. User wants only model papers.

**Fix:**
- Remove "notes_only" and "both" options from PrintType
- Rename system to "Paper Printing" or similar
- Update UI to only show model paper selection
- Update database queries to only fetch `is_model_paper = true` notes

### 10. Print Settings Should Be in /admin/pricing Not /admin/payment-settings
**Issue:** Print pricing was added to payment-settings but should be in pricing.

**Fix:** Move `PrintSettingsPanel` integration to `PricingSettings.tsx` instead.

### 11. Security - Server-Side Price Calculation
**Critical Issue:** Frontend calculates prices which users can manipulate.

**Fix:**
- Create edge function to calculate print request total
- Pass only item IDs, not prices, from frontend
- Validate all pricing server-side before accepting payment
- Use database pricing only, never trust frontend values

---

## Implementation Plan

### Phase 1: Fix Critical Bugs

#### 1.1 Fix Card Payment Error
**File:** `src/components/dashboard/PrintRequestDialog.tsx`

Change the function invoke to include the path:
```typescript
const { data, error } = await supabase.functions.invoke('payhere-checkout/generate-hash', {
  body: {
    // ... existing body
  }
});
```

Or update the edge function to handle requests without path as `generate-hash` by default.

#### 1.2 Add OTP Verification Endpoint
**File:** `supabase/functions/admin-finance/index.ts`

Add new handler after line 211:
```typescript
// Verify OTP for destructive actions
if (path === "verify-refund-otp" && req.method === "POST") {
  const { otp_code } = await req.json();
  const validCode = Deno.env.get("REFUND_OTP_CODE");
  
  if (!validCode) {
    return new Response(
      JSON.stringify({ valid: false, error: "OTP not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  const isValid = otp_code === validCode;
  return new Response(
    JSON.stringify({ valid: isValid }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

### Phase 2: Receipt to Telegram (No Storage)

#### 2.1 Create New Edge Function for Document Sending
**New File:** `supabase/functions/send-telegram-document/index.ts`

```typescript
// Uses Telegram sendDocument API to send files
// Accepts base64 file data and metadata
// Sends to configured chat ID

interface DocumentPayload {
  type: 'join_request' | 'upgrade_request' | 'print_request';
  message: string;
  file_base64: string;
  file_name: string;
  file_type: 'image/png' | 'image/jpeg' | 'application/pdf';
  data?: Record<string, unknown>;
}

// Use fetch with FormData to send to:
// https://api.telegram.org/bot{token}/sendDocument
```

#### 2.2 Update PrintRequestDialog
**File:** `src/components/dashboard/PrintRequestDialog.tsx`

- Remove `handleReceiptUpload` storage logic
- Convert file to base64 in frontend
- Send via new edge function instead of storing
- Remove `receipt_url` from database insert

#### 2.3 Update Join/Upgrade Request Dialogs Similarly
Apply same pattern to remove storage for all receipt types.

---

### Phase 3: Overhaul Print Request System

#### 3.1 Update Notes Table with Page Count
**Migration:**
```sql
-- Already have is_model_paper, add page_count
ALTER TABLE notes ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;
```

#### 3.2 Update Content Management
**File:** `src/pages/admin/ContentManagement.tsx`

Add page count input when uploading notes:
```tsx
<div>
  <Label>Number of Pages</Label>
  <Input 
    type="number" 
    min="1" 
    value={pageCount}
    onChange={(e) => setPageCount(Number(e.target.value))}
  />
</div>
```

#### 3.3 Simplify Print Request - Papers Only
**File:** `src/components/dashboard/PrintRequestDialog.tsx`

Remove PrintType selection entirely - only allow model papers:
- Remove Step 1 (content type selection)
- Query only notes where `is_model_paper = true`
- Let user select which papers to print
- Calculate price from paper page counts × price per page

#### 3.4 Create Server-Side Price Calculation Edge Function
**New File:** `supabase/functions/calculate-print-price/index.ts`

```typescript
// Input: { paper_ids: string[], delivery_method: 'standard' | 'cod' }
// Process:
// 1. Fetch papers from database with their page_count
// 2. Fetch pricing from site_settings
// 3. Calculate: total_pages * price_per_page + delivery_fee + (cod ? cod_fee : 0)
// 4. Return: { total_pages, subtotal, delivery_fee, cod_fee, total }
```

#### 3.5 Update PrintRequestDialog to Use Server Pricing
- Call edge function to get price when papers are selected
- Display server-calculated price (read-only)
- Submit order with only paper IDs, not prices
- Edge function validates and calculates final price

---

### Phase 4: Admin UI Improvements

#### 4.1 Horizontal Layout for Print Requests Detail
**File:** `src/pages/admin/PrintRequests.tsx`

Redesign the detail dialog to use a grid layout:
```tsx
<DialogContent className="max-w-4xl">
  <div className="grid grid-cols-2 gap-6">
    {/* Left Column: Customer & Order Info */}
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name</Label><p>{request.full_name}</p></div>
        <div><Label>Phone</Label><p>{request.phone}</p></div>
        <div><Label>Subject</Label><p>{request.subject_name}</p></div>
        <div><Label>Type</Label><p>{request.print_type}</p></div>
        <div><Label>Pages</Label><p>{request.estimated_pages}</p></div>
        <div><Label>Total</Label><p className="text-brand">Rs. {request.total_amount}</p></div>
      </div>
      <div><Label>Address</Label><p>{request.address}</p></div>
    </div>
    
    {/* Right Column: Actions */}
    <div className="space-y-4">
      {isPendingBankTransfer && (
        <div className="p-4 bg-warning/10 rounded-lg">
          <div className="flex gap-2">
            <Button variant="brand" onClick={approveRequest}>Approve</Button>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>Reject</Button>
          </div>
        </div>
      )}
      <div>
        <Label>Tracking Number</Label>
        <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
      </div>
      <div>
        <Label>Admin Notes</Label>
        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map(status => (
          <Button key={status} variant="outline" size="sm">
            {status}
          </Button>
        ))}
      </div>
    </div>
  </div>
</DialogContent>
```

#### 4.2 Compact CEO Dashboard Metrics
**File:** `src/pages/admin/AdminDashboard.tsx`

Create a more compact grid with mini stat cards:
```tsx
// Replace current 5-card row with compact 2-row grid
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
  <MiniStatCard label="Total Revenue" value={stats.totalRevenue} format="currency" />
  <MiniStatCard label="This Month" value={stats.thisMonthRevenue} format="currency" />
  <MiniStatCard label="Last Month" value={stats.lastMonthRevenue} format="currency" />
  <MiniStatCard label="Print Revenue" value={stats.printRevenue} format="currency" />
  <MiniStatCard label="Card Payments" value={stats.cardPayments} format="currency" />
  <MiniStatCard label="Bank Payments" value={stats.bankPayments} format="currency" />
  <MiniStatCard label="Students" value={stats.totalStudents} />
  <MiniStatCard label="Creators" value={stats.totalCreators} />
  <MiniStatCard label="CMOs" value={stats.totalCMOs} />
  <MiniStatCard label="Active Codes" value={stats.activeCodes} />
  <MiniStatCard label="Pending Upgrades" value={stats.pendingUpgrades} highlight />
  <MiniStatCard label="Pending Prints" value={stats.pendingPrintRequests} highlight />
</div>
```

Create new `MiniStatCard` component with smaller padding and font sizes.

#### 4.3 Add Print Revenue Tracking
Update `fetchStats` to query print request revenue:
```typescript
const { data: printPayments } = await supabase
  .from('print_requests')
  .select('total_amount')
  .eq('payment_status', 'paid');

const printRevenue = (printPayments || []).reduce(
  (sum, p) => sum + Number(p.total_amount || 0), 0
);
```

---

### Phase 5: Move Print Settings to Pricing Page

#### 5.1 Remove from PaymentSettings
**File:** `src/pages/admin/PaymentSettings.tsx`

Remove the `PrintSettingsPanel` import and component usage.

#### 5.2 Add to PricingSettings
**File:** `src/pages/admin/PricingSettings.tsx`

Import and add `PrintSettingsPanel`:
```tsx
import PrintSettingsPanel from '@/components/dashboard/PrintSettingsPanel';

// In the return, after tier pricing cards:
<div className="mt-6">
  <h2 className="font-display text-lg font-semibold mb-4">Print Request Pricing</h2>
  <PrintSettingsPanel />
</div>
```

---

### Phase 6: Create sitemap.xml

**New File:** `public/sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://notebase.lovable.app/</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://notebase.lovable.app/about</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://notebase.lovable.app/pricing</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://notebase.lovable.app/access</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://notebase.lovable.app/auth</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

---

### Phase 7: Security Hardening

#### 7.1 Server-Side Price Validation
All pricing calculations MUST happen in edge functions:
- Never trust frontend price values
- Always recalculate from database before processing payment
- Log any mismatches for security monitoring

#### 7.2 File Type Validation
Only allow PNG, JPG, PDF for receipts:
```typescript
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
if (!ALLOWED_TYPES.includes(file.type)) {
  toast.error('Only PNG, JPG, or PDF files are allowed');
  return;
}
```

#### 7.3 Input Sanitization
Already using Zod for validation - ensure all user inputs are validated server-side.

---

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `supabase/functions/admin-finance/index.ts` | Add verify-refund-otp endpoint | Critical |
| `supabase/functions/payhere-checkout/index.ts` | Fix routing for print requests | Critical |
| `supabase/functions/send-telegram-document/index.ts` | New - send files to Telegram | High |
| `supabase/functions/calculate-print-price/index.ts` | New - server-side pricing | High |
| `src/components/dashboard/PrintRequestDialog.tsx` | Major overhaul - papers only, server pricing | High |
| `src/pages/admin/PrintRequests.tsx` | Horizontal layout | Medium |
| `src/pages/admin/AdminDashboard.tsx` | Compact metrics grid | Medium |
| `src/components/dashboard/MiniStatCard.tsx` | New compact stat card | Medium |
| `src/pages/admin/PricingSettings.tsx` | Add print pricing section | Medium |
| `src/pages/admin/PaymentSettings.tsx` | Remove print pricing | Medium |
| `src/pages/admin/ContentManagement.tsx` | Add page count input | Medium |
| `public/sitemap.xml` | New | Low |
| Database Migration | Add page_count to notes | Medium |

---

## Security Checklist

- [ ] All prices calculated server-side
- [ ] File types validated (PNG, JPG, PDF only)
- [ ] No sensitive data in localStorage
- [ ] OTP verification working
- [ ] RLS policies unchanged
- [ ] Receipt files sent to Telegram, not stored

---

## Testing Checklist

- [ ] Card payment initiates PayHere popup
- [ ] OTP verification works for delete all
- [ ] Print request shows only papers
- [ ] Price calculated from actual page counts
- [ ] Receipts sent to Telegram
- [ ] CEO dashboard shows print revenue
- [ ] Print settings in /admin/pricing
- [ ] sitemap.xml accessible

