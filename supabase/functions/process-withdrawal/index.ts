import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyWithdrawalRequest, notifyEdgeFunctionError, sendNotification } from "../_shared/notify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  id: string;
  creator_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  updated_at: string;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  available_balance: number;
  total_withdrawn: number;
}

// Verify 2FA/OTP code
function verifyOTP(providedCode: string): boolean {
  const validCode = Deno.env.get('REFUND_OTP_CODE');
  if (!validCode) {
    console.error('REFUND_OTP_CODE not configured');
    return false;
  }
  return providedCode.trim() === validCode.trim();
}

// Check if user is admin
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'super_admin', 'content_admin', 'support_admin']);
  
  return (data?.length || 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    const body = await req.json().catch(() => ({}));

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify the JWT and get user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route to appropriate handler
    switch (action) {
      case 'request':
        return await handleRequest(adminClient, user.id, body, supabaseUrl, supabaseServiceKey);
      case 'approve':
        return await handleApprove(adminClient, user.id, body, supabaseUrl, supabaseServiceKey);
      case 'mark-paid':
        return await handleMarkPaid(adminClient, user.id, body, supabaseUrl, supabaseServiceKey);
      case 'reject':
        return await handleReject(adminClient, user.id, body, supabaseUrl, supabaseServiceKey);
      default:
        return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Withdrawal processing error:', error);
    
    await notifyEdgeFunctionError(supabaseUrl, supabaseServiceKey, {
      functionName: 'process-withdrawal',
      error: error.message || 'Unknown error',
    });

    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// CREATOR: Submit withdrawal request
async function handleRequest(
  supabase: any,
  userId: string,
  body: { withdrawal_method_id: string; amount: number },
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { withdrawal_method_id, amount } = body;

  if (!withdrawal_method_id || !amount || amount <= 0) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request: withdrawal_method_id and positive amount required' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get creator profile
  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('id, user_id, display_name, available_balance, total_withdrawn')
    .eq('user_id', userId)
    .single();

  if (creatorError || !creator) {
    return new Response(JSON.stringify({ success: false, error: 'Creator profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate withdrawal method belongs to creator
  const { data: method, error: methodError } = await supabase
    .from('withdrawal_methods')
    .select('id')
    .eq('id', withdrawal_method_id)
    .eq('creator_id', creator.id)
    .single();

  if (methodError || !method) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid withdrawal method' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get platform settings (minimum payout and fee)
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('setting_key, setting_value');

  const minimumPayout = settings?.find((s: any) => s.setting_key === 'minimum_payout_lkr')?.setting_value || 10000;
  const feePercent = settings?.find((s: any) => s.setting_key === 'withdrawal_fee_percent')?.setting_value || 3;

  // Validate amount
  const numMinPayout = typeof minimumPayout === 'number' ? minimumPayout : Number(minimumPayout);
  const numFeePercent = typeof feePercent === 'number' ? feePercent : Number(feePercent);

  if (amount < numMinPayout) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Minimum withdrawal is LKR ${numMinPayout.toLocaleString()}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate balance (from database, not from client)
  const currentBalance = creator.available_balance || 0;
  if (amount > currentBalance) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Insufficient balance. Available: LKR ${currentBalance.toLocaleString()}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check for existing pending request (double-request prevention)
  const { data: existingPending } = await supabase
    .from('withdrawal_requests')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'You already have a pending withdrawal request. Please wait for it to be processed.' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Calculate fee
  const feeAmount = Math.round(amount * (numFeePercent / 100) * 100) / 100;
  const netAmount = amount - feeAmount;

  // Create withdrawal request
  const { data: request, error: insertError } = await supabase
    .from('withdrawal_requests')
    .insert({
      creator_id: creator.id,
      withdrawal_method_id,
      amount,
      fee_percent: numFeePercent,
      fee_amount: feeAmount,
      net_amount: netAmount,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    // Check if it's a unique constraint violation (duplicate pending request)
    if (insertError.code === '23505') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'You already have a pending withdrawal request' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw insertError;
  }

  // Send Telegram notification
  await notifyWithdrawalRequest(supabaseUrl, supabaseServiceKey, {
    creatorName: creator.display_name || 'Unknown Creator',
    amount,
    netAmount,
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Withdrawal request submitted successfully',
    request_id: request.id,
    net_amount: netAmount,
    fee_amount: feeAmount,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ADMIN: Approve withdrawal
async function handleApprove(
  supabase: any,
  userId: string,
  body: { request_id: string; otp_code: string; admin_notes?: string },
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { request_id, otp_code, admin_notes } = body;

  if (!request_id || !otp_code) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'request_id and otp_code are required' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify admin status
  if (!await isAdmin(supabase, userId)) {
    return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify 2FA/OTP
  if (!verifyOTP(otp_code)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid verification code' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get withdrawal request with current state
  const { data: request, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('*, creator_profiles(id, available_balance, total_withdrawn, display_name)')
    .eq('id', request_id)
    .single();

  if (fetchError || !request) {
    return new Response(JSON.stringify({ success: false, error: 'Withdrawal request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate status (must be pending to approve)
  if (request.status !== 'pending') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Cannot approve: request is already ${request.status}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const creator = request.creator_profiles;
  const currentBalance = creator?.available_balance || 0;
  const currentWithdrawn = creator?.total_withdrawn || 0;

  // Final balance validation
  if (request.amount > currentBalance) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Insufficient balance. Creator has LKR ${currentBalance.toLocaleString()}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update withdrawal request status - use optimistic locking
  const { error: updateError, count } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      admin_notes: admin_notes || null,
    })
    .eq('id', request_id)
    .eq('status', 'pending') // Optimistic lock: only update if still pending
    .select();

  if (updateError) throw updateError;

  // Deduct balance from creator (atomic operation)
  const { error: balanceError } = await supabase
    .from('creator_profiles')
    .update({
      available_balance: Math.max(0, currentBalance - request.amount),
      total_withdrawn: currentWithdrawn + request.net_amount,
    })
    .eq('id', request.creator_id);

  if (balanceError) {
    // Rollback the status update
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
      .eq('id', request_id);
    
    throw new Error(`Failed to update balance: ${balanceError.message}`);
  }

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: userId,
    action_type: 'withdrawal_approved',
    target_type: 'withdrawal_request',
    target_id: request_id,
    details: {
      amount: request.amount,
      net_amount: request.net_amount,
      creator_id: request.creator_id,
      admin_notes,
    },
  });

  // Send inbox notification to creator
  await supabase.from('messages').insert({
    recipient_id: request.creator_id,
    recipient_type: 'creator',
    recipient_user_id: creator?.user_id || null,
    sender_id: null,
    subject: '✅ Withdrawal Approved',
    body: `Your withdrawal request for Rs. ${request.amount.toLocaleString()} has been approved and is being processed. Net amount after fees: Rs. ${request.net_amount.toLocaleString()}.`,
    notification_type: 'success',
    is_read: false,
  });

  // Send Telegram notification
  await sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'withdrawal_approved',
    message: `Withdrawal of Rs.${request.net_amount.toLocaleString()} approved for ${creator?.display_name || 'Creator'}`,
    data: {
      request_id,
      creator: creator?.display_name,
      amount: request.amount,
      net_amount: request.net_amount,
    },
    priority: 'medium',
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Withdrawal approved successfully',
    new_balance: Math.max(0, currentBalance - request.amount),
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ADMIN: Mark withdrawal as paid
async function handleMarkPaid(
  supabase: any,
  userId: string,
  body: { request_id: string; otp_code: string; idempotency_key?: string },
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { request_id, otp_code, idempotency_key } = body;

  if (!request_id || !otp_code) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'request_id and otp_code are required' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify admin status
  if (!await isAdmin(supabase, userId)) {
    return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify 2FA/OTP
  if (!verifyOTP(otp_code)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid verification code' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check idempotency key if provided
  if (idempotency_key) {
    const { data: existing } = await supabase
      .from('withdrawal_requests')
      .select('id, status')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existing) {
      // Already processed with this key - return success (idempotent)
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already marked as paid (idempotent)',
        status: existing.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Get withdrawal request
  const { data: request, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('*, creator_profiles(display_name)')
    .eq('id', request_id)
    .single();

  if (fetchError || !request) {
    return new Response(JSON.stringify({ success: false, error: 'Withdrawal request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if already paid (idempotent)
  if (request.status === 'paid') {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Already marked as paid',
      paid_at: request.paid_at,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate status (must be approved to mark paid)
  if (request.status !== 'approved') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Cannot mark as paid: request is ${request.status}. Must be approved first.` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update status with optimistic locking
  const { error: updateError } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      idempotency_key: idempotency_key || `paid_${request_id}_${Date.now()}`,
    })
    .eq('id', request_id)
    .eq('status', 'approved'); // Only update if still approved

  if (updateError) throw updateError;

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: userId,
    action_type: 'withdrawal_paid',
    target_type: 'withdrawal_request',
    target_id: request_id,
    details: {
      amount: request.amount,
      net_amount: request.net_amount,
      creator_id: request.creator_id,
    },
  });

  // Get creator user_id for inbox notification
  const { data: creatorData } = await supabase
    .from('creator_profiles')
    .select('user_id')
    .eq('id', request.creator_id)
    .single();

  // Send inbox notification to creator
  await supabase.from('messages').insert({
    recipient_id: request.creator_id,
    recipient_type: 'creator',
    recipient_user_id: creatorData?.user_id || null,
    sender_id: null,
    subject: '💰 Withdrawal Processed!',
    body: `Your withdrawal of Rs. ${request.net_amount.toLocaleString()} has been successfully processed and paid. You can view your payment receipt in the Withdrawal History section.`,
    notification_type: 'success',
    is_read: false,
  });

  // Send Telegram notification
  await sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'withdrawal_paid',
    message: `Payment of Rs.${request.net_amount.toLocaleString()} completed for ${request.creator_profiles?.display_name || 'Creator'}`,
    data: {
      request_id,
      creator: request.creator_profiles?.display_name,
      net_amount: request.net_amount,
    },
    priority: 'medium',
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Marked as paid successfully',
    paid_at: new Date().toISOString(),
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ADMIN: Reject withdrawal
async function handleReject(
  supabase: any,
  userId: string,
  body: { request_id: string; otp_code: string; rejection_reason: string; admin_notes?: string },
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { request_id, otp_code, rejection_reason, admin_notes } = body;

  if (!request_id || !otp_code || !rejection_reason) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'request_id, otp_code, and rejection_reason are required' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify admin status
  if (!await isAdmin(supabase, userId)) {
    return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify 2FA/OTP
  if (!verifyOTP(otp_code)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid verification code' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get withdrawal request
  const { data: request, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('*, creator_profiles(display_name)')
    .eq('id', request_id)
    .single();

  if (fetchError || !request) {
    return new Response(JSON.stringify({ success: false, error: 'Withdrawal request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate status (must be pending to reject)
  if (request.status !== 'pending') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Cannot reject: request is ${request.status}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update status
  const { error: updateError } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'rejected',
      rejection_reason,
      admin_notes: admin_notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', request_id)
    .eq('status', 'pending'); // Optimistic lock

  if (updateError) throw updateError;

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: userId,
    action_type: 'withdrawal_rejected',
    target_type: 'withdrawal_request',
    target_id: request_id,
    details: {
      amount: request.amount,
      rejection_reason,
      admin_notes,
      creator_id: request.creator_id,
    },
  });

  // Get creator user_id for inbox notification
  const { data: creatorData } = await supabase
    .from('creator_profiles')
    .select('user_id')
    .eq('id', request.creator_id)
    .single();

  // Send inbox notification to creator
  await supabase.from('messages').insert({
    recipient_id: request.creator_id,
    recipient_type: 'creator',
    recipient_user_id: creatorData?.user_id || null,
    sender_id: null,
    subject: '❌ Withdrawal Request Rejected',
    body: `Your withdrawal request for Rs. ${request.amount.toLocaleString()} was rejected. Reason: ${rejection_reason}${admin_notes ? `. Additional notes: ${admin_notes}` : ''}`,
    notification_type: 'warning',
    is_read: false,
  });

  // Send Telegram notification
  await sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'withdrawal_rejected',
    message: `Withdrawal of Rs.${request.amount.toLocaleString()} rejected for ${request.creator_profiles?.display_name || 'Creator'}`,
    data: {
      request_id,
      creator: request.creator_profiles?.display_name,
      amount: request.amount,
      reason: rejection_reason,
    },
    priority: 'medium',
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Withdrawal request rejected',
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
