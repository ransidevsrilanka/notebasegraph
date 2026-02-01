
# Comprehensive Platform Fixes & Enhancements Plan

## Overview

This plan addresses 17+ critical issues spanning withdrawal display, creator notifications, commission rates, tax calculations, upgrade flow, and UI/UX improvements.

---

## Issues Identified & Solutions

### Part 1: Withdrawal Display - Bank Shown as Crypto

**Current Problem:**
In `WithdrawalRequests.tsx`, when `withdrawal_method?.method_type` is `null` or undefined, it defaults to showing "Crypto" (line 461-465).

**Root Cause:**
The condition `request.withdrawal_method?.method_type === 'bank'` falls through to the else clause when method data isn't loaded properly.

**Solution:**
```typescript
// Line 461-465 in WithdrawalRequests.tsx
{request.withdrawal_method?.method_type === 'bank' ? (
  <><Building2 className="w-3 h-3" /> Bank Transfer</>
) : request.withdrawal_method?.method_type === 'crypto' ? (
  <><Wallet className="w-3 h-3" /> {request.withdrawal_method?.crypto_type || 'Crypto'}</>
) : (
  <span className="text-muted-foreground">Method not found</span>
)}
```

---

### Part 2: Creator Commission Rate - Showing 8% Instead of 12%

**Current Problem:**
Database shows commission_tiers: Tier 1 (Base) = 8%, Tier 2 = 12%. New creators start at `current_tier_level: 2` but the `CreatorDashboard.tsx` calculation logic has a bug.

**Root Cause:**
In `CreatorDashboard.tsx` (line 288-304), the commission rate calculation iterates through tiers but only updates when `monthlyCount >= tier.monthly_user_threshold`. Since Base tier has threshold 0, and Tier 2 has threshold 100, new creators with 0-99 users get 8% instead of 12%.

**Problem Logic (Current):**
```typescript
let currentCommissionRate = 12; // Default
for (const tier of commissionTiers) {
  if (monthlyCount >= tier.monthly_user_threshold) {
    currentCommissionRate = tier.commission_rate;
  }
}
// This gives 8% for new creators because tier.monthly_user_threshold=0 for Base
```

**Solution:**
Use `current_tier_level` from the database directly since it's already set correctly (level 2 for new creators):

```typescript
// In CreatorDashboard.tsx
let effectiveTierLevel = creatorProfile.current_tier_level || 2;
const currentTier = commissionTiers.find(t => t.tier_level === effectiveTierLevel);
let currentCommissionRate = currentTier?.commission_rate || 12;

// Only recalculate if NOT in protection period
if (!isInProtectionPeriod) {
  // Find highest tier they qualify for
  let qualifiedTierLevel = 1;
  for (const tier of commissionTiers) {
    if (monthlyCount >= tier.monthly_user_threshold) {
      qualifiedTierLevel = tier.tier_level;
    }
  }
  
  // Can only go DOWN, never below their protected tier
  effectiveTierLevel = Math.max(qualifiedTierLevel, creatorProfile.current_tier_level || 2);
  const effectiveTier = commissionTiers.find(t => t.tier_level === effectiveTierLevel);
  currentCommissionRate = effectiveTier?.commission_rate || 12;
}
```

---

### Part 3: 2FA Code Visibility - Hide OTP Input

**Current Problem:**
OTP code in `OTPVerificationDialog.tsx` is visible when typing (anyone can see it).

**Solution:**
Add a mask or password-style input. The `InputOTP` component from shadcn supports this:

```typescript
// In OTPVerificationDialog.tsx - update InputOTPSlot
<InputOTPSlot index={0} className="password-mask" />
// OR use password attribute if supported, otherwise CSS

// Add to index.css:
.otp-password-mask [data-input-otp] {
  -webkit-text-security: disc;
  text-security: disc;
}
```

Alternatively, replace visible slots with asterisks/dots after entry.

---

### Part 4: Creator Notifications - Referrals, Approvals, Rejections

**Current Problem:**
Creators don't receive inbox notifications for:
- New referral signups
- Withdrawal approved/rejected/paid
- Commission earned from referrals

**Solution:**

