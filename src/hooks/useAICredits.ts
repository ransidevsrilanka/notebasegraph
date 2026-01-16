import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AICredits {
  id: string;
  user_id: string;
  enrollment_id: string;
  month_year: string;
  credits_used: number;
  credits_limit: number;
  strikes: number;
  is_suspended: boolean;
  suspended_at: string | null;
}

// Credit limits by tier
export const TIER_CREDITS: Record<string, number> = {
  standard: 30000,  // Gold
  lifetime: 100000, // Platinum
  starter: 0,       // Silver - no AI access
};

export function useAICredits() {
  const { user, enrollment } = useAuth();

  const query = useQuery({
    queryKey: ["ai-credits", user?.id],
    queryFn: async (): Promise<AICredits | null> => {
      if (!user?.id || !enrollment?.id) return null;

      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Try to get existing credit record
      const { data, error } = await supabase
        .from("ai_credits")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching AI credits:", error);
        throw error;
      }

      if (data) {
        return data as AICredits;
      }

      // Create new credit record for this month
      const creditsLimit = TIER_CREDITS[enrollment.tier] || 0;
      
      if (creditsLimit === 0) {
        // Return virtual record for ineligible users
        return {
          id: "virtual",
          user_id: user.id,
          enrollment_id: enrollment.id,
          month_year: monthYear,
          credits_used: 0,
          credits_limit: 0,
          strikes: 0,
          is_suspended: false,
          suspended_at: null,
        };
      }

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
        console.error("Error creating AI credits:", insertError);
        throw insertError;
      }

      return newRecord as AICredits;
    },
    enabled: !!user?.id && !!enrollment?.id,
    staleTime: 30000, // 30 seconds
  });

  const isEligible = enrollment?.tier && TIER_CREDITS[enrollment.tier] > 0;
  const remainingCredits = query.data 
    ? query.data.credits_limit - query.data.credits_used 
    : 0;
  const percentageUsed = query.data && query.data.credits_limit > 0
    ? (query.data.credits_used / query.data.credits_limit) * 100
    : 0;

  return {
    credits: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEligible,
    remainingCredits,
    percentageUsed,
    isSuspended: query.data?.is_suspended || false,
    strikes: query.data?.strikes || 0,
  };
}
