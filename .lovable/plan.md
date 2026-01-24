
# Mobile UI Fixes, Notifications & System Improvements

## Overview
This plan addresses multiple mobile UI issues, missing features, and system improvements identified from the screenshots and requirements.

---

## Issues Identified

### From Screenshots:
1. **Payment Method Dialog** - Card Payment button text is cut off on mobile
2. **Join Requests page** - Action buttons (Reject) are cut off on mobile
3. **AI Chat tables not rendering** - Markdown tables showing as raw text
4. **AI Chat overlay covering send button** - Floating button overlaps the send button
5. **AI Chat button shows on AI Chat page** - Should be hidden on `/ai-assistant`

### From Requirements:
6. **Access codes showing as "unused" when used** - Status not updating correctly
7. **Telegram notification for new student signup with access code** - Missing notification
8. **Revenue forecast logic incorrect** - Should compare week-over-week, not monthly
9. **Support email update** - Change all emails to `support@notebase.tech`

---

## Phase 1: Mobile UI Fixes

### 1.1 Payment Method Dialog (Mobile Responsiveness)
**File:** `src/components/PaymentMethodDialog.tsx`

**Problem:** Button text and descriptions are cut off on small screens.

**Solution:**
- Reduce padding and icon size on mobile
- Add `min-w-0` and `flex-shrink` to prevent text overflow
- Make button layout stack vertically on very small screens
- Reduce text size for mobile

```tsx
// Changes to button styling:
className="h-auto py-3 sm:py-4 px-4 sm:px-6 justify-start gap-3 sm:gap-4 flex-col sm:flex-row items-start sm:items-center"

// Icon container:
<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/10 flex-shrink-0 flex items-center justify-center">
  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
</div>

// Text container:
<div className="text-left min-w-0">
  <p className="font-semibold text-foreground text-sm sm:text-base">Card Payment</p>
  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
    Pay instantly with Visa, Mastercard, or Amex
  </p>
</div>
```

### 1.2 Join Requests Page (Mobile Button Layout)
**File:** `src/pages/admin/JoinRequests.tsx`

**Problem:** Action buttons overflow horizontally on mobile.

**Solution:**
- Wrap buttons to next line on small screens
- Use `flex-wrap` with smaller button sizes on mobile
- Stack buttons vertically on very small screens

```tsx
// Change button container (line ~312):
<div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
  {request.receipt_url && (
    <Button variant="outline" size="sm" className="text-xs px-2 py-1.5">
      <Download className="w-3 h-3 mr-1" />
      Receipt
    </Button>
  )}
  {/* ... other buttons with similar sizing */}
</div>

// On mobile, buttons should be in 2 rows of 2
```

### 1.3 AI Chat Table Rendering Fix
**File:** `src/components/ai-chat/MessageBubble.tsx`

**Problem:** The `fixMalformedTables` function pattern doesn't catch all table formats.

**Solution:**
- Enhance the regex pattern to handle more table variations
- Add fallback parsing for vertical-bar-delimited content
- Ensure table container has proper overflow handling

```tsx
function fixMalformedTables(content: string): string {
  // Enhanced pattern to catch more table formats
  // Also handle consecutive pipes on same line
  
  // First, try to detect tables that are entirely on one line
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  for (const line of lines) {
    // Count pipes - if a line has many pipes, it might be a collapsed table
    const pipeCount = (line.match(/\|/g) || []).length;
    if (pipeCount > 4 && line.includes('|---')) {
      // This line contains a collapsed table - expand it
      const parts = line.split(/(\|[-:\s]+(?:\|[-:\s]+)+\|)/);
      if (parts.length >= 2) {
        // Reconstruct with newlines
        processedLines.push(...parts.filter(Boolean).map(p => p.trim()));
      } else {
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}
```

---

## Phase 2: AI Chat Button Visibility Fix

### 2.1 Hide ChatButton on AI Chat Page
**File:** `src/components/ai-chat/ChatButton.tsx`

**Problem:** The floating chat button appears even when user is already on the AI assistant page, overlapping the send button.

**Solution:**
- Check current route using `useLocation`
- Hide button when on `/ai-assistant` route

```tsx
import { useLocation } from "react-router-dom";

export function ChatButton({ className }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, enrollment } = useAuth();
  const location = useLocation();

  // Hide on AI assistant full page
  if (location.pathname === '/ai-assistant') {
    return null;
  }

  // Only show for logged-in users with enrollment
  if (!user || !enrollment) {
    return null;
  }
  // ... rest of component
}
```

---

## Phase 3: Access Code Status Fix

### 3.1 Investigate Access Code Status Issue
**File:** `src/pages/Access.tsx` (line ~213-222)

**Problem:** Access codes still show as "unused" after being activated.

**Analysis:** The current code updates the access code with:
```tsx
await supabase
  .from('access_codes')
  .update({
    status: 'used' as const,
    activated_by: authData.user.id,
    activated_at: new Date().toISOString(),
    bound_email: email,
    activations_used: 1,
  })
  .eq('id', validatedCode.id);
```

**Potential Issues:**
1. RLS policy might be blocking the update
2. Update might be failing silently

**Solution:**
- Add proper error handling and logging
- Ensure the update succeeds before proceeding
- Add Telegram notification for new signup