**A. Add notification on withdrawal status change (in `process-withdrawal/index.ts`):**
```typescript
// After updating withdrawal status to 'approved', 'paid', or 'rejected':
await supabase.from('messages').insert({
  recipient_id: creator.user_id,
  recipient_type: 'creator',
  subject: status === 'paid' 
    ? 'Withdrawal Processed ✓' 
    : status === 'approved' 
      ? 'Withdrawal Approved' 
      : 'Withdrawal Rejected',
  body: status === 'paid'
    ? `Your withdrawal of Rs. ${net_amount.toLocaleString()} has been processed. ${receipt_url ? 'Receipt attached.' : ''}`
    : status === 'approved'
      ? `Your withdrawal request for Rs. ${amount.toLocaleString()} has been approved and is being processed.`
      : `Your withdrawal request was rejected. ${rejection_reason || ''}`,
  is_read: false,
  metadata: { 
    withdrawal_id: request_id,
    receipt_url: receipt_url || null,
  },
});
```

**B. Database trigger for commission notifications (already exists but needs verification):**
Create/update a database function that triggers on `payment_attributions` insert to notify the creator.

---

### Part 5: Receipt Upload for Paid Withdrawals

**Current Problem:**
No UI to upload receipt after marking a withdrawal as "paid". The upload button only appears for "approved" status.

**Solution:**
The upload button is already shown for `approved` or `paid` status (line 485-496), but it needs to be more prominent after marking paid:

```typescript
// In WithdrawalRequests.tsx, after initiateMarkPaid completes:
// Show a toast prompting receipt upload
toast.success('Marked as paid! Don\'t forget to upload the receipt.');
```

Also ensure the receipt can be downloaded by creators from their inbox.

---

### Part 6: Withdrawal Amount Cap

**Current Problem:**
Creators can type any amount in the withdrawal form, even exceeding their balance.

**Solution:**
In `CreatorDashboard.tsx`, add max validation to the input:

```typescript
// In withdrawal form
<Input
  type="number"
  value={withdrawAmount}
  onChange={(e) => {
    const val = parseFloat(e.target.value) || 0;
    const maxBalance = creatorData?.available_balance || 0;
    setWithdrawAmount(Math.min(val, maxBalance).toString());
  }}
  max={creatorData?.available_balance || 0}
  placeholder={`Max: Rs. ${(creatorData?.available_balance || 0).toLocaleString()}`}
/>
```

---

### Part 7: Revenue & Enrollment Charts Not Working

**Current Problem:**
Charts display but with no data or flat lines.

**Root Cause:**
In `AdminDashboard.tsx`, `revenueData` and `enrollmentData` are set correctly (lines 422-436), but the data relies on `payment_month` field which may not exist or be formatted incorrectly.

**Solution:**
1. Verify `payment_month` field exists and is populated correctly
2. Add `setRevenueData` and `setEnrollmentData` calls after the data processing:

```typescript
// Line 428-436 - ensure these are called
setRevenueData(chartData);
setEnrollmentData(enrollmentChartData);
```

Check if these setState calls are actually present in the code. Add console.log to debug.

---

### Part 8: Bank Signup UI - Make Grade/Stream Selection Professional

**Current Problem:**
The grade/stream selection in `BankSignup.tsx` (lines 562-630) uses basic RadioGroup with minimal styling, while subject selection has premium glass-card styling with gradient orbs.

**Solution:**
Redesign the enrollment step with the same premium styling as subject selection:

