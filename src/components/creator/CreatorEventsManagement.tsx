import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar } from "lucide-react";
import { OrganizerEventsList } from "@/components/organizer/OrganizerEventsList";
import { OrganizerEventDetails } from "@/components/organizer/OrganizerEventDetails";
import { CreateEventDialog } from "@/components/organizer/CreateEventDialog";

export function CreatorEventsManagement() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchCreatorEvents();
  }, []);

  const fetchCreatorEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
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

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    fetchCreatorEvents();
    toast({
      title: "Event Created",
      description: "Your event has been submitted for admin approval.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">My Events</h2>
          <p className="text-muted-foreground mt-1">
            Manage your events, attendees, and ushers
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {selectedEvent ? (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => setSelectedEvent(null)}
            className="mb-4"
          >
            ← Back to Events
          </Button>
          <OrganizerEventDetails
            event={selectedEvent}
            onUpdate={fetchCreatorEvents}
          />
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">
              <Calendar className="mr-2 h-4 w-4" />
              All Events
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <OrganizerEventsList
              events={events}
              onSelectEvent={setSelectedEvent}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <OrganizerEventsList
              events={events.filter((e) => e.status === "active")}
              onSelectEvent={setSelectedEvent}
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <OrganizerEventsList
              events={events.filter((e) => e.status === "pending")}
              onSelectEvent={setSelectedEvent}
            />
          </TabsContent>
        </Tabs>
      )}

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleEventCreated}
      />
    </div>
  );
}
