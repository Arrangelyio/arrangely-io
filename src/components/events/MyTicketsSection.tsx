import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Clock, User, Trophy, Gift } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { QRCodeModal } from "./QRCodeModal";
import { TicketQRSelector } from "./TicketQRSelector";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface EventRegistration {
  id: string;
  booking_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string;
  qr_code: string;
  qr_code_data?: string | null;
  registration_date: string;
  status: string;
  amount_paid: number;
  payment_status: string;
  check_in_time: string | null;
  is_vip?: boolean;
  ticket_number: string;
  ticket_category_name: string;
  ticket_type_name: string;
  tickets?: Array<{
    id: string;
    registration_id: string;
    qr_code_data: string | null;
    ticket_number: string;
    status: string;
    ticket_category_id: string;
    participant_name: string;
    participant_email: string;
  }>;
  events: {
    id: string;
    title: string;
    description: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    price: number;
    speaker_name: string;
    banner_image_url: string | null;
  };
  ticketCategories?: Array<{
    id: string;
    name: string;
    ticket_type_id: string;
  }>;
  ticketTypes?: Array<{
    id: string;
    name: string;
  }>;
}

interface LotteryWinner {
  id: string;
  event_id: string;
  reward_name: string;
  reward_type: string;
  won_at: string;
}

