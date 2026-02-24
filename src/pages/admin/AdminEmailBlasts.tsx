import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface EmailBlast {
  blast_unique_id: string;
  created_at: string;
  total_count: number;
}

const AdminEmailBlasts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [blasts, setBlasts] = useState<EmailBlast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailBlasts();
  }, []);

  const fetchEmailBlasts = async () => {
    setLoading(true);
    try {
      // Fetch email blasts grouped by blast_unique_id
      const { data, error } = await supabase
        .from('email_jobs')
        .select('blast_unique_id, created_at')
        .not('blast_unique_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by blast_unique_id and count
      const grouped = data.reduce((acc: any, item: any) => {
        if (!acc[item.blast_unique_id]) {
          acc[item.blast_unique_id] = {
            blast_unique_id: item.blast_unique_id,
            created_at: item.created_at,
            total_count: 0
          };
        }
        acc[item.blast_unique_id].total_count++;
        return acc;
      }, {});

      const blastList = Object.values(grouped) as EmailBlast[];
      setBlasts(blastList);
    } catch (error: any) {
      console.error("Error fetching email blasts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch email blasts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewBlastDetail = (blastId: string) => {
    navigate(`/admin-dashboard-secure-7f8e2a9c/email-blasts/${blastId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Blast History</h1>
        <p className="text-muted-foreground">
          View all email blast campaigns and their status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Blasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email blasts found
            </div>
          ) : (
            <div className="space-y-3">
              {blasts.map((blast) => (
                <div
                  key={blast.blast_unique_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{blast.blast_unique_id}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(blast.created_at), "PPpp")} • {blast.total_count} emails
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewBlastDetail(blast.blast_unique_id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailBlasts;
