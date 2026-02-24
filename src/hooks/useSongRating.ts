import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SongRating {
  id: string;
  songId: string;
  userId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface SongRatingStats {
  averageRating: number;
  totalRatings: number;
  userRating: number | null;
}

export function useSongRating(songId?: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['song-rating-stats', songId, userId],
    queryFn: async (): Promise<SongRatingStats> => {
      if (!songId) {
        return { averageRating: 0, totalRatings: 0, userRating: null };
      }

      // Get all ratings for this song
      const { data: ratings, error } = await supabase
        .from('song_ratings')
        .select('rating, user_id')
        .eq('song_id', songId);

      if (error) {
        console.error('Error fetching ratings:', error);
        return { averageRating: 0, totalRatings: 0, userRating: null };
      }

      const totalRatings = ratings?.length || 0;
      const averageRating = totalRatings > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
        : 0;
      const userRating = userId 
        ? ratings?.find(r => r.user_id === userId)?.rating || null 
        : null;

      return {
        averageRating,
        totalRatings,
        userRating
      };
    },
    enabled: !!songId,
    staleTime: 30000
  });

  const rateSong = useMutation({
    mutationFn: async ({ rating }: { rating: number }) => {
      if (!songId || !userId) throw new Error('Missing songId or userId');

      const { data, error } = await supabase
        .from('song_ratings')
        .upsert({
          song_id: songId,
          user_id: userId,
          rating,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'song_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-rating-stats', songId] });
      toast.success('Rating submitted!');
    },
    onError: (error) => {
      console.error('Error rating song:', error);
      toast.error('Failed to submit rating');
    }
  });

  const deleteRating = useMutation({
    mutationFn: async () => {
      if (!songId || !userId) throw new Error('Missing songId or userId');

      const { error } = await supabase
        .from('song_ratings')
        .delete()
        .eq('song_id', songId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-rating-stats', songId] });
      toast.success('Rating removed');
    },
    onError: (error) => {
      console.error('Error removing rating:', error);
      toast.error('Failed to remove rating');
    }
  });

  return {
    stats: stats || { averageRating: 0, totalRatings: 0, userRating: null },
    isLoading,
    rateSong: rateSong.mutate,
    deleteRating: deleteRating.mutate,
    isRating: rateSong.isPending || deleteRating.isPending
  };
}

export default useSongRating;
