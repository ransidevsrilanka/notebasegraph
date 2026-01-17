import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit limits by tier
const TIER_CREDITS: Record<string, number> = {
  standard: 10000,   // Gold - 10K credits
  lifetime: 100000,  // Platinum - 100K credits
  starter: 0,        // Silver - no AI access
};

// Word count = credits (1 word = 1 credit)
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

// Abuse patterns to detect
const ABUSE_PATTERNS = [
  /ignore.*instructions/i,
  /pretend.*you.*are/i,
  /act.*as.*if/i,
  /forget.*previous/i,
  /disregard.*rules/i,
  /you.*are.*now/i,
  /bypass.*safety/i,
  /jailbreak/i,
  /dan.*mode/i,
  /developer.*mode/i,
];

function detectAbuse(message: string): boolean {
  return ABUSE_PATTERNS.some((pattern) => pattern.test(message));
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    standard: "Gold",
    lifetime: "Platinum",
    starter: "Silver",
  };
  return labels[tier] || tier;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to get user info
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, tier, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (enrollError || !enrollment) {
      return new Response(
        JSON.stringify({ error: "No active enrollment found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check tier eligibility
    const creditsLimit = TIER_CREDITS[enrollment.tier] || 0;
    if (creditsLimit === 0) {
      return new Response(
        JSON.stringify({ 
          error: "AI Assistant is only available for Gold and Platinum members",
          code: "TIER_INELIGIBLE"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { message, conversationHistory } = await req.json();
    
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for abuse
    const isAbusive = detectAbuse(message);

    // Get or create credit record for current month
    const monthYear = getCurrentMonthYear();
    let { data: creditRecord, error: creditError } = await supabase
      .from("ai_credits")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    if (!creditRecord) {
      // Create new credit record for this month
      const { data: newRecord, error: insertError } = await supabase
        .from("ai_credits")
        .insert({
          user_id: user.id,
          enrollment_id: enrollment.id,
          month_year: monthYear,
          credits_used: 0,
          credits_limit: creditsLimit,
          strikes: 0,
          is_suspended: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create credit record:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to initialize credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      creditRecord = newRecord;
    }

    // Check if suspended
    if (creditRecord.is_suspended) {
      return new Response(
        JSON.stringify({ 
          error: "Your AI access is suspended for this month due to policy violations",
          code: "SUSPENDED",
          strikes: creditRecord.strikes
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle abuse detection
    if (isAbusive) {
      const newStrikes = (creditRecord.strikes || 0) + 1;
      const isSuspended = newStrikes >= 3;

      await supabase
        .from("ai_credits")
        .update({
          strikes: newStrikes,
          is_suspended: isSuspended,
          suspended_at: isSuspended ? new Date().toISOString() : null,
          credits_used: isSuspended ? creditRecord.credits_limit : creditRecord.credits_used, // Burn credits on suspension
        })
        .eq("id", creditRecord.id);

      if (isSuspended) {
        return new Response(
          JSON.stringify({
            error: "Your AI access has been suspended for the remainder of this month due to repeated policy violations",
            code: "SUSPENDED",
            strikes: newStrikes
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: `Your message was flagged as inappropriate. You have ${3 - newStrikes} warning(s) remaining before suspension.`,
          code: "ABUSE_WARNING",
          strikes: newStrikes,
          remainingWarnings: 3 - newStrikes
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count words and check credits
    const wordCount = countWords(message);
    const remainingCredits = creditRecord.credits_limit - creditRecord.credits_used;

    if (wordCount > remainingCredits) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits for this message",
          code: "INSUFFICIENT_CREDITS",
          required: wordCount,
          remaining: remainingCredits,
          creditsUsed: creditRecord.credits_used,
          creditsLimit: creditRecord.credits_limit
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits
    const newCreditsUsed = creditRecord.credits_used + wordCount;
    await supabase
      .from("ai_credits")
      .update({ credits_used: newCreditsUsed })
      .eq("id", creditRecord.id);

    // Store user message
    await supabase.from("ai_chat_messages").insert({
      user_id: user.id,
      enrollment_id: enrollment.id,
      role: "user",
      content: message,
      word_count: wordCount,
    });

    // Only inject minimal context - let the DigitalOcean agent use its own system prompt
    const tierLabel = getTierLabel(enrollment.tier);
    const newRemainingCredits = creditRecord.credits_limit - newCreditsUsed;
    const contextNote = `[Context: ${tierLabel} member, ${newRemainingCredits.toLocaleString()} credits remaining this month]`;

    // Build messages array for the AI (no system prompt - agent has its own)
    const messages = [];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10); // Keep last 10 messages for context
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message with context prepended
    messages.push({ role: "user", content: `${contextNote}\n\n${message}` });

    // Call DigitalOcean AI Agent
    const DO_AGENT_ACCESS_KEY = Deno.env.get("DO_AGENT_ACCESS_KEY");
    if (!DO_AGENT_ACCESS_KEY) {
      console.error("DO_AGENT_ACCESS_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentResponse = await fetch(
      "https://der4nwxf5tbpcorj6smnf2mh.agents.do-ai.run/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DO_AGENT_ACCESS_KEY}`,
        },
        body: JSON.stringify({
          messages,
          stream: false,
        }),
      }
    );

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error("DO Agent error:", agentResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentData = await agentResponse.json();
    const assistantMessage = agentData.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Store assistant response
    await supabase.from("ai_chat_messages").insert({
      user_id: user.id,
      enrollment_id: enrollment.id,
      role: "assistant",
      content: assistantMessage,
      word_count: null, // AI output is not charged
    });

    // Return response with updated credit info
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        credits: {
          used: newCreditsUsed,
          limit: creditRecord.credits_limit,
          remaining: newRemainingCredits,
          wordsCost: wordCount,
        },
        strikes: creditRecord.strikes,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
