

# SSCL Tax Integration & Creator Telegram Bot Notification System

## Overview

This plan addresses two major enhancements:
1. **SSCL Tax Integration**: Add the 2.5% Social Security Contribution Levy to the CEO dashboard tax calculations
2. **Creator Telegram Bot**: Allow creators to receive instant notifications via their own Telegram account

---

## Part 1: SSCL Tax Integration

### Background - Sri Lankan SSCL Tax

Based on official documentation from the Sri Lankan IRD and SSCL Act No. 25 of 2022:

- **SSCL Rate**: 2.5% on liable turnover
- **For Service Providers**: 100% of turnover is liable (we're a digital service)
- **Registration Threshold**: Rs. 15 million per quarter OR Rs. 60 million in 4 consecutive quarters
- **Effective**: Since October 1, 2022

**Important**: SSCL is calculated on **revenue/turnover**, NOT on profit like corporate tax.

### Current Tax Calculation (in `AdminDashboard.tsx`)

```typescript
// Current implementation
const totalRevenue = stats.totalRevenue + stats.printRevenue;
const payhereCommission = stats.cardPayments * 0.033; // 3.3% PayHere fee
const grossProfit = totalRevenue - payhereCommission - stats.creatorCommissions - stats.printCost;

// Corporate Tax (30%)
const CORPORATE_TAX_RATE = 0.30;
const estimatedTax = Math.max(0, grossProfit * CORPORATE_TAX_RATE);
const netProfitAfterTax = grossProfit - estimatedTax;
```

### Updated Tax Calculation (Adding SSCL)

```typescript
const totalRevenue = stats.totalRevenue + stats.printRevenue;

// SSCL (2.5% on turnover - Service Provider rate at 100% liability)
// Reference: SSCL Act No. 25 of 2022, effective 1 Oct 2022
const SSCL_RATE = 0.025; // 2.5%
const ssclTax = totalRevenue * SSCL_RATE;

// Operating Expenses
const payhereCommission = stats.cardPayments * 0.033; // 3.3% PayHere fee
const operatingCosts = payhereCommission + stats.creatorCommissions + stats.printCost;

// Gross Profit (before corporate tax)
// SSCL is a tax expense, deducted before corporate tax
const grossProfit = totalRevenue - operatingCosts - ssclTax;

// Corporate Tax (30% on taxable profit)
const CORPORATE_TAX_RATE = 0.30;
const corporateTax = Math.max(0, grossProfit * CORPORATE_TAX_RATE);

// Net Profit After All Taxes
const netProfitAfterTax = grossProfit - corporateTax;

// Total Tax Burden
const totalTaxBurden = ssclTax + corporateTax;
```

### Updated UI Display

Add SSCL to the Tax & Final Profit Section in the dashboard:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Gross Profit (Before Tax)                                              │
│  Rs. XXX,XXX                                                            │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ SSCL (2.5%) │  │ Corp Tax    │  │ Total Tax   │  │ Net After   │    │
│  │ -Rs. XX.XK  │  │ (30%)       │  │ Burden      │  │ All Taxes   │    │
│  │             │  │ -Rs. XX.XK  │  │ -Rs. XX.XK  │  │ Rs. XX.XK   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│  * SSCL: 2.5% on revenue (Service Provider rate)                       │
│  * Corporate Tax: 30% on profit after expenses                         │
│  * Estimates only - consult a tax professional                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Creator Telegram Bot Notification System

### Concept

Create a dedicated Telegram bot for creators that:
- Sends instant notifications when they earn commissions
- Notifies them of withdrawal approvals/rejections/payments
- Keeps messages brief with a link to inbox for details

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  1. Creator saves Telegram Chat ID in profile                          │
│                                                                         │
│  2. Database trigger fires on payment_attribution INSERT               │
│     OR process-withdrawal edge function runs                           │
│                                                                         │
│  3. Check if creator has telegram_chat_id set                          │
│                                                                         │
│  4. Call new edge function: send-creator-telegram                      │
│     - Uses dedicated CREATOR_TELEGRAM_BOT_TOKEN                        │
│     - Sends brief message to creator's chat_id                         │
│                                                                         │
│  5. Creator receives notification on their Telegram                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Changes

Add `telegram_chat_id` column to `creator_profiles`:

```sql
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
```

### New Secret Required

**Secret Name**: `CREATOR_TELEGRAM_BOT_TOKEN`

This is a SEPARATE bot from the CEO notification bot. The user will need to:
1. Create a new Telegram bot via @BotFather
2. Get the bot token
3. Add it as a secret

### New Edge Function: `send-creator-telegram`

**File**: `supabase/functions/send-creator-telegram/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatorNotification {
  creator_id: string;
  type: 'commission' | 'withdrawal_approved' | 'withdrawal_paid' | 'withdrawal_rejected' | 'referral_signup';
  amount?: number;
  tier?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const botToken = Deno.env.get("CREATOR_TELEGRAM_BOT_TOKEN");
    
    if (!botToken) {
      return new Response(
        JSON.stringify({ success: false, message: "Creator bot not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: CreatorNotification = await req.json();
    const { creator_id, type, amount, tier, message } = body;

    // Get creator's telegram_chat_id
    const { data: creator } = await supabase
      .from('creator_profiles')
      .select('telegram_chat_id, display_name')
      .eq('id', creator_id)
      .single();

    if (!creator?.telegram_chat_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Creator has no Telegram configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format brief message based on type
    let text = "";
    switch (type) {
      case 'commission':
        text = `💰 Commission: Rs.${amount?.toLocaleString()} from ${tier || 'a sale'}. Check inbox for details.`;
        break;
      case 'withdrawal_approved':
        text = `✅ Withdrawal approved: Rs.${amount?.toLocaleString()}. Processing soon.`;
        break;
      case 'withdrawal_paid':
        text = `🎉 Paid: Rs.${amount?.toLocaleString()} sent. Receipt in inbox.`;
        break;
      case 'withdrawal_rejected':
        text = `❌ Withdrawal declined. See inbox for reason.`;
        break;
      case 'referral_signup':
        text = `🌟 New signup via your link! Check inbox.`;
        break;
      default:
        text = message || "You have a new notification.";
    }

    // Send to Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: creator.telegram_chat_id,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();
    return new Response(
      JSON.stringify({ success: result.ok }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Creator Telegram error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### UI Changes - Creator Dashboard

Add a section in the Creator Dashboard for Telegram setup:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  📱 Telegram Notifications                                             │
│                                                                         │
│  Get instant alerts when you earn commissions or withdrawals update.  │
│                                                                         │
│  1. Start a chat with @NotebaseCreatorBot on Telegram                 │
│  2. Send /start to get your Chat ID                                   │
│  3. Enter your Chat ID below:                                          │
│                                                                         │
│  ┌────────────────────────────┐  ┌──────────┐                          │
│  │ Enter Chat ID...          │  │   Save   │                          │
│  └────────────────────────────┘  └──────────┘                          │
│                                                                         │
│  ✓ Connected: 123456789                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integrate with Existing Flows

**A. Commission Notifications (Update database trigger):**

```sql
-- Update notify_creator_on_commission function to also call edge function
-- Note: Database triggers can't call edge functions directly,
-- so we'll call the edge function from the existing notification points
```

Instead of modifying the trigger, we'll update the edge functions that handle payments to also call `send-creator-telegram`:

**B. In `payhere-checkout/index.ts` (after payment success):**
```typescript
// After creating payment attribution with creator_id
if (creatorId) {
  await fetch(`${supabaseUrl}/functions/v1/send-creator-telegram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      creator_id: creatorId,
      type: 'commission',
      amount: commissionAmount,
      tier: tierName,
    }),
  });
}
```

**C. In `process-withdrawal/index.ts` (on status changes):**

Already sends inbox notifications - add Telegram call:

```typescript
// After each status change (approved, paid, rejected):
await fetch(`${supabaseUrl}/functions/v1/send-creator-telegram`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseServiceKey}`,
  },
  body: JSON.stringify({
    creator_id: request.creator_id,
    type: status === 'paid' ? 'withdrawal_paid' 
        : status === 'approved' ? 'withdrawal_approved' 
        : 'withdrawal_rejected',
    amount: request.net_amount,
  }),
});
```

---

## Summary of Changes

### Database Migration

```sql
-- Add Telegram Chat ID field for creators
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
```

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-creator-telegram/index.ts` | Send notifications to creator's Telegram |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminDashboard.tsx` | Add SSCL 2.5% tax calculation and display |
| `src/pages/creator/CreatorDashboard.tsx` | Add Telegram Chat ID setup section |
| `supabase/functions/process-withdrawal/index.ts` | Call send-creator-telegram on status changes |
| `supabase/functions/payhere-checkout/index.ts` | Call send-creator-telegram on commission |
| `supabase/config.toml` | Add send-creator-telegram function config |

