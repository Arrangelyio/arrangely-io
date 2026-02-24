import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreatorProScore {
  id: string;
  userId: string;
  validationScore: number;
  communityScore: number;
  totalScore: number;
  totalPublications: number;
  approvedPublications: number;
  rejectedPublications: number;
  totalRatings: number;
  averageRating: number;
  totalReports: number;
  confirmedReports: number;
  status: 'active' | 'warning' | 'blocked' | 'suspended';
  blockedUntil: string | null;
  warningCount: number;
  lastWarningAt: string | null;
}

interface ScoreHistoryEntry {
  id: string;
  eventType: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number | null;
  eventDetails: Record<string, unknown>;
  createdAt: string;
}

export function useCreatorProScore(userId?: string) {
  return useQuery({
    queryKey: ['creator-pro-score', userId],
    queryFn: async (): Promise<CreatorProScore | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('creator_pro_scores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        validationScore: Number(data.validation_score),
        communityScore: Number(data.community_score),
        totalScore: Number(data.total_score),
        totalPublications: data.total_publications || 0,
        approvedPublications: data.approved_publications || 0,
        rejectedPublications: data.rejected_publications || 0,
        totalRatings: data.total_ratings || 0,
        averageRating: Number(data.average_rating) || 0,
        totalReports: data.total_reports || 0,
        confirmedReports: data.confirmed_reports || 0,
        status: data.status as 'active' | 'warning' | 'blocked' | 'suspended',
        blockedUntil: data.blocked_until,
        warningCount: data.warning_count || 0,
        lastWarningAt: data.last_warning_at
      };
    },
    enabled: !!userId,
    staleTime: 30000
  });
}

export function useCreatorScoreHistory(userId?: string, limit = 10) {
  return useQuery({
    queryKey: ['creator-score-history', userId, limit],
    queryFn: async (): Promise<ScoreHistoryEntry[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('creator_score_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(entry => ({
        id: entry.id,
        eventType: entry.event_type,
        scoreBefore: entry.score_before ? Number(entry.score_before) : null,
        scoreAfter: entry.score_after ? Number(entry.score_after) : null,
        scoreDelta: entry.score_delta ? Number(entry.score_delta) : null,
        eventDetails: entry.event_details as Record<string, unknown>,
        createdAt: entry.created_at
      }));
    },
    enabled: !!userId,
    staleTime: 30000
  });
}

export default useCreatorProScore;
