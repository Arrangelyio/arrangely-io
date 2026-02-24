import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, MessageSquare, Image, Award, ClipboardList } from "lucide-react";
import { EventCommunityFeed } from "@/components/events/community/EventCommunityFeed";
import { EventAttendeeList } from "@/components/events/networking/EventAttendeeList";
import { EventNetworkingPanel } from "@/components/events/networking/EventNetworkingPanel";
import { EventMediaManager } from "@/components/events/post-engagement/EventMediaManager";
import { AttendeeCertificates } from "@/components/events/attendee/AttendeeCertificates";
import { AttendeeSurvey } from "@/components/events/attendee/AttendeeSurvey";

export default function EventAttendeeHub() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);

  useEffect(() => {
    fetchEventAndRegistration();
  }, [eventId]);

  const fetchEventAndRegistration = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate("/auth");
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: regData, error: regError } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (regError) throw regError;
      setRegistration(regData);

      if (!regData) {
        toast({
          title: "Not Registered",
          description: "You need to register for this event first",
          variant: "destructive",
        });
        navigate(`/events/${eventId}`);
      }
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!event || !registration) {
    return <div className="flex items-center justify-center min-h-screen">Event not found</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate(`/events/${eventId}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Event
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <p className="text-muted-foreground">Attendee Hub - Connect with other attendees</p>
      </div>

      <Tabs defaultValue="community" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="community">
            <MessageSquare className="mr-2 h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="survey">
            <ClipboardList className="mr-2 h-4 w-4" />
            Survey
          </TabsTrigger>
          <TabsTrigger value="media">
            <Image className="mr-2 h-4 w-4" />
            Media
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <Award className="mr-2 h-4 w-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="networking">
            <Users className="mr-2 h-4 w-4" />
            Networking
          </TabsTrigger>
          <TabsTrigger value="attendees">
            <Users className="mr-2 h-4 w-4" />
            Attendees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-4">
          <EventCommunityFeed eventId={eventId!} />
        </TabsContent>

        <TabsContent value="survey" className="space-y-4">
          <AttendeeSurvey eventId={eventId!} registrationId={registration.id} />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <EventMediaManager eventId={eventId!} isOrganizer={false} />
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <AttendeeCertificates eventId={eventId!} userId={registration.user_id} />
        </TabsContent>

        <TabsContent value="networking" className="space-y-4">
          <EventNetworkingPanel eventId={eventId!} registrationId={registration.id} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-4">
          <EventAttendeeList eventId={eventId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
