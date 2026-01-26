
# Print Request System Fixes & Enhancements

## Issues Identified

1. **Print Request Dialog - History Management**: Currently shows all orders; needs to archive old completed/cancelled orders and only show ongoing orders (pending, confirmed, processing, shipped)
2. **Card Payment - PayHere Popup Not Showing**: The dialog doesn't trigger PayHere payment flow when card payment is selected
3. **Receipt Upload Failing**: Uses wrong storage bucket (`receipts` instead of `print-receipts` which doesn't exist)
4. **Print Settings Panel Not Integrated**: `PrintSettingsPanel.tsx` exists but is not integrated into any admin page
5. **Bank Details Not Editable**: Bank details for print orders should be manageable from `/admin/payment-settings`
6. **Receipt Upload UX**: Needs to replicate the exact upgrade page flow with proper file handling

---

## Root Cause Analysis

### 1. Receipt Upload Failure
**Problem**: Line 307-309 in `PrintRequestDialog.tsx` tries to upload to a `receipts` bucket that doesn't exist:
```typescript
const { error } = await supabase.storage
  .from('receipts')  // ❌ This bucket doesn't exist
  .upload(fileName, file);
```

**Solution**: Need to create `print-receipts` storage bucket OR use the existing `upgrade-receipts` bucket with proper folder structure.

### 2. Card Payment Not Triggering
**Problem**: In Step 4 (line 823-830), there's only a note saying "Card payment will be processed on the next step", but Step 5 (Confirmation) just calls `handleSubmit()` which doesn't initiate PayHere.

**Solution**: When card payment is selected, after Step 5 confirmation, need to:
1. Create the print_request record
2. Call `payhere-checkout` edge function with `print_request_id`
3. Open PayHere payment popup
4. Handle success/failure callbacks

### 3. Missing Storage Bucket
**Problem**: No `print-receipts` bucket exists in database migrations.

**Solution**: Create storage bucket with proper RLS policies (similar to `upgrade-receipts`).

### 4. History Management
**Problem**: All orders are shown by default, cluttering the UI for users with many orders.

**Solution**: 
- Filter to show only "active" orders: `['pending', 'confirmed', 'processing', 'shipped']`
- Add "View History" button to show completed/cancelled/delivered orders

### 5. Print Settings Integration
**Problem**: `PrintSettingsPanel.tsx` component exists but is not imported/used anywhere.

**Solution**: Add to `/admin/payment-settings` page below the payment mode section.

### 6. Bank Details Management
**Problem**: Bank details are stored in `site_settings` with key `bank_details` but not editable from payment settings page.

**Solution**: Add an editable form in `/admin/payment-settings` to manage bank details.

---

## Implementation Plan

### Phase 1: Database & Storage Setup

#### 1.1 Create Print Receipts Storage Bucket
**Migration SQL:**
```sql
-- Create print-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-receipts', 'print-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload print receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'print-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to read their own receipts
CREATE POLICY "Users can view own print receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow admins to view all print receipts
CREATE POLICY "Admins can view all print receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'admin', 'head_ops')
  )
);

-- Allow admins to delete print receipts
CREATE POLICY "Admins can delete print receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'print-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'admin')
  )
);
```

#### 1.2 Ensure Bank Details Schema
Bank details should be stored in `site_settings` table with key `bank_details` as JSON:
```json
{
  "bank_name": "Bank of Ceylon",
  "account_number": "1234567890",
  "account_holder": "NoteBASE Education",
  "branch_name": "Colombo Main"
}
```

---

### Phase 2: Fix Receipt Upload in Print Request Dialog

#### File: `src/components/dashboard/PrintRequestDialog.tsx`

**Changes to `handleReceiptUpload` function (lines 300-319):**

Replace the current implementation with the Upgrade page pattern:

```typescript
const handleReceiptUpload = async (file: File) => {
  if (!user) return null;
  
  setIsUploading(true);
  
  try {
    // Use unique timestamp to avoid UPDATE RLS issues
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `${user.id}/print_${timestamp}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('print-receipts')  // ✅ Correct bucket name
      .upload(filePath, file, {
        upsert: false,  // Don't use upsert to avoid UPDATE policy requirement
        contentType: file.type || undefined,
        cacheControl: '3600',
      });
    
    if (error) {
      console.error('Storage upload error:', {
        error,
        bucket: 'print-receipts',
        path: filePath,
        userId: user.id,
      });
      toast.error('Failed to upload receipt');
      setIsUploading(false);
      return null;
    }
    
    setIsUploading(false);
    return filePath;  // ✅ Return full path, not just filename
    
  } catch (err: any) {
    console.error('Receipt upload error:', err);
    toast.error(err?.message || 'Failed to upload receipt');
    setIsUploading(false);
    return null;
  }
};
```

**Update `handleSubmit` to properly store receipt URL (line 332-334):**

```typescript
// Handle bank transfer receipt upload
if (paymentMethod === 'bank_transfer' && receiptFile) {
  receiptUrl = await handleReceiptUpload(receiptFile);
  if (!receiptUrl) {
    setIsLoading(false);
    return; // Stop if upload failed
  }
}
```

---

### Phase 3: Implement Card Payment Flow

#### File: `src/components/dashboard/PrintRequestDialog.tsx`

**Add new function to initiate PayHere payment:**

```typescript
const initiateCardPayment = async (printRequestId: string) => {
  if (!user || !enrollment) return;
  
  try {
    setIsLoading(true);
    
    // Call edge function to get PayHere hash
    const { data, error } = await supabase.functions.invoke('payhere-checkout', {
      body: {
        order_id: `PR-${printRequestId.substring(0, 8)}`,
        items: `Print Request - ${subjects.find(s => s.id === selectedSubject)?.name}`,
        amount: calculateTotal(),
        currency: 'LKR',
        first_name: fullName.split(' ')[0] || 'Customer',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: phone,
        address: address,
        city: city || 'Colombo',
        country: 'Sri Lanka',
        print_request_id: printRequestId,
      }
    });
    
    if (error) {
      console.error('PayHere checkout error:', error);
      toast.error('Failed to initiate payment');
      setIsLoading(false);
      return;
    }
    
    // Create PayHere form and submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';
    
    // Add all PayHere fields
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'sandbox') {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });
    
    document.body.appendChild(form);
    form.submit();
    
  } catch (err: any) {
    console.error('Card payment error:', err);
    toast.error('Failed to process payment');
    setIsLoading(false);
  }
};
```

**Modify `handleSubmit` to handle card payment (replace lines 321-369):**

```typescript
const handleSubmit = async () => {
  if (!user || !enrollment) return;
  
  setIsLoading(true);
  
  const requestNumber = referenceNumber || generateReferenceNumber();
  const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
  
  let receiptUrl: string | null = null;
  
  // Handle bank transfer receipt upload
  if (paymentMethod === 'bank_transfer' && receiptFile) {
    receiptUrl = await handleReceiptUpload(receiptFile);
    if (!receiptUrl) {
      setIsLoading(false);
      return; // Stop if upload failed
    }
  }
  
  // Create print request record
  const { data: printRequest, error } = await supabase
    .from('print_requests')
    .insert({
      user_id: user.id,
      request_number: requestNumber,
      full_name: fullName,
      address,
      phone,
      city,
      print_type: printType,
      subject_id: selectedSubject,
      subject_name: subjectName,
      topic_ids: allTopics ? [] : selectedTopics,
      estimated_pages: estimatedPages,
      estimated_price: calculateTotal() - (settings?.base_delivery_fee || 0) - (paymentMethod === 'cod' ? settings?.cod_extra_fee || 0 : 0),
      delivery_fee: settings?.base_delivery_fee || 0,
      total_amount: calculateTotal(),
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'bank_transfer' ? 'pending_verification' : paymentMethod === 'card' ? 'pending' : 'pending',
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      receipt_url: receiptUrl,
    })
    .select()
    .single();
  
  if (error) {
    toast.error('Failed to submit request');
    console.error(error);
    setIsLoading(false);
    return;
  }
  
  // Handle different payment methods
  if (paymentMethod === 'card') {
    // Initiate PayHere payment
    await initiateCardPayment(printRequest.id);
  } else if (paymentMethod === 'bank_transfer') {
    toast.success('Print request submitted! Please wait for verification.');
    resetForm();
    loadExistingOrders();
    setViewMode('orders');
    setIsLoading(false);
  } else if (paymentMethod === 'cod') {
    toast.success('Print request submitted! Payment will be collected upon delivery.');
    resetForm();
    loadExistingOrders();
    setViewMode('orders');
    setIsLoading(false);
  }
};
```

---

### Phase 4: Add History Management

#### File: `src/components/dashboard/PrintRequestDialog.tsx`

**Add state for showing history (after line 126):**

```typescript
const [showHistory, setShowHistory] = useState(false);
```

**Filter orders based on history view (update line 195-204):**

```typescript
useEffect(() => {
  if (open && viewMode === 'orders') {
    loadExistingOrders();
  }
}, [open, viewMode, user?.id]);

