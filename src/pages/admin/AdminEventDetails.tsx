import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  Users, 
  Download,
  CheckCircle,
  XCircle,
  Share2,
  ArrowLeft,
  Gift,
  DollarSign,
  UserCheck,
  QrCode
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import LotteryDrawingSystem from "@/components/admin/LotteryDrawingSystem";
import { UnifiedQRCheckinDialog } from "@/components/events/UnifiedQRCheckinDialog";
import { EventUshersTab } from "@/components/organizer/EventUshersTab";
import { ExpandableRegistrationRow } from "@/components/events/ExpandableRegistrationRow";
import { PromoNewsManager } from "@/components/events/PromoNewsManager";
import { TicketManagement } from "@/components/organizer/TicketManagement";
import { EventFeeSettings } from "@/components/admin/EventFeeSettings";
import { TicketSalesDashboard } from "@/components/events/TicketSalesDashboard";

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
  speaker_name?: string;
  speaker_bio?: string;
  speaker_image_url?: string;
  status: string;
  organizer_id?: string;
  created_at: string;
  setlist_id?: string;
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

export default function AdminEventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsUse, setRegistrationsUse] = useState<Registration[]>([]);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState<number>(0);
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [checkedInTickets, setCheckedInTickets] = useState<number>(0);
  const [attendeeSubscriptions, setAttendeeSubscriptions] = useState<{[key: string]: any}>({});
  const [eventTickets, setEventTickets] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<Registration | null>(null);
  const [giftAmount, setGiftAmount] = useState<number>(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [setlistData, setSetlistData] = useState<any>(null);

  useEffect(() => {
    fetchEvent();
    fetchSetlistData();
  }, [eventId]);

  const fetchSetlistData = async () => {
    if (!event?.setlist_id) {
      setSetlistData(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("setlists")
        .select(`
          id,
          name,
          setlist_songs (
            order_index,
            songs (
              id,
              title,
              artist
            )
          )
        `)
        .eq("id", event.setlist_id)
        .maybeSingle();

      if (error) throw error;
      setSetlistData(data);
    } catch (error) {
      console.error("Error fetching setlist:", error);
      setSetlistData(null);
    }
  };

  const fetchEvent = async () => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive"
      });
    }
  };

  const fetchAttendeeSubscriptions = async () => {
    if (!registrations.length) return;

    try {
      const userIds = registrations.map(reg => reg.user_id).filter(Boolean);
      
      if (userIds.length === 0) return;

      // Get current subscriptions for all attendees
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          user_id,
          status,
          subscription_plans!inner(name)
        `)
        .in('user_id', userIds)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching attendee subscriptions:', error);
        return;
      }

      // Create a map of user_id to subscription info
      const subscriptionMap = subscriptions?.reduce((acc, sub) => {
        acc[sub.user_id] = {
          status: sub.status,
          plan: sub.subscription_plans?.name || 'Unknown'
        };
        return acc;
      }, {} as {[key: string]: any}) || {};

      setAttendeeSubscriptions(subscriptionMap);
    } catch (error) {
      console.error('Error fetching attendee subscriptions:', error);
    }
  };

  const fetchSubscriptionRevenue = async () => {
    if (!eventId || !event) return;

    try {
      // Get event dates for filtering subscription period
      const eventStartDate = new Date(event.date);
      const eventEndDate = new Date(event.date);
      if (event.end_time) {
        const [hours, minutes] = event.end_time.split(':');
        eventEndDate.setHours(parseInt(hours), parseInt(minutes));
      } else {
        eventEndDate.setHours(23, 59, 59); // End of day if no end time
      }

      // Get all users who registered for this event
      const registeredUserIds = registrations.map(reg => reg.user_id).filter(Boolean);
      
      if (registeredUserIds.length === 0) {
        setSubscriptionRevenue(0);
        return;
      }

      // Query payments for subscriptions made by registered users during event period
      const { data: subscriptionPayments, error } = await supabase
        .from('payments')
        .select(`
          *,
          subscriptions!inner(*)
        `)
        .in('user_id', registeredUserIds)
        .eq('status', 'paid')
        .gte('created_at', eventStartDate.toISOString())
        .lte('created_at', eventEndDate.toISOString())
        .not('subscription_id', 'is', null);

      if (error) {
        console.error('Error fetching subscription revenue:', error);
        return;
      }

      const revenue = subscriptionPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      setSubscriptionRevenue(revenue);
    } catch (error) {
      console.error('Error calculating subscription revenue:', error);
      setSubscriptionRevenue(0);
    }
  };

  const fetchRegistrations = async () => {
  if (!eventId) return;

  try {
    const { data: regs, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("registration_date", { ascending: false });

    if (error) throw error;
    setRegistrations(regs || []);

    if (!regs?.length) {
      setRegistrationsUse([]);
      return;
    }

    const userIds = regs.map(r => r.user_id);

    // ambil subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, status, current_period_end")
      .in("user_id", userIds);

    // ambil payments hari ini
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data: pays } = await supabase
      .from("payments")
      .select("user_id, status, paid_at")
      .in("user_id", userIds)
      .eq("status", "paid")
      .gte("paid_at", startOfDay)
      .lte("paid_at", endOfDay);

    const now = new Date();
    const filtered = regs.filter(r => {
      const sub = subs?.find(s => s.user_id === r.user_id);
      const pay = pays?.find(p => p.user_id === r.user_id);

      const hasActiveSub =
        sub?.status === "active" &&
        (!sub.current_period_end || new Date(sub.current_period_end) >= now);

      const hasTodayPayment = !!pay;

      return hasActiveSub || hasTodayPayment;
    });

    setRegistrationsUse(filtered);

    // Fetch all event tickets at once
    const registrationIds = regs.map(reg => reg.id);
    if (registrationIds.length > 0) {
     // Fetch all event tickets by event_id (much faster)
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
        .eq("event_id", eventId)
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


  useEffect(() => {
    fetchEvent();
    fetchRegistrations();
    fetchTotalTickets();
    fetchCheckedInTickets();
  }, [eventId]);

  const fetchCheckedInTickets = async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("id")
        .eq("event_id", event.id)
        .not("checked_in_at", "is", null);

      if (error) throw error;

      const total = data?.length || 0;
      setCheckedInTickets(total);
    } catch (error) {
      console.error("Error fetching checked-in tickets:", error);
      setCheckedInTickets(0);
    }
  };

  const fetchTotalTickets = async () => {
    if (!eventId) return;
    
    try {
      // Count tickets from event_tickets table grouped by event_id and buyer_user_id
      const { data: tickets, error } = await supabase
        .from("event_tickets")
        .select("buyer_user_id")
        .eq("event_id", eventId);

      if (error) throw error;

      const total = tickets?.length || 0;
      setTotalTickets(total);
    } catch (error) {
      console.error("Error fetching total tickets:", error);
      setTotalTickets(0);
    }
  };

  useEffect(() => {
    if (event && registrations.length > 0) {
      fetchSubscriptionRevenue();
      fetchAttendeeSubscriptions();
    }
  }, [event, registrations]);

  const shareEvent = async () => {
    if (!event) return;
    
    // Create a professional URL structure: arrangely.io/events/event-name-id
    // const eventSlug = event.title
    //   .toLowerCase()
    //   .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    //   .replace(/\s+/g, '-') // Replace spaces with hyphens
    //   .replace(/-+/g, '-') // Replace multiple hyphens with single
    //   .trim();
    
    // const shortId = event.id.split('-')[0]; // Use first part of UUID for shorter ID
   const shareUrl = `${window.location.origin}/events/${eventId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Professional event link has been copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Share Link",
        description: shareUrl,
      });
    }
  };

  const exportParticipants = async () => {
    if (!event) return;

    try {
      const csv = [
        'Booking ID,Name,Email,Phone,Registration Date,Payment Status,Check-in Status,Amount Paid',
        ...registrations.map(reg => 
          `${reg.booking_id},"${reg.attendee_name}","${reg.attendee_email}","${reg.attendee_phone || ''}","${format(new Date(reg.registration_date), 'yyyy-MM-dd HH:mm')}","${reg.payment_status}","${reg.check_in_time ? 'Checked In' : 'Not Checked In'}","${reg.amount_paid || 0}"`
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
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
      console.error('Error exporting participants:', error);
      toast({
        title: "Error",
        description: "Failed to export participants",
        variant: "destructive"
      });
    }
  };

  const handleGiftReward = (attendee: Registration) => {
    setSelectedAttendee(attendee);
    setShowGiftModal(true);
  };

  const handleManualCheckIn = async (registration: Registration) => {
    try {
      const isCheckingIn = !registration.check_in_time;
      const updateData = isCheckingIn 
        ? { check_in_time: new Date().toISOString() }
        : { check_in_time: null };

      const { error } = await supabase
        .from('event_registrations')
        .update(updateData)
        .eq('id', registration.id);

      if (error) throw error;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === registration.id 
            ? { ...reg, check_in_time: updateData.check_in_time }
            : reg
        )
      );

      toast({
        title: "Success",
        description: `${registration.attendee_name} has been ${isCheckingIn ? 'checked in' : 'checked out'}`,
      });
    } catch (error) {
      console.error('Error updating check-in status:', error);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive"
      });
    }
  };

  const processGift = async () => {
    if (!selectedAttendee || giftAmount <= 0) return;

    try {
      // Here you would implement the gift/reward logic
      // For now, we'll just show a success message
      toast({
        title: "Gift Sent!",
        description: `Rp ${giftAmount.toLocaleString()} gift has been sent to ${selectedAttendee.attendee_name}`,
      });

      setShowGiftModal(false);
      setSelectedAttendee(null);
      setGiftAmount(0);
    } catch (error) {
      console.error('Error processing gift:', error);
      toast({
        title: "Error",
        description: "Failed to process gift",
        variant: "destructive"
      });
    }
  };

  const toggleVIPStatus = async (registration: Registration) => {
    try {
      const newVipStatus = !registration.is_vip;
      
      const { error } = await supabase
        .from('event_registrations')
        .update({ is_vip: newVipStatus })
        .eq('id', registration.id);

      if (error) throw error;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === registration.id 
            ? { ...reg, is_vip: newVipStatus }
            : reg
        )
      );

      toast({
        title: "Success",
        description: `${registration.attendee_name} VIP status ${newVipStatus ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating VIP status:', error);
      toast({
        title: "Error",
        description: "Failed to update VIP status",
        variant: "destructive"
      });
    }
  };

  // Filter registrations based on search query
  const filteredRegistrations = registrations.filter(reg => 
    reg.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.attendee_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Button onClick={() => navigate('/admin-dashboard-secure-7f8e2a9c/events')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const totalRevenue = registrations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.amount_paid || event.price), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin-dashboard-secure-7f8e2a9c/events')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-muted-foreground">{registrations.length} total registrations</p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <CardContent className="p-0">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-64 object-cover rounded-t-lg"
            />
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="sales">Ticket Sales</TabsTrigger>
          <TabsTrigger value="tickets">Tickets & Categories</TabsTrigger>
          <TabsTrigger value="fees">Fee Settings</TabsTrigger>
          <TabsTrigger value="promo">Promo News</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="ushers">Ushers</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & Gifts</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div>
                    <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
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
                    {format(new Date(event.date), 'PPP')}
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
                    {event.max_capacity || "Unlimited"} 
                    ({event.current_registrations} registered)
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
                        <p className="text-xs text-muted-foreground mt-1">{event.address}</p>
                      )}
                    </div>
                  </div>
                  {event.google_maps_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-2 h-9 text-xs"
                      onClick={() => window.open(event.google_maps_link, '_blank')}
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
                        <p className="text-muted-foreground text-sm">{event.speaker_bio}</p>
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
                      {setlistData.setlist_songs && setlistData.setlist_songs.length > 0 ? (
                        <ol className="space-y-2">
                          {setlistData.setlist_songs.map((item: any, index: number) => (
                            <li key={index} className="flex items-center gap-3">
                              <span className="text-muted-foreground text-sm">{index + 1}.</span>
                              <div>
                                <p className="text-sm font-medium">{item.songs?.title}</p>
                                {item.songs?.artist && (
                                  <p className="text-xs text-muted-foreground">{item.songs.artist}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">No songs in this setlist</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <TicketSalesDashboard eventId={event.id} />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <TicketManagement eventId={event.id} />
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <EventFeeSettings eventId={event.id} />
        </TabsContent>

        <TabsContent value="promo" className="space-y-4">
          <PromoNewsManager eventId={event.id} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Attendees ({filteredRegistrations.length})</CardTitle>
              <Button variant="outline" onClick={() => setShowQRScanner(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Scanner
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
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
                    <TableHead>Check-in</TableHead>
                    <TableHead>Subscription Plan</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <ExpandableRegistrationRow
                      key={reg.id}
                      registration={reg}
                      tickets={eventTickets[reg.id] || []}
                      attendeeSubscription={attendeeSubscriptions[reg.user_id]}
                      onToggleVIP={toggleVIPStatus}
                      onManualCheckIn={handleManualCheckIn}
                      onGiftReward={handleGiftReward}
                      showSubscription={true}
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

        <TabsContent value="rewards" className="space-y-4">
          {/* Demo Mode Toggle */}
          {registrations.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Demo Mode</h3>
                    <p className="text-xs text-muted-foreground">
                      Use demo data instead of real registrations for testing
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This will be handled by the demo mode in the component
                      window.location.reload();
                    }}
                  >
                    Use Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Lottery Drawing System */}
          <LotteryDrawingSystem 
            registrations={registrations}
            subscriptionRevenue={subscriptionRevenue}
            demoMode={registrations.length === 0}
          />
        </TabsContent>
      </Tabs>

      {/* Gift Modal */}
      <Dialog open={showGiftModal} onOpenChange={setShowGiftModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Gift to {selectedAttendee?.attendee_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gift-amount">Gift Amount (IDR)</Label>
              <Input
                id="gift-amount"
                type="number"
                value={giftAmount}
                onChange={(e) => setGiftAmount(Number(e.target.value))}
                placeholder="Enter gift amount"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowGiftModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={processGift}
                disabled={giftAmount <= 0}
                className="flex-1"
              >
                <Gift className="h-4 w-4 mr-2" />
                Send Gift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified QR Check-in Dialog */}
      {event && (
        <UnifiedQRCheckinDialog
          eventId={event.id}
          open={showQRScanner}
          onOpenChange={setShowQRScanner}
          onSuccess={() => {
            fetchRegistrations();
          }}
        />
      )}

    </div>
  );
}