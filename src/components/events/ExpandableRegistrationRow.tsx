import { useState, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Ticket } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface EventTicket {
  id: string;
  checked_in_at: string | null;
  created_at: string;
  ticket_category_id: string;
  ticket_number: string;
  event_ticket_categories: {
    name: string;
    price: number;
  };
}

interface Registration {
  id: string;
  booking_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  payment_status: string;
  status: string;
  check_in_time?: string;
  registration_date: string;
  amount_paid: number;
  is_vip?: boolean;
}

interface ExpandableRegistrationRowProps {
  registration: Registration;
  tickets: EventTicket[];
  attendeeSubscription?: any;
  onToggleVIP?: (reg: Registration) => void;
  onManualCheckIn?: (reg: Registration) => void;
  onGiftReward?: (reg: Registration) => void;
  showSubscription?: boolean;
}

export function ExpandableRegistrationRow({
  registration,
  tickets,
  attendeeSubscription,
  onToggleVIP,
  onManualCheckIn,
  onGiftReward,
  showSubscription = true,
}: ExpandableRegistrationRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [checkingInTicketId, setCheckingInTicketId] = useState<string | null>(null);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const checkedInCount = tickets.filter((t) => t.checked_in_at).length;

  const handleTicketCheckIn = async (ticketId: string, isCheckedIn: boolean) => {
    try {
      setCheckingInTicketId(ticketId);

      const localTimestamp = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const { error } = await supabase
        .from("event_tickets")
        .update({
          checked_in_at: isCheckedIn ? null : localTimestamp,
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Trigger a page reload to refresh all data
      window.location.reload();
    } catch (error) {
      console.error("Error updating ticket check-in:", error);
    } finally {
      setCheckingInTicketId(null);
    }
  };

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={handleToggleExpand}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            {registration.booking_id}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {registration.attendee_name}
            {registration.is_vip && (
              <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900">
                VIP
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{registration.attendee_email}</TableCell>
        <TableCell>{registration.attendee_phone || "-"}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onToggleVIP && (
              <>
                <Switch
                  checked={registration.is_vip || false}
                  onCheckedChange={() => onToggleVIP(registration)}
                />
                <span className="text-sm text-muted-foreground">
                  {registration.is_vip ? "VIP" : "Regular"}
                </span>
              </>
            )}
            {!onToggleVIP && (
              <span className="text-sm text-muted-foreground">
                {registration.is_vip ? "VIP" : "Regular"}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant={registration.status === "confirmed" ? "default" : "secondary"}
          >
            {registration.status}
          </Badge>
        </TableCell>
        {/* <TableCell>
          {registration.check_in_time ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <div className="text-sm">
                <div>Checked In</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(registration.check_in_time), "HH:mm")}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center text-muted-foreground">
              <XCircle className="h-4 w-4 mr-1" />
              Not Checked In
            </div>
          )}
        </TableCell> */}
        {showSubscription && (
          <TableCell>
            {attendeeSubscription ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                {attendeeSubscription.plan}
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </TableCell>
        )}
        <TableCell>Rp {registration.amount_paid.toLocaleString()}</TableCell>
        <TableCell>
          {format(new Date(registration.registration_date), "MMM d, yyyy")}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {onGiftReward && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGiftReward(registration)}
                disabled={checkedInCount === 0}
              >
                Gift
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={showSubscription ? 11 : 10} className="bg-muted/30 p-0">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Ticket className="h-4 w-4" />
                Tickets ({tickets.length} total, {checkedInCount} checked in)
              </div>
              
              {tickets.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No tickets found
                </div>
              ) : (
                <div className="grid gap-2">
                  {tickets.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-muted-foreground">
                          {ticket.ticket_number ? `#${ticket.ticket_number}` : `#${index + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {ticket.event_ticket_categories?.name || "Unknown Category"}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          Rp {(ticket.event_ticket_categories?.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {ticket.checked_in_at ? (
                          <>
                            <div className="text-xs text-muted-foreground text-right">
                              <div className="font-medium">
                                {format(new Date(ticket.checked_in_at), "PPp")}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketCheckIn(ticket.id, true)}
                              disabled={checkingInTicketId === ticket.id}
                              className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTicketCheckIn(ticket.id, false)}
                            disabled={checkingInTicketId === ticket.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
