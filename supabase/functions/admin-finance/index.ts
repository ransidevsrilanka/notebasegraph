import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Commission rates
const CREATOR_BASE_RATE = 0.08; // 8% for creators under 500 users
const CREATOR_BONUS_RATE = 0.12; // 12% after 500 users
const CREATOR_BONUS_THRESHOLD = 500;
const CMO_COMMISSION_RATE = 0.08; // 8% of revenue from their creators
const CMO_BONUS_RATE = 0.05; // Additional 5% bonus
const CMO_ANNUAL_USER_GOAL = 280; // 280 users annually for bonus

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if this is a user-accessible endpoint (finalize-payment-user)
  const isUserEndpoint = path === "finalize-payment-user";

  // For admin-only endpoints, verify admin role
  if (!isUserEndpoint) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "content_admin", "support_admin"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Finalize a payment from user after card payment - creates attribution, updates commissions
    // This endpoint can be called by the paying user themselves
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "finalize-payment-user" && req.method === "POST") {
      const body = await req.json();
      const {
        order_id,
        enrollment_id,
        payment_type,
        tier,
        original_amount,
        final_amount,
        ref_creator,
        discount_code,
      } = body;

      // IMPORTANT: Use the authenticated user's ID, not from request body
      const user_id = user.id;

      console.log("Finalizing payment (user):", { order_id, user_id, tier, final_amount, ref_creator });

      // STEP 1: Check if attribution already exists - EARLY EXIT if so
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id, creator_id")
        .eq("order_id", order_id)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for order:", order_id, "- Returning early without updating stats");
        return new Response(
          JSON.stringify({ success: true, message: "Attribution already exists", creator_id: existingAttribution.creator_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const paymentMonth = currentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let discountCodeId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorData: any = null;

      // Find creator by referral code
      if (ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
            ? CREATOR_BONUS_RATE 
            : CREATOR_BASE_RATE;
          creatorCommissionAmount = final_amount * commissionRate;
          console.log("Creator found by ref:", creatorId, "Commission:", creatorCommissionAmount);
        }
      }

      // Find creator by discount code if not found by ref
      if (!creatorId && discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
              ? CREATOR_BONUS_RATE 
              : CREATOR_BASE_RATE;
            creatorCommissionAmount = final_amount * commissionRate;
            console.log("Creator found by discount code:", creatorId, "Commission:", creatorCommissionAmount);
          }
        }
      }

      // STEP 3: Create payment attribution FIRST (this is the source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id,
        user_id,
        creator_id: creatorId,
        enrollment_id,
        amount: final_amount,
        original_amount,
        discount_applied: original_amount - final_amount,
        final_amount,
        creator_commission_rate: creatorId ? (creatorCommissionAmount / final_amount) : 0,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonth,
        tier,
        payment_type,
      });

      if (paError) {
        console.error("Payment attribution insert error:", paError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create attribution: " + paError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment attribution created successfully for order:", order_id);

      // STEP 4: Only NOW update stats (since attribution was successfully created)
      if (creatorId && creatorData) {
        // Update creator balance and paid users
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // Create user attribution if doesn't exist (using upsert with unique constraint)
        await supabase.from("user_attributions").upsert({
          user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // Update discount code stats if applicable
        if (discountCodeId) {
          const { data: currentDC } = await supabase
            .from("discount_codes")
            .select("usage_count, paid_conversions")
            .eq("id", discountCodeId)
            .single();

          if (currentDC) {
            await supabase
              .from("discount_codes")
              .update({
                usage_count: (currentDC.usage_count || 0) + 1,
                paid_conversions: (currentDC.paid_conversions || 0) + 1,
              })
              .eq("id", discountCodeId);
          }
        }

        // Handle CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, final_amount, paymentMonth);
        }
      }

      return new Response(
        JSON.stringify({ success: true, creator_id: creatorId, commission: creatorCommissionAmount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Finalize a payment (admin-only) - creates attribution, updates commissions
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "finalize-payment" && req.method === "POST") {
      const body = await req.json();
      const {
        order_id,
        user_id,
        enrollment_id,
        payment_type,
        tier,
        original_amount,
        final_amount,
        ref_creator,
        discount_code,
      } = body;

      console.log("Finalizing payment:", { order_id, user_id, tier, final_amount, ref_creator });

      // STEP 1: Check if attribution already exists - EARLY EXIT if so
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id, creator_id")
        .eq("order_id", order_id)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for order:", order_id, "- Returning early without updating stats");
        return new Response(
          JSON.stringify({ success: true, message: "Attribution already exists", creator_id: existingAttribution.creator_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const paymentMonth = currentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let discountCodeId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorData: any = null;

      // Find creator by referral code
      if (ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
            ? CREATOR_BONUS_RATE 
            : CREATOR_BASE_RATE;
          creatorCommissionAmount = final_amount * commissionRate;
          console.log("Creator found by ref:", creatorId, "Commission:", creatorCommissionAmount);
        }
      }

      // Find creator by discount code if not found by ref
      if (!creatorId && discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
              ? CREATOR_BONUS_RATE 
              : CREATOR_BASE_RATE;
            creatorCommissionAmount = final_amount * commissionRate;
            console.log("Creator found by discount code:", creatorId, "Commission:", creatorCommissionAmount);
          }
        }
      }

      // STEP 3: Create payment attribution FIRST (this is the source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id,
        user_id,
        creator_id: creatorId,
        enrollment_id,
        amount: final_amount,
        original_amount,
        discount_applied: original_amount - final_amount,
        final_amount,
        creator_commission_rate: creatorId ? (creatorCommissionAmount / final_amount) : 0,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonth,
        tier,
        payment_type,
      });

      if (paError) {
        console.error("Payment attribution insert error:", paError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create attribution: " + paError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment attribution created successfully for order:", order_id);

      // STEP 4: Only NOW update stats (since attribution was successfully created)
      if (creatorId && creatorData) {
        // Update creator balance and paid users
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // Create user attribution if doesn't exist
        await supabase.from("user_attributions").upsert({
          user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // Update discount code stats if applicable
        if (discountCodeId) {
          const { data: currentDC } = await supabase
            .from("discount_codes")
            .select("usage_count, paid_conversions")
            .eq("id", discountCodeId)
            .single();

          if (currentDC) {
            await supabase
              .from("discount_codes")
              .update({
                usage_count: (currentDC.usage_count || 0) + 1,
                paid_conversions: (currentDC.paid_conversions || 0) + 1,
              })
              .eq("id", discountCodeId);
          }
        }

        // Handle CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, final_amount, paymentMonth);
        }
      }

      return new Response(
        JSON.stringify({ success: true, creator_id: creatorId, commission: creatorCommissionAmount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve join request
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "approve-join-request" && req.method === "POST") {
      const { join_request_id, admin_notes } = await req.json();

      console.log("Approving join request:", join_request_id);

      // Get the join request
      const { data: request, error: reqError } = await supabase
        .from("join_requests")
        .select("*")
        .eq("id", join_request_id)
        .single();

      if (reqError || !request) {
        return new Response(JSON.stringify({ error: "Join request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.status !== "pending") {
        return new Response(JSON.stringify({ error: "Request already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderId = `BANK-${request.reference_number}`;

      // STEP 1: Check if attribution already exists for this join request
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for join request:", orderId);
        // Still update the join request status if not done
        await supabase
          .from("join_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            admin_notes: admin_notes || null,
          })
          .eq("id", join_request_id);
        
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate expiry
      const durationDays = request.tier === "lifetime" ? null : 365;
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          user_id: request.user_id,
          grade: request.grade,
          stream: request.stream || "maths",
          medium: request.medium || "english",
          tier: request.tier,
          expires_at: expiresAt,
          is_active: true,
          payment_order_id: orderId,
        })
        .select()
        .single();

      if (enrollmentError) {
        console.error("Enrollment creation error:", enrollmentError);
        return new Response(JSON.stringify({ error: "Failed to create enrollment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save subjects if provided
      if (request.subject_1 && request.subject_2 && request.subject_3) {
        await supabase.from("user_subjects").insert({
          user_id: request.user_id,
          enrollment_id: enrollment.id,
          subject_1: request.subject_1,
          subject_2: request.subject_2,
          subject_3: request.subject_3,
          is_locked: true,
          locked_at: new Date().toISOString(),
        });
      }

      // STEP 2: Find creator (but DON'T update stats yet)
      const paymentMonth = new Date();
      paymentMonth.setDate(1);
      const paymentMonthStr = paymentMonth.toISOString().split("T")[0];

      let creatorId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorData: any = null;
      let discountCodeId: string | null = null;

      // Handle referral
      if (request.ref_creator) {
        const { data: foundCreator } = await supabase
          .from("creator_profiles")
          .select("id, lifetime_paid_users, available_balance, cmo_id")
          .eq("referral_code", request.ref_creator.toUpperCase())
          .maybeSingle();

        if (foundCreator) {
          creatorId = foundCreator.id;
          creatorData = foundCreator;
          const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
            ? CREATOR_BONUS_RATE 
            : CREATOR_BASE_RATE;
          creatorCommissionAmount = request.amount * commissionRate;
        }
      }

      // Also check discount code
      if (!creatorId && request.discount_code) {
        const { data: dcData } = await supabase
          .from("discount_codes")
          .select("id, creator_id")
          .eq("code", request.discount_code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (dcData && dcData.creator_id) {
          creatorId = dcData.creator_id;
          discountCodeId = dcData.id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
              ? CREATOR_BONUS_RATE 
              : CREATOR_BASE_RATE;
            creatorCommissionAmount = request.amount * commissionRate;
          }
        }
      }

      // STEP 3: Create payment attribution FIRST (source of truth)
      const { error: paError } = await supabase.from("payment_attributions").insert({
        order_id: orderId,
        user_id: request.user_id,
        creator_id: creatorId,
        enrollment_id: enrollment.id,
        amount: request.amount,
        original_amount: request.amount,
        final_amount: request.amount,
        creator_commission_rate: creatorId ? (creatorCommissionAmount / request.amount) : 0,
        creator_commission_amount: creatorCommissionAmount,
        payment_month: paymentMonthStr,
        tier: request.tier,
        payment_type: "bank",
      });

      if (paError) {
        console.error("Payment attribution error:", paError);
        // Don't fail the whole request, just log it
      }

      // STEP 4: Only NOW update stats (since attribution was created)
      if (creatorId && creatorData && !paError) {
        // Update creator
        await supabase
          .from("creator_profiles")
          .update({
            lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
            available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
          })
          .eq("id", creatorId);

        // User attribution
        await supabase.from("user_attributions").upsert({
          user_id: request.user_id,
          creator_id: creatorId,
          discount_code_id: discountCodeId,
          referral_source: discountCodeId ? "discount_code" : "link",
        }, { onConflict: "user_id" });

        // CMO commission
        if (creatorData.cmo_id) {
          await updateCMOPayout(supabase, creatorData.cmo_id, request.amount, paymentMonthStr);
        }
      }

      // Update join request status
      await supabase
        .from("join_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: admin_notes || null,
        })
        .eq("id", join_request_id);

      console.log("Join request approved:", join_request_id);

      return new Response(
        JSON.stringify({ success: true, enrollment_id: enrollment.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve upgrade request
    // IDEMPOTENT: Check attribution FIRST, only update stats if NEW attribution created
    if (path === "approve-upgrade-request" && req.method === "POST") {
      const { upgrade_request_id, admin_notes } = await req.json();

      console.log("Approving upgrade request:", upgrade_request_id);

      const { data: request, error: reqError } = await supabase
        .from("upgrade_requests")
        .select("*")
        .eq("id", upgrade_request_id)
        .single();

      if (reqError || !request) {
        return new Response(JSON.stringify({ error: "Upgrade request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.status !== "pending") {
        return new Response(JSON.stringify({ error: "Request already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderId = `UPG-BANK-${request.reference_number}`;

      // STEP 1: Check if attribution already exists
      const { data: existingAttribution } = await supabase
        .from("payment_attributions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingAttribution) {
        console.log("Attribution already exists for upgrade:", orderId);
        // Still update status
        await supabase
          .from("upgrade_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            admin_notes: admin_notes || null,
          })
          .eq("id", upgrade_request_id);
        
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update enrollment tier
      await supabase
        .from("enrollments")
        .update({ tier: request.requested_tier })
        .eq("id", request.enrollment_id);

      // Get enrollment for user_id
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("id", request.enrollment_id)
        .single();

      const paymentMonth = new Date();
      paymentMonth.setDate(1);
      const paymentMonthStr = paymentMonth.toISOString().split("T")[0];

      // STEP 2: Find creator (but DON'T update stats yet)
      let creatorId: string | null = null;
      let creatorCommissionAmount = 0;
      let creatorData: any = null;

      if (enrollment) {
        const { data: userAttribution } = await supabase
          .from("user_attributions")
          .select("creator_id")
          .eq("user_id", enrollment.user_id)
          .maybeSingle();

        if (userAttribution?.creator_id) {
          creatorId = userAttribution.creator_id;

          const { data: foundCreator } = await supabase
            .from("creator_profiles")
            .select("id, lifetime_paid_users, available_balance, cmo_id")
            .eq("id", creatorId)
            .single();

          if (foundCreator) {
            creatorData = foundCreator;
            const commissionRate = (foundCreator.lifetime_paid_users || 0) >= CREATOR_BONUS_THRESHOLD 
              ? CREATOR_BONUS_RATE 
              : CREATOR_BASE_RATE;
            creatorCommissionAmount = (request.amount || 0) * commissionRate;
          }
        }

        // STEP 3: Create payment attribution FIRST
        const { error: paError } = await supabase.from("payment_attributions").insert({
          order_id: orderId,
          user_id: enrollment.user_id,
          creator_id: creatorId,
          enrollment_id: request.enrollment_id,
          amount: request.amount || 0,
          original_amount: request.amount || 0,
          final_amount: request.amount || 0,
          creator_commission_rate: creatorId && request.amount ? (creatorCommissionAmount / request.amount) : 0,
          creator_commission_amount: creatorCommissionAmount,
          payment_month: paymentMonthStr,
          tier: request.requested_tier,
          payment_type: "bank",
        });

        // STEP 4: Only NOW update stats
        if (creatorId && creatorData && !paError) {
          // Update creator balance (not paid users count for upgrades)
          await supabase
            .from("creator_profiles")
            .update({
              available_balance: (creatorData.available_balance || 0) + creatorCommissionAmount,
            })
            .eq("id", creatorId);

          // CMO commission for upgrade
          if (creatorData.cmo_id && request.amount) {
            await updateCMOPayout(supabase, creatorData.cmo_id, request.amount, paymentMonthStr);
          }
        }
      }

      // Update upgrade request
      await supabase
        .from("upgrade_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: admin_notes || null,
        })
        .eq("id", upgrade_request_id);

      console.log("Upgrade request approved:", upgrade_request_id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Recalculate all stats from payment_attributions (source of truth)
    if (path === "recalculate-stats" && req.method === "POST") {
      console.log("Recalculating all stats from payment_attributions...");

      const results: any = {
        creators_updated: 0,
        cmo_payouts_regenerated: 0,
        errors: [],
      };

      try {
        // 1. Recalculate all creator_profiles stats
        const { data: creators } = await supabase
          .from("creator_profiles")
          .select("id");

        for (const creator of creators || []) {
          // Count payment attributions
          const { count: paidUsers } = await supabase
            .from("payment_attributions")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id);

          // Sum commissions
          const { data: commissions } = await supabase
            .from("payment_attributions")
            .select("creator_commission_amount")
            .eq("creator_id", creator.id);

          const totalCommission = (commissions || []).reduce(
            (sum, c) => sum + Number(c.creator_commission_amount || 0), 0
          );

          // Count this month's payments
          const currentMonth = new Date();
          currentMonth.setDate(1);
          const currentMonthStr = currentMonth.toISOString().split("T")[0];

          const { count: monthlyUsers } = await supabase
            .from("payment_attributions")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)
            .gte("payment_month", currentMonthStr);

          // Get total withdrawn
          const { data: creatorData } = await supabase
            .from("creator_profiles")
            .select("total_withdrawn")
            .eq("id", creator.id)
            .single();

          const totalWithdrawn = creatorData?.total_withdrawn || 0;
          const availableBalance = totalCommission - totalWithdrawn;

          // Update creator profile
          await supabase
            .from("creator_profiles")
            .update({
              lifetime_paid_users: paidUsers || 0,
              monthly_paid_users: monthlyUsers || 0,
              available_balance: availableBalance,
            })
            .eq("id", creator.id);

          results.creators_updated++;
        }

        // 2. Regenerate CMO payouts
        // First, delete all existing
        await supabase.from("cmo_payouts").delete().gte("id", "00000000-0000-0000-0000-000000000000");

        // Get all CMOs
        const { data: cmos } = await supabase.from("cmo_profiles").select("id");

        for (const cmo of cmos || []) {
          // Get all creators under this CMO
          const { data: cmoCreators } = await supabase
            .from("creator_profiles")
            .select("id")
            .eq("cmo_id", cmo.id);

          const creatorIds = (cmoCreators || []).map(c => c.id);

          if (creatorIds.length === 0) continue;

          // Get all payment attributions for these creators, grouped by month
          const { data: attributions } = await supabase
            .from("payment_attributions")
            .select("payment_month, final_amount")
            .in("creator_id", creatorIds);

          // Group by month
          const monthlyData: Record<string, { count: number; revenue: number }> = {};
          for (const attr of attributions || []) {
            if (!attr.payment_month) continue;
            if (!monthlyData[attr.payment_month]) {
              monthlyData[attr.payment_month] = { count: 0, revenue: 0 };
            }
            monthlyData[attr.payment_month].count++;
            monthlyData[attr.payment_month].revenue += Number(attr.final_amount || 0);
          }

          // Create payout records for each month
          for (const [month, data] of Object.entries(monthlyData)) {
            const baseCommission = data.revenue * CMO_COMMISSION_RATE;
            
            await supabase.from("cmo_payouts").insert({
              cmo_id: cmo.id,
              payout_month: month,
              total_paid_users: data.count,
              base_commission_amount: baseCommission,
              bonus_amount: 0,
              total_commission: baseCommission,
              status: "pending",
            });

            results.cmo_payouts_regenerated++;
          }
        }

        console.log("Stats recalculation complete:", results);

        return new Response(
          JSON.stringify({ success: true, ...results }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error: any) {
        console.error("Error recalculating stats:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get revenue stats for admin dashboard
    if (path === "revenue-stats" && req.method === "GET") {
      const months = 6;
      const revenueData = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        const startOfMonth = date.toISOString().split("T")[0];
        
        const endDate = new Date(date);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const endOfMonth = endDate.toISOString().split("T")[0];

        const { data: payments } = await supabase
          .from("payment_attributions")
          .select("final_amount")
          .gte("payment_month", startOfMonth)
          .lte("payment_month", endOfMonth);

        const monthTotal = (payments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
        
        const monthName = date.toLocaleDateString("en-US", { month: "short" });
        revenueData.push({ name: monthName, value: monthTotal });
      }

      // Total revenue
      const { data: allPayments } = await supabase
        .from("payment_attributions")
        .select("final_amount");

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // This month's revenue
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split("T")[0];

      const { data: thisMonthPayments } = await supabase
        .from("payment_attributions")
        .select("final_amount")
        .gte("payment_month", currentMonthStr);

      const thisMonthRevenue = (thisMonthPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      return new Response(
        JSON.stringify({ revenueData, totalRevenue, thisMonthRevenue }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in admin-finance:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to update CMO payout
async function updateCMOPayout(
  supabase: any,
  cmoId: string,
  grossAmount: number,
  paymentMonth: string
) {
  // Get CMO's annual paid users to determine if bonus applies (280 users annually)
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearStartStr = yearStart.toISOString().split("T")[0];

  // Get all creator IDs under this CMO
  const { data: cmoCreators } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("cmo_id", cmoId);

  const creatorIds = (cmoCreators || []).map((c: any) => c.id);
  
  let annualPaidUsers = 0;
  if (creatorIds.length > 0) {
    const { count } = await supabase
      .from("payment_attributions")
      .select("*", { count: "exact", head: true })
      .in("creator_id", creatorIds)
      .gte("payment_month", yearStartStr);
    annualPaidUsers = count || 0;
  }

  // CMO commission: 8% of revenue from their creators, +5% if 280 annual users goal met
  const baseCommission = grossAmount * CMO_COMMISSION_RATE;
  const bonusCommission = annualPaidUsers >= CMO_ANNUAL_USER_GOAL ? grossAmount * CMO_BONUS_RATE : 0;
  const totalCommission = baseCommission + bonusCommission;

  // Check if payout record exists for this month
  const { data: existingPayout } = await supabase
    .from("cmo_payouts")
    .select("*")
    .eq("cmo_id", cmoId)
    .eq("payout_month", paymentMonth)
    .maybeSingle();

  if (existingPayout) {
    await supabase
      .from("cmo_payouts")
      .update({
        total_paid_users: (existingPayout.total_paid_users || 0) + 1,
        base_commission_amount: (existingPayout.base_commission_amount || 0) + baseCommission,
        bonus_amount: (existingPayout.bonus_amount || 0) + bonusCommission,
        total_commission: (existingPayout.total_commission || 0) + totalCommission,
      })
      .eq("id", existingPayout.id);
  } else {
    await supabase.from("cmo_payouts").insert({
      cmo_id: cmoId,
      payout_month: paymentMonth,
      total_paid_users: 1,
      base_commission_amount: baseCommission,
      bonus_amount: bonusCommission,
      total_commission: totalCommission,
      status: "pending",
    });
  }

  console.log("CMO payout updated:", cmoId, "Base:", baseCommission, "Bonus:", bonusCommission, "Annual users:", annualPaidUsers);
}
