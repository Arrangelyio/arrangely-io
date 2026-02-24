import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  banner_image_url: string;
  max_capacity: number;
  current_registrations: number;
  price: number;
  status: string;
  slug: string;
  show_spots_left: boolean;
  organizer_name?: string;
  organizer_icon?: string;
}

const EventsSection = () => {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          event_ticket_types!inner (
            event_ticket_categories (
              price
            )
          )
        `)
        .eq("status", "active")
        .eq("visibility", "public")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(4);

      if (error) throw error;
      
      // Calculate lowest price for each event
      const eventsWithPrice = (data || []).map(event => {
        const prices = event.event_ticket_types
          ?.flatMap(type => type.event_ticket_categories?.map(cat => cat.price) || [])
          .filter(price => price != null);
        const lowestPrice = prices && prices.length > 0 ? Math.min(...prices) : 0;
        return { ...event, price: lowestPrice };
      });
      
      setEvents(eventsWithPrice);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (date: string, startTime: string) => {
    try {
      const eventDate = new Date(date);
      const [hours, minutes] = startTime.split(":");
      eventDate.setHours(parseInt(hours), parseInt(minutes));
      return format(eventDate, "EEE, MMM d • h:mm a");
    } catch {
      return `${date} • ${startTime}`;
    }
  };

  const getSpotsLeft = (event: Event) => {
    if (!event.max_capacity) return null;
    return event.max_capacity - event.current_registrations;
  };

  if (loading || events.length === 0) return null;

  return (
    <div className="pl-6 pr-4 py-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{t("eventsHome.heading")}</h2>
        </div>
        <Link to="/events">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
            {t("eventsHome.buttonAll")}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Compact Events Grid - 4 cards on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {events.map((event) => {
          const eventDate = new Date(event.date.replace(/-/g, "/"));
          const spotsLeft = getSpotsLeft(event);

          return (
            <div
              key={event.id}
              onClick={() => navigate(`/events/${event.id}/${event.slug}`)}
              className="group cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Compact Banner - 16:10 aspect */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={event.banner_image_url || "/placeholder.svg"}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Date Badge - Compact */}
                <div className="absolute top-2 left-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-center shadow-sm">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase leading-none">
                      {eventDate.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-base font-bold text-primary leading-tight">
                      {eventDate.getDate()}
                    </div>
                  </div>
                </div>

                {/* Price/Free Badge */}
                <div className="absolute top-2 right-2">
                  {event.price === 0 ? (
                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 h-5">
                      FREE
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 h-5">
                      Rp{(event.price / 1000).toFixed(0)}k
                    </Badge>
                  )}
                </div>
              </div>

              {/* Compact Event Info */}
              <div className="p-3 space-y-1.5">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                  {event.title}
                </h3>

                {/* Time - Compact */}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="text-[11px] truncate">
                    {formatEventDate(event.date, event.start_time)}
                  </span>
                </div>

                {/* Location - Compact */}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="text-[11px] line-clamp-1">{event.location}</span>
                </div>

                {/* Spots Left - Only if enabled */}
                {event.show_spots_left && spotsLeft !== null && (
                  <div className="flex items-center text-muted-foreground text-[11px] pt-1">
                    <Users className="h-3 w-3 mr-1" />
                    {spotsLeft} {t("eventsHome.spot")}
                  </div>
                )}

                {/* Organizer - Minimal */}
                {event.organizer_name && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    {event.organizer_icon && (
                      <img
                        src={event.organizer_icon}
                        alt={event.organizer_name}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">
                      {event.organizer_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventsSection;
