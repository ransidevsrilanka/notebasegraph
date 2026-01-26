import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Document types for different request types
const DOCUMENT_TYPES: Record<string, { emoji: string; title: string }> = {
  'join_request': { emoji: '📥', title: 'Join Request Receipt' },
  'upgrade_request': { emoji: '⬆️', title: 'Upgrade Request Receipt' },
  'print_request': { emoji: '🖨️', title: 'Print Request Receipt' },
};

// Allowed file types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

interface DocumentPayload {
  type: 'join_request' | 'upgrade_request' | 'print_request';
  message: string;
  file_base64: string;
  file_name: string;
  file_type: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Telegram credentials
    const { data: telegramSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_settings")
      .single();

    const botToken = telegramSettings?.value?.bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = telegramSettings?.value?.chat_id || Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.log("Telegram credentials not configured");
      return new Response(
        JSON.stringify({ success: false, message: "Telegram not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: DocumentPayload = await req.json();
    const { type, message, file_base64, file_name, file_type, data } = body;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file_type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid file type. Only PNG, JPG, and PDF are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file_base64 || !file_name) {
      return new Response(
        JSON.stringify({ success: false, error: "File data and name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build caption
    const typeConfig = DOCUMENT_TYPES[type] || DOCUMENT_TYPES['print_request'];
    let caption = `${typeConfig.emoji} <b>${typeConfig.title}</b>\n\n${message}`;
    
    // Add data details
    if (data && Object.keys(data).length > 0) {
      caption += '\n\n<b>📋 Details:</b>';
      for (const [key, value] of Object.entries(data)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        caption += `\n• <b>${formattedKey}:</b> ${value}`;
      }
    }

    // Add timestamp
    const now = new Date();
    const formattedTime = now.toLocaleString('en-LK', { 
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    caption += `\n\n<i>🕐 ${formattedTime}</i>`;

    // Decode base64 to binary
    const binaryData = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));

    // Create FormData for Telegram API
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    formData.append('document', new Blob([binaryData], { type: file_type }), file_name);

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.description || 'Telegram error' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document sent to Telegram:", type, file_name);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Send document error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