```tsx
{/* Step 2: Enrollment Options - Premium Design */}
{step === 'enrollment' && (
  <div className="glass-card p-6 relative overflow-hidden">
    {/* Decorative gradient orbs */}
    <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand/20 rounded-full blur-3xl" />
    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
    
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/30 to-brand/10 flex items-center justify-center mb-4 border border-brand/20">
        <GraduationCap className="w-6 h-6 text-brand" />
      </div>
      
      {/* Grade Selection Cards */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Select Your Grade
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {['al_grade12', 'al_grade13'].map((grade) => {
              const isSelected = selectedGrade === grade;
              return (
                <div
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`
                    relative overflow-hidden rounded-xl p-4 border-2 transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-brand bg-brand/10 shadow-lg shadow-brand/20' 
                      : 'border-border bg-card/50 hover:border-brand/50'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-brand" />
                    </div>
                  )}
                  <p className="font-medium">{GRADE_LABELS[grade]}</p>
                  <p className="text-xs text-muted-foreground">
                    {grade === 'al_grade12' ? '1st Year A/L' : '2nd Year A/L'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Stream Selection Cards - Similar styling */}
        {/* Medium Selection Cards - Similar styling */}
      </div>
    </div>
  </div>
)}
```

---

### Part 9: Upgrade Flow - Only Bank Transfer Available

**Current Problem:**
`Upgrade.tsx` only shows bank transfer option. PayHere card payment is not integrated.

**Solution:**
The `PaymentMethodDialog` component already supports card payments. Use it for upgrades:

```typescript
// In Upgrade.tsx, when user selects a tier:
{requestedTier && (
  <PaymentMethodDialog
    open={paymentDialogOpen}
    onOpenChange={setPaymentDialogOpen}
    tier={requestedTier}
    tierName={getTierDisplayName(requestedTier)}
    amount={amount}
    userEmail={user?.email || ""}
    userName={profile?.full_name || user?.email?.split("@")[0] || "Customer"}
    enrollmentId={enrollment.id}
    onBankTransfer={() => navigate(`/upgrade?tier=${requestedTier}`)}
  />
)}
```

The PaymentMethodDialog already handles both card (PayHere popup) and bank transfer options.

---

### Part 10: Upgrade Status Showing "Pending"

**Current Problem:**
After card payment for upgrade, status still shows "Pending" even though payment succeeded.

**Root Cause:**
The `payhere-checkout/notify` callback needs to handle upgrades differently from new signups.

**Solution:**
In `payhere-checkout/index.ts`, detect if it's an upgrade (enrollmentId exists and != "new"):
```typescript
// In notify handler:
if (custom_2 && custom_2 !== 'new') {
  // This is an upgrade payment
  await supabase
    .from('enrollments')
    .update({ tier: custom_1 }) // custom_1 contains the new tier
    .eq('id', custom_2);
  
  // Mark any pending upgrade_request as completed
  await supabase
    .from('upgrade_requests')
    .update({ status: 'completed', paid_at: new Date().toISOString() })
    .eq('enrollment_id', custom_2)
    .eq('status', 'pending');
}
```

---

### Part 11: Enrollment Deletion - Proper Order

**Current Problem:**
Deleting enrollments fails due to foreign key constraints with `user_subjects` and `subject_medium_requests`.

**Solution:**
In `Enrollments.tsx`, update the delete flow:

```typescript
// When deleting enrollment:
const deleteEnrollment = async (enrollmentId: string, userId: string) => {
  // 1. Delete subject_medium_requests first
  await supabase
    .from('subject_medium_requests')
    .delete()
    .eq('user_id', userId);
  
  // 2. Delete user_subjects
  await supabase
    .from('user_subjects')
    .delete()
    .eq('enrollment_id', enrollmentId);
  
  // 3. Finally delete enrollment
  await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);
};
```

---

### Part 12: Access Code Payments Not in Revenue

**Current Problem:**
Payments from access codes don't appear in revenue calculations. Query returns empty for `payment_type = 'access_code'`.

**Root Cause:**
Access code activations may not be creating `payment_attributions` records.

**Solution:**
In the access code activation flow (`Access.tsx` or related edge function), ensure a payment_attribution is created:

```typescript
// When access code is activated:
await supabase.from('payment_attributions').insert({
  user_id: userId,
  final_amount: accessCode.equivalent_value || pricing[tier].price,
  payment_type: 'access_code',
  payment_month: new Date().toISOString().slice(0, 10),
  tier: accessCode.tier,
});
```

---

### Part 13: Net Profit After Taxes - Sri Lankan Tax Code

**Current Problem:**
Dashboard shows Net Profit but doesn't account for corporate income tax.

**Sri Lankan Tax Code (2025/2026):**
- Standard corporate tax rate: **30%** on taxable income
- After deducting business expenses (PayHere fees, commissions, operational costs)

**Solution:**
Add a "Profit After Tax" calculation to the dashboard:

```typescript
// In AdminDashboard.tsx Net Profit section:
const totalRevenue = stats.totalRevenue + stats.printRevenue;
const payhereCommission = stats.cardPayments * 0.033; // 3.3%
const creatorCommissions = stats.creatorCommissions;
const printCosts = stats.printCost;

