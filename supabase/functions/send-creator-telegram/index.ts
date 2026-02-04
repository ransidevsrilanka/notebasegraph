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
      console.log("Creator Telegram bot not configured - skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "Creator bot not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: CreatorNotification = await req.json();
    const { creator_id, type, amount, tier, message } = body;

    if (!creator_id) {
      return new Response(
        JSON.stringify({ success: false, message: "creator_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get creator's telegram_chat_id
    const { data: creator, error: creatorError } = await supabase
      .from('creator_profiles')
      .select('telegram_chat_id, display_name')
      .eq('id', creator_id)
      .single();

    if (creatorError || !creator) {
      console.log("Creator not found:", creator_id);
      return new Response(
        JSON.stringify({ success: false, message: "Creator not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creator.telegram_chat_id) {
      console.log("Creator has no Telegram configured:", creator_id);
      return new Response(
        JSON.stringify({ success: false, message: "Creator has no Telegram configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format tier display name
    const getTierDisplayName = (tierCode: string | undefined): string => {
      switch (tierCode) {
        case 'starter': return 'Silver Access';
        case 'standard': return 'Gold Access';
        case 'lifetime': return 'Platinum Access';
        default: return tierCode || 'a sale';
      }
    };

    // Format brief, professional message based on type
    let text = "";
    const formattedAmount = amount ? `Rs.${amount.toLocaleString()}` : '';
    
    switch (type) {
      case 'commission':
        text = `💰 Commission earned: ${formattedAmount} from ${getTierDisplayName(tier)}. Check inbox for details.`;
        break;
      case 'withdrawal_approved':
        text = `✅ Withdrawal approved: ${formattedAmount}. Processing soon.`;
        break;
      case 'withdrawal_paid':
        text = `🎉 Paid: ${formattedAmount} sent to your account. Receipt in inbox.`;
        break;
      case 'withdrawal_rejected':
        text = `❌ Withdrawal declined. See inbox for reason.`;
        break;
      case 'referral_signup':
        text = `🌟 New signup via your link! Check inbox for details.`;
        break;
      default:
        text = message || "You have a new notification. Check your inbox.";
    }

    console.log(`Sending Telegram notification to creator ${creator.display_name || creator_id}:`, type);

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
    
    if (!result.ok) {
      console.error("Telegram API error:", result);
      return new Response(
        JSON.stringify({ success: false, message: result.description || "Telegram API error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Telegram notification sent successfully");
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Creator Telegram error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
