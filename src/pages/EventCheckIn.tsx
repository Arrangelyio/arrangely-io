import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, User, Mail, Phone, ArrowLeft } from "lucide-react";

export default function EventCheckIn() {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useState(() => {
    loadTicket();
  });

  const loadTicket = async () => {
    if (!ticketNumber) return;

    try {
      // First try event_tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from('event_tickets')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location
          )
        `)
        .eq('ticket_number', ticketNumber.toUpperCase())
        .single();

      if (!ticketError && ticketData) {
        setTicket(ticketData);
        setLoading(false);
        return;
      }

      // If not found in event_tickets, try event_registrations (legacy support)
      const { data: regData, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location
          )
        `)
        .or(`qr_code.eq.${ticketNumber},booking_id.eq.${ticketNumber.toUpperCase()}`)
        .single();

      if (regError) throw regError;
      setTicket(regData);
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      toast({
        title: "Ticket not found",
        description: "Please check the ticket number and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticket) return;

    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if this is event_tickets or event_registrations
      const isEventTicket = 'ticket_number' in ticket;
      
      if (isEventTicket) {
        const { error } = await supabase
          .from('event_tickets')
          .update({
            status: 'checked_in',
            checked_in_at: new Date().toISOString(),
            checked_in_by: user?.id,
          })
          .eq('id', ticket.id);

        if (error) throw error;

        toast({
          title: "Check-in successful!",
          description: `${ticket.participant_name} has been checked in.`,
        });

        setTicket({ ...ticket, status: 'checked_in', checked_in_at: new Date().toISOString() });
      } else {
        // Legacy event_registrations
        const { error } = await supabase
          .from('event_registrations')
          .update({
            status: 'confirmed',
            check_in_time: new Date().toISOString(),
          })
          .eq('id', ticket.id);

        if (error) throw error;

        toast({
          title: "Check-in successful!",
          description: `${ticket.attendee_name} has been checked in.`,
        });

        setTicket({ ...ticket, status: 'confirmed', check_in_time: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string; icon: any }> = {
      paid: { color: "bg-green-500", label: "Valid", icon: CheckCircle2 },
      pending: { color: "bg-yellow-500", label: "Pending Payment", icon: XCircle },
      expired: { color: "bg-red-500", label: "Expired", icon: XCircle },
      checked_in: { color: "bg-blue-500", label: "Already Checked In", icon: CheckCircle2 },
    };
    
    const variant = variants[status] || { color: "bg-gray-500", label: status, icon: XCircle };
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {variant.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The ticket number you're looking for doesn't exist or is invalid.
          </p>
          <Button onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        </Card>
      </div>
    );
  }

  const canCheckIn = (ticket?.status === 'paid' || ticket?.status === 'confirmed') && 
                     !ticket?.checked_in_at && !ticket?.check_in_time;

  return (
    <div className="min-h-screen bg-background pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Event Check-In</h1>
            <p className="text-muted-foreground">Ticket Verification</p>
          </div>

          <div className="space-y-6">
            {/* Event Info */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold mb-2">{ticket.events?.title}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(ticket.events?.date).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-muted-foreground">{ticket.events?.location}</p>
            </div>

            {/* Ticket Status */}
            <div className="flex items-center justify-between">
              <span className="font-semibold">Ticket Status:</span>
              {getStatusBadge(ticket.status)}
            </div>

            {/* Ticket Number */}
            <div>
              <span className="text-sm text-muted-foreground">
                {'ticket_number' in ticket ? 'Ticket Number' : 'Booking ID'}
              </span>
              <p className="font-mono font-bold text-lg">
                {'ticket_number' in ticket ? ticket.ticket_number : ticket.booking_id}
              </p>
            </div>

            {/* Participant Info */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold mb-3">Participant Information</h3>
              
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">
                    {'ticket_number' in ticket ? ticket.participant_name : ticket.attendee_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">
                    {'ticket_number' in ticket ? ticket.participant_email : ticket.attendee_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">
                    {'ticket_number' in ticket ? ticket.participant_phone : ticket.attendee_phone}
                  </p>
                </div>
              </div>

              {ticket.participant_ktp && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number (KTP)</p>
                    <p className="font-semibold">{ticket.participant_ktp}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Check-in Info */}
            {(ticket.checked_in_at || ticket.check_in_time) && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Checked in at</p>
                <p className="font-semibold">
                  {new Date(ticket.checked_in_at || ticket.check_in_time).toLocaleString('id-ID')}
                </p>
              </div>
            )}

            {/* Check-in Button */}
            {canCheckIn ? (
              <Button 
                onClick={handleCheckIn} 
                disabled={checking}
                className="w-full"
                size="lg"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Check In Now
                  </>
                )}
              </Button>
            ) : ticket.status === 'pending' ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold">Payment Pending</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This ticket cannot be checked in until payment is completed.
                </p>
              </div>
            ) : ticket.status === 'checked_in' ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="font-semibold">Already Checked In</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This ticket has already been used for check-in.
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
