import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

export default function AdminChangeRequestManager({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [eventId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_ticket_change_requests')
        .select(`
          *,
          event_tickets:ticket_id (
            id,
            ticket_number,
            participant_name,
            participant_email,
            participant_phone,
            participant_ktp,
            event_id
          )
        `)
        .eq('event_tickets.event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(requestId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update request status
      const { error: updateError } = await supabase
        .from('event_ticket_change_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, update the ticket
      if (status === 'approved') {
        const updateField = `participant_${request.change_type}`;
        const { error: ticketError } = await supabase
          .from('event_tickets')
          .update({ [updateField]: request.new_value })
          .eq('id', request.ticket_id);

        if (ticketError) throw ticketError;
      }

      toast({
        title: `Request ${status}`,
        description: `The change request has been ${status}.`,
      });

      setReviewNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error reviewing request:', error);
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-500", icon: Clock },
      approved: { color: "bg-green-500", icon: CheckCircle2 },
      rejected: { color: "bg-red-500", icon: XCircle },
    };
    
    const variant = variants[status] || { color: "bg-gray-500", icon: Clock };
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Change Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No change requests</p>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Pending Requests ({pendingRequests.length})</h3>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {request.event_tickets?.participant_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Ticket #{request.event_tickets?.ticket_number}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Field:</p>
                            <p className="font-medium capitalize">{request.change_type}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Requested:</p>
                            <p className="text-xs">{new Date(request.created_at).toLocaleString('id-ID')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Old:</p>
                            <p className="font-medium">{request.old_value || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">New:</p>
                            <p className="font-medium">{request.new_value}</p>
                          </div>
                        </div>

                        <div className="text-sm">
                          <p className="text-muted-foreground">Reason:</p>
                          <p>{request.reason}</p>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review Request
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Change Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-semibold mb-2">Change Summary</p>
                                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                                  <p><strong>Field:</strong> {request.change_type}</p>
                                  <p><strong>Old Value:</strong> {request.old_value || 'N/A'}</p>
                                  <p><strong>New Value:</strong> {request.new_value}</p>
                                  <p><strong>Reason:</strong> {request.reason}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Review Notes (Optional)</Label>
                                <Textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Add any notes about your decision..."
                                  rows={3}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleReview(request.id, 'approved')}
                                  disabled={processing === request.id}
                                  className="flex-1"
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleReview(request.id, 'rejected')}
                                  disabled={processing === request.id}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {requests.filter(r => r.status !== 'pending').length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Request History</h3>
                <div className="space-y-2">
                  {requests.filter(r => r.status !== 'pending').map((request) => (
                    <Card key={request.id} className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{request.event_tickets?.participant_name}</p>
                          <p className="text-muted-foreground">
                            {request.change_type}: {request.old_value} → {request.new_value}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
