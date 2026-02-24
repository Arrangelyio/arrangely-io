import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventDetailsTab } from "./EventDetailsTab";
import { EventUshersTab } from "./EventUshersTab";
import { TicketManagement } from "./TicketManagement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Users,
  UserCheck,
  Share2,
  Download,
  CheckCircle,
  DollarSign,
  CalendarDays,
  Clock,
  MapPin,
  Gift,
  QrCode,
  MoreVertical,
  Bug,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import LotteryDrawingSystem from "@/components/admin/LotteryDrawingSystem";
import { UnifiedQRCheckinDialog } from "@/components/events/UnifiedQRCheckinDialog";
import { useNavigate } from "react-router-dom";
import { PromoNewsManager } from "@/components/events/PromoNewsManager";
import AdminChangeRequestManager from "@/components/events/AdminChangeRequestManager";
import { TicketSalesDashboard } from "@/components/events/TicketSalesDashboard";
import { ExpandableRegistrationRow } from "@/components/events/ExpandableRegistrationRow";

interface OrganizerEventDetailsProps {
  event: any;
  onUpdate: () => void;
}

interface Registration {
  id: string;
  booking_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  payment_status: string;
  status: string;
  check_in_time?: string;
  registration_date: string;
  amount_paid: number;
  is_vip?: boolean;
}

