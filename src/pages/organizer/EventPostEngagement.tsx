import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Award, Image, MessageSquare, Users } from "lucide-react";
import { EventMediaManager } from "@/components/events/post-engagement/EventMediaManager";
import { EventSurveyManager } from "@/components/events/post-engagement/EventSurveyManager";
import { EventCertificateManager } from "@/components/events/post-engagement/EventCertificateManager";
import { EventCommunityFeed } from "@/components/events/community/EventCommunityFeed";

export default function EventPostEngagement() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttendees: 0,
    checkedIn: 0,
    surveysCompleted: 0,
    certificatesGenerated: 0,
  });

  useEffect(() => {
    fetchEventAndStats();
  }, [eventId]);

  const fetchEventAndStats = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("id, check_in_time, survey_completed_at, certificate_generated_at")
        .eq("event_id", eventId);

      if (registrations) {
        setStats({
          totalAttendees: registrations.length,
          checkedIn: registrations.filter((r) => r.check_in_time).length,
          surveysCompleted: registrations.filter((r) => r.survey_completed_at).length,
          certificatesGenerated: registrations.filter((r) => r.certificate_generated_at).length,
        });
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

  if (!event) {
    return <div className="flex items-center justify-center min-h-screen">Event not found</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/organizer/events")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Events
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <p className="text-muted-foreground">Post-Event Engagement Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedIn}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAttendees > 0
                ? `${Math.round((stats.checkedIn / stats.totalAttendees) * 100)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surveys Completed</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.surveysCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.checkedIn > 0
                ? `${Math.round((stats.surveysCompleted / stats.checkedIn) * 100)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Generated</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificatesGenerated}</div>
            <p className="text-xs text-muted-foreground">
              {stats.checkedIn > 0
                ? `${Math.round((stats.certificatesGenerated / stats.checkedIn) * 100)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="certificates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">
            <Award className="mr-2 h-4 w-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="media">
            <Image className="mr-2 h-4 w-4" />
            Media Recap
          </TabsTrigger>
          <TabsTrigger value="survey">
            <MessageSquare className="mr-2 h-4 w-4" />
            Survey
          </TabsTrigger>
          <TabsTrigger value="community">
            <Users className="mr-2 h-4 w-4" />
            Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          <EventCertificateManager eventId={eventId!} />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <EventMediaManager eventId={eventId!} />
        </TabsContent>

        <TabsContent value="survey" className="space-y-4">
          <EventSurveyManager eventId={eventId!} onUpdate={fetchEventAndStats} />
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          <EventCommunityFeed eventId={eventId!} isOrganizer={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