// Gross Profit (before tax)
const grossProfit = totalRevenue - payhereCommission - creatorCommissions - printCosts;

// Corporate Tax (30% of profit)
const corporateTaxRate = 0.30;
const estimatedTax = Math.max(0, grossProfit * corporateTaxRate);

// Net Profit After Tax
const netProfitAfterTax = grossProfit - estimatedTax;
```

Display in UI:
```tsx
<div className="p-3 bg-secondary/50 rounded-lg">
  <p className="text-xs text-muted-foreground">Est. Tax (30%)</p>
  <p className="text-lg font-semibold text-red-500">-Rs. {(estimatedTax / 1000).toFixed(1)}K</p>
</div>
<div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
  <p className="text-xs text-muted-foreground">Net After Tax</p>
  <p className="text-lg font-bold text-green-500">Rs. {(netProfitAfterTax / 1000).toFixed(1)}K</p>
</div>
```

**Important Tax Notes:**
- This is an ESTIMATE for planning purposes only
- Actual tax liability depends on registered business structure
- Consult a Sri Lankan tax professional for accurate filings
- Consider adding a disclaimer in the UI

---

### Part 14: Creator Code Stats Not Updating

**Current Problem:**
Creator profiles show stale data for `lifetime_paid_users` and `monthly_paid_users`.

**Solution:**
Verify the database trigger on `payment_attributions` is updating `creator_profiles`:

```sql
-- Check/create trigger function
CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_id IS NOT NULL THEN
    UPDATE creator_profiles
    SET 
      lifetime_paid_users = (
        SELECT COUNT(DISTINCT user_id) 
        FROM payment_attributions 
        WHERE creator_id = NEW.creator_id
      ),
      monthly_paid_users = (
        SELECT COUNT(DISTINCT user_id) 
        FROM payment_attributions 
        WHERE creator_id = NEW.creator_id
        AND created_at >= date_trunc('month', CURRENT_DATE)
      )
    WHERE id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_creator_stats_trigger ON payment_attributions;
CREATE TRIGGER update_creator_stats_trigger
AFTER INSERT ON payment_attributions
FOR EACH ROW
EXECUTE FUNCTION update_creator_stats();
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/WithdrawalRequests.tsx` | Fix bank/crypto display logic |
| `src/components/admin/OTPVerificationDialog.tsx` | Hide OTP input while typing |
| `src/pages/creator/CreatorDashboard.tsx` | Fix commission rate logic, cap withdrawal amount |
| `supabase/functions/process-withdrawal/index.ts` | Add inbox notifications for creators |
| `src/pages/BankSignup.tsx` | Premium UI for grade/stream selection |
| `src/pages/Upgrade.tsx` | Add PayHere card payment option |
| `supabase/functions/payhere-checkout/index.ts` | Handle upgrade payments properly |
| `src/pages/admin/AdminDashboard.tsx` | Add tax calculation, fix chart data |
| `src/pages/admin/Enrollments.tsx` | Proper deletion order |
| `src/pages/Access.tsx` | Create payment_attribution for access codes |

## Database Migrations Needed

```sql
-- 1. Fix creator stats trigger
-- 2. Ensure payment_attribution is created for access codes
```

---

## Testing Checklist

- [ ] Withdrawal requests show correct method (Bank vs Crypto)
- [ ] OTP code is hidden/masked while typing
- [ ] New creators see 12% commission rate
- [ ] Creators receive inbox notifications for referrals and withdrawal updates
- [ ] Withdrawal amount cannot exceed available balance
- [ ] Revenue and enrollment charts display data
- [ ] Bank signup has premium UI for grade/stream selection
- [ ] Upgrade page offers both card and bank payment
- [ ] Card payment for upgrade actually upgrades the tier
- [ ] Enrollment deletion works without foreign key errors
- [ ] Access code activations appear in revenue stats
- [ ] Net profit shows estimated tax and after-tax profit
- [ ] Creator stats update when new payments come in