// Filter orders based on showHistory
const activeStatuses = ['pending', 'confirmed', 'processing', 'shipped'];
const completedStatuses = ['delivered', 'cancelled'];

const displayedOrders = showHistory 
  ? existingOrders.filter(order => completedStatuses.includes(order.status))
  : existingOrders.filter(order => activeStatuses.includes(order.status));
```

**Update orders view UI (replace lines 426-478):**

```typescript
{viewMode === 'orders' && (
  <div className="space-y-4">
    {loadingOrders ? (
      <div className="text-center py-8 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading orders...
      </div>
    ) : (
      <>
        {/* Toggle between Active and History */}
        <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              !showHistory 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Orders ({existingOrders.filter(o => activeStatuses.includes(o.status)).length})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              showHistory 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            History ({existingOrders.filter(o => completedStatuses.includes(o.status)).length})
          </button>
        </div>
        
        {displayedOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {showHistory ? 'No completed orders yet' : 'No active orders'}
            </p>
            {!showHistory && (
              <Button variant="brand" onClick={startNewRequest}>
                <Plus className="w-4 h-4 mr-2" />
                Request Printouts
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {displayedOrders.map((order) => (
                <div key={order.id} className="p-4 border border-border rounded-lg space-y-2">
                  {/* ... existing order card UI ... */}
                </div>
              ))}
            </div>
            
            {!showHistory && (
              <Button variant="brand" onClick={startNewRequest} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            )}
          </>
        )}
      </>
    )}
  </div>
)}
```

---

### Phase 5: Integrate Print Settings & Bank Details in Payment Settings

#### File: `src/pages/admin/PaymentSettings.tsx`

**Add imports (after line 18):**

```typescript
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PrintSettingsPanel from '@/components/dashboard/PrintSettingsPanel';
import { Building2, Save } from 'lucide-react';
```

**Add state for bank details (after line 34):**

```typescript
const [bankDetails, setBankDetails] = useState({
  bank_name: '',
  account_number: '',
  account_holder: '',
  branch_name: '',
});
const [isSavingBank, setIsSavingBank] = useState(false);
```

**Fetch bank details (update `fetchPaymentMode` or add new effect):**

```typescript
useEffect(() => {
  const fetchBankDetails = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bank_details')
      .maybeSingle();
    
    if (!error && data?.value) {
      setBankDetails(data.value as any);
    }
  };
  
  fetchBankDetails();
}, []);
```

**Add save bank details function:**

```typescript
const saveBankDetails = async () => {
  setIsSavingBank(true);
  try {
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', 'bank_details')
      .maybeSingle();
    
    if (existing) {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: bankDetails })
        .eq('key', 'bank_details');
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('site_settings')
        .insert([{ key: 'bank_details', value: bankDetails }]);
      if (error) throw error;
    }
    
    toast.success('Bank details updated successfully');
  } catch (err) {
    console.error('Error saving bank details:', err);
    toast.error('Failed to save bank details');
  } finally {
    setIsSavingBank(false);
  }
};
```

**Add UI sections (after the payment mode section, before closing container div):**

```tsx
{/* Bank Details Section */}
<div className="glass-card p-6 space-y-6">
  <div className="flex items-center gap-3">
    <Building2 className="w-5 h-5 text-brand" />
    <div>
      <h2 className="text-lg font-semibold text-foreground">Bank Account Details</h2>
      <p className="text-xs text-muted-foreground">For print orders and bank transfers</p>
    </div>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Bank Name</Label>
      <Input
        value={bankDetails.bank_name}
        onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
        placeholder="Bank of Ceylon"
      />
    </div>
    
    <div className="space-y-2">
      <Label>Account Number</Label>
      <Input
        value={bankDetails.account_number}
        onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))}
        placeholder="1234567890"
      />
    </div>
    
    <div className="space-y-2">
      <Label>Account Holder Name</Label>
      <Input
        value={bankDetails.account_holder}
        onChange={(e) => setBankDetails(prev => ({ ...prev, account_holder: e.target.value }))}
        placeholder="NoteBASE Education"
      />
    </div>
    
    <div className="space-y-2">
      <Label>Branch Name</Label>
      <Input
        value={bankDetails.branch_name}
        onChange={(e) => setBankDetails(prev => ({ ...prev, branch_name: e.target.value }))}
        placeholder="Colombo Main"
      />
    </div>
  </div>
  
  <Button 
    variant="brand" 
    onClick={saveBankDetails}
    disabled={isSavingBank}
    className="w-full"
  >
    <Save className="w-4 h-4 mr-2" />
    {isSavingBank ? 'Saving...' : 'Save Bank Details'}
  </Button>