### Secrets to Add

| Secret | Purpose |
|--------|---------|
| `CREATOR_TELEGRAM_BOT_TOKEN` | Dedicated bot for creator notifications |

---

## Tax Calculation Summary

| Tax | Rate | Calculated On | Notes |
|-----|------|---------------|-------|
| SSCL | 2.5% | Total Revenue | Service Provider = 100% liable turnover |
| PayHere | 3.3% | Card Payments | Payment gateway fee (deducted) |
| Corporate | 30% | Taxable Profit | After all expenses & SSCL |

**Formula:**
```
Net Profit = Revenue 
           - SSCL (2.5% of Revenue)
           - PayHere Fee (3.3% of Card)
           - Creator Commissions
           - Print Costs
           - Corporate Tax (30% of remaining profit)
```

---

## Testing Checklist

- [ ] SSCL tax displays correctly in CEO dashboard
- [ ] Total tax burden shows SSCL + Corporate Tax
- [ ] Net profit after all taxes is correct
- [ ] Creator can save Telegram Chat ID
- [ ] Creator receives Telegram on commission earned
- [ ] Creator receives Telegram on withdrawal approved
- [ ] Creator receives Telegram on withdrawal paid
- [ ] Creator receives Telegram on withdrawal rejected
- [ ] Messages are brief and professional
- [ ] Each creator only receives THEIR notifications (no mixing)

