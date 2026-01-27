
# Comprehensive Fix Plan: Print Request System & Logic Cleanup

## Issues Identified

### Critical Issue 1: Print Requests Created BEFORE Payment Completion
**Problem:**
- The `handleSubmit` function (lines 532-645) creates a print request record **immediately** when user clicks "Pay Now"
- If user cancels payment or payment fails, the orphaned record remains in the database
- This causes duplicate entries with same reference numbers (e.g., PR-IN853 appearing twice)
- Telegram notifications are sent **before** payment is confirmed

**Current Flow (Broken):**
```
User clicks "Pay Now" → Insert print_request → Send Telegram → Open PayHere popup → User cancels → Orphan record remains
```

**Correct Flow:**
```
User clicks "Pay Now" → Open PayHere popup → Payment succeeds → Insert print_request → Send Telegram
```

---

### Critical Issue 2: Empty Subjects Dropdown
**Problem:**
The subjects are loading correctly from the database (verified: subjects exist for grade `al_grade13`, medium `english`, stream `maths`), BUT the filtering logic in `loadSubjects` may fail when:
1. User hasn't locked subjects yet (`userSubjects` is null)
2. The JSONB `.contains()` filter on streams isn't returning expected results

**Root Cause:**
Looking at line 307-313, if `subjectNames.length > 0`, it filters by names. Otherwise for A/L without locked subjects, it uses `.contains('streams', [enrollment.stream])`. This should work, but may fail if `streams` column contains different format.

**Fix:**
Add explicit debugging and ensure fallback always triggers if primary query returns empty.

---

### Critical Issue 3: Telegram Notifications Sent Before Payment Confirmation
**Problem:**
Lines 582-627 send Telegram notifications for ALL payment methods immediately in `handleSubmit`, including card payments BEFORE the card payment completes.

---

## Implementation Plan

### Phase 1: Restructure Card Payment Flow (CRITICAL)

**Change:** For card payments, do NOT create the print_request until payment is confirmed.

**Updated Frontend Flow:**

1. **Card Payment Selected:**
   - On "Pay Now", call edge function to generate hash only
   - Store order details in localStorage temporarily
   - Open PayHere popup
   - On `onCompleted` callback: Create print request via new edge function call
   - On `onDismissed`/`onError`: Do nothing (no orphan records)

2. **Bank Transfer / COD:**
   - Keep existing flow (create request immediately)
   - These are valid because admin must manually verify anyway

**File Changes:**

#### `src/components/dashboard/PrintRequestDialog.tsx`

**handleSubmit changes (lines 532-645):**
```typescript
const handleSubmit = async () => {
  if (!user || !enrollment) return;
  
  setIsLoading(true);
  
  // For CARD payments: Don't create request yet - wait for payment confirmation
  if (paymentMethod === 'card') {
    // Store order details in memory/state for later
    const orderDetails = {
      fullName,
      address,
      phone,
      city,
      selectedSubject,
      selectedTopics,
      selectedPapers,
      allTopics,
      totalPages,
      subjectName: subjects.find(s => s.id === selectedSubject)?.name || '',
      totalAmount: calculateTotal(),
      deliveryFee: settings?.base_delivery_fee || 0,
      estimatedPrice: calculateTotal() - (settings?.base_delivery_fee || 0),
    };
    
    await initiateCardPayment(orderDetails);
    return;
  }
  
  // For BANK TRANSFER and COD: Create request immediately (admin verification required)
  // ... existing logic for non-card payments
};
```

