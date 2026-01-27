
# Fix Plan: PayHere PH-0014 Error - Order ID Mismatch

## Root Cause Identified

The PH-0014 "Unauthorized payment request" error is caused by a **hash/order_id mismatch**:

1. **Frontend generates**: `order_id = "PR-551da34c"` (line 451)
2. **Edge function generates hash** with this order_id
3. **Edge function returns** `{ merchant_id, hash, sandbox, custom_2 }` - **NO order_id returned!**
4. **Frontend uses** `data.order_id` which is **undefined**
5. **PayHere receives** order_id as "undefined" but hash was calculated for "PR-551da34c"
6. **Hash verification fails** → PH-0014 error

## The Fix

### Update `supabase/functions/payhere-checkout/index.ts`

Add `order_id` to the response for print request payments (lines 307-318):

**Before:**
```typescript
return new Response(
  JSON.stringify({
    merchant_id: merchantId,
    hash: hash,
    sandbox: isSandbox,
    custom_2: `print_${body.print_request_id}`,
  }),
  ...
);
```

**After:**
```typescript
return new Response(
  JSON.stringify({
    merchant_id: merchantId,
    hash: hash,
    sandbox: isSandbox,
    order_id: body.order_id,  // ADD THIS
    custom_2: `print_${body.print_request_id}`,
  }),
  ...
);
```

Also update the regular payment response (lines 341-350) to include `order_id`:

```typescript
return new Response(
  JSON.stringify({
    merchant_id: merchantId,
    hash: hash,
    sandbox: isSandbox,
    order_id: body.order_id,  // ADD THIS
  }),
  ...
);
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/payhere-checkout/index.ts` | Add `order_id: body.order_id` to both print and regular payment responses |

## Technical Details

The secrets are correctly configured - the issue is purely a **missing field in the API response**:

- **LIVE mode secrets** (currently active):
  - `PAYHERE_MERCHANT_ID` ✓
  - `PAYHERE_MERCHANT_SECRET` ✓

- **TEST web secrets** (if you switch to test mode):
  - `PAYHERE_MERCHANT_SANDOBOX_ID` ✓ (note the typo)
  - `PAYHERE_MERCHANT_SANDBOX_SECRET_WEB` ✓

- **TEST localhost secrets**:
  - `PAYHERE_MERCHANT_SECRET_SANDBOX_LOCALHOST` ✓

The hash is generated correctly, but when the frontend doesn't receive the `order_id` back, it sends `undefined` to PayHere, which breaks the hash verification.

## Testing After Fix

1. Open Print Request Dialog
2. Select papers and choose Card Payment
3. PayHere popup should open without PH-0014 error
4. Complete a test payment successfully
