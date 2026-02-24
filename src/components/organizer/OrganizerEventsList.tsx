import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, QrCode } from "lucide-react";
import { format } from "date-fns";
import { UnifiedQRCheckinDialog } from "@/components/events/UnifiedQRCheckinDialog";
import NativeQRScanner from "@/components/events/NativeQRScanner";
import { useState } from "react";
import { useCapacitor } from "@/hooks/useCapacitor";

interface OrganizerEventsListProps {
  events: any[];
  onSelectEvent: (event: any) => void;
}

export function OrganizerEventsList({ events, onSelectEvent }: OrganizerEventsListProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { isNative } = useCapacitor();


  const openScanner = (eventId: string) => {
    setSelectedEventId(eventId);
    setScannerOpen(true);
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No events found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Card key={event.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{event.title}</CardTitle>
              <Badge
                variant={
                  event.status === "active"
                    ? "default"
                    : event.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {event.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(event.date), "MMMM d, yyyy")} at {event.start_time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  {event.current_registrations || 0}
                  {event.max_capacity ? ` / ${event.max_capacity}` : ""} registered
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onSelectEvent(event)} className="flex-1">
                Manage Event
              </Button>
              {isNative ? (
                <div className="flex-1">
                  <NativeQRScanner 
                    eventId={event.id}
                    onSuccess={() => {
                      // Refresh or update UI
                    }}
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openScanner(event.id)}
                  title="QR Check-in"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      <UnifiedQRCheckinDialog
        eventId={selectedEventId || ""}
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSuccess={() => {
          // Optionally refresh events data
        }}
      />
    </div>
  );
}