export function OrganizerEventDetails({
  event,
  onUpdate,
}: OrganizerEventDetailsProps) {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState<number>(0);
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [checkedInTickets, setCheckedInTickets] = useState<number>(0);
  const [attendeeSubscriptions, setAttendeeSubscriptions] = useState<{
    [key: string]: any;
  }>({});
  const [eventTickets, setEventTickets] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [setlistData, setSetlistData] = useState<any>(null);
  const [isDemoModeEnabled, setIsDemoModeEnabled] = useState(false);

  const tabItems = [
    { value: "details", label: "Event Details" },
    { value: "sales", label: "Ticket Sales" },
    { value: "tickets", label: "Tickets & Categories" },
    { value: "promo", label: "Promo News" },
    { value: "attendees", label: "Attendees" },
    { value: "ushers", label: "Ushers" },
    { value: "rewards", label: "Rewards & Gifts" },
  ];

  // state untuk track tab aktif
  const [currentTab, setCurrentTab] = useState("details");
  const currentTabLabel = tabItems.find((t) => t.value === currentTab)?.label;

  useEffect(() => {
    fetchRegistrations();
    fetchTotalTickets();
    fetchCheckedInTickets();
    if (event.setlist_id) {
      fetchSetlistData();
    }
  }, [event.id, event.setlist_id]);

  const fetchSetlistData = async () => {
    if (!event.setlist_id) {
      setSetlistData(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("setlists")
        .select(
          `
          *,
          setlist_songs (
            song_id,
            songs (
              id,
              title,
              artist
            )
          )
        `
        )
        .eq("id", event.setlist_id)
        .maybeSingle();

      if (error) throw error;
      setSetlistData(data);
    } catch (error) {
      console.error("Error fetching setlist:", error);
      setSetlistData(null);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", event.id)
        .order("registration_date", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);

      // Fetch all event tickets at once
      const registrationIds = data?.map(reg => reg.id) || [];
      if (registrationIds.length > 0) {
        const { data: ticketsData, error: ticketsError } = await supabase
        .from("event_tickets")
        .select(`
          id,
          checked_in_at,
          ticket_number,
          created_at,
          ticket_category_id,
          registration_id,
          event_ticket_categories (
            name,
            price
          )
        `)
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

        if (ticketsError) throw ticketsError;

        // Group tickets by registration_id
        const ticketsByRegistration: {[key: string]: any[]} = {};
        ticketsData?.forEach(ticket => {
          if (!ticketsByRegistration[ticket.registration_id]) {
            ticketsByRegistration[ticket.registration_id] = [];
          }
          ticketsByRegistration[ticket.registration_id].push(ticket);
        });

        setEventTickets(ticketsByRegistration);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast({
        title: "Error",
        description: "Failed to load registrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckedInTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("id")
        .eq("event_id", event.id)
        .not("checked_in_at", "is", null);

      if (error) throw error;

      setCheckedInTickets(data?.length || 0);
    } catch (error) {
      console.error("Error fetching checked-in tickets:", error);
      setCheckedInTickets(0);
    }
  };

  const fetchTotalTickets = async () => {
    try {
      // Count tickets from event_tickets table grouped by event_id and buyer_user_id
      const { data: tickets, error } = await supabase
        .from("event_tickets")
        .select("buyer_user_id")
        .eq("event_id", event.id);

      if (error) throw error;

      const total = tickets?.length || 0;
      setTotalTickets(total);
    } catch (error) {
      console.error("Error fetching total tickets:", error);
      setTotalTickets(0);
    }
  };

  // const fetchAttendeeSubscriptions = async () => {
  //   if (!registrations.length) return;

  //   try {
  //     const userIds = registrations.map(reg => reg.user_id).filter(Boolean);

  //     if (userIds.length === 0) return;

  //     const { data: subscriptions, error } = await supabase
  //       .from('subscriptions')
  //       .select(`
  //         user_id,
  //         status,
  //         subscription_plans!inner(name)
  //       `)
  //       .in('user_id', userIds)
  //       .eq('status', 'active');

  //     if (error) {
  //       console.error('Error fetching attendee subscriptions:', error);
  //       return;
  //     }

  //     const subscriptionMap = subscriptions?.reduce((acc, sub) => {
  //       acc[sub.user_id] = {
  //         status: sub.status,
  //         plan: sub.subscription_plans?.name || 'Unknown'
  //       };
  //       return acc;
  //     }, {} as {[key: string]: any}) || {};

  //     setAttendeeSubscriptions(subscriptionMap);
  //   } catch (error) {
  //     console.error('Error fetching attendee subscriptions:', error);
  //   }
  // };

  // const fetchSubscriptionRevenue = async () => {
  //   try {
  //     const eventStartDate = new Date(event.date);
  //     const eventEndDate = new Date(event.date);
  //     if (event.end_time) {
  //       const [hours, minutes] = event.end_time.split(':');
  //       eventEndDate.setHours(parseInt(hours), parseInt(minutes));
  //     } else {
  //       eventEndDate.setHours(23, 59, 59);
  //     }

  //     const registeredUserIds = registrations.map(reg => reg.user_id).filter(Boolean);

  //     if (registeredUserIds.length === 0) {
  //       setSubscriptionRevenue(0);
  //       return;
  //     }

  //     const { data: subscriptionPayments, error } = await supabase
  //       .from('payments')
  //       .select(`
  //         *,
  //         subscriptions!inner(*)
  //       `)
  //       .in('user_id', registeredUserIds)
  //       .eq('status', 'paid')
  //       .gte('created_at', eventStartDate.toISOString())
  //       .lte('created_at', eventEndDate.toISOString())
  //       .not('subscription_id', 'is', null);

  //     if (error) {
  //       console.error('Error fetching subscription revenue:', error);
  //       return;
  //     }

  //     const revenue = subscriptionPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  //     setSubscriptionRevenue(revenue);
  //   } catch (error) {
  //     console.error('Error calculating subscription revenue:', error);
  //     setSubscriptionRevenue(0);
  //   }
  // };

  const shareEvent = async () => {
    const shareUrl = `${window.location.origin}/events/${event.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Event link has been copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Share Link",
        description: shareUrl,
      });
    }
  };

  const exportParticipants = async () => {
    try {
      const csv = [
        "Booking ID,Name,Email,Phone,Registration Date,Payment Status,Check-in Status,Amount Paid",
        ...registrations.map(
          (reg) =>
            `${reg.booking_id},"${reg.attendee_name}","${
              reg.attendee_email
            }","${reg.attendee_phone || ""}","${format(
              new Date(reg.registration_date),
              "yyyy-MM-dd HH:mm"
            )}","${reg.payment_status}","${
              reg.check_in_time ? "Checked In" : "Not Checked In"
            }","${reg.amount_paid || 0}"`
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-participants.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Participants exported successfully",
      });
    } catch (error) {
      console.error("Error exporting participants:", error);
      toast({
        title: "Error",
        description: "Failed to export participants",
        variant: "destructive",
      });
    }
  };

  const handleManualCheckIn = async (registration: Registration) => {
    try {
      const isCheckingIn = !registration.check_in_time;
      const updateData = isCheckingIn
        ? { check_in_time: new Date().toISOString() }
        : { check_in_time: null };

      const { error } = await supabase
        .from("event_registrations")
        .update(updateData)
        .eq("id", registration.id);

      if (error) throw error;

      setRegistrations((prev) =>
        prev.map((reg) =>
          reg.id === registration.id
            ? { ...reg, check_in_time: updateData.check_in_time }
            : reg
        )
      );

      toast({
        title: "Success",
        description: `${registration.attendee_name} has been ${
          isCheckingIn ? "checked in" : "checked out"
        }`,
      });
    } catch (error) {
      console.error("Error updating check-in status:", error);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive",
      });
    }
  };

  const toggleVIPStatus = async (registration: Registration) => {
    try {
      const newVipStatus = !registration.is_vip;

      const { error } = await supabase
        .from("event_registrations")
        .update({ is_vip: newVipStatus })
        .eq("id", registration.id);

      if (error) throw error;

      setRegistrations((prev) =>
        prev.map((reg) =>
          reg.id === registration.id ? { ...reg, is_vip: newVipStatus } : reg
        )
      );

      toast({
        title: "Success",
        description: `${registration.attendee_name} VIP status ${
          newVipStatus ? "enabled" : "disabled"
        }`,
      });
    } catch (error) {
      console.error("Error updating VIP status:", error);
      toast({
        title: "Error",
        description: "Failed to update VIP status",
        variant: "destructive",
      });
    }
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.attendee_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInRegistrations = registrations.filter((r) => r.check_in_time);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            {registrations.length} total registrations
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button 
            variant="default" 
            onClick={() => navigate(`/organizer/events/${event.id}/engagement`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Post-Event Engagement
          </Button> */}
          <Button variant="outline" onClick={shareEvent}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Event
          </Button>
          <Button variant="outline" onClick={exportParticipants}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Event Banner */}
      {event.banner_image_url && (
        <Card>
          <CardContent className="p-0 relative">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-64 object-cover rounded-lg"
            />
            {event.speaker_name && (
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent rounded-lg flex items-center p-8">
                {/* <div className="max-w-xl space-y-4">
                  <p className="text-sm text-muted-foreground">Speaker:</p>
                  <h2 className="text-4xl font-bold">{event.speaker_name}</h2>
                  {event.speaker_bio && (
                    <p className="text-lg text-muted-foreground">{event.speaker_bio}</p>
                  )}
                </div> */}
                {/* <div className="ml-auto space-y-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <CalendarDays className="h-5 w-5" />
                    <span className="text-lg font-medium">{format(new Date(event.date), 'dd MMMM yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Clock className="h-5 w-5" />
                    <span className="text-lg font-medium">{event.start_time} - {event.end_time}</span>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <MapPin className="h-5 w-5 mt-1" />
                    <div className="text-left">
                      <p className="text-lg font-medium">{event.location}</p>
                      {event.address && (
                        <p className="text-sm text-muted-foreground">{event.address}</p>
                      )}
                    </div>
                  </div>
                </div> */}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {checkedInTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {subscriptionRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From subscriptions during event
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          {/* Desktop Tabs (Grid Layout) */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              {tabItems.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Mobile Tabs (Dropdown) */}
          <div className="sm:hidden mb-4 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between px-6">
                  <span>{currentTabLabel}</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                {tabItems.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onSelect={() => setCurrentTab(tab.value)}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="details" className="space-y-4 mt-6">
          <AdminChangeRequestManager eventId={event.id} />
          
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div>
                    <Badge
                      variant={
                        event.status === "active" ? "default" : "secondary"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Price</Label>
                  <p className="font-medium text-muted-foreground text-sm">
                    See Tickets & Categories tab for pricing
                  </p>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-muted-foreground">{event.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <div className="flex items-center text-sm">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {format(new Date(event.date), "PPP")}
                  </div>
                </div>
                <div>
                  <Label>Time</Label>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2" />
                    {event.start_time} - {event.end_time}
                  </div>
                </div>
                <div>
                  <Label>Capacity</Label>
                  <p className="font-medium">
                    {event.max_capacity || "Unlimited"}(
                    {event.current_registrations} registered)
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Location</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{event.location}</p>
                      {event.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {event.google_maps_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-2 h-9 text-xs"
                      onClick={() =>
                        window.open(event.google_maps_link, "_blank")
                      }
                    >
                      <MapPin className="h-3 w-3" />
                      Open in Google Maps
                    </Button>
                  )}
                </div>
              </div>

              {event.speaker_name && (
                <div>
                  <Label>Speaker</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {event.speaker_image_url && (
                      <img
                        src={event.speaker_image_url}
                        alt={event.speaker_name}
                        className="h-16 w-16 object-cover rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">{event.speaker_name}</p>
                      {event.speaker_bio && (
                        <p className="text-muted-foreground text-sm">
                          {event.speaker_bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {setlistData && (
                <div>
                  <Label>Setlist</Label>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-3">{setlistData.name}</h3>
                      {setlistData.setlist_songs &&
                      setlistData.setlist_songs.length > 0 ? (
                        <ol className="space-y-2">
                          {setlistData.setlist_songs.map(
                            (item: any, index: number) => (
                              <li
                                key={index}
                                className="flex items-center gap-3"
                              >
                                <span className="text-muted-foreground text-sm">
                                  {index + 1}.
                                </span>
                                <div>
                                  <p className="text-sm font-medium">
                                    {item.songs?.title}
                                  </p>
                                  {item.songs?.artist && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.songs.artist}
                                    </p>
                                  )}
                                </div>
                              </li>
                            )
                          )}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No songs in this setlist
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <EventDetailsTab event={event} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 mt-6">
          <TicketSalesDashboard eventId={event.id} />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4 mt-6">
          <TicketManagement eventId={event.id} />
        </TabsContent>

        <TabsContent value="promo" className="space-y-4 mt-6">
          <PromoNewsManager eventId={event.id} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-4 mt-6">
          
          <AdminChangeRequestManager eventId={event.id} />
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                All Attendees ({filteredRegistrations.length})
              </CardTitle>
              <Button variant="outline" onClick={() => setShowQRScanner(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Scanner
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>VIP Status</TableHead>
                    <TableHead>Status</TableHead>
                    {/* <TableHead>Check-in</TableHead> */}
                    {/* <TableHead>Subscription Plan</TableHead> */}
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Registration Date</TableHead>
                    {/* <TableHead>Actions</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <ExpandableRegistrationRow
                      key={reg.id}
                      registration={reg}
                      tickets={eventTickets[reg.id] || []}
                      onToggleVIP={toggleVIPStatus}
                      onManualCheckIn={handleManualCheckIn}
                      showSubscription={false}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ushers" className="mt-6">
          <EventUshersTab eventId={event.id} />
        </TabsContent>

        <TabsContent value="rewards" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Rewards & Gifts
              </CardTitle>

              {/* ✅ 3. TAMBAHKAN TOMBOL BARU INI */}
              <Button
                variant={isDemoModeEnabled ? "destructive" : "outline"}
                size="sm"
                onClick={() => setIsDemoModeEnabled(!isDemoModeEnabled)}
              >
                <Bug className="h-4 w-4 mr-2" />
                {isDemoModeEnabled ? "Disable Dummy Data" : "Enable Dummy Data"}
              </Button>
            </CardHeader>
            <CardContent>
              <LotteryDrawingSystem
                registrations={checkedInRegistrations}
                subscriptionRevenue={subscriptionRevenue}
                demoMode={isDemoModeEnabled} // <-- Pass state Anda ke prop demoMode
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unified QR Check-in Dialog */}
      <UnifiedQRCheckinDialog
        eventId={event.id}
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onSuccess={() => {
          fetchRegistrations();
        }}
      />

    </div>
  );
}
