import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, QrCode } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface EventUshersTabProps {
  eventId: string;
}

export function EventUshersTab({ eventId }: EventUshersTabProps) {
  const { toast } = useToast();
  const [ushers, setUshers] = useState<any[]>([]);
  const [registeredAttendees, setRegisteredAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchUshers();
    fetchRegisteredAttendees();
  }, [eventId]);

  const fetchRegisteredAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id,
          user_id,
          attendee_name,
          attendee_email,
          status
        `)
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if (error) throw error;
      
      // Filter out attendees who are already ushers
      const usherUserIds = ushers.map(u => u.user_id);
      const availableAttendees = (data || []).filter(
        attendee => !usherUserIds.includes(attendee.user_id)
      );
      
      setRegisteredAttendees(availableAttendees);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchUshers = async () => {
    try {
      const { data, error } = await supabase
        .from("event_ushers_with_profiles")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;

      setUshers(data || []);

      // Refresh available attendees setelah fetch ushers
      await fetchRegisteredAttendees();
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


  const handleAddUsher = async () => {
    if (!selectedAttendeeId) {
      toast({
        title: "Error",
        description: "Please select an attendee",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);

    try {
      const selectedAttendee = registeredAttendees.find(
        a => a.id === selectedAttendeeId
      );

      if (!selectedAttendee) {
        toast({
          title: "Error",
          description: "Selected attendee not found",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("event_ushers").insert({
        event_id: eventId,
        user_id: selectedAttendee.user_id,
        assigned_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Error",
            description: "This user is already an usher for this event",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Usher added successfully",
      });
      setSelectedAttendeeId("");
      fetchUshers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUsher = async (usherId: string) => {
    try {
      const { error } = await supabase
        .from("event_ushers")
        .delete()
        .eq("id", usherId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Usher removed successfully",
      });
      fetchUshers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading ushers...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Ushers ({ushers.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Select
            value={selectedAttendeeId}
            onValueChange={setSelectedAttendeeId}
            disabled={registeredAttendees.length === 0}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={
                registeredAttendees.length === 0 
                  ? "No registered attendees available" 
                  : "Select a registered attendee"
              } />
            </SelectTrigger>
            <SelectContent>
              {registeredAttendees.map((attendee) => (
                <SelectItem key={attendee.id} value={attendee.id}>
                  {attendee.attendee_name} ({attendee.attendee_email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddUsher} 
            disabled={adding || !selectedAttendeeId || registeredAttendees.length === 0}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Usher
          </Button>
        </div>

        {ushers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No ushers assigned yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ushers.map((usher) => (
                <TableRow key={usher.id}>
                  <TableCell className="font-medium">
                    {usher?.display_name || "Unknown User"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(usher.assigned_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to check-in page with usher role
                          window.location.href = `/events/${eventId}/check-in?role=usher`;
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Check-in
                      </Button> */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUsher(usher.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
