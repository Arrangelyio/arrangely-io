import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, UserCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EventAttendeesTabProps {
  eventId: string;
}

export function EventAttendeesTab({ eventId }: EventAttendeesTabProps) {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from("event_tickets")
        .select(`
          *,
          event_registrations:registration_id (
            booking_id,
            registration_date,
            amount_paid
          ),
          event_ticket_categories:ticket_category_id (
            name,
            event_ticket_types:ticket_type_id (
              name
            )
          )
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttendees(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("event_tickets")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendee checked in successfully",
      });

      fetchAttendees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportAttendees = () => {
    const csv = [
      ["Name", "Email", "Phone", "Ticket Number", "Ticket Type", "Ticket Category", "Status", "Check-in Status", "Registration Date"],
      ...attendees.map((a) => [
        a.participant_name,
        a.participant_email,
        a.participant_phone || "",
        a.ticket_number,
        a.event_ticket_categories?.event_ticket_types?.name || "N/A",
        a.event_ticket_categories?.name || "N/A",
        a.status,
        a.checked_in_at ? "Checked In" : "Not Checked In",
        format(new Date(a.event_registrations?.registration_date || a.created_at), "yyyy-MM-dd HH:mm"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
  };

  if (loading) {
    return <div>Loading attendees...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Attendees ({attendees.length})</CardTitle>
          <Button onClick={exportAttendees} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attendees.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No attendees yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Ticket Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">
                      {attendee.participant_name}
                    </TableCell>
                    <TableCell>{attendee.participant_email}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {attendee.ticket_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {attendee.event_ticket_categories?.event_ticket_types?.name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {attendee.event_ticket_categories?.name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          attendee.status === "paid"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {attendee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attendee.checked_in_at ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(attendee.checked_in_at), "HH:mm")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not checked in
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(attendee.event_registrations?.registration_date || attendee.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {!attendee.checked_in_at && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(attendee.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Check In
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