**initiateCardPayment changes:**
```typescript
const initiateCardPayment = async (orderDetails: OrderDetails) => {
  if (!user || !enrollment) return;
  
  try {
    await loadPayHereScript();
    
    // Generate order ID (NOT print request ID yet)
    const tempOrderId = `PR-${Date.now().toString(36).slice(-8).toUpperCase()}`;
    
    // Call hash generation WITHOUT creating print_request
    const { data, error } = await supabase.functions.invoke('payhere-checkout/generate-hash', {
      body: {
        order_id: tempOrderId,
        items: `Print Request - ${orderDetails.subjectName}`,
        amount: orderDetails.totalAmount,
        currency: 'LKR',
        first_name: fullName.split(' ')[0] || 'Customer',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: phone,
        address: address,
        city: city || 'Colombo',
        country: 'Sri Lanka',
        // Pass order details to be stored on backend for later use
        print_order_details: JSON.stringify(orderDetails),
      }
    });
    
    if (error) throw error;
    
    window.payhere.onCompleted = async (completedOrderId: string) => {
      console.log("Payment completed:", completedOrderId);
      
      // NOW create the print request via edge function (payment confirmed)
      const { error: createError } = await supabase.functions.invoke('payhere-checkout/finalize-print-request', {
        body: {
          order_id: completedOrderId,
          user_id: user.id,
          order_details: orderDetails,
        }
      });
      
      if (!createError) {
        toast.success("Payment successful! Your print order is confirmed.");
        loadExistingOrders();
        resetForm();
        setViewMode('orders');
      } else {
        toast.error("Payment received but order creation failed. Please contact support.");
      }
    };
    
    window.payhere.onDismissed = () => {
      toast.info("Payment cancelled");
      setIsLoading(false);
      // NO orphan record created!
    };
    
    window.payhere.onError = (error: string) => {
      toast.error(`Payment failed: ${error}`);
      setIsLoading(false);
      // NO orphan record created!
    };
    
    // Start payment
    const payment = { ... }; // Build payment object
    onOpenChange(false);
    window.payhere.startPayment(payment);
    
  } catch (err) {
    toast.error('Failed to process payment');
    setIsLoading(false);
  }
};
```

---

### Phase 2: Update Edge Function for Deferred Print Request Creation

**File:** `supabase/functions/payhere-checkout/index.ts`

**Add new endpoint:** `finalize-print-request`

```typescript
// New endpoint: Create print request AFTER payment is confirmed
if (path === "finalize-print-request" && req.method === "POST") {
  const { order_id, user_id, order_details } = await req.json();
  
  // Verify payment was actually completed
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", order_id)
    .eq("status", "completed")
    .maybeSingle();
  
  if (!payment) {
    return new Response(
      JSON.stringify({ error: "Payment not verified" }),
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Create print request
  const requestNumber = `PR-${order_id.slice(-8)}`;
  const { data: printRequest, error } = await supabase
    .from("print_requests")
    .insert({
      user_id: user_id,
      request_number: requestNumber,
      full_name: order_details.fullName,
      address: order_details.address,
      phone: order_details.phone,
      city: order_details.city,
      print_type: 'model_papers_only',
      subject_id: order_details.selectedSubject,
      subject_name: order_details.subjectName,
      topic_ids: order_details.allTopics ? [] : order_details.selectedTopics,
      estimated_pages: order_details.totalPages,
      estimated_price: order_details.estimatedPrice,
      delivery_fee: order_details.deliveryFee,
      total_amount: order_details.totalAmount,
      payment_method: 'card',
      payment_status: 'paid',
      status: 'confirmed',
      order_id: order_id,
    })
    .select()
    .single();
  
  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to create print request" }),
      { status: 500, headers: corsHeaders }
    );
  }
  
  // Send Telegram notification ONLY NOW (after payment confirmed)
  await sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'payment_success',
    message: `Print Request Payment Received`,
    data: {
      request_number: requestNumber,
      customer: order_details.fullName,
      amount: `Rs.${order_details.totalAmount}`,
      payment: 'Card (Paid)',
    },
    priority: 'medium',
  });
  
  // Send user inbox message
  await supabase.from('messages').insert({
    recipient_id: user_id,
    recipient_type: 'student',
    recipient_user_id: user_id,
    subject: `Order Confirmed - ${requestNumber}`,
    body: `Your print order has been confirmed and is being processed!`,
    is_read: false,
  });
  
  return new Response(
    JSON.stringify({ success: true, print_request_id: printRequest.id }),
    { status: 200, headers: corsHeaders }
  );
}
```

---

### Phase 3: Fix Subjects Loading Issue

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

