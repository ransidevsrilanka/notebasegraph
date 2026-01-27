
# Comprehensive Fix Plan: Access Codes, Dashboard Metrics, PayHere Popup & Print System

## Issues Identified

### 1. Access Codes Show "unused" After Being Used
**Root Cause:** The `access_codes` table has a default status of `'unused'` instead of `'active'`. When codes are generated, they start as `unused`. When activated, the status is updated to `used`, but:
- The AccessCodes.tsx page displays `unused` because codes are never set to `active`
- The trigger `on_access_code_activation` only fires when OLD.status != 'used' AND NEW.status = 'used', which works, but the display is confusing

**Fix:** Change default status to `active` and update existing `unused` codes to `active`.

### 2. Revenue from Access Codes Not Showing in Total Revenue
**Root Cause:** The trigger `create_access_code_payment_attribution` fires on access code UPDATE (status changing to 'used'). However, I confirmed via query that no `payment_attributions` are being created for access codes - only upgrades show up. The trigger may not be working, possibly because:
- Codes default to `unused` (not `active`), so the status change check may not work as expected
- The trigger condition `OLD.status IS NULL OR OLD.status != 'used'` doesn't handle `unused` → `used` correctly

**Fix:** Update the trigger to handle all status transitions properly.

### 3. Dashboard Metrics Showing Zero/Incorrect Values
**Root Cause:** Multiple issues:
- Revenue from access codes not being recorded (trigger issue above)
- Print revenue is tracked separately in `print_requests` table but needs proper integration
- Card vs Bank breakdown only tracks from `payment_attributions.payment_type` which doesn't include all payment sources

### 4. PayHere Redirects to New Page Instead of Popup
**Root Cause:** In `PrintRequestDialog.tsx` (lines 347-366), the code creates a form and uses `form.submit()` which navigates to the PayHere page. The proper approach (used in `PaymentMethodDialog.tsx`) is to:
1. Load PayHere JavaScript SDK
2. Call `window.payhere.startPayment(payment)` to open the popup

**Fix:** Use the PayHere popup SDK like `PaymentMethodDialog.tsx` does.

### 5. Users Can Edit Estimated Pages in Print Request
**Root Cause:** Line 713-722 in `PrintRequestDialog.tsx` has an editable input for `estimatedPages`. This should be calculated automatically from the selected notes' `page_count` attribute.

**Fix:** 
- Remove editable page input
- Fetch selected papers with their `page_count`
- Auto-calculate total pages from selected papers
- Use server-side `calculate-print-price` edge function for final pricing

### 6. Duplicate Subjects Still Appearing
**Root Cause:** Even with medium filtering, subjects may still duplicate if there are multiple subjects with the same name for different streams. The deduplication is working but needs to happen at a different level.

**Fix:** Ensure the query filters by `enrollment.stream` as well for A/L students.

### 7. Need Profit Calculation Card
**Requirement:** Display profit = Revenue - Expenses where:
- PayHere fee = 3.3% of card payments
- Creator commissions from `payment_attributions.creator_commission_amount`

### 8. Reduce Dashboard to 6 Essential Metrics
**Requirement:** Replace 12 mini stat cards with 6 most important metrics in a 3x2 grid.

---

## Implementation Plan

### Phase 1: Fix Access Code Status (Database Migration)

**Migration SQL:**
```sql
-- Fix default status from 'unused' to 'active'
ALTER TABLE access_codes 
ALTER COLUMN status SET DEFAULT 'active';

-- Update existing 'unused' codes to 'active'
UPDATE access_codes 
SET status = 'active' 
WHERE status = 'unused' AND activated_by IS NULL;

-- Fix the trigger to properly handle status transitions
CREATE OR REPLACE FUNCTION create_access_code_payment_attribution()
RETURNS TRIGGER AS $$
DECLARE
  tier_price NUMERIC;
  pricing_data JSONB;
BEGIN
  -- Trigger when code status becomes 'used' and has an activator
  IF NEW.status = 'used' AND NEW.activated_by IS NOT NULL 
     AND (OLD.status IS DISTINCT FROM 'used') THEN
    
    -- Get tier pricing from site_settings
    SELECT value INTO pricing_data
    FROM site_settings
    WHERE key = 'pricing';
    
    -- Get price for the tier
    tier_price := COALESCE(
      (pricing_data -> NEW.tier ->> 'price')::NUMERIC,
      CASE NEW.tier
        WHEN 'starter' THEN 1500
        WHEN 'standard' THEN 2500
        WHEN 'lifetime' THEN 4500
        ELSE 0
      END
    );
    
    -- Create payment attribution
    INSERT INTO payment_attributions (
      user_id,
      access_code_id,
      final_amount,
      original_amount,
      tier,
      payment_type,
      payment_month,
      created_at
    ) VALUES (
      NEW.activated_by,
      NEW.id,
      tier_price,
      tier_price,
      NEW.tier,
      'access_code',
      to_char(NOW(), 'YYYY-MM-DD'),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Phase 2: Fix PayHere Popup in Print Request Dialog

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

Replace the form submission approach with PayHere SDK popup:

```typescript
// Add PayHere script loading (same pattern as PaymentMethodDialog)
const loadPayHereScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.payhere) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayHere SDK"));
    document.body.appendChild(script);
  });
};

