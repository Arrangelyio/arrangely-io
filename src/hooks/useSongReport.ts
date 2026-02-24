import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ReportReason = 'inappropriate_content' | 'wrong_chords' | 'spam' | 'copyright' | 'misleading' | 'other';

interface SongReport {
  id: string;
  songId: string;
  reporterId: string;
  reportReason: ReportReason;
  reportDetails: string | null;
  status: 'pending' | 'reviewing' | 'confirmed' | 'dismissed';
  createdAt: string;
}

export function useSongReport(songId?: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: existingReport, isLoading } = useQuery({
    queryKey: ['song-report', songId, userId],
    queryFn: async (): Promise<SongReport | null> => {
      if (!songId || !userId) return null;

      const { data, error } = await supabase
        .from('song_reports')
        .select('*')
        .eq('song_id', songId)
        .eq('reporter_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        songId: data.song_id,
        reporterId: data.reporter_id,
        reportReason: data.report_reason as ReportReason,
        reportDetails: data.report_details,
        status: data.status as SongReport['status'],
        createdAt: data.created_at
      };
    },
    enabled: !!songId && !!userId,
    staleTime: 60000
  });

  const submitReport = useMutation({
    mutationFn: async ({ 
      reason, 
      details 
    }: { 
      reason: ReportReason; 
      details?: string 
    }) => {
      if (!songId || !userId) throw new Error('Missing songId or userId');

      const { data, error } = await supabase
        .from('song_reports')
        .insert({
          song_id: songId,
          reporter_id: userId,
          report_reason: reason,
          report_details: details || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('You have already reported this song');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-report', songId] });
      toast.success('Report submitted. Our team will review it.');
    },
    onError: (error: Error) => {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'Failed to submit report');
    }
  });

  return {
    existingReport,
    hasReported: !!existingReport,
    isLoading,
    submitReport: submitReport.mutate,
    isSubmitting: submitReport.isPending
  };
}

export function useAdminReports(status?: string) {
  return useQuery({
    queryKey: ['admin-song-reports', status],
    queryFn: async () => {
      let query = supabase
        .from('song_reports')
        .select(`
          *,
          songs (id, title, artist, user_id),
          reporter:profiles!song_reports_reporter_id_fkey (display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30000
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      adminNotes,
      reviewedBy
    }: { 
      reportId: string; 
      status: 'confirmed' | 'dismissed'; 
      adminNotes?: string;
      reviewedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('song_reports')
        .update({
          status,
          admin_notes: adminNotes || null,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-song-reports'] });
      toast.success('Report status updated');
    },
    onError: (error) => {
      console.error('Error updating report:', error);
      toast.error('Failed to update report status');
    }
  });
}

export default useSongReport;
