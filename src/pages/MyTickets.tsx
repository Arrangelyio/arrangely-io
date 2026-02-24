import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Calendar, MapPin, Mail, Phone, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketChangeRequests from "@/components/events/TicketChangeRequests";
import QRCode from "qrcode";

export default function MyTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTicketsAndPayments();
  }, []);

  const fetchTicketsAndPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_tickets')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location,
            image_url
          ),
          event_payments:payment_id (
            id,
            amount,
            discount_code_id,
            original_amount,
            midtrans_order_id,
            payment_method,
            paid_at,
            discount_codes:discount_code_id (code)
          )
        `)
        .eq('buyer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Generate QR codes for tickets
      const ticketsWithQR = await Promise.all((ticketsData || []).map(async (ticket) => {
        if (!ticket.qr_code_data && ticket.status === 'paid') {
          const qrData = `${window.location.origin}/event/checkin/${ticket.ticket_number}`;
          const qrCodeDataUrl = await QRCode.toDataURL(qrData);
          
          // Update ticket with QR code
          await supabase
            .from('event_tickets')
            .update({ qr_code_data: qrCodeDataUrl })
            .eq('id', ticket.id);
          
          return { ...ticket, qr_code_data: qrCodeDataUrl };
        }
        return ticket;
      }));

      setTickets(ticketsWithQR);

      // Fetch payments with aggregated ticket info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('event_payments')
        .select(`
          *,
          events:event_id (
            id,
            title,
            date,
            location
          ),
          discount_codes:discount_code_id (code)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (qrCode: string, ticketNumber: string) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `ticket-${ticketNumber}.png`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      paid: "bg-green-500",
      pending: "bg-yellow-500",
      expired: "bg-red-500",
      checked_in: "bg-blue-500",
    };
    return <Badge className={variants[status] || "bg-gray-500"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
            <p className="text-muted-foreground">
              View and manage your event tickets and invoices
            </p>
          </div>

          <Tabs defaultValue="tickets" className="space-y-6">
            <TabsList>
              <TabsTrigger value="tickets">My Tickets ({tickets.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-4">
              {tickets.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No tickets found</p>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id} className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {ticket.events?.image_url && (
                        <img 
                          src={ticket.events.image_url} 
                          alt={ticket.events?.title}
                          className="w-full md:w-48 h-32 object-cover rounded-lg"
                        />
                      )}
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold">{ticket.events?.title}</h3>
                            <p className="text-sm text-muted-foreground">Ticket #{ticket.ticket_number}</p>
                          </div>
                          {getStatusBadge(ticket.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(ticket.events?.date).toLocaleDateString('id-ID', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {ticket.events?.location}
                          </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <p className="font-semibold">Participant Information:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              {ticket.participant_name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {ticket.participant_phone}
                            </div>
                          </div>
                        </div>

                        {ticket.status === 'paid' && ticket.qr_code_data && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => downloadQRCode(ticket.qr_code_data, ticket.ticket_number)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download QR
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              Request Change
                            </Button>
                          </div>
                        )}
                      </div>

                      {ticket.status === 'paid' && ticket.qr_code_data && (
                        <div className="flex flex-col items-center gap-2">
                          <img src={ticket.qr_code_data} alt="QR Code" className="w-32 h-32" />
                          <p className="text-xs text-muted-foreground">Scan at entrance</p>
                        </div>
                      )}
                    </div>

                    {selectedTicket?.id === ticket.id && (
                      <div className="mt-6 pt-6 border-t">
                        <TicketChangeRequests
                          ticketId={ticket.id}
                          currentData={{
                            participant_name: ticket.participant_name,
                            participant_email: ticket.participant_email,
                            participant_phone: ticket.participant_phone,
                            participant_ktp: ticket.participant_ktp,
                          }}
                          onUpdate={fetchTicketsAndPayments}
                        />
                      </div>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              {payments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No invoices found</p>
                </Card>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id} className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold">{payment.events?.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Invoice #{payment.midtrans_order_id}
                          </p>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tickets</p>
                          <p className="font-semibold">{payment.ticket_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">Rp {payment.amount.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Date</p>
                          <p className="font-semibold">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Method</p>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4" />
                            <p className="font-semibold">{payment.payment_method || 'Pending'}</p>
                          </div>
                        </div>
                      </div>

                      {payment.discount_codes && (
                        <div className="border-t pt-3">
                          <p className="text-sm">
                            Discount code applied: <Badge variant="outline">{payment.discount_codes.code}</Badge>
                          </p>
                          {payment.original_amount && (
                            <p className="text-sm text-muted-foreground">
                              Original amount: Rp {payment.original_amount.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
