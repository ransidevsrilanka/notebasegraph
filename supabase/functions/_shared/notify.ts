// Shared notification helper for edge functions
// This sends notifications to the CEO via Telegram

interface NotificationData {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export async function sendNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  notification: NotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Convenience functions for common notification types
export function notifyPaymentSuccess(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { orderId: string; amount: number; tier: string; userEmail?: string; refCreator?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'payment_success',
    message: `Payment of Rs.${data.amount} received for ${data.tier} tier`,
    data: {
      order_id: data.orderId,
      amount: `Rs.${data.amount}`,
      tier: data.tier,
      user: data.userEmail || 'Unknown',
      referral: data.refCreator || 'Direct',
    },
    priority: 'medium',
  });
}

export function notifyPaymentFailure(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { orderId: string; reason: string; amount?: number }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'payment_failure',
    message: `Payment failed: ${data.reason}`,
    data: {
      order_id: data.orderId,
      amount: data.amount ? `Rs.${data.amount}` : 'Unknown',
      reason: data.reason,
    },
    priority: 'high',
  });
}

export function notifyJoinRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { referenceNumber: string; amount: number; tier: string; userEmail?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'join_request',
    message: `New join request submitted`,
    data: {
      reference: data.referenceNumber,
      amount: `Rs.${data.amount}`,
      tier: data.tier,
      user: data.userEmail || 'Unknown',
    },
    priority: 'medium',
  });
}

export function notifyUpgradeRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { currentTier: string; requestedTier: string; amount: number; userEmail?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'upgrade_request',
    message: `Upgrade request: ${data.currentTier} → ${data.requestedTier}`,
    data: {
      current_tier: data.currentTier,
      requested_tier: data.requestedTier,
      amount: `Rs.${data.amount}`,
      user: data.userEmail || 'Unknown',
    },
    priority: 'medium',
  });
}

export function notifyWithdrawalRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { creatorName: string; amount: number; netAmount: number }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'withdrawal_request',
    message: `Withdrawal request from ${data.creatorName}`,
    data: {
      creator: data.creatorName,
      gross_amount: `Rs.${data.amount}`,
      net_amount: `Rs.${data.netAmount}`,
    },
    priority: 'high',
  });
}

export function notifyRefundProcessed(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { orderId: string; amount: number; paymentId: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'refund_processed',
    message: `Refund of Rs.${data.amount} processed successfully`,
    data: {
      order_id: data.orderId,
      payment_id: data.paymentId,
      amount: `Rs.${data.amount}`,
    },
    priority: 'medium',
  });
}

export function notifySecurityAlert(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { alertType: string; details: string; userId?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'security_alert',
    message: `Security alert: ${data.alertType}`,
    data: {
      type: data.alertType,
      details: data.details,
      user_id: data.userId || 'Unknown',
    },
    priority: 'critical',
  });
}

export function notifyEdgeFunctionError(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { functionName: string; error: string; context?: Record<string, unknown> }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'edge_function_error',
    message: `Error in ${data.functionName}: ${data.error}`,
    data: {
      function: data.functionName,
      error: data.error,
      ...data.context,
    },
    priority: 'critical',
  });
}

export function notifyNewCreator(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { displayName: string; referralCode: string; cmoName?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'new_creator',
    message: `New creator joined: ${data.displayName}`,
    data: {
      name: data.displayName,
      referral_code: data.referralCode,
      cmo: data.cmoName || 'Direct',
    },
    priority: 'medium',
  });
}

export function notifyHeadOpsRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  data: { requestType: string; requesterName: string; details?: string }
) {
  return sendNotification(supabaseUrl, supabaseServiceKey, {
    type: 'head_ops_request',
    message: `Head of Ops request: ${data.requestType}`,
    data: {
      type: data.requestType,
      requester: data.requesterName,
      details: data.details || '',
    },
    priority: 'high',
  });
}