export default function MyTicketsSection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<EventRegistration[]>([]);
  const [lotteryWinners, setLotteryWinners] = useState<{
    [eventId: string]: LotteryWinner;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<EventRegistration | null>(null);
  const { user } = useUserRole();

  useEffect(() => {
    if (user) {
      fetchMyTickets();
      fetchLotteryWinners();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      // [MODIFIKASI] Step 1: Hapus query ke tabel 'payments'.
      // Kita langsung query 'event_registrations'.

      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          `
        *,
        events (
          id,
          title,
          description,
          date,
          start_time,
          end_time,
          location,
          price,
          speaker_name,
          banner_image_url
        )
      `
        )
        .eq("user_id", user?.id)
        // [MODIFIKASI] Filter status di sini.
        // Kita asumsikan tiket gratis punya status "confirmed"
        // dan tiket berbayar punya status "paid".
        .in("payment_status", ["paid", "confirmed", "free"])
        .order("registration_date", { ascending: false });

      if (error) throw error;

      // [MODIFIKASI] Cek data registrasi, bukan paidEventIds
      if (!data || data.length === 0) {
        setTickets([]); // Tidak ada registrasi yang 'paid' atau 'confirmed'
        setLoading(false);
        return;
      }

      // [MODIFIKASI] Step 2: Ambil ticket terkait (sebelumnya Step 3)
      const registrationIds = data.map((r) => r.id); // 'data' dari query di atas
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("event_tickets")
        .select(
          "id, registration_id, qr_code_data, ticket_number, status, ticket_category_id, participant_name, participant_email"
        )
        .in("registration_id", registrationIds);

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
      }

      // [MODIFIKASI] Step 3: Generate QR code (sebelumnya Step 4)
      // PERHATIAN: Periksa logika ini.
      // Jika tiket gratis tidak punya 'status: "paid"', QR-nya tidak akan dibuat.
      const ticketsWithQR = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          // Anda mungkin perlu mengubah kondisi ini, misal menjadi:
          // if (!ticket.qr_code_data && (ticket.status === "paid" || ticket.status === "confirmed")) {
          if (!ticket.qr_code_data && ticket.status === "paid") {
            const QRCode = (await import("qrcode")).default;
            const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticket_number, {
              width: 200,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });

            await supabase
              .from("event_tickets")
              .update({ qr_code_data: qrCodeDataUrl })
              .eq("id", ticket.id);

            return { ...ticket, qr_code_data: qrCodeDataUrl };
          }
          return ticket;
        })
      );

      // [MODIFIKASI] Step 4 & 5 (sebelumnya Step 5 & 6)
      // Logika ini sudah benar, tidak perlu diubah
      const categoryIds = [
        ...new Set(ticketsWithQR.map((t) => t.ticket_category_id)),
      ];
      const { data: categoriesData } = await supabase
        .from("event_ticket_categories")
        .select("id, name, ticket_type_id")
        .in("id", categoryIds);

      const typeIds = [
        ...new Set((categoriesData || []).map((c) => c.ticket_type_id)),
      ];
      const { data: typesData } = await supabase
        .from("event_ticket_types")
        .select("id, name")
        .in("id", typeIds);

      const registrationsWithTickets = data.map((registration) => {
        const relatedTickets = ticketsWithQR.filter(
          (t) => t.registration_id === registration.id
        );
        return {
          ...registration,
          tickets: relatedTickets,
          ticketCategories: categoriesData || [],
          ticketTypes: typesData || [],
          qr_code_data: relatedTickets[0]?.qr_code_data || null,
        };
      });

      setTickets(registrationsWithTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLotteryWinners = async () => {
    try {
      const { data, error } = await supabase
        .from("lottery_winners")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      // Create a map of event_id to winner data
      const winnersMap = (data || []).reduce((acc, winner) => {
        acc[winner.event_id] = winner;
        return acc;
      }, {} as { [eventId: string]: LotteryWinner });

      setLotteryWinners(winnersMap);
    } catch (error) {
      console.error("Error fetching lottery winners:", error);
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      confirmed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      checked_in: "bg-blue-100 text-blue-800",
    };
    return (
      statusColors[status as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const formatCheckInTime = (checkInTime: string) => {
    return new Date(checkInTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      statusColors[status as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const handleShowQR = (ticket: EventRegistration) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Please sign in to view your tickets.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg h-64"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Tickets Yet</h3>
        <p className="text-muted-foreground mb-4">
          You haven't registered for any events yet. Browse available events
          above to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => {
        const winner = lotteryWinners[ticket.events.id];

        return (
          <Card
            key={ticket.id}
            className={`overflow-hidden ${
              winner
                ? "ring-2 ring-yellow-400 bg-gradient-to-b from-yellow-50 to-white"
                : ""
            }`}
          >
            {winner && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3">
                <div className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold">🎉 WINNER! 🎉</span>
                </div>
                <div className="text-white/90 text-sm mt-1">
                  You won: {winner.reward_name}
                </div>
              </div>
            )}

            {ticket.events.banner_image_url && (
              <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative">
                <img
                  src={ticket.events.banner_image_url}
                  alt={ticket.events.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">
                  {ticket.events.title}
                </CardTitle>
                <div className="flex flex-col gap-1">
                  <Badge className={getStatusBadge(ticket.status)}>
                    {ticket.status === "checked_in"
                      ? "CHECKED IN"
                      : ticket.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  {ticket.is_vip && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900">
                      ✨ VIP ✨
                    </Badge>
                  )}
                  {winner && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Gift className="h-3 w-3 mr-1" />
                      Winner
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 mr-2" />
                {formatDate(ticket.events.date)}
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(ticket.events.start_time)} -{" "}
                {formatTime(ticket.events.end_time)}
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                {ticket.events.location}
              </div>

              {ticket.events.speaker_name && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  {ticket.events.speaker_name}
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono">{ticket.booking_id}</span>
                </div>

                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">
                    {/* Payment: */}
                    {t("myTicket.payment")}
                  </span>
                  <Badge
                    className={getPaymentStatusBadge(ticket.payment_status)}
                  >
                    {ticket.payment_status.toUpperCase()}
                  </Badge>
                </div>

                {ticket.events.price > 0 && (
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold">
                      Rp {ticket.amount_paid.toLocaleString()}
                    </span>
                  </div>
                )}

                {ticket.check_in_time && (
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="text-muted-foreground">
                      Check-in Time:
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCheckInTime(ticket.check_in_time)}
                    </span>
                  </div>
                )}
              </div>

              {ticket.tickets && ticket.tickets.length > 0 && (
                <TicketQRSelector
                  tickets={ticket.tickets}
                  ticketCategories={ticket.ticketCategories || []}
                  ticketTypes={ticket.ticketTypes || []}
                  onShowQR={(individualTicket) => {
                    // Find category and type info for this ticket
                    const category = ticket.ticketCategories?.find(
                      (c) => c.id === individualTicket.ticket_category_id
                    );
                    const type = ticket.ticketTypes?.find(
                      (t) => t.id === category?.ticket_type_id
                    );

                    handleShowQR({
                      ...ticket,
                      qr_code_data: individualTicket.qr_code_data,
                      qr_code: individualTicket.ticket_number,
                      ticket_number: individualTicket.ticket_number,
                      attendee_name: individualTicket.participant_name,
                      attendee_email: individualTicket.participant_email,
                      ticket_category_name:
                        category?.name || "Unknown Category",
                      ticket_type_name: type?.name || "General",
                    });
                  }}
                />
              )}

              <Button
                className="w-full"
                onClick={() => navigate(`/events/${ticket.events.id}`)}
              >
                {/* View Detail Event */}
                {t("myTicket.viewDetail")}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* QR Code Modal */}
      {selectedTicket && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTicket(null);
          }}
          ticketData={{
            booking_id: selectedTicket.booking_id,
            qr_code: selectedTicket.qr_code_data || selectedTicket.qr_code,
            ticket_number: selectedTicket.ticket_number,
            attendee_name: selectedTicket.attendee_name,
            attendee_email: selectedTicket.attendee_email,
            event_title: selectedTicket.events.title,
            event_date: selectedTicket.events.date,
            event_location: selectedTicket.events.location,
            status: selectedTicket.status,
            check_in_time: selectedTicket.check_in_time,
            is_vip: selectedTicket.is_vip,
            ticket_category_name: selectedTicket.ticket_category_name,
            ticket_type_name: selectedTicket.ticket_type_name,
          }}
        />
      )}
    </div>
  );
}
