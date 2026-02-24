import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Helmet } from "react-helmet-async";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  User,
  CreditCard,
  Mail,
  Phone,
  QrCode,
  Music,
  ListMusic,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { RegistrationModal } from "@/components/events/RegistrationModal";
import { UnifiedQRCheckinDialog } from "@/components/events/UnifiedQRCheckinDialog";
import EventRegistrationDialog from "@/components/events/EventRegistrationDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storeIntendedUrl } from "@/utils/redirectUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { PromoNewsCarousel } from "@/components/events/PromoNewsCarousel";
import { SetlistSongCards } from "@/components/events/SetlistSongCards";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketSelectionFlow } from "@/components/events/TicketSelectionFlow";
import { EventTicketsTab } from "@/components/events/EventTicketsTab";

interface Event {
  id: string;
  title: string;
  description: string;
  banner_image_url?: string;
  date: string;
  start_time: string;
  end_time?: string;
  location: string;
  address?: string;
  google_maps_link?: string;
  price: number;
  max_capacity?: number;
  current_registrations: number;
  registration_deadline?: string;
  allow_cancellation: boolean;
  cancellation_deadline?: string;
  speaker_name?: string;
  speaker_bio?: string;
  speaker_image_url?: string;
  status: string;
  notes?: string;
  setlist_id?: string;
  organizer_email?: string;
  organizer_phone?: string;
  show_spots_left: boolean;
  max_purchase: number;
}

interface Registration {
  id: string;
  booking_id: string;
  status: string;
}