```tsx
// Line ~213-222, add error handling:
const { error: codeUpdateError } = await supabase
  .from('access_codes')
  .update({
    status: 'used' as const,
    activated_by: authData.user.id,
    activated_at: new Date().toISOString(),
    bound_email: email,
    activations_used: 1,
  })
  .eq('id', validatedCode.id);

if (codeUpdateError) {
  console.error('Failed to update access code:', codeUpdateError);
  // Continue anyway - enrollment is more important
}

// Send Telegram notification for new signup
await supabase.functions.invoke('send-telegram-notification', {
  body: {
    type: 'new_access_code_signup',
    message: `New student signed up using access code`,
    data: {
      email: email,
      name: name,
      code: accessCode,
      tier: TIER_LABELS[validatedCode.tier as keyof typeof TIER_LABELS],
      grade: GRADE_LABELS[validatedCode.grade as keyof typeof GRADE_LABELS],
    },
    priority: 'low'
  }
});
```

---

## Phase 4: Revenue Forecast Logic Update

### 4.1 Change to Week-over-Week Comparison
**File:** `src/components/dashboard/RevenueForecast.tsx`

**Problem:** Current logic compares monthly data, but requirement is week-over-week.

**Solution:**
- Update props interface to accept weekly data
- Change calculations to compare this week vs last week
- Update visual labels

```tsx
interface RevenueForecastProps {
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  twoWeeksAgoRevenue: number;
  daysIntoWeek: number; // 1-7
}

export const RevenueForecast = ({ 
  thisWeekRevenue, 
  lastWeekRevenue, 
  twoWeeksAgoRevenue,
  daysIntoWeek 
}: RevenueForecastProps) => {
  // Calculate weekly growth trend
  const growth1 = lastWeekRevenue > 0 && twoWeeksAgoRevenue > 0 
    ? ((lastWeekRevenue - twoWeeksAgoRevenue) / twoWeeksAgoRevenue) 
    : 0;
  
  // Project this week based on days passed (7 days in a week)
  const projectedThisWeek = daysIntoWeek > 0 
    ? Math.round((thisWeekRevenue / daysIntoWeek) * 7)
    : thisWeekRevenue;
  
  // Trend percentage vs last week
  const trendPercent = lastWeekRevenue > 0 
    ? Math.round(((projectedThisWeek - lastWeekRevenue) / lastWeekRevenue) * 100)
    : 0;
  
  // Forecast next week
  const forecastNextWeek = Math.round(projectedThisWeek * (1 + growth1));
  
  // Update labels: "2 weeks ago", "Last week", "This week"
  // ...
};
```

**Parent Component Update:**
The component that uses `RevenueForecast` needs to provide weekly data. This typically would be in an admin dashboard or analytics page.

---

## Phase 5: Support Email Update

### 5.1 Update All Email References
**Files to modify:**
1. `src/components/Footer.tsx` (lines 53-55)
2. `src/pages/PrivacyPolicy.tsx` (lines 150-156)
3. `src/pages/RefundPolicy.tsx` (lines 93, 144-146)
4. `src/pages/TermsOfService.tsx` (lines 160-163)

**Change:** Replace all instances of `ransibeats@gmail.com` and `support@coursemaster.store` with `support@notebase.tech`

```tsx
// Footer.tsx
<a href="mailto:support@notebase.tech" className="inline-flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors text-sm">
  <Mail className="w-4 h-4" />
  support@notebase.tech
</a>

// All policy pages
<a href="mailto:support@notebase.tech" className="text-primary hover:underline">
  support@notebase.tech
</a>
```

---

## Phase 6: Add Notification Type

### 6.1 Update Telegram Notification Function
**File:** `supabase/functions/send-telegram-notification/index.ts`

**Add new notification type for access code signups:**

```typescript
const NOTIFICATION_TYPES: Record<string, { emoji: string; title: string; priority: string }> = {
  // ... existing types
  'new_access_code_signup': {
    emoji: '🎓',
    title: 'New Student Signup (Access Code)',
    priority: 'low'
  },
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/PaymentMethodDialog.tsx` | Mobile-responsive button layout |
| `src/pages/admin/JoinRequests.tsx` | Wrap action buttons on mobile |
| `src/components/ai-chat/MessageBubble.tsx` | Improve table parsing |
| `src/components/ai-chat/ChatButton.tsx` | Hide on /ai-assistant route |
| `src/pages/Access.tsx` | Add error handling + Telegram notification |
| `src/components/dashboard/RevenueForecast.tsx` | Week-over-week logic |
| `src/components/Footer.tsx` | Update email |
| `src/pages/PrivacyPolicy.tsx` | Update email |
| `src/pages/RefundPolicy.tsx` | Update email |
| `src/pages/TermsOfService.tsx` | Update email |
| `supabase/functions/send-telegram-notification/index.ts` | Add notification type |

---

## Testing Checklist

- [ ] Open Payment Method dialog on mobile - buttons should be fully visible
- [ ] Open Join Requests on mobile - all action buttons visible (may wrap to 2 lines)
- [ ] Send AI chat message with table - table should render properly
- [ ] Navigate to /ai-assistant - floating chat button should not appear
- [ ] Register new account with access code - code status should change to "used"
- [ ] Check Telegram for new signup notification
- [ ] Verify all policy pages show correct email: support@notebase.tech
