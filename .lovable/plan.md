
# Critical Platform Fixes - Payment Verification, Data Visibility & Dashboard Metrics

## Issues Identified

### 1. Card Payment Marked as Paid Despite Failure (CRITICAL SECURITY)

**Root Cause Analysis:**
The print request card payment flow uses "deferred creation" - the print request record is only created AFTER payment success. Looking at the code:

1. **Frontend** (`PrintRequestDialog.tsx` lines 531-565): The `onCompleted` callback is triggered when PayHere popup closes, calling `finalize-print-request`
2. **Problem**: PayHere's `onCompleted` callback fires when the popup **COMPLETES**, not when payment **SUCCEEDS**. A failed payment still triggers `onCompleted`!

**Evidence in code (lines 531-565):**
```typescript
window.payhere.onCompleted = async (orderId: string) => {
  console.log("Card payment completed. OrderID:", orderId);
  // NOW create the print request via edge function (payment confirmed)
  // ...calls finalize-print-request
}
```

The `finalize-print-request` endpoint (lines 661-784) has a verification loop (lines 676-693) BUT:
```typescript
// If payment still not confirmed, check if it exists at all
if (!payment) {
  // Payment exists but not completed - might still be processing
  // For card payments, PayHere calls notify async, so we trust the client-side completion
  console.log("Payment exists but status is:", pendingPayment.status);
}
// Then proceeds to create the print request ANYWAY!
```

This is the bug - it trusts the client-side callback without verifying the actual payment status.

**Solution:**
1. Do NOT trust PayHere's `onCompleted` callback for success verification
2. The `finalize-print-request` endpoint must ONLY proceed if `payment.status === 'completed'`
3. If payment status is not 'completed' after retries, return an error to the client
4. Client should show appropriate error message

### 2. Pricing Manipulation Prevention

**Current State:**
- Server-side pricing is already implemented in `calculate-print-price` edge function
- BUT `finalize-print-request` blindly accepts `order_details` from the client including `totalAmount`

**Solution:**
- Validate pricing server-side by recalculating from paper IDs
- Store `selected_paper_ids` in print_requests table for audit and display

### 3. Print Requests Missing Lesson Details

**Current Problem:**
In `PrintRequests.tsx` (line 427):
```typescript
<td className="p-3 text-foreground text-sm capitalize">{request.print_type.replace(/_/g, ' ')}</td>
```
This shows "model papers only" instead of actual lesson details.

**Database has:**
- `topic_ids` (array of topic UUIDs)
- `subject_name` (string)
- No stored paper/lesson titles

**Solution:**
1. Add `selected_paper_titles` JSON field to store actual paper names on creation
2. In PrintRequests admin, show paper titles instead of generic "Type"

### 4. PayHere Commission Missing for Print Requests

**Current Dashboard (lines 748-749):**
```typescript
const payhereCommission = stats.cardPayments * 0.033; // 3.3% PayHere fee
```

This only considers enrollment card payments (`stats.cardPayments`), NOT print request card payments.

**Solution:**
Add `printCardRevenue` stat and include it in PayHere commission calculation:
```typescript
const payhereCommission = (stats.cardPayments + stats.printCardRevenue) * 0.033;
```

### 5. Join Requests Stats Not Working with Filters

**Current Code (lines 209-213):**
```typescript
const stats = {
  pending: requests.filter(r => r.status === 'pending').length,
  approved: requests.filter(r => r.status === 'approved').length,
  rejected: requests.filter(r => r.status === 'rejected').length,
};
```

**Problem:** When `statusFilter === 'pending'`, only pending requests are fetched (line 97), so `requests` array has no approved/rejected items.

**Solution:**
Fetch all requests for stats, but filter for display. OR compute stats from a separate query that ignores the filter.

---

## Implementation Plan

### Part 1: Fix Payment Verification (CRITICAL)

**File: `supabase/functions/payhere-checkout/index.ts`**

Update `finalize-print-request` endpoint to REQUIRE verified payment:

