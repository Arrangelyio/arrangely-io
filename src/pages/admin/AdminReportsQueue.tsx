import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
  Music,
  User,
  MessageSquare,
  Loader2
} from "lucide-react";
import { useUpdateReportStatus } from "@/hooks/useSongReport";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export default function AdminReportsQueue() {
  const navigate = useNavigate();
  const { role, user, loading: isLoadingRole } = useUserRole();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateReportStatus();

  // Check admin access
  useEffect(() => {
    if (!isLoadingRole && role !== 'admin') {
      navigate('/');
      toast.error('Access denied');
    }
  }, [role, isLoadingRole, navigate]);

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('song_reports')
        .select(`
          *,
          songs (id, title, artist, youtube_thumbnail, user_id)
        `)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get reporter profiles
      const reporterIds = [...new Set(data?.map(r => r.reporter_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', reporterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data?.map(report => ({
        ...report,
        reporter: profileMap.get(report.reporter_id)
      })) || [];
    },
    enabled: role === 'admin'
  });

  const handleAction = (action: 'confirmed' | 'dismissed') => {
    if (!selectedReport || !userId) return;

    updateStatus({
      reportId: selectedReport.id,
      status: action,
      adminNotes: adminNotes.trim() || undefined,
      reviewedBy: userId
    }, {
      onSuccess: () => {
        setSelectedReport(null);
        setAdminNotes('');
        refetch();
      }
    });
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'inappropriate_content': 'Inappropriate Content',
      'wrong_chords': 'Wrong Chords',
      'spam': 'Spam/Low Quality',
      'copyright': 'Copyright Issue',
      'misleading': 'Misleading',
      'other': 'Other'
    };
    return labels[reason] || reason;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Reviewing</Badge>;
      case 'confirmed':
        return <Badge variant="destructive" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><XCircle className="h-3 w-3" /> Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoadingRole || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-destructive" />
            Song Reports Queue
          </h1>
          <p className="text-muted-foreground">Review and moderate reported content</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-2 space-y-4">
              {reports?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Flag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No reports in this category</p>
                  </CardContent>
                </Card>
              ) : (
                reports?.map(report => (
                  <Card 
                    key={report.id}
                    className={`cursor-pointer transition-all ${selectedReport?.id === report.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {report.songs?.youtube_thumbnail ? (
                            <img 
                              src={report.songs.youtube_thumbnail}
                              alt={report.songs.title}
                              className="w-16 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-16 h-12 rounded bg-muted flex items-center justify-center">
                              <Music className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{report.songs?.title || 'Unknown Song'}</h3>
                            <p className="text-sm text-muted-foreground">{report.songs?.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getReasonLabel(report.report_reason)}
                              </Badge>
                              {getStatusBadge(report.status)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Report Details */}
            <div>
              {selectedReport ? (
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Report Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Song Info */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Music className="h-4 w-4" /> Song
                      </h4>
                      <p className="text-sm">{selectedReport.songs?.title}</p>
                      <p className="text-xs text-muted-foreground">{selectedReport.songs?.artist}</p>
                    </div>

                    {/* Reporter */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" /> Reporter
                      </h4>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedReport.reporter?.avatar_url} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {selectedReport.reporter?.display_name || 'Anonymous'}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Reason
                      </h4>
                      <Badge>{getReasonLabel(selectedReport.report_reason)}</Badge>
                    </div>

                    {/* Details */}
                    {selectedReport.report_details && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" /> Details
                        </h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {selectedReport.report_details}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {selectedReport.status === 'pending' && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Admin Notes</h4>
                        <Textarea
                          placeholder="Add notes about this report..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {selectedReport.status === 'pending' && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleAction('confirmed')}
                          disabled={isUpdating}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAction('dismissed')}
                          disabled={isUpdating}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {/* Previous Admin Notes */}
                    {selectedReport.admin_notes && selectedReport.status !== 'pending' && (
                      <div className="space-y-2 pt-4 border-t">
                        <h4 className="text-sm font-medium">Admin Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedReport.admin_notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Flag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Select a report to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
