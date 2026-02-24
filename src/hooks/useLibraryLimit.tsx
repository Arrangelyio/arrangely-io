import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { rateLimiter } from "../../utils/securityUtils";

interface LibraryUsage {
  currentCount: number;
  limit: number;
  canAddMore: boolean;
  isTrialing: boolean;
}

export const useLibraryLimit = () => {
  const [libraryUsage, setLibraryUsage] = useState<LibraryUsage>({
    currentCount: 0,
    limit: 10,
    canAddMore: true,
    isTrialing: false,
  });
  const [loading, setLoading] = useState(true);
  const { subscriptionStatus } = useSubscription();

  const checkLibraryUsage = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Get active subscription with period dates
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status, is_trial, current_period_start, current_period_end")
        .eq("user_id", session.user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let limit = 10; // Default for free trial
      let isTrialing = true;
      let periodStart: string | null = null;
      let periodEnd: string | null = null;

      if (subscription) {
        periodStart = subscription.current_period_start;
        periodEnd = subscription.current_period_end;
        isTrialing = subscription.is_trial || subscription.status === "trialing";

        // Get subscription plan details
        const { data: plan, error: planError } = await supabase
          .from("subscription_plans")
          .select("library_limit")
          .eq("id", subscription.plan_id)
          .single();

        if (!planError && plan) {
          limit = plan.library_limit || 10;
        }
      }

      // Build query for library actions within the current subscription period
      let query = supabase
        .from("user_library_actions")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("action_type", "add_to_library");

      // Filter by subscription period if available
      if (periodStart) {
        query = query.gte("created_at", periodStart);
      }
      if (periodEnd) {
        query = query.lte("created_at", periodEnd);
      }

      const { data: libraryActions, error: libraryError } = await query;

      if (libraryError) throw libraryError;

      const currentCount = libraryActions?.length || 0;
      const canAddMore = currentCount < limit;

      setLibraryUsage({
        currentCount,
        limit,
        canAddMore,
        isTrialing,
      });
    } catch (error) {
      console.error("Error checking library usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const recordLibraryAction = async (songId: string, originalSongId: string, originalUserId: string, actionType: "add_to_library" | "remove_from_library") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Apply rate limiting
      const rateLimitKey = `library-${session.user.id}`;
      if (!rateLimiter.isAllowed(rateLimitKey, 10, 60000)) { // 10 requests per minute
        throw new Error("Too many requests. Please wait a moment.");
      }

      // Use secure server-side validation
      const { data, error } = await supabase.functions.invoke('validate-library-action', {
        body: {
          songId,
          originalId: originalUserId,
          originalSongId: originalSongId,
          actionType
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update library');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Library action failed');
      }

      // Refresh usage after successful action
      await checkLibraryUsage();
      
      // toast.success(
      //   actionType === 'add_to_library' 
      //     ? 'Song added to library successfully' 
      //     : 'Song removed from library'
      // );

    } catch (error: any) {
      console.error("Error recording library action:", error);
      
      if (error.message.includes('Library limit reached')) {
        toast.error('Library limit reached. Upgrade your subscription for more space.');
      } else if (error.message.includes('already in library')) {
        toast.info('Song is already in your library');
      } else if (error.message.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (error.message.includes('Subscription required')) {
        toast.error('Subscription required for library access');
      } else {
        toast.error('Failed to update library');
      }
      
      throw error;
    }
  };

  useEffect(() => {
    checkLibraryUsage();
  }, [subscriptionStatus]);

  return {
    libraryUsage,
    loading,
    checkLibraryUsage,
    recordLibraryAction,
  };
};