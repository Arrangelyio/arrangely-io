import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Star } from "lucide-react";

interface EventAttendeeListProps {
  eventId: string;
}

export function EventAttendeeList({ eventId }: EventAttendeeListProps) {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          event_attendee_profiles (*)
        `)
        .eq("event_id", eventId)
        .eq("show_in_attendee_list", true)
        .order("attendee_name");

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

  if (loading) {
    return <div className="text-center py-8">Loading attendees...</div>;
  }

  if (attendees.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No attendees have opted to share their information yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {attendees.map((attendee) => (
        <Card key={attendee.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {attendee.profiles?.display_name?.[0]?.toUpperCase() || 
                   attendee.attendee_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">
                    {attendee.profiles?.display_name || attendee.attendee_name}
                  </p>
                  {attendee.is_vip && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {attendee.event_attendee_profiles?.[0] && (
                  <>
                    {attendee.event_attendee_profiles[0].job_title && (
                      <p className="text-sm text-muted-foreground truncate">
                        {attendee.event_attendee_profiles[0].job_title}
                      </p>
                    )}
                    {attendee.event_attendee_profiles[0].company && (
                      <p className="text-sm text-muted-foreground truncate">
                        {attendee.event_attendee_profiles[0].company}
                      </p>
                    )}
                    {attendee.event_attendee_profiles[0].interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {attendee.event_attendee_profiles[0].interests.slice(0, 3).map((interest: string) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