```typescript
// Line 694-714 - Replace the "trust client" logic with strict verification
if (!payment) {
  const { data: pendingPayment } = await supabase
    .from("payments")
    .select("status, failure_reason")
    .eq("order_id", order_id)
    .maybeSingle();
  
  if (!pendingPayment) {
    return new Response(
      JSON.stringify({ 
        error: "Payment not found", 
        success: false,
        user_message: "Payment verification failed. Please try again or contact support."
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // CRITICAL: Payment exists but NOT completed - DO NOT proceed
  if (pendingPayment.status !== 'completed') {
    const failureMsg = pendingPayment.failure_reason || "Payment was not successful";
    return new Response(
      JSON.stringify({ 
        error: "Payment not verified", 
        success: false,
        payment_status: pendingPayment.status,
        user_message: failureMsg
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
```

**File: `src/components/dashboard/PrintRequestDialog.tsx`**

Update `onCompleted` handler to properly handle verification failures:

```typescript
window.payhere.onCompleted = async (orderId: string) => {
  console.log("PayHere popup completed. OrderID:", orderId);
  
  const details = orderDetailsRef.current;
  if (!details) {
    toast.error("Order details not found. Please contact support.");
    setIsLoading(false);
    return;
  }
  
  try {
    const { data: result, error: createError } = await supabase.functions.invoke('payhere-checkout/finalize-print-request', {
      body: {
        order_id: orderId,
        user_id: user.id,
        order_details: details,
      }
    });
    
    if (createError || !result?.success) {
      // Payment verification failed - show specific error
      const errorMsg = result?.user_message || "Payment could not be verified. Please check your payment status.";
      console.error('Payment verification failed:', result);
      toast.error(errorMsg);
      setIsLoading(false);
      return;
    }
    
    toast.success("Payment successful! Your print order is confirmed.");
    loadExistingOrders();
    resetForm();
    setViewMode('orders');
  } catch (err) {
    console.error('Error finalizing print request:', err);
    toast.error("Failed to verify payment. Please contact support with order ID: " + orderId);
  }
  
  setIsLoading(false);
};
```

### Part 2: Store and Display Paper Details

**Database Migration:**
```sql
ALTER TABLE print_requests 
ADD COLUMN IF NOT EXISTS selected_paper_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_paper_titles TEXT[] DEFAULT '{}';
```

**File: `supabase/functions/payhere-checkout/index.ts`**

Update `finalize-print-request` to store paper details:
```typescript
const { data: printRequest, error: insertError } = await supabase
  .from("print_requests")
  .insert({
    // ...existing fields
    selected_paper_ids: order_details.selectedPapers || [],
    selected_paper_titles: order_details.selectedPaperTitles || [],
  })
```

**File: `src/components/dashboard/PrintRequestDialog.tsx`**

Include paper titles in order details:
```typescript
const orderDetails: OrderDetails = {
  // ...existing fields
  selectedPaperTitles: papers.filter(p => selectedPapers.includes(p.id)).map(p => p.title),
};
```

**File: `src/pages/admin/PrintRequests.tsx`**

Replace Type column with Paper details:
```typescript
// Line 409: Change "Type" header to "Papers"
<th className="text-left p-3 text-muted-foreground text-sm font-medium">Papers</th>

// Line 427: Display paper titles
<td className="p-3 text-foreground text-sm">
  {(request as any).selected_paper_titles?.length > 0 
    ? (request as any).selected_paper_titles.length === 1
      ? (request as any).selected_paper_titles[0]
      : `${(request as any).selected_paper_titles.length} papers`
    : request.print_type.replace(/_/g, ' ')
  }
</td>
```

### Part 3: Add Print Card Revenue to PayHere Commission

**File: `src/pages/admin/AdminDashboard.tsx`**

Add `printCardRevenue` to Stats interface and fetch:
```typescript
// In Stats interface (line 93):
printCardRevenue: number;

// In fetchStats function - add query for print card payments:
const { data: printCardData } = await supabase
  .from('print_requests')
  .select('total_amount')
  .eq('payment_method', 'card')
  .eq('payment_status', 'paid');

const printCardRevenue = printCardData?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0;

// Update PayHere commission calculation (line 748):
const payhereCommission = (stats.cardPayments + stats.printCardRevenue) * 0.033;
```