**Update loadSubjects function (lines 289-348):**
```typescript
const loadSubjects = async () => {
  if (!enrollment) {
    console.log('No enrollment found');
    return;
  }
  
  // Get user's locked subjects if any
  const subjectNames = userSubjects?.is_locked ? [
    userSubjects.subject_1,
    userSubjects.subject_2,
    userSubjects.subject_3,
  ].filter(Boolean) : [];
  
  console.log('Loading subjects for:', { 
    grade: enrollment.grade, 
    medium: enrollment.medium, 
    stream: enrollment.stream,
    lockedSubjects: subjectNames 
  });
  
  let subjectsFound: Subject[] = [];
  
  // Strategy 1: Try subjects table with grade + medium filter
  let query = supabase
    .from('subjects')
    .select('id, name, streams')
    .eq('grade', enrollment.grade)
    .eq('medium', enrollment.medium)
    .eq('is_active', true);
  
  // If user has locked subjects, filter by those
  if (subjectNames.length > 0) {
    query = query.in('name', subjectNames);
  }
  
  const { data, error } = await query;
  
  if (!error && data && data.length > 0) {
    // Filter by stream if needed (for A/L without locked subjects)
    let filteredData = data;
    if (subjectNames.length === 0 && enrollment.stream && !enrollment.grade.startsWith('ol_')) {
      filteredData = data.filter(s => 
        s.streams && Array.isArray(s.streams) && s.streams.includes(enrollment.stream)
      );
    }
    
    if (filteredData.length > 0) {
      // Deduplicate by name
      const uniqueSubjects = filteredData.filter(
        (subject, index, self) => index === self.findIndex(s => s.name === subject.name)
      );
      subjectsFound = uniqueSubjects;
    }
  }
  
  // Strategy 2: Fallback to stream_subjects table
  if (subjectsFound.length === 0) {
    console.log('Falling back to stream_subjects table');
    const stream = enrollment.grade.startsWith('ol_') ? 'ol' : enrollment.stream;
    
    if (stream) {
      const { data: streamData } = await supabase
        .from('stream_subjects')
        .select('id, subject_name')
        .eq('stream', stream)
        .order('sort_order');
      
      if (streamData && streamData.length > 0) {
        // Filter by locked subjects if user has them
        let filtered = streamData;
        if (subjectNames.length > 0) {
          filtered = streamData.filter(s => subjectNames.includes(s.subject_name));
        }
        subjectsFound = filtered.map(s => ({ id: s.id, name: s.subject_name }));
      }
    }
  }
  
  console.log('Subjects loaded:', subjectsFound.length);
  setSubjects(subjectsFound);
};
```

---

### Phase 4: Remove Premature Telegram Notifications for Card Payments

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

In `handleSubmit`, move Telegram notification logic:

```typescript
// Send Telegram notification ONLY for bank_transfer and COD
// Card payments will send notification in edge function AFTER payment confirms
if (paymentMethod === 'bank_transfer' && receiptFile) {
  // ... existing Telegram document sending
} else if (paymentMethod === 'cod') {
  // Send notification for COD only
  await supabase.functions.invoke('send-telegram-notification', {
    body: {
      type: 'new_print_request',
      message: `New COD Print Request: ${requestNumber}`,
      data: { ... },
      priority: 'medium'
    }
  });
}
// NOTE: No notification for 'card' here - will be sent after payment confirms
```

---

### Phase 5: Cleanup Orphan Records (Database Migration)

Clean up existing orphaned print requests where payment was never completed:

```sql
-- Delete print requests with card payment that are still pending (orphans)
DELETE FROM print_requests 
WHERE payment_method = 'card' 
  AND payment_status = 'pending' 
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/PrintRequestDialog.tsx` | Restructure card payment flow; fix subjects loading; remove premature notifications |
| `supabase/functions/payhere-checkout/index.ts` | Add `finalize-print-request` endpoint for deferred order creation |
| Database migration | Clean orphan records; no schema changes needed |

## Flow Diagrams

### Card Payment Flow (Fixed)
```
1. User selects papers, fills delivery info, chooses Card
2. Clicks "Pay Now"
3. Frontend calls generate-hash (NO print_request created yet)
4. PayHere popup opens
5a. User pays successfully → onCompleted callback
   → Call finalize-print-request endpoint
   → Edge function verifies payment
   → Creates print_request with status='confirmed'
   → Sends Telegram notification
   → User sees success toast
5b. User cancels → onDismissed callback
   → Toast "Payment cancelled"
   → NO orphan record, NO notification
5c. Payment fails → onError callback
   → Toast error message
   → NO orphan record, NO notification
```

### Bank Transfer / COD Flow (Unchanged)
```
1. User selects papers, fills delivery info
2. Chooses Bank Transfer or COD
3. Clicks Submit
4. Creates print_request immediately (pending verification)
5. Sends Telegram notification
6. Admin manually verifies/approves
```

## Testing Checklist

- [ ] Card payment cancelled - no orphan record created
- [ ] Card payment failed - no orphan record created  
- [ ] Card payment success - print request created with paid status
- [ ] Card payment success - Telegram notification sent
- [ ] Bank transfer - request created immediately with pending status
- [ ] COD - request created immediately with confirmed status
- [ ] Subjects dropdown populated for users with locked subjects
- [ ] Subjects dropdown populated for users without locked subjects (stream filter)
- [ ] No duplicate requests with same reference number
