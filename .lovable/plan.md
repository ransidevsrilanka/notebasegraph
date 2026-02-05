
# Comprehensive Platform Fixes - Upgrades, Dashboard, Tiers & Referrals

## Issues Identified & Solutions

---

## Part 1: Upgrade Flow Issues

### 1.1 Card Payment Option Missing for Upgrades

**Current Problem:**
The `Upgrade.tsx` page shows `PaymentMethodDialog` when selecting a tier (lines 441-456), BUT there's a logic issue. The dialog opens, but after clicking card payment, the flow works. However, when coming back via URL param `/upgrade?tier=gold`, it goes directly to bank transfer flow (line 466+) without showing the payment method choice.

**Solution:**
When landing on `/upgrade?tier=X`, show `PaymentMethodDialog` first instead of immediately showing bank transfer form. Only show bank transfer details after user explicitly chooses bank transfer.

### 1.2 Same Reference Number for Multiple Upgrades

**Current Problem:**
When a student upgrades from Silver → Gold, a reference number is created. If they later try Gold → Platinum, the existing request (with old reference) is reused (lines 123-149) because it only checks for `status: 'pending'`.

**Solution:**
Check if the existing request's `requested_tier` matches the new `requestedTier`. If not, create a NEW request with a new reference number:

```typescript
// In useEffect checking existing request:
if (existingRequest?.requested_tier !== requestedTier) {
  // Create new request for the different tier
  setExistingRequest(null); // Clear to trigger new creation
}
```

### 1.3 Upgrade Status Showing "Pending" After Card Payment

**Current Problem:**
After PayHere card payment succeeds for upgrade, the `payhere-checkout` notify handler (lines 594-638) updates enrollment tier AND sets upgrade_request status to "approved". But the frontend may still show "pending" because:
1. User lands on page before notify callback completes
2. The `existingRequest` state shows old data

**Solution:**
1. In `Upgrade.tsx`, add a useEffect to check for `pending_upgrade_payment` in localStorage (set in PaymentMethodDialog line 200-208)
2. Poll for payment verification and enrollment update
3. Show success state when upgrade is confirmed

---

## Part 2: Admin Dashboard - Too Cluttered ("Carnival")

**Current Problem:**
The dashboard has:
- Large Net Profit card with tax breakdown (duplicated SSCL display)
- 6 MiniStatCards
- Conversion Funnel + Revenue Forecast
- 2 Charts
- 3 more cards (Tier, Payment Methods, Storage)
- Referral Network Breakdown
- Creator Leaderboard
- Danger Zone

**Solution - Reorganize into Logical Sections:**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  CEO DASHBOARD - Clean Professional Layout                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SECTION 1: Financial Health (Primary Focus)                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Net Profit Card (simplified - no duplicate SSCL display)          │ │
│  │ Revenue | SSCL | PayHere | Commissions | Corp Tax | Net After Tax │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  SECTION 2: Key Metrics (3x2 Grid)                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                                  │
│  │Total Rev│ │This Mo. │ │Students │                                  │
│  ├─────────┤ ├─────────┤ ├─────────┤                                  │
│  │Card Pay │ │Bank Pay │ │Creators │                                  │
│  └─────────┘ └─────────┘ └─────────┘                                  │
│                                                                         │
│  SECTION 3: Performance Charts (Side by Side)                          │
│  ┌─────────────────────┐ ┌─────────────────────┐                       │
│  │ Revenue Chart       │ │ Enrollments Chart   │                       │
│  └─────────────────────┘ └─────────────────────┘                       │
│                                                                         │
│  SECTION 4: Business Intelligence                                       │
│  ┌─────────────────────┐ ┌─────────────────────┐                       │
│  │ Conversion Funnel   │ │ Revenue Forecast    │                       │
│  └─────────────────────┘ └─────────────────────┘                       │
│                                                                         │
│  SECTION 5: Distribution & Details (Collapsible)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                               │
│  │ Tiers    │ │ Payments │ │ Storage  │                               │
│  └──────────┘ └──────────┘ └──────────┘                               │
│                                                                         │
│  SECTION 6: Referral Insights (Collapsible)                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Referral Network Breakdown                                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  SECTION 7: Top Performers (Collapsible)                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Creator Leaderboard                                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. Remove duplicate SSCL display (currently shown twice in profit card)
2. Add section headers with collapse/expand for less-used sections
3. Move "Danger Zone" to Settings page instead of dashboard
4. Add "Print Revenue" to the key metrics grid

---

## Part 3: SSCL Tax Calculation Fix

**Current Problem:**
Looking at lines 728-753, the SSCL is calculated correctly as 2.5% of revenue, BUT the formula deducts it BEFORE calculating gross profit, which is correct. However, I see SSCL is displayed twice:
1. In the top metric cards (line 777-778)
2. In the tax breakdown section (line 795-798)