// Update initiateCardPayment to use popup
const initiateCardPayment = async (printRequestId: string) => {
  try {
    // Load PayHere SDK
    await loadPayHereScript();
    
    // Get hash from edge function
    const { data, error } = await supabase.functions.invoke('payhere-checkout/generate-hash', {
      body: { ... }
    });
    
    if (error) throw error;
    
    // Set up callbacks
    window.payhere.onCompleted = (orderId: string) => {
      toast.success("Payment completed! Your order is confirmed.");
      onOpenChange(false); // Close dialog
      loadExistingOrders();
    };
    
    window.payhere.onDismissed = () => {
      toast.info("Payment cancelled");
      setIsLoading(false);
    };
    
    window.payhere.onError = (error: string) => {
      toast.error(`Payment failed: ${error}. Please try again or choose a different payment method.`);
      setIsLoading(false);
    };
    
    // Close dialog and start payment popup
    const payment = {
      sandbox: data.sandbox,
      merchant_id: data.merchant_id,
      // ... all PayHere fields
    };
    
    // Close dialog first, then open PayHere popup
    onOpenChange(false);
    setTimeout(() => {
      window.payhere.startPayment(payment);
    }, 100);
    
  } catch (err) {
    toast.error("Failed to initiate payment. Please try again or choose a different method.");
    setIsLoading(false);
  }
};
```

### Phase 3: Auto-Calculate Pages from Selected Papers

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

1. **Modify the data structure to track paper page counts:**
```typescript
interface Paper {
  id: string;
  title: string;
  page_count: number;
  topic_id: string;
}

const [papers, setPapers] = useState<Paper[]>([]);
const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
```

2. **Load papers with page_count when subject/topics change:**
```typescript
const loadPapers = async (topicIds: string[]) => {
  const { data } = await supabase
    .from('notes')
    .select('id, title, page_count, topic_id')
    .in('topic_id', topicIds)
    .eq('is_model_paper', true)
    .eq('is_active', true);
  
  if (data) setPapers(data);
};
```

3. **Calculate total pages automatically:**
```typescript
const totalPages = papers
  .filter(p => selectedPapers.includes(p.id))
  .reduce((sum, p) => sum + (p.page_count || 1), 0);
```

4. **Remove editable page input and display read-only total:**
```tsx
<div className="p-3 bg-secondary/50 rounded-lg">
  <Label className="text-xs text-muted-foreground">Total Pages</Label>
  <p className="text-lg font-semibold text-foreground">{totalPages} pages</p>
</div>
```

5. **Use server-side pricing via calculate-print-price:**
```typescript
const [serverPrice, setServerPrice] = useState<PriceResponse | null>(null);

useEffect(() => {
  if (selectedPapers.length > 0) {
    calculateServerPrice();
  }
}, [selectedPapers, paymentMethod]);

const calculateServerPrice = async () => {
  const { data } = await supabase.functions.invoke('calculate-print-price', {
    body: {
      paper_ids: selectedPapers,
      delivery_method: paymentMethod === 'cod' ? 'cod' : 'standard'
    }
  });
  if (data?.success) setServerPrice(data);
};
```

### Phase 4: Redesign CEO Dashboard Metrics

**File:** `src/pages/admin/AdminDashboard.tsx`

1. **Add Profit Card at the top (large):**
```tsx
// Profit calculation
const calculateProfit = () => {
  const totalRevenue = stats.totalRevenue + stats.printRevenue;
  const payhereCommission = stats.cardPayments * 0.033; // 3.3% PayHere fee
  const creatorCommissions = creatorCommissionTotal; // From payment_attributions
  const profit = totalRevenue - payhereCommission - creatorCommissions;
  return { profit, payhereCommission, creatorCommissions };
};

