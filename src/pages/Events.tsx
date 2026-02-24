import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Ticket,
  Settings,
  ReceiptText,
} from "lucide-react";
import MyTicketsSection from "@/components/events/MyTicketsSection";
import EventTransactionSection from "@/components/events/EventTransactionSection";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Capacitor } from "@capacitor/core";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  banner_image_url?: string;
  date: string;
  start_time: string;
  end_time?: string;
  location: string;
  address?: string;
  price: number;
  max_capacity?: number;
  current_registrations: number;
  speaker_name?: string;
  speaker_bio?: string;
  speaker_image_url?: string;
  status: string;
  show_spots_left: boolean;
  organizer_name?: string;
  organizer_icon?: string;
}

export default function Events() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const navigate = useNavigate();
  const { user } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "events";
  const [activeTab, setActiveTab] = useState(tabParam);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }); // Update URL param tanpa kehilangan route
  };

  const formatEventDate = (date: string, startTime: string) => {
    try {
      const eventDate = new Date(date);
      const [hours, minutes] = startTime.split(":");
      eventDate.setHours(parseInt(hours), parseInt(minutes));
      return format(eventDate, "EEEE, MMMM d, yyyy • h:mm a");
    } catch {
      return `${date} • ${startTime}`;
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          event_ticket_types!inner (
            event_ticket_categories (
              price
            )
          )
        `
        )
        .eq("status", "active")
        .eq("visibility", "public")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;

      // Calculate lowest price for each event
      const eventsWithPrice = (data || []).map((event) => {
        const prices = event.event_ticket_types
          ?.flatMap(
            (type) =>
              type.event_ticket_categories?.map((cat) => cat.price) || []
          )
          .filter((price) => price != null);
        const lowestPrice =
          prices && prices.length > 0 ? Math.min(...prices) : 0;
        return { ...event, price: lowestPrice };
      });

      setEvents(eventsWithPrice);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    checkEventOwnership();
  }, [user]);

  const checkEventOwnership = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", user.id)
        .limit(1);

      if (error) throw error;
      setIsEventOwner(data && data.length > 0);
    } catch (error) {
      console.error("Error checking event ownership:", error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isFullyBooked = (event: Event) => {
    return (
      event.max_capacity && event.current_registrations >= event.max_capacity
    );
  };

  const getSpotsLeft = (event: Event) => {
    if (!event.max_capacity) return null;
    return event.max_capacity - event.current_registrations;
  };

  return (
    <div
          className={`min-h-screen bg-gradient-sanctuary pb-10 px-1 sm:px-1 
            ${Capacitor.isNativePlatform() ? "pt-24" : "pt-5"}
        `}
        >
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {/* Events & Tickets */}
            {t("events.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {/* Discover upcoming events and manage your tickets all in one place */}
            {t("events.subtitle")}
          </p>
          {/* {isEventOwner && (
            <div className="mt-6">
              <Button
                onClick={() => navigate("/organizer/events")}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage My Events
              </Button>
            </div>
          )} */}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="events" className="flex items-center gap-2">
              {/* <CalendarDays className="h-4 w-4" /> */}
              {/* Browse Events */}
              {t("events.browseEvents")}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              {/* <Ticket className="h-4 w-4" /> */}
              {/* My Tickets */}
              {t("events.myTickets")}
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2"
            >
              {/* <ReceiptText className="h-4 w-4" /> */}
              {t("events.history")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-64"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Upcoming Events
                </h3>
                <p className="text-muted-foreground">
                  Check back soon for exciting events and workshops!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {events.map((event) => {
                  const eventDate = new Date(event.date.replace(/-/g, "/"));
                  const spotsLeft = getSpotsLeft(event);

                  return (
                    <div
                      key={event.id}
                      onClick={() =>
                        navigate(`/events/${event.id}/${event.slug}`)
                      }
                      className="group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                    >
                      {/* 🖼️ Event Banner */}
                      <div className="relative">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={event.banner_image_url || "/placeholder.svg"}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* 📅 Date Badge */}
                          <div className="absolute top-4 left-4">
                            <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 text-center shadow-md min-w-[60px]">
                              <div className="text-xs font-medium text-muted-foreground uppercase">
                                {eventDate.toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                              </div>
                              <div className="text-xl font-bold text-primary">
                                {eventDate.getDate()}
                              </div>
                            </div>
                          </div>

                          {/* 🔖 Badges (Free / Almost Full / Sold Out) */}
                          <div className="absolute top-4 right-4 flex flex-col gap-2">
                            {event.price === 0 && (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold">
                                FREE
                              </Badge>
                            )}
                          </div>

                          {/* 🧾 Event Title Overlay */}
                        </div>
                      </div>

                      {/* 📋 Event Info */}
                      <div className="p-6 space-y-3">
                        <h3 className="text-black font-bold text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                        {/* ⏰ Time */}
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">
                            {formatEventDate(event.date, event.start_time)}
                          </span>
                        </div>

                        {/* 📍 Location */}
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm line-clamp-1">
                            {event.location}
                          </span>
                        </div>

                        {/* 👥 Spots Left + 💰 Price */}
                        <div className="flex items-center justify-between mt-4">
                          {event.show_spots_left && spotsLeft !== null ? (
                            <div className="flex items-center text-muted-foreground text-sm">
                              <Users className="h-4 w-4 mr-2" />
                              {spotsLeft} {t("eventsHome.spot")}
                            </div>
                          ) : (
                            <div />
                          )}

                          <div className="text-right">
                            <div className="text-xs text-gray-400 leading-tight">
                              From
                            </div>
                            <div className="text-xl font-bold text-primary">
                              {event.price === 0
                                ? t("events.free")
                                : `Rp ${event.price.toLocaleString("id-ID")}`}
                            </div>
                          </div>
                        </div>

                        {/* Organizer Info */}
                        {(event.organizer_icon || event.organizer_name) && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            {event.organizer_icon && (
                              <img
                                src={event.organizer_icon}
                                alt={event.organizer_name || "Organizer"}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            {event.organizer_name && (
                              <span className="text-sm text-muted-foreground">
                                {event.organizer_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="tickets">
            <MyTicketsSection />
          </TabsContent>
          <TabsContent value="transactions">
            <EventTransactionSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
