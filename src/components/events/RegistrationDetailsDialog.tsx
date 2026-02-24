import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, CheckCircle, XCircle, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RegistrationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  registrationData: {
    booking_id: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone?: string;
    registration_date: string;
    amount_paid: number;
  };
}

interface EventTicket {
  id: string;
  checked_in_at: string | null;
  created_at: string;
  ticket_category_id: string;
  event_ticket_categories: {
    name: string;
    price: number;
  };
}

export function RegistrationDetailsDialog({
  open,
  onOpenChange,
  registrationId,
  registrationData,
}: RegistrationDetailsDialogProps) {
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && registrationId) {
      fetchTickets();
    }
  }, [open, registrationId]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("event_tickets")
        .select(
          `
          id,
          checked_in_at,
          created_at,
          ticket_category_id,
          event_ticket_categories (
            name,
            price
          )
        `
        )
        .eq("registration_id", registrationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const checkedInCount = tickets.filter((t) => t.checked_in_at).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Registration Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Registration Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Booking ID</p>
                <p className="font-medium">{registrationData.booking_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Attendee Name</p>
                <p className="font-medium">{registrationData.attendee_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{registrationData.attendee_email}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Phone</p>
                <p className="font-medium">{registrationData.attendee_phone || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Registration Date</p>
                <p className="font-medium">
                  {format(new Date(registrationData.registration_date), "PPp")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Amount Paid</p>
                <p className="font-medium">
                  Rp {registrationData.amount_paid.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  Tickets ({tickets.length} total, {checkedInCount} checked in)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tickets found for this registration</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Ticket Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Check-in Status</TableHead>
                      <TableHead>Check-in Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket, index) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            {ticket.event_ticket_categories?.name || "Unknown Category"}
                          </div>
                        </TableCell>
                        <TableCell>
                          Rp {(ticket.event_ticket_categories?.price || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {ticket.checked_in_at ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Checked In
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {ticket.checked_in_at ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {format(new Date(ticket.checked_in_at), "PPp")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(ticket.checked_in_at), "HH:mm:ss")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
