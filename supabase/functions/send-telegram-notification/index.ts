import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive notification types with emojis
const NOTIFICATION_TYPES: Record<string, { emoji: string; title: string; priority: 'low' | 'medium' | 'high' | 'critical' }> = {
  // Payment related
  'payment_success': { emoji: '✅', title: 'Payment Received', priority: 'medium' },
  'payment_failure': { emoji: '❌', title: 'Payment Failed', priority: 'high' },
  'payment_pending': { emoji: '⏳', title: 'Payment Pending', priority: 'low' },
  'payhere_popup_failed': { emoji: '🔴', title: 'PayHere Popup Failed', priority: 'high' },
  
  // Requests
  'join_request': { emoji: '📥', title: 'New Join Request', priority: 'medium' },
  'upgrade_request': { emoji: '⬆️', title: 'Upgrade Request', priority: 'medium' },
  'withdrawal_request': { emoji: '🏦', title: 'Withdrawal Request', priority: 'high' },
  'head_ops_request': { emoji: '📋', title: 'Head of Ops Request', priority: 'high' },
  
  // Refunds
  'refund_requested': { emoji: '💸', title: 'Refund Requested', priority: 'high' },
  'refund_processed': { emoji: '💰', title: 'Refund Processed', priority: 'medium' },
  'refund_failed': { emoji: '⚠️', title: 'Refund Failed', priority: 'critical' },
  
  // Creator activity
  'new_creator': { emoji: '🌟', title: 'New Creator Joined', priority: 'medium' },
  'creator_tier_change': { emoji: '📈', title: 'Creator Tier Change', priority: 'low' },
  'creator_withdrawal': { emoji: '💵', title: 'Creator Withdrawal', priority: 'medium' },
  
  // Referrals
  'referral_mismatch': { emoji: '⚠️', title: 'Referral Issue', priority: 'medium' },
  'premium_unlocked': { emoji: '🎉', title: 'Referral Reward Unlocked', priority: 'low' },
  'commission_issue': { emoji: '💰', title: 'Commission Alert', priority: 'high' },
  
  // Subject Medium
  'medium_change_request': { emoji: '📝', title: 'Medium Change Request', priority: 'medium' },
  
  // Access Code Signups
  'new_access_code_signup': { emoji: '🎓', title: 'New Student Signup (Access Code)', priority: 'low' },
  
  // Security
  'security_alert': { emoji: '🚨', title: 'Security Alert', priority: 'critical' },
  'suspicious_download': { emoji: '⚠️', title: 'High Download Activity', priority: 'high' },
  'account_locked': { emoji: '🔒', title: 'Account Locked', priority: 'medium' },
  'login_suspicious': { emoji: '🔐', title: 'Suspicious Login', priority: 'high' },
  
  // System errors
  'edge_function_error': { emoji: '🔴', title: 'Edge Function Error', priority: 'critical' },
  'database_error': { emoji: '🗄️', title: 'Database Error', priority: 'critical' },
  'system_error': { emoji: '⚙️', title: 'System Error', priority: 'critical' },
  
  // Performance
  'cmo_underperformance': { emoji: '📊', title: 'CMO Target Alert', priority: 'medium' },
  
  // Daily reports
  'daily_summary': { emoji: '📊', title: 'Daily Summary', priority: 'low' },
  'weekly_report': { emoji: '📈', title: 'Weekly Report', priority: 'low' },
  
  // Default
  'notification': { emoji: '📢', title: 'Notification', priority: 'low' },
};

// Priority to urgency indicator mapping
const PRIORITY_INDICATORS: Record<string, string> = {
  'low': '',
  'medium': '⚡',
  'high': '🔔',
  'critical': '🚨🚨🚨',
};

interface NotificationPayload {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendToTelegram(
  botToken: string, 
  chatId: string, 
  message: string, 
  retries = MAX_RETRIES
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        return { success: true };
      }

      console.error(`Telegram API error (attempt ${attempt}/${retries}):`, result);
      
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        return { success: false, error: result.description || 'Unknown Telegram error' };
      }
    } catch (error) {
      console.error(`Network error (attempt ${attempt}/${retries}):`, error);
      
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' };
      }
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

function formatMessage(payload: NotificationPayload): string {
  const typeConfig = NOTIFICATION_TYPES[payload.type] || NOTIFICATION_TYPES['notification'];
  const effectivePriority = payload.priority || typeConfig.priority;
  const urgencyIndicator = PRIORITY_INDICATORS[effectivePriority];
  
  let formattedMessage = '';
  
  // Add urgency indicator for high/critical priority
  if (urgencyIndicator) {
    formattedMessage += `${urgencyIndicator} `;
  }
  
  // Title with emoji
  formattedMessage += `<b>${typeConfig.emoji} ${typeConfig.title}</b>\n\n`;
  
  // Main message
  formattedMessage += `${payload.message}`;
  
  // Additional data
  if (payload.data && Object.keys(payload.data).length > 0) {
    formattedMessage += '\n\n<b>📋 Details:</b>';
    for (const [key, value] of Object.entries(payload.data)) {
      // Format key as title case
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      formattedMessage += `\n• <b>${formattedKey}:</b> ${value}`;
    }
  }
  
  // Timestamp
  const now = new Date();
  const formattedTime = now.toLocaleString('en-LK', { 
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  formattedMessage += `\n\n<i>🕐 ${formattedTime}</i>`;
  
  return formattedMessage;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Telegram bot credentials from site_settings first, then fallback to env vars
    const { data: telegramSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_settings")
      .single();

    const botToken = telegramSettings?.value?.bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = telegramSettings?.value?.chat_id || Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.log("Telegram credentials not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "Telegram not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { type, message, data, priority } = body as NotificationPayload;

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the message
    const formattedMessage = formatMessage({ 
      type: type || 'notification', 
      message, 
      data,
      priority 
    });

    // Send to Telegram with retry logic
    const result = await sendToTelegram(botToken, chatId, formattedMessage);

    if (!result.success) {
      console.error("Failed to send Telegram notification:", result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Telegram notification sent:", type);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Telegram notification error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