// Large profit card
<div className="glass-card p-6 mb-4 bg-gradient-to-r from-green-500/10 to-brand/10">
  <div className="flex justify-between items-start">
    <div>
      <p className="text-sm text-muted-foreground">Net Profit</p>
      <p className="text-3xl font-bold text-green-500">Rs. {profit.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">
        After {(payhereCommission / 1000).toFixed(1)}K PayHere fees + {(creatorCommissions / 1000).toFixed(1)}K commissions
      </p>
    </div>
    <TrendingUp className="w-8 h-8 text-green-500" />
  </div>
</div>
```

2. **Reduce to 6 Essential MiniStatCards (3x2 grid):**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
  <MiniStatCard label="Total Revenue" value={stats.totalRevenue + stats.printRevenue} format="currency" icon={DollarSign} />
  <MiniStatCard label="This Month" value={stats.thisMonthRevenue} format="currency" trend={monthlyTrend} />
  <MiniStatCard label="Active Students" value={stats.totalStudents} icon={Users} />
  <MiniStatCard label="Card Payments" value={stats.cardPayments} format="currency" icon={CreditCard} />
  <MiniStatCard label="Bank Payments" value={stats.bankPayments} format="currency" icon={Building2} />
  <MiniStatCard label="Print Revenue" value={stats.printRevenue} format="currency" icon={Printer} />
</div>
```

3. **Add creator commission query to fetchStats:**
```typescript
// Fetch total creator commissions paid
const { data: commissionData } = await supabase
  .from('payment_attributions')
  .select('creator_commission_amount')
  .not('creator_commission_amount', 'is', null);

const totalCreatorCommissions = (commissionData || []).reduce(
  (sum, p) => sum + Number(p.creator_commission_amount || 0), 0
);
```

### Phase 5: Fix Subject Deduplication for A/L Students

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

Update loadSubjects to also filter by stream:

```typescript
const loadSubjects = async () => {
  if (!enrollment) return;
  
  let query = supabase
    .from('subjects')
    .select('id, name')
    .eq('grade', enrollment.grade)
    .eq('medium', enrollment.medium)
    .eq('is_active', true);
  
  // For A/L students, also filter by stream
  if (enrollment.stream && !enrollment.grade.startsWith('ol_')) {
    query = query.contains('streams', [enrollment.stream]);
  }
  
  const { data } = await query;
  
  if (data) {
    // Deduplicate by name
    const uniqueSubjects = data.filter(
      (subject, index, self) =>
        index === self.findIndex(s => s.name === subject.name)
    );
    setSubjects(uniqueSubjects);
  }
};
```

---

## Technical Summary

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Access code shows "unused" | Default status is 'unused' | Change default to 'active', update existing |
| Revenue not tracked | Trigger doesn't handle 'unused' → 'used' | Fix trigger with `IS DISTINCT FROM` |
| PayHere redirects | Uses form.submit() | Use `window.payhere.startPayment()` popup |
| Users edit page count | Manual input field | Auto-calculate from paper.page_count |
| Duplicate subjects | No stream filter | Add enrollment.stream filter |
| Missing profit card | Not implemented | Add profit calculation card |
| Too many metrics | 12 cards | Reduce to 6 essential metrics |

---

## Files to Modify

1. **Database Migration** (new)
   - Fix access_codes default status
   - Update existing unused codes
   - Fix trigger function

2. **`src/components/dashboard/PrintRequestDialog.tsx`**
   - Add PayHere SDK popup pattern
   - Auto-calculate pages from papers
   - Remove editable page input
   - Add stream filter for subjects
   - Use server-side pricing

3. **`src/pages/admin/AdminDashboard.tsx`**
   - Add profit calculation card
   - Reduce to 6 mini stat cards
   - Add creator commission tracking
   - Include print revenue in total

---

## Testing Checklist

- [ ] Generate new access code - status should be "active"
- [ ] Activate access code - status changes to "used"
- [ ] Check payment_attributions - record created with access_code_id
- [ ] CEO dashboard shows correct Total Revenue (including access codes)
- [ ] Print request card payment opens PayHere popup (not redirect)
- [ ] Dialog closes when PayHere popup opens
- [ ] Payment errors show helpful message with retry option
- [ ] Select subject shows unique subjects only (no duplicates)
- [ ] Select papers - page count auto-calculated
- [ ] No editable page input for users
- [ ] Profit card shows correct calculation
- [ ] Dashboard has exactly 6 mini stat cards
