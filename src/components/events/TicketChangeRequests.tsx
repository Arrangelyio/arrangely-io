import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";

interface ChangeRequest {
  id: string;
  change_type: 'name' | 'email' | 'phone' | 'ktp';
  old_value: string;
  new_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface TicketChangeRequestsProps {
  ticketId: string;
  currentData: {
    participant_name: string;
    participant_email: string;
    participant_phone: string;
    participant_ktp?: string;
  };
  onUpdate?: () => void;
}

export default function TicketChangeRequests({ ticketId, currentData, onUpdate }: TicketChangeRequestsProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  // Form state
  const [changeType, setChangeType] = useState<'name' | 'email' | 'phone' | 'ktp'>('name');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [ticketId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_ticket_change_requests')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newValue.trim() || !reason.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const oldValue = currentData[`participant_${changeType}` as keyof typeof currentData] || '';

      const { error } = await supabase
        .from('event_ticket_change_requests')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          change_type: changeType,
          old_value: oldValue,
          new_value: newValue,
          reason: reason,
          is_production: true,
        });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "Your change request has been submitted for review.",
      });

      setOpen(false);
      setNewValue('');
      setReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  const getFieldLabel = (type: string) => {
    const labels: Record<string, string> = {
      name: "Name",
      email: "Email",
      phone: "Phone Number",
      ktp: "ID Number (KTP)",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Change Requests</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Send className="w-4 h-4 mr-2" />
              Request Change
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Ticket Information Change</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Field to Change</Label>
                <Select value={changeType} onValueChange={(v: any) => setChangeType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
                    <SelectItem value="ktp">ID Number (KTP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Value</Label>
                <Input
                  value={currentData[`participant_${changeType}` as keyof typeof currentData] || 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>New Value *</Label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={`Enter new ${getFieldLabel(changeType).toLowerCase()}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Reason for Change *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need to change this information"
                  rows={3}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No change requests yet
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{getFieldLabel(request.change_type)}</span>
                  {getStatusBadge(request.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Old Value:</p>
                    <p className="font-medium">{request.old_value || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New Value:</p>
                    <p className="font-medium">{request.new_value}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Reason:</p>
                  <p>{request.reason}</p>
                </div>

                {request.review_notes && (
                  <div className="text-sm border-t pt-3">
                    <p className="text-muted-foreground">Review Notes:</p>
                    <p>{request.review_notes}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Submitted: {new Date(request.created_at).toLocaleString('id-ID')}
                  {request.reviewed_at && (
                    <> • Reviewed: {new Date(request.reviewed_at).toLocaleString('id-ID')}</>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
