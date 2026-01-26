import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceRequest {
  paper_ids: string[];
  delivery_method: 'standard' | 'cod';
}

interface PriceResponse {
  success: boolean;
  total_pages: number;
  subtotal: number;
  delivery_fee: number;
  cod_fee: number;
  total: number;
  papers: Array<{
    id: string;
    title: string;
    page_count: number;
    price_per_page: number;
    subtotal: number;
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PriceRequest = await req.json();
    const { paper_ids, delivery_method } = body;

    if (!paper_ids || !Array.isArray(paper_ids) || paper_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "paper_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pricing settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from("print_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (settingsError || !settingsData) {
      console.error("Failed to fetch print settings:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Print settings not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pricePerPage = settingsData.model_paper_price_per_page || 8;
    const deliveryFee = settingsData.base_delivery_fee || 200;
    const codFee = delivery_method === 'cod' ? (settingsData.cod_extra_fee || 50) : 0;

    // Fetch papers with their page counts
    const { data: papers, error: papersError } = await supabase
      .from("notes")
      .select("id, title, page_count, is_model_paper")
      .in("id", paper_ids)
      .eq("is_model_paper", true)
      .eq("is_active", true);

    if (papersError) {
      console.error("Failed to fetch papers:", papersError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch paper details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!papers || papers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No valid papers found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals
    let totalPages = 0;
    const paperDetails = papers.map(paper => {
      const pageCount = paper.page_count || 1;
      const paperSubtotal = pageCount * pricePerPage;
      totalPages += pageCount;
      
      return {
        id: paper.id,
        title: paper.title,
        page_count: pageCount,
        price_per_page: pricePerPage,
        subtotal: paperSubtotal,
      };
    });

    const subtotal = totalPages * pricePerPage;
    const total = subtotal + deliveryFee + codFee;

    const response: PriceResponse = {
      success: true,
      total_pages: totalPages,
      subtotal,
      delivery_fee: deliveryFee,
      cod_fee: codFee,
      total,
      papers: paperDetails,
    };

    console.log("Price calculation:", { paper_ids, total_pages: totalPages, total });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Calculate price error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