The tax formula is:
```typescript
const grossProfit = totalRevenue - operatingCosts - ssclTax;
const corporateTax = Math.max(0, grossProfit * 0.30);
```

**This is CORRECT!** SSCL is deducted from revenue before calculating corporate tax, which is the proper approach since SSCL is a business expense.

**Fix Needed:**
Remove the duplicate SSCL display and keep only ONE instance in the tax breakdown section.

---

## Part 4: PDF Export Issues

**Problem:**
PDF export may not be correctly exporting the right details.

**Solution:**
Audit the PDF export functionality (likely in the creator dashboard or admin sections) and ensure all required fields are included.

---

## Part 5: Creator Tier Promotion Logic

**Current Database State (from query):**
- Tier 1 (Base): 8% commission, 0 threshold
- Tier 2: 12% commission, 100 threshold
- Tier 3: 15% commission, 250 threshold
- Tier 4: 20% commission, 500 threshold

**Current Logic in `evaluate-creator-tiers` (lines 84-100):**
```typescript
// Get monthly paid users count
const { count: monthlyPaidUsers } = await supabase
  .from('payment_attributions')
  .select('*', { count: 'exact', head: true })
  .eq('creator_id', creator.id)
  .gte('created_at', currentMonthStart.toISOString());

const monthlyCount = monthlyPaidUsers || 0;

// Determine tier based on monthly performance
let newTierLevel = 1; // Start at lowest tier
for (const tier of commissionTiers) {
  if (monthlyCount >= tier.monthly_user_threshold) {
    newTierLevel = tier.tier_level;
  }
}
```

**PROBLEM IDENTIFIED!**
The logic uses `currentMonthStart` (first of current calendar month), NOT a rolling 30-day window!

A creator who signs up on Jan 15 and brings 500 users by Feb 15:
- If evaluated on Feb 1: Only ~15 days of data counted
- If evaluated on Feb 15: Still only counts from Feb 1 (not the full 30 days)

**SOLUTION:**
Use a rolling 30-day window:

```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { count: monthlyPaidUsers } = await supabase
  .from('payment_attributions')
  .select('*', { count: 'exact', head: true })
  .eq('creator_id', creator.id)
  .gte('created_at', thirtyDaysAgo.toISOString());
```

---

## Part 6: Referral Count Mismatch (3 vs 2)

**Current Logic in `UserReferrals.tsx` (lines 100-138):**
The issue is likely in how paid referrals are counted:

```typescript
// Get all payment attributions for paid referrals
const { data: paymentAttributions } = await supabase
  .from('payment_attributions')
  .select('user_id');

// Count referrals for each referrer
const paidUserIds = new Set(paymentAttributions?.map(pa => pa.user_id) || []);

attributions?.forEach(attr => {
  if (attr.referral_source && referrerMap.has(attr.referral_source)) {
    const referrer = referrerMap.get(attr.referral_source)!;
    referrer.total_referrals++;
    if (paidUserIds.has(attr.user_id)) {
      referrer.paid_referrals++;
    }
  }
});
```

**Potential Issue:**
The `profiles` table is queried but profiles might not include users who signed up but haven't completed their profile. The `user_attributions` table should have ALL signups via referral.

**Solution:**
Ensure the count uses `user_attributions` correctly and cross-reference with actual signups, not just profiles.

Also, check if the student's referral code matches the format expected (USR prefix).

---

## Part 7: Enrollment Deletion Order

**Current Problem:**
Deleting enrollments fails due to foreign key constraints. Need to delete in order:
1. `subject_medium_requests` (by user_id)
2. `user_subjects` (by enrollment_id)
3. `enrollments` (by id)

**Solution:**
Update the delete function in `Enrollments.tsx` to cascade deletes properly.

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Upgrade.tsx` | Fix payment method flow, unique reference per tier, poll for upgrade completion |
| `src/pages/admin/AdminDashboard.tsx` | Reorganize sections, remove duplicate SSCL, add collapsible sections |
| `supabase/functions/evaluate-creator-tiers/index.ts` | Use rolling 30-day window instead of calendar month |
| `src/pages/admin/UserReferrals.tsx` | Fix referral counting logic |
| `src/pages/admin/Enrollments.tsx` | Cascade delete in correct order |
| `src/components/PaymentMethodDialog.tsx` | Already supports upgrades - no changes needed |

---

## Database Considerations

No schema changes needed - only logic fixes in application code and edge functions.

---

## Testing Checklist

- [ ] Upgrade page shows payment method choice (Card/Bank)
- [ ] Card payment for upgrade updates tier immediately
- [ ] Different upgrade tiers get different reference numbers
- [ ] Dashboard is organized and professional
- [ ] SSCL shows only once in tax breakdown
- [ ] Creator with 500 users in 30 days gets promoted to 20%
- [ ] Referral counts match between student dashboard and admin panel
- [ ] Enrollments can be deleted without FK errors
