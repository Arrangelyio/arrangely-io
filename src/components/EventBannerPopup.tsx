import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface Event {
  id: string;
  title: string;
  description: string;
  banner_image_url: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  price: number;
  max_capacity: number;
  current_registrations: number;
  speaker_name: string;
  speaker_bio: string;
  slug: string;
}

export const EventBannerPopup = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchActiveEvent = async () => {
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
          .eq("is_production", true)
          .gte("date", new Date().toISOString().split("T")[0])
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching event:", error);
          return;
        }

        if (data) {
          // Calculate lowest price
          const prices = data.event_ticket_types
            ?.flatMap(type => type.event_ticket_categories?.map(cat => cat.price) || [])
            .filter(price => price != null);
          const lowestPrice = prices && prices.length > 0 ? Math.min(...prices) : 0;
          
          setEvent({ ...data, price: lowestPrice });

          // cek localStorage, kalau sudah lebih dari 1 jam baru buka popup
          const lastClosed = localStorage.getItem("event_popup_closed_at");
          const now = Date.now();
          if (!lastClosed || now - parseInt(lastClosed, 10) > 60 * 60 * 1000) {
            setIsOpen(false);
          }
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveEvent();
  }, []);

  const handleClose = () => {
    localStorage.setItem("event_popup_closed_at", Date.now().toString());
    setIsOpen(false);
  };

  const handleRegisterClick = () => {
    if (event) {
      window.open(`/events/${event.id}/${event.slug}`, "_blank");
    }
    handleClose();
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

  if (!event || isLoading) {
    return null;
  }

  const spotsLeft = event.max_capacity
    ? event.max_capacity - event.current_registrations
    : null;
  const isFree = event.price === 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="w-[90vw] max-w-sm md:max-w-4xl p-0 overflow-hidden bg-background border-0 shadow-2xl rounded-lg">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative"
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Banner Image */}
              <div className="relative h-48 sm:h-64 md:h-96 overflow-hidden bg-black">
                <img
                  src={event.banner_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover md:object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent md:from-black/40" />

                <div className="absolute top-3 left-3 flex gap-2">
                  {isFree && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm">
                      FREE EVENT
                    </Badge>
                  )}
                  {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
                    <Badge variant="destructive" className="text-xs sm:text-sm">
                      Only {spotsLeft} spots left!
                    </Badge>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-12">
                  <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-white drop-shadow-lg">
                    {event.title}
                  </h2>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">
                      {formatEventDate(event.date, event.start_time)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">
                      {event.location}
                    </span>
                  </div>

                  {event.end_time && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">
                        {event.start_time} - {event.end_time}
                      </span>
                    </div>
                  )}

                  {event.max_capacity && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">
                        {event.current_registrations}/{event.max_capacity}{" "}
                        registered
                      </span>
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {event.description.length > 200
                      ? `${event.description.substring(0, 200)}...`
                      : event.description}
                  </p>
                )}

                {event.speaker_name && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-1">
                      Featured Speaker: {event.speaker_name}
                    </h4>
                    {event.speaker_bio && (
                      <p className="text-sm text-muted-foreground">
                        {event.speaker_bio.length > 150
                          ? `${event.speaker_bio.substring(0, 150)}...`
                          : event.speaker_bio}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={handleRegisterClick}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-elegant"
                    // size="lg"
                  >
                    {isFree
                      ? "Register for Free"
                      : `Register Now • Rp ${event.price.toLocaleString()}`}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="sm:w-auto"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
