import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyEdgeFunctionError } from "../_shared/notify.ts";
import { sendNotification } from "../_shared/notify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  current_tier_level: number | null;
  tier_protection_until: string | null;
  monthly_paid_users: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all commission tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('commission_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    if (tiersError) {
      throw new Error(`Failed to fetch commission tiers: ${tiersError.message}`);
    }

    const commissionTiers = tiers as CommissionTier[];

    // Fetch all active creator profiles
    const { data: creators, error: creatorsError } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('is_active', true);

    if (creatorsError) {
      throw new Error(`Failed to fetch creator profiles: ${creatorsError.message}`);
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const results = {
      evaluated: 0,
      promoted: 0,
      demoted: 0,
      unchanged: 0,
      protected: 0,
      errors: [] as string[],
    };

    for (const creator of creators as CreatorProfile[]) {
      try {
        // Check if still in protection period
        if (creator.tier_protection_until) {
          const protectionEnd = new Date(creator.tier_protection_until);
          if (protectionEnd > now) {
            results.protected++;
            continue; // Skip evaluation for protected creators
          }
        }

      // Get paid users count for this creator using ROLLING 30-day window
      // This ensures fair evaluation regardless of when the creator signed up
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
        const { count: monthlyPaidUsers } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creator.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

        const monthlyCount = monthlyPaidUsers || 0;
        const currentTierLevel = creator.current_tier_level || 2; // Default Tier 2

        // Determine the appropriate tier based on monthly performance
        let newTierLevel = 1; // Start at lowest tier
        for (const tier of commissionTiers) {
          if (monthlyCount >= tier.monthly_user_threshold) {
            newTierLevel = tier.tier_level;
          }
        }

        results.evaluated++;

        // Check if tier changed
        if (newTierLevel !== currentTierLevel) {
          const isPromotion = newTierLevel > currentTierLevel;
          
          // The tier change takes effect for the NEXT 30-day period
          // Whether promoted or demoted, give them 30 days at the new tier
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          
          // Update the creator's tier
          const { error: updateError } = await supabase
            .from('creator_profiles')
            .update({
              current_tier_level: newTierLevel,
              monthly_paid_users: monthlyCount,
              // ALWAYS give 30-day protection for the new tier (both promotion AND demotion)
              tier_protection_until: thirtyDaysFromNow,
            })
            .eq('id', creator.id);

          if (updateError) {
            results.errors.push(`Failed to update creator ${creator.id}: ${updateError.message}`);
          } else {
            if (isPromotion) {
              results.promoted++;
              console.log(`Creator ${creator.display_name || creator.id} promoted from Tier ${currentTierLevel} to Tier ${newTierLevel}`);
              
              // Send notification for promotion
              await sendNotification(supabaseUrl, supabaseServiceKey, {
                type: 'creator_tier_change',
                message: `Creator ${creator.display_name || 'Unknown'} promoted to Tier ${newTierLevel}`,
                data: {
                  creator_id: creator.id,
                  creator_name: creator.display_name || 'Unknown',
                  old_tier: currentTierLevel,
                  new_tier: newTierLevel,
                  monthly_users: monthlyCount,
                  change_type: 'promotion',
                },
                priority: 'medium',
              });
            } else {
              results.demoted++;
              console.log(`Creator ${creator.display_name || creator.id} demoted from Tier ${currentTierLevel} to Tier ${newTierLevel}`);
              
              // Send notification for demotion
              await sendNotification(supabaseUrl, supabaseServiceKey, {
                type: 'creator_tier_change',
                message: `Creator ${creator.display_name || 'Unknown'} demoted to Tier ${newTierLevel}`,
                data: {
                  creator_id: creator.id,
                  creator_name: creator.display_name || 'Unknown',
                  old_tier: currentTierLevel,
                  new_tier: newTierLevel,
                  monthly_users: monthlyCount,
                  change_type: 'demotion',
                },
                priority: 'high',
              });
            }
          }
        } else {
          // Update monthly_paid_users count
          await supabase
            .from('creator_profiles')
            .update({ monthly_paid_users: monthlyCount })
            .eq('id', creator.id);
            
          results.unchanged++;
        }
      } catch (creatorError: any) {
        results.errors.push(`Error processing creator ${creator.id}: ${creatorError.message}`);
      }
    }

    console.log('Tier evaluation completed:', results);

    // Send summary notification if there were changes
    if (results.promoted > 0 || results.demoted > 0) {
      await sendNotification(supabaseUrl, supabaseServiceKey, {
        type: 'creator_tier_change',
        message: `Tier evaluation completed: ${results.promoted} promoted, ${results.demoted} demoted`,
        data: {
          evaluated: results.evaluated,
          promoted: results.promoted,
          demoted: results.demoted,
          unchanged: results.unchanged,
          protected: results.protected,
          errors_count: results.errors.length,
        },
        priority: 'low',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Creator tier evaluation completed',
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error evaluating creator tiers:', error);
    
    // Send error notification
    await notifyEdgeFunctionError(supabaseUrl, supabaseServiceKey, {
      functionName: 'evaluate-creator-tiers',
      error: error.message || 'Unknown error',
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