</div>

{/* Print Pricing Settings */}
<PrintSettingsPanel />
```

---

### Phase 6: Edge Function Updates (Already Implemented)

The `payhere-checkout` edge function already handles print requests correctly (lines 287-312 for hash generation, lines 532-578 for payment notification). No changes needed.

---

## Testing Checklist

### Receipt Upload
- [ ] Create print-receipts storage bucket
- [ ] Upload receipt from print request dialog (bank transfer)
- [ ] Verify file appears in storage bucket
- [ ] Verify admin can view receipt in print requests page

### Card Payment
- [ ] Select card payment in print request dialog
- [ ] Submit order - PayHere popup should appear
- [ ] Complete test payment
- [ ] Verify order status changes to "confirmed"
- [ ] Verify payment_status changes to "paid"
- [ ] Verify user receives inbox notification
- [ ] Verify admin receives Telegram notification

### History Management
- [ ] Create multiple print orders
- [ ] Mark some as delivered/cancelled
- [ ] Verify "Active Orders" shows only pending/confirmed/processing/shipped
- [ ] Click "History" tab
- [ ] Verify shows only delivered/cancelled orders
- [ ] Verify counts are accurate

### Payment Settings Integration
- [ ] Navigate to /admin/payment-settings
- [ ] Verify bank details form is visible
- [ ] Update bank details
- [ ] Save - verify success toast
- [ ] Verify print settings panel is visible
- [ ] Update pricing
- [ ] Save - verify success toast
- [ ] Create new print request
- [ ] Verify bank details shown match updated values
- [ ] Verify pricing matches updated values

### COD Flow
- [ ] Select COD payment method
- [ ] Verify COD fee is added to total
- [ ] Verify confirmation checkbox is required
- [ ] Submit order
- [ ] Verify status is "confirmed" immediately
- [ ] Verify payment_status is "pending"

---

## Files to Modify

1. **Database Migration** (new file)
   - Create `print-receipts` storage bucket
   - Add RLS policies

2. **`src/components/dashboard/PrintRequestDialog.tsx`**
   - Fix `handleReceiptUpload` to use correct bucket
   - Add `initiateCardPayment` function
   - Update `handleSubmit` to handle card payments
   - Add history management (showHistory state)
   - Update orders display UI with Active/History tabs

3. **`src/pages/admin/PaymentSettings.tsx`**
   - Add bank details state and form
   - Add `saveBankDetails` function
   - Integrate `PrintSettingsPanel` component
   - Add UI sections for bank details and print pricing

---

## Summary of Changes

| Component | Change | Lines Affected |
|-----------|--------|----------------|
| Database Migration | Create print-receipts bucket | New file |
| PrintRequestDialog | Fix receipt upload bucket | 300-319 |
| PrintRequestDialog | Add card payment flow | New function + 321-369 |
| PrintRequestDialog | Add history management | 126, 195-478 |
| PaymentSettings | Add bank details management | 18, 34, new sections |
| PaymentSettings | Integrate PrintSettingsPanel | After mode section |

All changes preserve existing functionality while adding the requested features and fixing critical bugs.