### Part 4: Fix Join Requests Stats with Filters

**File: `src/pages/admin/JoinRequests.tsx`**

Compute stats from ALL requests regardless of filter:
```typescript
// Add separate state for all requests stats
const [allRequestsStats, setAllRequestsStats] = useState({ pending: 0, approved: 0, rejected: 0 });

// In fetchRequests, always fetch stats from all records:
const fetchRequests = async () => {
  setIsLoading(true);
  
  // FIRST: Get counts for ALL statuses (for stats display)
  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);
  
  setAllRequestsStats({
    pending: pendingRes.count || 0,
    approved: approvedRes.count || 0,
    rejected: rejectedRes.count || 0,
  });
  
  // THEN: Fetch filtered data for list display
  let query = supabase
    .from('join_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  // ...rest of fetch logic
};

// Use allRequestsStats instead of computed stats in the UI (line 233-245)
```

### Part 5: Server-Side Price Validation (Security Hardening)

**File: `supabase/functions/payhere-checkout/index.ts`**

Add price validation in `finalize-print-request`:
```typescript
// After verifying payment, validate the price matches database records
const { data: printSettings } = await supabase
  .from('print_settings')
  .select('model_paper_price_per_page, base_delivery_fee')
  .eq('is_active', true)
  .single();

if (!printSettings) {
  return new Response(
    JSON.stringify({ error: "Print settings not configured", success: false }),
    { status: 500, headers: corsHeaders }
  );
}

// Verify page count from database (not from client)
const { data: paperData } = await supabase
  .from('notes')
  .select('page_count')
  .in('id', order_details.selectedPapers);

const verifiedPageCount = paperData?.reduce((sum, p) => sum + (p.page_count || 1), 0) || 0;
const expectedPrice = (verifiedPageCount * printSettings.model_paper_price_per_page) + printSettings.base_delivery_fee;

// Allow small rounding tolerance
if (Math.abs(expectedPrice - order_details.totalAmount) > 10) {
  console.error('Price mismatch detected:', { expected: expectedPrice, received: order_details.totalAmount });
  await notifySecurityAlert(supabaseUrl, supabaseServiceKey, {
    alertType: "Price Manipulation Attempt",
    details: `Expected: ${expectedPrice}, Received: ${order_details.totalAmount}`,
    userId: user_id,
  });
  return new Response(
    JSON.stringify({ error: "Price validation failed", success: false }),
    { status: 400, headers: corsHeaders }
  );
}

// Use verified values
order_details.totalPages = verifiedPageCount;
order_details.totalAmount = expectedPrice;
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/payhere-checkout/index.ts` | Fix payment verification, add price validation, store paper titles |
| `src/components/dashboard/PrintRequestDialog.tsx` | Handle verification failures properly, include paper titles |
| `src/pages/admin/PrintRequests.tsx` | Show paper titles instead of generic Type |
| `src/pages/admin/JoinRequests.tsx` | Fix stats to show all statuses regardless of filter |
| `src/pages/admin/AdminDashboard.tsx` | Add print card revenue to PayHere commission |
| Database Migration | Add `selected_paper_ids` and `selected_paper_titles` columns |

---

## Database Migration Required

```sql
-- Add columns for storing paper selection details
ALTER TABLE print_requests 
ADD COLUMN IF NOT EXISTS selected_paper_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_paper_titles TEXT[] DEFAULT '{}';
```

---

## Security Improvements Summary

1. **Payment Verification**: Never trust client-side callbacks; always verify server-side
2. **Price Validation**: Recalculate prices from database records, not client data
3. **Audit Trail**: Store paper IDs for verification and display
4. **Alert System**: Notify on potential manipulation attempts

---

## Testing Checklist

- [ ] Card payment failure shows appropriate error (not marked as paid)
- [ ] Successful card payment correctly creates print request
- [ ] Print requests show actual paper titles in admin view
- [ ] Join requests stats show correct counts regardless of filter
- [ ] PayHere commission includes print request card payments
- [ ] Price manipulation attempt is blocked and logged
- [ ] All existing functionality continues to work