export default function EventDetail() {
  const { t } = useLanguage();
  const { eventId, slug } = useParams<{ eventId?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useUserRole();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(
    null
  );
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isUsher, setIsUsher] = useState(false);
  const [isOwnerEvent, setIsOwnerEvent] = useState(false);
  const isMobile = useIsMobile();
  const [setlistData, setSetlistData] = useState<any>(null);
  const [showSetlistDialog, setShowSetlistDialog] = useState(false);
  const [showTicketFlow, setShowTicketFlow] = useState(false);
  const [userTotalPurchases, setUserTotalPurchases] = useState(0);
  const [maxPurchaseReached, setMaxPurchaseReached] = useState(false);
  // const hasOrganizerPrivileges = isOwnerEvent || isUsher;

  const fetchEventDetails = async () => {
    const identifier = slug || eventId;
    if (!identifier) return;

    try {
      let query = supabase.from("events").select(`
        *,
        event_ticket_types (
        event_ticket_categories (
          price
        )
        )
      `);

      // Try slug first, then fallback to eventId
      if (slug) {
        query = query.eq("slug", slug);
      } else {
        query = query.eq("id", eventId);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      // Calculate lowest price
      const prices = data.event_ticket_types
        ?.flatMap(
          (type) => type.event_ticket_categories?.map((cat) => cat.price) || []
        )
        .filter((price) => price != null);
      const lowestPrice = prices && prices.length > 0 ? Math.min(...prices) : 0;

      setEvent({ ...data, price: lowestPrice });

      // ✅ Check if user has registration or paid tickets
      if (user) {
        // Check for free event registrations first
        if (lowestPrice === 0) {
          const { data: freeRegistration, error: freeRegError } = await supabase
            .from("event_registrations")
            .select("id, booking_id, status")
            .eq("event_id", data.id)
            .eq("user_id", user.id)
            .eq("payment_status", "free")
            .maybeSingle();

          if (freeRegError) throw freeRegError;

          if (freeRegistration) {
            setUserRegistration({
              id: freeRegistration.id,
              booking_id: freeRegistration.booking_id,
              status: freeRegistration.status,
            });
            setUserTotalPurchases(1);
            setMaxPurchaseReached(true);
          } else {
            setUserRegistration(null);
            setUserTotalPurchases(0);
            setMaxPurchaseReached(false);
          }
        } else {
          // 🔹 Ambil semua pembayaran paid user untuk event ini (sekali saja)
          const { data: userPayments, error: paymentError } = await supabase
            .from("payments")
            .select("id, status, midtrans_order_id")
            .eq("event_id", data.id)
            .eq("user_id", user.id)
            .in("status", ["paid"]);

          if (paymentError) throw paymentError;

          if (userPayments && userPayments.length > 0) {
            // 🎟️ Ambil semua ID payment
            const paymentIds = userPayments.map((p) => p.id);

            // 🔢 Hitung total tiket dari event_quota_transaction_history
            const { data: transactions, error: transactionError } =
              await supabase
                .from("event_quota_transaction_history")
                .select("ticket_count")
                .in("payment_id", paymentIds)
                .eq("transaction_type", "used");

            if (transactionError) throw transactionError;

            const totalTickets =
              transactions?.reduce(
                (sum, t) => sum + (t.ticket_count || 0),
                0
              ) || 0;

            setUserTotalPurchases(totalTickets);

            // 🚫 Cek apakah sudah capai batas pembelian
            if (data.enable_max_purchase && data.max_purchase) {
              setMaxPurchaseReached(totalTickets >= data.max_purchase);
            }

            // ✅ Tampilkan userRegistration berdasarkan salah satu payment (ambil pertama)
            const primaryPayment = userPayments[0];
            setUserRegistration({
              id: primaryPayment.id,
              booking_id: primaryPayment.midtrans_order_id || "TICKET",
              status: primaryPayment.status,
            });
          } else {
            setUserRegistration(null);
            setUserTotalPurchases(0);
            setMaxPurchaseReached(false);
          }
        }

        // 🧑‍💼 Organizer check
        setIsOwnerEvent(data.organizer_id === user.id);

        // 👥 Usher check
        const { data: usherData } = await supabase
          .from("event_ushers")
          .select("id")
          .eq("event_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsUsher(!!usherData);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId, slug, user]);

  useEffect(() => {
    if (event?.setlist_id) {
      fetchSetlistData();
    }
  }, [event?.setlist_id]);

  const fetchSetlistData = async () => {
    if (!event?.setlist_id) {
      setSetlistData(null);
      return;
    }

    try {
      // First fetch the setlist
      const { data: setlist, error: setlistError } = await supabase
        .from("setlists")
        .select("id, name, song_ids")
        .eq("id", event.setlist_id)
        .maybeSingle();

      if (setlistError) {
        console.error("Error fetching setlist:", setlistError);
        throw setlistError;
      }

      if (!setlist || !setlist.song_ids || setlist.song_ids.length === 0) {
        
        setSetlistData(null);
        return;
      }

      // Then fetch the songs in the order they appear in song_ids
      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("id, title, slug, artist")
        .in("id", setlist.song_ids);

      if (songsError) {
        console.error("Error fetching songs:", songsError);
        throw songsError;
      }

      // Sort songs according to the order in song_ids
      const orderedSongs = setlist.song_ids
        .map((songId) => songs?.find((song) => song.id === songId))
        .filter((song) => song !== undefined);

      const setlistWithSongs = {
        ...setlist,
        songs: orderedSongs,
      };

      
      setSetlistData(setlistWithSongs);
    } catch (error) {
      console.error("Error fetching setlist:", error);
      setSetlistData(null);
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
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isFullyBooked = () => {
    return (
      event?.max_capacity && event.current_registrations >= event.max_capacity
    );
  };

  const isRegistrationOpen = () => {
    if (!event) return false;

    if (event.registration_deadline) {
      return new Date() < new Date(event.registration_deadline);
    }

    const closingTime = event.end_time || event.start_time;

    return new Date() < new Date(`${event.date}T${closingTime}`);
  };

  const getSpotsLeft = () => {
    if (!event?.max_capacity) return null;
    return event.max_capacity - event.current_registrations;
  };

  const handleRegisterClick = () => {
    // if (!user) {
    //   // Store the current event ID and redirect to auth
    //   localStorage.setItem("pendingEventRegistration", event?.id || "");
    //   storeIntendedUrl(window.location.origin + window.location.pathname);

    //   navigate(
    //     "/auth?returnTo=" + encodeURIComponent(window.location.pathname)
    //   );

    //   return;
    // }

    setShowTicketFlow(true);
  };

  const handleRegistrationSuccess = () => {
    setShowTicketFlow(false);
    fetchEventDetails(); // Refresh data
    toast({
      title: "Registration Successful!",
      description:
        "You have been registered for the event. Check your email for confirmation.",
    });
  };

  if (loading || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-6" />
          <div className="h-64 bg-muted rounded-lg mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        {/* Gunakan optional chaining (?.) dan fallback value (??) */}
        <title>{`${event?.title ?? "Event"} - Arrangely`}</title>
        <meta
          name="description"
          content={
            event?.description?.substring(0, 160) ??
            "Join this exciting event on Arrangely."
          }
        />
        <meta
          name="keywords"
          content={`event, ${event?.title ?? "Arrangely event"}, ${
            event?.location ?? ""
          }, music, community`}
        />

        {/* Open Graph meta tags */}
        <meta property="og:title" content={event?.title ?? "Arrangely Event"} />
        <meta
          property="og:description"
          content={
            event?.description?.substring(0, 160) ??
            "Join this exciting event on Arrangely."
          }
        />
        <meta property="og:type" content="event" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="Arrangely" />
        {event.banner_image_url ? (
          <meta property="og:image" content={event.banner_image_url} />
        ) : (
          <meta
            property="og:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          property="og:image:alt"
          content={`${event?.title ?? "Arrangely Event"} banner`}
        />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={event?.title ?? "Arrangely Event"}
        />
        <meta
          name="twitter:description"
          content={
            event?.description?.substring(0, 160) ??
            "Join this exciting event on Arrangely."
          }
        />
        {event.banner_image_url ? (
          <meta name="twitter:image" content={event.banner_image_url} />
        ) : (
          <meta
            name="twitter:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          name="twitter:image:alt"
          content={`${event?.title ?? "Arrangely Event"} banner`}
        />

        {/* Event-specific structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: event?.title,
            description: event?.description,
            startDate:
              event?.date && event?.start_time
                ? `${event.date}T${event.start_time}`
                : undefined,
            endDate:
              event?.date && event?.end_time
                ? `${event.date}T${event.end_time}`
                : undefined,
            location: {
              "@type": "Place",
              name: event?.location,
              address: event?.address,
            },
            offers: event?.price
              ? {
                  "@type": "Offer",
                  price: event.price,
                  priceCurrency: "IDR",
                }
              : undefined,
            organizer: {
              "@type": "Organization",
              name: "Arrangely",
            },
            image:
              event?.banner_image_url ||
              `${window.location.origin}/placeholder.svg`,
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background pt-[calc(4rem+env(safe-area-inset-top))]">
        {/* Header Banner - Loket.com Style with Split Layout */}
        {/* HEADER BANNER */}
        <div className="relative w-full overflow-hidden">
          {/* Background Blur */}
          <div className="absolute inset-0">
            {event.banner_image_url ? (
              <img
                src={event.banner_image_url}
                alt="Event background"
                className="w-full h-full object-cover scale-110 blur-[90px] opacity-90"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-700 to-slate-500" />
            )}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <div className="relative container mx-auto px-4 py-10 md:py-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left Info */}
            <div className="flex-1 text-white space-y-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">
                {event.title}
              </h1>

              <div className="space-y-2 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{event.location}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>
                    {formatDate(event.date)}, {formatTime(event.start_time)}
                    {event.end_time && ` - ${formatTime(event.end_time)}`} WIB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <span>Konser • Musik • K-Pop</span>
                </div>
              </div>
            </div>

            {/* Right Banner Card */}
            {event.banner_image_url && (
              <div className="relative lg:w-[380px] lg:shrink-0 rounded-xl overflow-hidden shadow-xl bg-white">
                <img
                  src={event.banner_image_url}
                  alt={`${event.title} banner`}
                  className="w-full h-[240px] object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content Container */}
        <div className="container mx-auto px-4 py-8 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8">
          {/* Back Button - Desktop only */}
          {/* {!isMobile && (
            <Button
              variant="ghost"
              onClick={() => navigate("/events")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("events.backToEvents") || "Back to Events"}
            </Button>
          )} */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs for Description, Ticket, Terms */}
              <Card className="border-none shadow-md">
                <CardContent className="p-0">
                  <Tabs defaultValue="description" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12">
                      <TabsTrigger value="description" className="rounded-none">
                        {t("events.description") || "Description"}
                      </TabsTrigger>
                      <TabsTrigger value="tickets" className="rounded-none">
                        {t("events.tickets") || "Tickets"}
                      </TabsTrigger>
                      {(event.location || event.address) && (
                        <TabsTrigger value="location" className="rounded-none">
                          {t("events.location") || "Location"}
                        </TabsTrigger>
                      )}
                      {event.speaker_name && (
                        <TabsTrigger value="speaker" className="rounded-none">
                          {t("events.speaker") || "Speaker"}
                        </TabsTrigger>
                      )}
                      {setlistData && (
                        <TabsTrigger value="setlist" className="rounded-none">
                          Setlist
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="description" className="p-4 md:p-6">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {event.description || "No description available."}
                        </p>
                        {event.notes && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="font-semibold mb-2">
                              {t("events.additionalNotes") ||
                                "Additional Notes"}
                            </h4>
                            <div
                              className="text-muted-foreground"
                              dangerouslySetInnerHTML={{
                                __html: event.notes.replace(
                                  "<ol>",
                                  '<ol class="list-decimal ml-6">'
                                ),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="tickets" className="p-4 md:p-6">
                      <EventTicketsTab event={event} />
                    </TabsContent>

                    <TabsContent value="location" className="p-4 md:p-6">
                      {(() => {
                        // --- AWAL PERBAIKAN LOGIKA ---
                        const mapsQuery = event.address || event.location;

                        let mapLink = null; // Link untuk tombol "Open in Maps"
                        let embedMapLink = null; // Link untuk iframe peta

                        if (event.google_maps_link) {
                          // 1. Jika ada link spesifik, utamakan itu untuk tombol
                          mapLink = event.google_maps_link;

                          // 2. Coba buat link embed dari query yang ada (sebagai fallback embed)
                          if (mapsQuery) {
                            embedMapLink = `https://maps.google.com/maps?q=${encodeURIComponent(
                              mapsQuery
                            )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                          }
                        } else if (mapsQuery) {
                          // 3. Jika tidak ada link spesifik, generate keduanya dari query
                          mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            mapsQuery
                          )}`;
                          embedMapLink = `https://maps.google.com/maps?q=${encodeURIComponent(
                            mapsQuery
                          )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                        }
                        // --- AKHIR PERBAIKAN LOGIKA ---

                        if (!mapsQuery) {
                          return (
                            <p className="text-muted-foreground">
                              {t("events.noLocation") ||
                                "Location information not available."}
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {" "}
                            {/* Beri jarak lebih */}
                            {/* 1. Peta Interaktif (Embed) */}
                            {embedMapLink && (
                              <div className="overflow-hidden rounded-lg border shadow-sm">
                                <iframe
                                  src={embedMapLink}
                                  width="100%"
                                  height="300" // Anda bisa sesuaikan tinggi peta
                                  style={{ border: 0 }}
                                  allowFullScreen={true}
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                  title="Event Location Map"
                                ></iframe>
                              </div>
                            )}
                            {/* 2. Detail Alamat dengan Ikon */}
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                              <div>
                                <p className="font-semibold text-base">
                                  {event.location}
                                </p>
                                {event.address && (
                                  <p className="text-sm text-muted-foreground">
                                    {event.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* 3. Tombol "Open in Maps" (dengan link yang sudah diperbaiki) */}
                            {mapLink && (
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full"
                              >
                                <Button
                                  variant="outline"
                                  className="w-full gap-2"
                                >
                                  {t("events.openInMaps") ||
                                    "Open in Google Maps"}
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    <TabsContent value="speaker" className="p-4 md:p-6">
                      {event.speaker_name ? (
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={event.speaker_image_url} />
                            <AvatarFallback>
                              <User className="w-8 h-8" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              {event.speaker_name}
                            </h3>
                            {event.speaker_bio && (
                              <p className="text-muted-foreground">
                                {event.speaker_bio}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          {t("events.noSpeaker") ||
                            "No speaker information available"}
                        </p>
                      )}
                    </TabsContent>

                    {setlistData && (
                      <TabsContent value="setlist" className="p-4 md:p-6">
                        {setlistData.songs && setlistData.songs.length > 0 ? (
                          <div className="space-y-2">
                            {setlistData.songs.map(
                              (song: any, index: number) => (
                                <div
                                  key={song.id || index}
                                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <span className="text-sm text-muted-foreground font-semibold min-w-[32px]">
                                    {index + 1}.
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-medium">{song.title}</p>
                                    {song.artist && (
                                      <p className="text-xs text-muted-foreground">
                                        {song.artist}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-8">
                            {t("events.noSetlist") ||
                              "No songs in this setlist"}
                          </p>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Ticket/Registration */}
            <div className="lg:col-span-1 space-y-4 sticky top-24">
              {/* === KARTU BARU YANG LEBIH BAIK === */}
              <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
                {/* 1. Gambar Banner Event (DIHAPUS) */}
                {/* {event.banner_image_url && (
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-40 object-cover"
            />
          )} */}

                <CardContent className="p-4 md:p-6">
                  {/* 2. Info Judul, Tanggal, Lokasi */}
                  <div className="mb-4">
                    <h3 className="font-bold text-lg leading-tight mb-2">
                      {event.title}
                    </h3>
                    {/* Info Tanggal & Lokasi Diperbarui */}
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {/* Menambahkan Waktu Mulai */}
                        <span>
                          {formatDate(event.date)},{" "}
                          {formatTime(event.start_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{event.location}</span>
                      </div>

                      {/* Info Batas Registrasi (Dipindah ke sini) */}
                      {/* <div className="flex items-center gap-2 pt-2 text-yellow-600">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">
                          {t("events.registrationClosed") ||
                            "Registration closes"}
                          :{" "}
                          {
                            event.registration_deadline
                              ? formatDate(event.registration_deadline) // Jika ada deadline, pakai ini
                              : `${formatDate(event.date)}, ${formatTime(
                                  event.start_time
                                )}` // Jika tidak, pakai waktu mulai event
                          }
                        </span>
                      </div> */}
                    </div>
                  </div>

                  {/* 3. Harga dan Tombol (dipisah border) */}
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      {event.price > 0 ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {t("eventRegistration.startingFrom") ||
                              "Starting from"}
                          </p>
                          {/* Harga dibuat lebih menonjol */}
                          <p className="text-3xl font-bold text-primary">
                            Rp{event.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          {t("events.free") || "Free"}
                        </Badge>
                      )}
                    </div>

                    {/* 4. Info Kuota (Urgency) */}
                    {/* {event.max_capacity && event.show_spots_left && (
                      <div className="flex items-center justify-between mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/30">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-300">
                            {t("events.availableQuota") || "Available Quota"}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-700 dark:text-red-300">
                          {getSpotsLeft()} / {event.max_capacity}
                        </span>
                      </div>
                    )} */}

                    {/* 5. Tombol Aksi (Logika sama seperti sebelumnya) */}
                    {/* {userRegistration ? (
                      <div className="space-y-3">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <Badge variant="default" className="mb-2">
                            {userRegistration.status === "confirmed"
                              ? t("events.registered") || "Registered"
                              : userRegistration.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            Booking ID:{" "}
                            <span className="font-mono font-medium">
                              {userRegistration.booking_id}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="default"
                          onClick={() => navigate("/events?tab=tickets")}
                          className="w-full h-12"
                        >
                          {t("events.viewMyTicket") || "View My Ticket"}
                        </Button>
                      </div>
                    ) : ( */}
                    <div className="space-y-3">
                      {userRegistration && event.price === 0 ? (
                        // Show "My Ticket" button for registered free events
                        <div className="space-y-3">
                          <div className="text-center p-4 bg-primary/10 rounded-lg">
                            <Badge variant="default" className="mb-2">
                              {t("events.registered") || "Registered"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                              Booking ID:{" "}
                              <span className="font-mono font-medium">
                                {userRegistration.booking_id}
                              </span>
                            </p>
                          </div>
                          <Button
                            variant="default"
                            onClick={() => navigate("/events?tab=tickets")}
                            className="w-full h-12"
                          >
                            {t("events.viewMyTicket") || "My Ticket"}
                          </Button>
                        </div>
                      ) : !isRegistrationOpen() ? (
                        <Button disabled className="w-full h-12">
                          {t("events.registrationClosed") ||
                            "Registration Closed"}
                        </Button>
                      ) : isFullyBooked() ? (
                        <Button disabled className="w-full h-12">
                          {t("events.eventFull") || "Event Full"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={handleRegisterClick}
                            className="w-full h-12 text-base font-semibold"
                            size="lg"
                            disabled={
                              maxPurchaseReached ||
                              !isRegistrationOpen() ||
                              isFullyBooked()
                            }
                          >
                            {maxPurchaseReached
                              ? t("events.purchaseLimitReached") ||
                                "Purchase Limit Reached"
                              : event.price > 0
                              ? t("eventRegistration.buyTicket") || "Buy Ticket"
                              : t("eventRegistration.registerFree") ||
                                "Register for Free"}
                          </Button>
                          {maxPurchaseReached && (
                            <p className="text-xs text-destructive text-center mt-2">
                              {t("events.purchaseLimitReachedDesc") ||
                                `You have reached the purchase limit (${event.max_purchase} tickets).`}
                            </p>
                          )}
                        </>
                      )}
                      {/* Info tanggal registrasi dipindah ke atas */}
                    </div>
                    {/* )} */}
                  </div>
                </CardContent>

                {/* 6. Panel Admin (dipisah) */}
                {(isOwnerEvent || isUsher) && (
                  <div className="border-t p-4 md:p-6 space-y-2 bg-muted/50">
                    {isOwnerEvent && (
                      <Button
                        onClick={() => navigate("/organizer/events")}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        {t("events.organizerPanel") || "Organizer Events"}
                      </Button>
                    )}
                    {isUsher && (
                      <Button
                        onClick={() => setShowQRScanner(true)}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <QrCode className="w-4 h-4" />
                        QR Check-in Scanner
                      </Button>
                    )}
                  </div>
                )}

                {/* Cancellation (dipisah di luar content) */}
                {userRegistration &&
                  event.allow_cancellation &&
                  event.cancellation_deadline &&
                  new Date() < new Date(event.cancellation_deadline) && (
                    <div className="border-t p-4 md:p-6">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: t("events.cancellation") || "Cancellation",
                            description:
                              t("events.cancellationSoon") ||
                              "Cancellation functionality will be implemented soon.",
                          });
                        }}
                      >
                        {t("events.cancelRegistration") ||
                          "Cancel Registration"}
                      </Button>
                    </div>
                  )}
              </Card>

              {/* Contact Card (sama seperti sebelumnya) */}
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("events.needHelp") || "Need Help?"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.organizer_email && (
                    <a
                      href={`mailto:${event.organizer_email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span>{event.organizer_email}</span>
                    </a>
                  )}
                  {event.organizer_phone && (
                    <a
                      href={`tel:${event.organizer_phone}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{event.organizer_phone}</span>
                    </a>
                  )}
                  {!event.organizer_email && !event.organizer_phone && (
                    <p className="text-sm text-muted-foreground">
                      {t("events.contact") ||
                        "Contact information not available"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Event News (sama seperti sebelumnya) */}
              <PromoNewsCarousel eventId={event.id} />
            </div>
          </div>
        </div>

        {/* Fixed Bottom Button - Mobile Only */}
        {isMobile && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t z-[100] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
            style={{
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
              paddingTop: "16px",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <div className="container mx-auto flex items-center justify-between gap-4">
              <div>
                {event.price > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Harga mulai dari
                    </p>
                    <p className="text-lg font-bold">
                      Rp{event.price.toLocaleString("id-ID")}
                    </p>
                  </>
                ) : (
                  <p className="text-primary font-semibold">Gratis</p>
                )}
              </div>

              {userRegistration && event.price === 0 ? (
                // Show "My Ticket" button for registered free events
                <Button
                  variant="default"
                  onClick={() => navigate("/events?tab=tickets")}
                  className="h-12 text-base font-semibold flex-1 ml-3 rounded-lg shadow-md"
                >
                  {t("events.viewMyTicket") || "My Ticket"}
                </Button>
              ) : isFullyBooked() ? (
                <Button
                  disabled
                  className="h-12 text-base font-semibold flex-1 ml-3 rounded-lg shadow-md"
                >
                  {t("events.eventFull") || "Event Full"}
                </Button>
              ) : !isRegistrationOpen() ? (
                <Button
                  disabled
                  className="h-12 text-base font-semibold flex-1 ml-3 rounded-lg shadow-md"
                >
                  {t("events.registrationClosed") || "Registration Closed"}
                </Button>
              ) : (
                <Button
                  onClick={handleRegisterClick}
                  disabled={!isRegistrationOpen() || isFullyBooked()}
                  className="h-12 text-base font-semibold flex-1 ml-3 rounded-lg shadow-md"
                >
                  {event.price > 0
                    ? t("eventRegistration.buyTicket") || "Buy Ticket"
                    : t("eventRegistration.registerFree") ||
                      "Register for Free"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Ticket Selection Flow */}
        <TicketSelectionFlow
          event={event}
          open={showTicketFlow}
          onOpenChange={setShowTicketFlow}
        />

        {/* QR Scanner Dialog */}
        <UnifiedQRCheckinDialog
          eventId={event.id}
          open={showQRScanner}
          onOpenChange={setShowQRScanner}
          onSuccess={() => {}}
        />
      </div>
    </>
  );
}
