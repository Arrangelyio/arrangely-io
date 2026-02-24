import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreatorProStatus {
  isCreatorPro: boolean;
  hasActiveSubscription: boolean;
  isInGracePeriod: boolean;
  gracePeriodEnd: string | null;
  score: {
    total: number;
    validation: number;
    community: number;
    status: 'active' | 'warning' | 'blocked' | 'suspended';
  } | null;
  canPublish: boolean;
  blockedUntil: string | null;
}

export function useCreatorProStatus(userId?: string) {
  return useQuery({
    queryKey: ['creator-pro-status', userId],
    queryFn: async (): Promise<CreatorProStatus> => {
      if (!userId) {
        return {
          isCreatorPro: false,
          hasActiveSubscription: false,
          isInGracePeriod: false,
          gracePeriodEnd: null,
          score: null,
          canPublish: false,
          blockedUntil: null
        };
      }

      // Check if user is creator_pro
      const { data: profile } = await supabase
        .from('profiles')
        .select('creator_type')
        .eq('user_id', userId)
        .single();

      const isCreatorPro = profile?.creator_type === 'creator_pro';

      if (!isCreatorPro) {
        return {
          isCreatorPro: false,
          hasActiveSubscription: false,
          isInGracePeriod: false,
          gracePeriodEnd: null,
          score: null,
          canPublish: false,
          blockedUntil: null
        };
      }

      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, grace_period_end, grace_period_started_at')
        .eq('user_id', userId)
        .eq('is_production', true)
        .maybeSingle();

      const hasActiveSubscription = subscription?.status === 'active';
      const isInGracePeriod = !hasActiveSubscription && 
        subscription?.grace_period_end && 
        new Date(subscription.grace_period_end) > new Date();

      // Get creator score
      const { data: scoreData } = await supabase
        .from('creator_pro_scores')
        .select('total_score, validation_score, community_score, status, blocked_until')
        .eq('user_id', userId)
        .maybeSingle();

      const score = scoreData ? {
        total: Number(scoreData.total_score),
        validation: Number(scoreData.validation_score),
        community: Number(scoreData.community_score),
        status: scoreData.status as 'active' | 'warning' | 'blocked' | 'suspended'
      } : null;

      const isBlocked = scoreData?.status === 'blocked' || scoreData?.status === 'suspended';
      const canPublish = (hasActiveSubscription || isInGracePeriod) && !isBlocked;

      return {
        isCreatorPro,
        hasActiveSubscription,
        isInGracePeriod,
        gracePeriodEnd: subscription?.grace_period_end || null,
        score,
        canPublish,
        blockedUntil: scoreData?.blocked_until || null
      };
    },
    enabled: !!userId,
    staleTime: 30000
  });
}

export default useCreatorProStatus;
