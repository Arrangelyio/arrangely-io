import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle, Clock, XCircle, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface EmailStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  created_at: string;
}

interface EmailJob {
  id: string;
  recipient_email: string;
  recipient_name: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

const ITEMS_PER_PAGE = 50;

const AdminEmailBlastDetail = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { blastId } = useParams<{ blastId: string }>();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (blastId) {
      fetchStats();
    }
  }, [blastId]);

  useEffect(() => {
    if (blastId) {
      fetchEmails();
    }
  }, [blastId, currentPage, searchTerm]);

  // Fetch stats separately with count queries to avoid 1000 limit
  const fetchStats = async () => {
    try {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('email_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('blast_unique_id', blastId);

      if (totalError) throw totalError;

      // Get sent count
      const { count: sentCount, error: sentError } = await supabase
        .from('email_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('blast_unique_id', blastId)
        .eq('status', 'sent');

      if (sentError) throw sentError;

      // Get pending count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('email_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('blast_unique_id', blastId)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get failed count
      const { count: failedCount, error: failedError } = await supabase
        .from('email_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('blast_unique_id', blastId)
        .not('error_message', 'is', null);

      if (failedError) throw failedError;

      // Get created_at from first record
      const { data: firstRecord, error: firstError } = await supabase
        .from('email_jobs')
        .select('created_at')
        .eq('blast_unique_id', blastId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstError && firstError.code !== 'PGRST116') throw firstError;

      if (!firstRecord) {
        toast({
          title: "Error",
          description: "Email blast not found",
          variant: "destructive",
        });
        navigate('/admin-dashboard-secure-7f8e2a9c/email-blasts');
        return;
      }

      setStats({
        total: totalCount || 0,
        sent: sentCount || 0,
        pending: pendingCount || 0,
        failed: failedCount || 0,
        created_at: firstRecord.created_at,
      });

      setTotalCount(totalCount || 0);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch blast statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    setSearchLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('email_jobs')
        .select('id, recipient_email, recipient_name, status, created_at, sent_at, error_message', { count: 'exact' })
        .eq('blast_unique_id', blastId)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply search filter if present
      if (searchTerm.trim()) {
        query = query.ilike('recipient_email', `%${searchTerm.trim()}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setEmails(data || []);
      
      // Update total count for filtered results
      if (searchTerm.trim()) {
        setTotalCount(count || 0);
      } else if (stats) {
        setTotalCount(stats.total);
      }
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Error",
        description: "Failed to fetch email list",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status: string, errorMessage: string | null) => {
    if (errorMessage) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    
    if (status === 'sent') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Sent
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin-dashboard-secure-7f8e2a9c/email-blasts')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blasts
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Email Blast Details</h1>
        <p className="text-muted-foreground">
          {blastId}
        </p>
        <p className="text-sm text-muted-foreground">
          Created: {format(new Date(stats.created_at), "PPpp")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Details
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No emails found matching your search" : "No emails found"}
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Showing {startIndex.toLocaleString()} - {endIndex.toLocaleString()} of {totalCount.toLocaleString()} emails
                {searchTerm && ` (filtered)`}
              </div>
              
              <div className="space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="font-medium truncate">{email.recipient_name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {email.recipient_email}
                      </div>
                      {email.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {email.error_message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {email.sent_at && (
                        <div className="text-xs text-muted-foreground text-right">
                          {format(new Date(email.sent_at), "PP p")}
                        </div>
                      )}
                      {getStatusBadge(email.status, email.error_message)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-9"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailBlastDetail;
