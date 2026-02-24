import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicationStatus {
  id: string;
  songId: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'archived';
  validationResults: Record<string, unknown> | null;
  rejectedReason: string | null;
  createdAt: string;
}

interface ValidationResult {
  type: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  result: Record<string, unknown> | null;
  errorMessage: string | null;
}

/**
 * Hook to handle song publication with validation workflow.
 * 
 * Instead of directly setting is_public = true, this hook:
 * 1. Creates a publication record with 'pending_review' status
 * 2. Triggers the validation edge function
 * 3. The edge function validates and updates status to 'active' or 'rejected'
 * 4. If 'active', the song's is_public is set to true
 */
export function usePublishSongWithValidation(userId?: string) {
  const queryClient = useQueryClient();

  const publishSong = useMutation({
    mutationFn: async ({ songId }: { songId: string }) => {
      if (!userId) throw new Error('User not authenticated');

      // Check if there's already a pending or active publication for this song
      const { data: existingPub } = await supabase
        .from('creator_pro_publications')
        .select('id, status')
        .eq('song_id', songId)
        .maybeSingle();

      if (existingPub) {
        if (existingPub.status === 'active') {
          throw new Error('This song is already published');
        }
        if (existingPub.status === 'pending_review') {
          throw new Error('This song is already pending review');
        }
        // If rejected, allow re-submission by deleting old record
        if (existingPub.status === 'rejected') {
          await supabase
            .from('creator_pro_publications')
            .delete()
            .eq('id', existingPub.id);
          
          // Also delete old validation queue entries
          await supabase
            .from('content_validation_queue')
            .delete()
            .eq('publication_id', existingPub.id);
        }
      }

      // Create publication record with pending status
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
        const { data: validationResult, error: funcError } = await supabase.functions.invoke('validate-song-publication', {
          body: { publicationId: publication.id, songId }
        });

        if (funcError) {
          console.error('Edge function error:', funcError);
          throw new Error('Validation service temporarily unavailable');
        }

        // Return the validation result
        return {
          publication,
          validationResult,
          allPassed: validationResult?.allPassed
        };
      } catch (e) {
        console.error('Error triggering validation:', e);
        throw new Error('Failed to validate song. Please try again.');
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-publications'] });
      queryClient.invalidateQueries({ queryKey: ['creator-pro-score'] });
      queryClient.invalidateQueries({ queryKey: ['user-songs'] });
      
      // Manual review flow - song is pending review
      toast.success('🎵 Song submitted for review!', {
        description: 'Your arrangement has been submitted. An admin will review it shortly.'
      });
    },
    onError: (error: Error) => {
      console.error('Error publishing song:', error);
      toast.error(error.message || 'Failed to publish song');
    }
  });

  return {
    publishSong: publishSong.mutate,
    publishSongAsync: publishSong.mutateAsync,
    isPublishing: publishSong.isPending,
    publishResult: publishSong.data
  };
}

/**
 * Hook to get the publication status for a specific song
 */
export function useSongPublicationStatus(songId?: string) {
  return useQuery({
    queryKey: ['song-publication-status', songId],
    queryFn: async (): Promise<PublicationStatus | null> => {
      if (!songId) return null;

      const { data, error } = await supabase
        .from('creator_pro_publications')
        .select('*')
        .eq('song_id', songId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching publication status:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        songId: data.song_id,
        status: data.status as PublicationStatus['status'],
        validationResults: data.validation_results as Record<string, unknown> | null,
        rejectedReason: data.rejected_reason,
        createdAt: data.created_at
      };
    },
    enabled: !!songId,
    staleTime: 10000
  });
}

/**
 * Hook to get validation details for a publication
 */
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
        result: v.result as Record<string, unknown> | null,
        errorMessage: v.error_message
      }));
    },
    enabled: !!publicationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const isComplete = data?.every((v: ValidationResult) => v.status === 'passed' || v.status === 'failed');
      return isComplete ? false : 3000;
    }
  });
}

export default usePublishSongWithValidation;
