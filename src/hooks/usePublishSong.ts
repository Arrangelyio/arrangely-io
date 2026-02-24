import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Publication {
  id: string;
  songId: string;
  userId: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'archived';
  validationResults: Record<string, unknown>;
  reviewNotes: string | null;
  rejectedReason: string | null;
  publishedAt: string;
  createdAt: string;
}

interface ValidationResult {
  type: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  result: Record<string, unknown>;
  errorMessage: string | null;
}

export function usePublishSong(userId?: string) {
  const queryClient = useQueryClient();

  const publishSong = useMutation({
    mutationFn: async ({ songId }: { songId: string }) => {
      if (!userId) throw new Error('User not authenticated');

      // Create publication record
      const { data: publication, error } = await supabase
        .from('creator_pro_publications')
        .insert({
          user_id: userId,
          song_id: songId,
          status: 'pending_review'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This song has already been submitted for publication');
        }
        throw error;
      }

      // Create validation queue entries (includes quality and arrangement validation)
      const validationTypes = ['youtube', 'sections', 'arrangement', 'quality', 'chords', 'content'];
      const validationEntries = validationTypes.map(type => ({
        publication_id: publication.id,
        song_id: songId,
        validation_type: type,
        status: 'pending'
      }));

      const { error: queueError } = await supabase
        .from('content_validation_queue')
        .insert(validationEntries);

      if (queueError) {
        console.error('Error creating validation queue:', queueError);
      }

      // Trigger validation edge function
      try {
        await supabase.functions.invoke('validate-song-publication', {
          body: { publicationId: publication.id, songId }
        });
      } catch (e) {
        console.error('Error triggering validation:', e);
      }

      return publication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-publications'] });
      queryClient.invalidateQueries({ queryKey: ['creator-pro-score'] });
      toast.success('Song submitted for publication review');
    },
    onError: (error: Error) => {
      console.error('Error publishing song:', error);
      toast.error(error.message || 'Failed to publish song');
    }
  });

  return {
    publishSong: publishSong.mutate,
    isPublishing: publishSong.isPending
  };
}

export function useMyPublications(userId?: string) {
  return useQuery({
    queryKey: ['my-publications', userId],
    queryFn: async (): Promise<Publication[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('creator_pro_publications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching publications:', error);
        return [];
      }

      return data.map(pub => ({
        id: pub.id,
        songId: pub.song_id,
        userId: pub.user_id,
        status: pub.status as Publication['status'],
        validationResults: pub.validation_results as Record<string, unknown>,
        reviewNotes: pub.review_notes,
        rejectedReason: pub.rejected_reason,
        publishedAt: pub.published_at,
        createdAt: pub.created_at
      }));
    },
    enabled: !!userId,
    staleTime: 30000
  });
}

export function usePublicationValidation(publicationId?: string) {
  return useQuery({
    queryKey: ['publication-validation', publicationId],
    queryFn: async (): Promise<ValidationResult[]> => {
      if (!publicationId) return [];

      const { data, error } = await supabase
        .from('content_validation_queue')
        .select('*')
        .eq('publication_id', publicationId)
        .order('created_at');

      if (error) {
        console.error('Error fetching validation:', error);
        return [];
      }

      return data.map(v => ({
        type: v.validation_type,
        status: v.status as ValidationResult['status'],
        result: v.result as Record<string, unknown>,
        errorMessage: v.error_message
      }));
    },
    enabled: !!publicationId,
    refetchInterval: (query) => {
      // Keep polling if any validation is still pending/in_progress
      const data = query.state.data;
      const isComplete = data?.every((v: ValidationResult) => v.status === 'passed' || v.status === 'failed');
      return isComplete ? false : 3000;
    }
  });
}

export default usePublishSong;
