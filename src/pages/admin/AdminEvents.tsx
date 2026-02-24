import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Plus,
  Edit2,
  Trash2,
  Download,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  User,
  Eye,
  Share2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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
  organizer_email?: string;
  organizer_phone?: string;
  visibility?: string;
  show_spots_left: boolean;
}

interface Registration {
  id: string;
  booking_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  payment_status: string;
  status: string;
  check_in_time?: string;
  registration_date: string;
}

const AdminEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingOrganizerIcon, setUploadingOrganizerIcon] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [validatedAttendee, setValidatedAttendee] =
    useState<Registration | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    banner_image_url: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    address: "",
    google_maps_link: "",
    price: "",
    max_capacity: "",
    speaker_name: "",
    speaker_bio: "",
    speaker_image_url: "",
    stage_seating_image_url: "",
    notes: "",
    setlist_id: "none",
    organizer_email: "",
    organizer_phone: "",
    organizer_name: "",
    organizer_icon: "",
    visibility: "public",
    show_spots_left: true,
    enable_max_purchase: false,
    max_purchase: "",
    use_core_api: true,
  });
  const [setlists, setSetlists] = useState<any[]>([]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          event_ticket_types (
            event_ticket_categories (
              price
            )
          )
        `
        )
        .order("created_at", { ascending: false });

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

  const isValidEmail = (email: string) => {
    if (!email) return true; // boleh kosong asalkan ada phone
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    if (!phone) return true; // boleh kosong asalkan ada email
    return /^\+?[0-9]+$/.test(phone);
  };

  const fetchRegistrations = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("registration_date", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast({
        title: "Error",
        description: "Failed to load registrations",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchSetlists();
  }, []);

  const fetchSetlists = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("setlists")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSetlists(data || []);
    } catch (error) {
      console.error("Error fetching setlists:", error);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `event-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, banner_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Banner image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast({
        title: "Error",
        description: "Failed to upload banner image",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSpeakerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `speaker-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, speaker_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Speaker image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading speaker image:", error);
      toast({
        title: "Error",
        description: "Failed to upload speaker image",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleOrganizerIconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOrganizerIcon(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `organizer-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, organizer_icon: publicUrl }));

      toast({
        title: "Success",
        description: "Organizer icon uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading organizer icon:", error);
      toast({
        title: "Error",
        description: "Failed to upload organizer icon",
        variant: "destructive",
      });
    } finally {
      setUploadingOrganizerIcon(false);
    }
  };

  const handleStageSeatingUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `stage-seating-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, stage_seating_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Stage seating image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading stage seating image:", error);
      toast({
        title: "Error",
        description: "Failed to upload stage seating image",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const createEvent = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const eventData: any = {
        ...formData,
        price: Number(formData.price),
        max_capacity: formData.max_capacity
          ? Number(formData.max_capacity)
          : null,
        max_purchase: formData.max_purchase
          ? Number(formData.max_purchase)
          : null,
        organizer_id: user?.id,
      };

      // Handle setlist_id properly
      if (formData.setlist_id && formData.setlist_id !== "none") {
        eventData.setlist_id = formData.setlist_id;
      } else {
        delete eventData.setlist_id;
      }

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Create default ticket type and category
      const { data: ticketType, error: ticketTypeError } = await supabase
        .from("event_ticket_types")
        .insert({
          event_id: newEvent.id,
          name: "General Admission",
          description: "Standard ticket",
          order_index: 0,
          is_active: true,
        })
        .select()
        .single();

      if (ticketTypeError)
        throw new Error(
          "Failed to create ticket type: " + ticketTypeError.message
        );

      // Create default category with the event price
      const { error: categoryError } = await supabase
        .from("event_ticket_categories")
        .insert({
          ticket_type_id: ticketType.id,
          event_id: newEvent.id,
          name: "Regular",
          description: "Regular ticket",
          price: Number(formData.price),
          quota: formData.max_capacity ? Number(formData.max_capacity) : null,
          order_index: 0,
          is_active: true,
        });

      if (categoryError)
        throw new Error(
          "Failed to create ticket category: " + categoryError.message
        );

      toast({
        title: "Success",
        description: "Event created successfully with default ticket",
      });

      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        banner_image_url: "",
        date: "",
        start_time: "",
        end_time: "",
        location: "",
        address: "",
        google_maps_link: "",
        price: "",
        max_capacity: "",
        speaker_name: "",
        speaker_bio: "",
        speaker_image_url: "",
        stage_seating_image_url: "",
        notes: "",
        setlist_id: "none",
        organizer_email: "",
        organizer_phone: "",
        organizer_name: "",
        organizer_icon: "",
        visibility: "public",
        show_spots_left: true,
        enable_max_purchase: false,
        max_purchase: "",
        use_core_api: true,
      });
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Event ${
          status === "active" ? "published" : "unpublished"
        } successfully`,
      });

      fetchEvents();
    } catch (error) {
      console.error("Error updating event status:", error);
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive",
      });
    }
  };

  const exportParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if (error) throw error;

      const event = events.find((e) => e.id === eventId);
      const csv = [
        "Booking ID,Name,Email,Phone,Registration Date,Payment Status,Check-in Status",
        ...data.map(
          (reg) =>
            `${reg.booking_id},"${reg.attendee_name}","${
              reg.attendee_email
            }","${reg.attendee_phone || ""}","${format(
              new Date(reg.registration_date),
              "yyyy-MM-dd HH:mm"
            )}","${reg.payment_status}","${
              reg.check_in_time ? "Checked In" : "Not Checked In"
            }"`
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event?.title || "event"}-participants.csv`;
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

  const validateQRCode = async (qrCode: string) => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events(title)")
        .eq("qr_code", qrCode)
        .eq("event_id", selectedEventId) // Only check QR codes for the current event
        .single();

      if (error) {
        toast({
          title: "Invalid QR Code",
          description: "QR code not found or invalid for this event",
          variant: "destructive",
        });
        setValidatedAttendee(null);
        return;
      }

      if (data.check_in_time) {
        toast({
          title: "Already Checked In",
          description: "This attendee has already been checked in",
          variant: "destructive",
        });
        setValidatedAttendee(data as Registration);
        return;
      }

      // Mark as checked in
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({ check_in_time: new Date().toISOString() })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // Update the data with check-in time for display
      const updatedData = { ...data, check_in_time: new Date().toISOString() };
      setValidatedAttendee(updatedData as Registration);

      toast({
        title: "Check-in Successful ✅",
        description: `${data.attendee_name} has been checked in successfully.`,
      });

      setScannedCode("");
      // Refresh registrations to show updated status
      if (selectedEventId) {
        fetchRegistrations(selectedEventId);
      }
    } catch (error) {
      console.error("Error validating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to check in attendee",
        variant: "destructive",
      });
      setValidatedAttendee(null);
    }
  };

  const manualCheckIn = async (registration: Registration) => {
    try {
      if (registration.check_in_time) {
        toast({
          title: "Already Checked In",
          description: "This attendee has already been checked in",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("event_registrations")
        .update({ check_in_time: new Date().toISOString() })
        .eq("id", registration.id);

      if (error) throw error;

      toast({
        title: "Check-in Successful ✅",
        description: `${registration.attendee_name} has been checked in manually.`,
      });

      // Refresh registrations to show updated status
      if (selectedEventId) {
        fetchRegistrations(selectedEventId);
      }
    } catch (error) {
      console.error("Error checking in attendee:", error);
      toast({
        title: "Error",
        description: "Failed to check in attendee",
        variant: "destructive",
      });
    }
  };

  const shareEvent = async (event: Event) => {
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

  const handleViewDetails = (event: Event) => {
    navigate(`/admin-dashboard-secure-7f8e2a9c/events/${event.id}`);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      banner_image_url: event.banner_image_url || "",
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time || "",
      location: event.location,
      address: event.address || "",
      google_maps_link: event.google_maps_link || "",
      price: event.price?.toString() || "",
      max_capacity: event.max_capacity?.toString() || "",
      speaker_name: event.speaker_name || "",
      speaker_bio: event.speaker_bio || "",
      speaker_image_url: event.speaker_image_url || "",
      stage_seating_image_url: (event as any).stage_seating_image_url || "",
      notes: (event as any).notes || "",
      setlist_id: (event as any).setlist_id || "none",
      organizer_email: event.organizer_email || "",
      organizer_phone: event.organizer_phone || "",
      organizer_name: (event as any).organizer_name || "",
      organizer_icon: (event as any).organizer_icon || "",
      visibility: event.visibility || "public",
      show_spots_left: event.show_spots_left,
      enable_max_purchase: (event as any).enable_max_purchase || false,
      max_purchase: (event as any).max_purchase?.toString() || "",
      use_core_api: (event as any).use_core_api ?? true,
    });
    setShowEditDialog(true);
  };

  const updateEvent = async () => {
    try {
      if (!selectedEvent) return;

      const eventData: any = {
        ...formData,
        price: Number(formData.price),
        max_capacity: formData.max_capacity
          ? Number(formData.max_capacity)
          : null,
        max_purchase: formData.max_purchase
          ? Number(formData.max_purchase)
          : null,
      };

      // Handle setlist_id properly
      if (!eventData.setlist_id || eventData.setlist_id === "none") {
        eventData.setlist_id = null;
      }

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", selectedEvent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      setShowEditDialog(false);
      setSelectedEvent(null);
      setFormData({
        title: "",
        description: "",
        banner_image_url: "",
        date: "",
        start_time: "",
        end_time: "",
        location: "",
        address: "",
        google_maps_link: "",
        price: "",
        max_capacity: "",
        speaker_name: "",
        speaker_bio: "",
        speaker_image_url: "",
        stage_seating_image_url: "",
        notes: "",
        setlist_id: "none",
        organizer_email: "",
        organizer_phone: "",
        organizer_name: "",
        organizer_icon: "",
        visibility: "public",
        show_spots_left: true,
        enable_max_purchase: false,
        max_purchase: "",
        use_core_api: true,
      });
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  const deleteEvent = async () => {
    try {
      if (!eventToDelete) return;

      // First delete all registrations for this event
      const { error: regError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventToDelete.id);

      if (regError) throw regError;

      // Then delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      setShowDeleteDialog(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events Management</h1>
          <p className="text-muted-foreground">
            Create and manage events, view registrations, and validate tickets
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Enter event title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Event location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="google_maps_link">Google Maps Link</Label>
                    <Input
                      id="google_maps_link"
                      value={formData.google_maps_link}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          google_maps_link: e.target.value,
                        }))
                      }
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Event description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (IDR)</Label>
                    <Input
                      id="price"
                      type="text"
                      inputMode="numeric"
                      value={formData.price}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        );
                        setFormData((prev) => ({
                          ...prev,
                          price: numericValue,
                        }));
                      }}
                      placeholder="0 for free event"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_capacity">Max Capacity</Label>
                    <Input
                      id="max_capacity"
                      type="text"
                      inputMode="numeric"
                      value={formData.max_capacity}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        );
                        setFormData((prev) => ({
                          ...prev,
                          max_capacity: numericValue,
                        }));
                      }}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div> */}

                <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_spots_left">Show Spots Left</Label>
                    <p className="text-sm text-muted-foreground">
                      Display remaining ticket capacity to the public.
                    </p>
                  </div>
                  <Switch
                    id="show_spots_left"
                    checked={formData.show_spots_left}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        show_spots_left: checked,
                      }))
                    }
                  />
                </div>

                {/* <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Purchase Limit per User</Label>
                      <p className="text-sm text-muted-foreground">
                        Limit how many tickets each user can purchase across all
                        categories
                      </p>
                    </div>
                    <Switch
                      checked={formData.enable_max_purchase}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          enable_max_purchase: checked,
                          max_purchase: checked ? prev.max_purchase : "",
                        }))
                      }
                    />
                  </div>
                  {formData.enable_max_purchase && (
                    <div className="space-y-2">
                      <Label htmlFor="max_purchase_admin">
                        Maximum Tickets per User
                      </Label>
                      <Input
                        id="max_purchase_admin"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g., 5"
                        value={formData.max_purchase}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(
                            /[^0-9]/g,
                            ""
                          );
                          setFormData((prev) => ({
                            ...prev,
                            max_purchase: numericValue,
                          }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        This limit applies to the total tickets a user can buy
                        across all ticket categories
                      </p>
                    </div>
                  )}
                </div> */}

                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="use_core_api">
                        Payment Method Selection
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable Core API to let customers choose payment method.
                        Disable for direct checkout.
                      </p>
                    </div>
                    <Switch
                      id="use_core_api"
                      checked={formData.use_core_api}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          use_core_api: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="banner_image">Banner Image</Label>
                  <Input
                    id="banner_image"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="cursor-pointer"
                  />
                  {uploadingBanner && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploading...
                    </p>
                  )}
                  {formData.banner_image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.banner_image_url}
                        alt="Banner preview"
                        className="h-32 w-full object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="stage_seating_image">
                    Stage & Seating Area (Optional)
                  </Label>
                  <Input
                    id="stage_seating_image"
                    type="file"
                    accept="image/*"
                    onChange={handleStageSeatingUpload}
                    disabled={uploadingBanner}
                    className="cursor-pointer"
                  />
                  {uploadingBanner && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploading...
                    </p>
                  )}
                  {formData.stage_seating_image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.stage_seating_image_url}
                        alt="Stage seating preview"
                        className="h-32 w-full object-cover rounded-md"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a seating area image to show ticket buyers the venue
                    layout
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="speaker_name">
                      Speaker Name (Optional)
                    </Label>
                    <Input
                      id="speaker_name"
                      value={formData.speaker_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          speaker_name: e.target.value,
                        }))
                      }
                      placeholder="Speaker or instructor name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="speaker_image">Speaker Image</Label>
                    <Input
                      id="speaker_image"
                      type="file"
                      accept="image/*"
                      onChange={handleSpeakerUpload}
                      disabled={uploadingBanner}
                      className="cursor-pointer"
                    />
                    {uploadingBanner && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Uploading...
                      </p>
                    )}
                    {formData.speaker_image_url && (
                      <div className="mt-2">
                        <img
                          src={formData.speaker_image_url}
                          alt="Speaker preview"
                          className="h-20 w-20 object-cover rounded-full mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="speaker_bio">Speaker Bio</Label>
                  <Textarea
                    id="speaker_bio"
                    value={formData.speaker_bio}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        speaker_bio: e.target.value,
                      }))
                    }
                    placeholder="Speaker background and bio"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organizer_name">Organizer Name *</Label>
                    <Input
                      id="organizer_name"
                      placeholder="Organization or your name"
                      value={formData.organizer_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          organizer_name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="organizer_icon">
                      Organizer Icon (Optional)
                    </Label>
                    <Input
                      id="organizer_icon"
                      type="file"
                      accept="image/*"
                      onChange={handleOrganizerIconUpload}
                      disabled={uploadingOrganizerIcon}
                      className="cursor-pointer"
                    />
                    {uploadingOrganizerIcon && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Uploading...
                      </p>
                    )}
                    {formData.organizer_icon && (
                      <div className="mt-2">
                        <img
                          src={formData.organizer_icon}
                          alt="Organizer icon preview"
                          className="h-16 w-16 object-cover rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Event Visibility</Label>
                  <RadioGroup
                    defaultValue="public"
                    value={formData.visibility}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, visibility: value }))
                    }
                  >
                    <div className="flex items-center space-x-2 rounded-md border p-4">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="font-normal w-full">
                        <p>Public</p>
                        <p className="text-sm text-muted-foreground">
                          Shown on the events page and in search.
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-4">
                      <RadioGroupItem value="unlisted" id="unlisted" />
                      <Label htmlFor="unlisted" className="font-normal w-full">
                        <p>Unlisted</p>
                        <p className="text-sm text-muted-foreground">
                          Only accessible via a direct link.
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.notes}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, notes: value }))
                    }
                    placeholder="Additional notes or instructions for attendees"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setlist">Setlist (Optional)</Label>
                  <Select
                    value={formData.setlist_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        setlist_id: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a setlist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {setlists.map((setlist) => (
                        <SelectItem key={setlist.id} value={setlist.id}>
                          {setlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contact Information (At least one required) *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organizer_email">Email</Label>
                      <Input
                        id="organizer_email"
                        type="email"
                        placeholder="contact@example.com"
                        value={formData.organizer_email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            organizer_email: e.target.value,
                          }))
                        }
                        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                      />
                    </div>
                    <div>
                      <Label htmlFor="organizer_phone">Phone</Label>
                      <Input
                        id="organizer_phone"
                        type="tel"
                        placeholder="+62 812 3456 7890"
                        value={formData.organizer_phone}
                        onChange={(e) =>
                          // hanya izinkan angka dan "+"
                          setFormData({
                            ...formData,
                            organizer_phone: e.target.value.replace(
                              /[^0-9+]/g,
                              ""
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  {!formData.organizer_email && !formData.organizer_phone && (
                    <p className="text-sm text-destructive">
                      Please provide at least one contact method
                    </p>
                  )}

                  {formData.organizer_email &&
                    !isValidEmail(formData.organizer_email) && (
                      <p className="text-sm text-destructive">
                        Invalid email format
                      </p>
                    )}

                  {formData.organizer_phone &&
                    !isValidPhone(formData.organizer_phone) && (
                      <p className="text-sm text-destructive">
                        Phone must contain only numbers
                      </p>
                    )}
                </div>

                <Button
                  onClick={createEvent}
                  disabled={
                    !formData.title ||
                    !formData.date ||
                    !formData.start_time ||
                    !formData.location ||
                    !formData.organizer_name ||
                    (!formData.organizer_email && !formData.organizer_phone) ||
                    !isValidEmail(formData.organizer_email) ||
                    !isValidPhone(formData.organizer_phone)
                  }
                  className="w-full"
                >
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">All Events</TabsTrigger>
          <TabsTrigger value="dashboard">Event Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-64"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  {event.banner_image_url && (
                    <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10">
                      <img
                        src={event.banner_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-1">
                        {event.title}
                      </CardTitle>
                      <Badge
                        variant={
                          event.status === "active" ? "default" : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {format(new Date(event.date), "PPP")}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {event.start_time} - {event.end_time}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        {event.current_registrations} registered
                      </div>
                      <div className="font-semibold text-muted-foreground text-sm">
                        From{" "}
                        {event.price === 0
                          ? "Free"
                          : `Rp ${event.price.toLocaleString()}`}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t">
                      {/* Main Actions Row */}
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          onClick={() => handleViewDetails(event)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteEvent(event)}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      {/* Status Toggle */}
                      <Button
                        variant={
                          event.status === "active" ? "secondary" : "default"
                        }
                        onClick={() =>
                          updateEventStatus(
                            event.id,
                            event.status === "active" ? "cancelled" : "active"
                          )
                        }
                        className="w-full"
                      >
                        {event.status === "active" ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          {selectedEventId ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {events.find((e) => e.id === selectedEventId)?.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {registrations.length} total registrations
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Scanner
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>QR Code Check-in</DialogTitle>
                      </DialogHeader>

                      {!validatedAttendee ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="qr-code">Enter QR Code</Label>
                            <Input
                              id="qr-code"
                              value={scannedCode}
                              onChange={(e) => setScannedCode(e.target.value)}
                              placeholder="Scan or enter QR code"
                              className="font-mono"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Sample QR Code:{" "}
                              <span className="font-mono font-semibold">
                                QR-SAMPLE-001
                              </span>
                            </p>
                          </div>
                          <Button
                            onClick={() => validateQRCode(scannedCode)}
                            disabled={!scannedCode}
                            className="w-full"
                          >
                            Check In Attendee
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="text-center">
                            {validatedAttendee.check_in_time ? (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                                <CheckCircle className="h-4 w-4" />
                                Checked In Successfully
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full">
                                <AlertCircle className="h-4 w-4" />
                                Already Checked In
                              </div>
                            )}
                          </div>

                          <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {validatedAttendee.attendee_name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {validatedAttendee.attendee_email}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Booking ID
                                </p>
                                <p className="font-mono text-sm">
                                  {validatedAttendee.booking_id}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Payment Status
                                </p>
                                <p className="text-sm capitalize">
                                  {validatedAttendee.payment_status}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Registration Date
                                </p>
                                <p className="text-sm">
                                  {format(
                                    new Date(
                                      validatedAttendee.registration_date
                                    ),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                              {validatedAttendee.check_in_time && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Check-in Time
                                  </p>
                                  <p className="text-sm">
                                    {format(
                                      new Date(validatedAttendee.check_in_time),
                                      "HH:mm"
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setValidatedAttendee(null);
                                setScannedCode("");
                              }}
                              className="flex-1"
                            >
                              Scan Another
                            </Button>
                            <Button
                              onClick={() => {
                                setShowQRScanner(false);
                                setValidatedAttendee(null);
                                setScannedCode("");
                                // Refresh registrations to show latest check-in status
                                fetchRegistrations(selectedEventId);
                              }}
                              className="flex-1"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => {
                      const event = events.find(
                        (e) => e.id === selectedEventId
                      );
                      if (event) shareEvent(event);
                    }}
                    variant="outline"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Event
                  </Button>
                  <Button
                    onClick={() => exportParticipants(selectedEventId)}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Total Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {registrations.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Confirmed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        registrations.filter((r) => r.status === "confirmed")
                          .length
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Checked In</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {registrations.filter((r) => r.check_in_time).length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Rp{" "}
                      {(
                        (events.find((e) => e.id === selectedEventId)?.price ||
                          0) *
                        registrations.filter((r) => r.status === "confirmed")
                          .length
                      ).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.booking_id}
                          </TableCell>
                          <TableCell>{reg.attendee_name}</TableCell>
                          <TableCell>{reg.attendee_email}</TableCell>
                          <TableCell>{reg.attendee_phone || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                reg.status === "confirmed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {reg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reg.check_in_time ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <div>
                                  <div className="text-sm font-medium">
                                    Checked In
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(reg.check_in_time),
                                      "HH:mm"
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center text-muted-foreground">
                                <XCircle className="h-4 w-4 mr-1" />
                                Not Checked In
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(reg.registration_date),
                              "MMM d, yyyy"
                            )}
                          </TableCell>
                          <TableCell>
                            {!reg.check_in_time &&
                            reg.status === "confirmed" ? (
                              <Button
                                size="sm"
                                onClick={() => manualCheckIn(reg)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Check In
                              </Button>
                            ) : reg.check_in_time ? (
                              <span className="text-sm text-green-600 font-medium">
                                ✓ Checked In
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select an Event</h3>
              <p className="text-muted-foreground">
                Choose an event from the "All Events" tab to view its dashboard
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Details - {selectedEvent?.title}</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Share Button Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Event Management</h3>
                  <p className="text-muted-foreground">
                    View details and manage event
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => shareEvent(selectedEvent)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event Link
                </Button>
              </div>

              {/* Event Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <p className="font-medium">{selectedEvent.title}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge
                        variant={
                          selectedEvent.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {selectedEvent.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <p className="text-muted-foreground">
                      {selectedEvent.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Date</Label>
                      <div className="flex items-center text-sm">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {format(new Date(selectedEvent.date), "PPP")}
                      </div>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2" />
                        {selectedEvent.start_time} - {selectedEvent.end_time}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <div className="space-y-3 mt-2">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {selectedEvent.location}
                            </p>
                            {selectedEvent.address && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {selectedEvent.address}
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedEvent.google_maps_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center gap-2 h-9 text-xs"
                            onClick={() =>
                              window.open(
                                selectedEvent.google_maps_link,
                                "_blank"
                              )
                            }
                          >
                            <MapPin className="h-3 w-3" />
                            Open in Google Maps
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price Range</Label>
                      <p className="font-medium text-muted-foreground text-sm">
                        See Tickets & Categories tab for full pricing
                      </p>
                    </div>
                    <div>
                      <Label>Capacity</Label>
                      <p className="font-medium">
                        {selectedEvent.max_capacity || "Unlimited"}(
                        {selectedEvent.current_registrations} registered)
                      </p>
                    </div>
                  </div>

                  {selectedEvent.speaker_name && (
                    <div>
                      <Label>Speaker</Label>
                      <p className="font-medium">
                        {selectedEvent.speaker_name}
                      </p>
                      {selectedEvent.speaker_bio && (
                        <p className="text-muted-foreground text-sm mt-1">
                          {selectedEvent.speaker_bio}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Registrations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Participants ({registrations.length})</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportParticipants(selectedEvent.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.slice(0, 10).map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.booking_id}
                          </TableCell>
                          <TableCell>{reg.attendee_name}</TableCell>
                          <TableCell>{reg.attendee_email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                reg.status === "confirmed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {reg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reg.check_in_time ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {registrations.length > 10 && (
                    <p className="text-center text-muted-foreground text-sm mt-2">
                      Showing first 10 registrations. Export CSV for complete
                      list.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Event location"
                />
              </div>
              <div>
                <Label htmlFor="edit-google_maps_link">Google Maps Link</Label>
                <Input
                  id="edit-google_maps_link"
                  value={formData.google_maps_link}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      google_maps_link: e.target.value,
                    }))
                  }
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-start_time">Start Time</Label>
                <Input
                  id="edit-start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-end_time">End Time</Label>
                <Input
                  id="edit-end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_time: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Price (IDR)</Label>
                <Input
                  id="edit-price"
                  type="text"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, "");
                    setFormData((prev) => ({ ...prev, price: numericValue }));
                  }}
                  placeholder="0 for free event"
                />
              </div>
              <div>
                <Label htmlFor="edit-max_capacity">Max Capacity</Label>
                <Input
                  id="edit-max_capacity"
                  type="text"
                  inputMode="numeric"
                  value={formData.max_capacity}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, "");
                    setFormData((prev) => ({
                      ...prev,
                      max_capacity: numericValue,
                    }));
                  }}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-show_spots_left">Show Spots Left</Label>
                <p className="text-sm text-muted-foreground">
                  Display remaining ticket capacity to the public.
                </p>
              </div>
              <Switch
                id="edit-show_spots_left"
                checked={formData.show_spots_left}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    show_spots_left: checked,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-banner_image">Banner Image</Label>
              <Input
                id="edit-banner_image"
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
                className="cursor-pointer"
              />
              {uploadingBanner && (
                <p className="text-sm text-muted-foreground mt-1">
                  Uploading...
                </p>
              )}
              {formData.banner_image_url && (
                <div className="mt-2">
                  <img
                    src={formData.banner_image_url}
                    alt="Banner preview"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="edit-stage_seating_image">
                Stage & Seating Area (Optional)
              </Label>
              <Input
                id="edit-stage_seating_image"
                type="file"
                accept="image/*"
                onChange={handleStageSeatingUpload}
                disabled={uploadingBanner}
                className="cursor-pointer"
              />
              {uploadingBanner && (
                <p className="text-sm text-muted-foreground mt-1">
                  Uploading...
                </p>
              )}
              {formData.stage_seating_image_url && (
                <div className="mt-2">
                  <img
                    src={formData.stage_seating_image_url}
                    alt="Stage seating preview"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Upload a seating area image to show ticket buyers the venue
                layout
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-speaker_name">
                  Speaker Name (Optional)
                </Label>
                <Input
                  id="edit-speaker_name"
                  value={formData.speaker_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      speaker_name: e.target.value,
                    }))
                  }
                  placeholder="Speaker or instructor name"
                />
              </div>
              <div>
                <Label htmlFor="edit-speaker_image">Speaker Image</Label>
                <Input
                  id="edit-speaker_image"
                  type="file"
                  accept="image/*"
                  onChange={handleSpeakerUpload}
                  disabled={uploadingBanner}
                  className="cursor-pointer"
                />
                {uploadingBanner && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploading...
                  </p>
                )}
                {formData.speaker_image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.speaker_image_url}
                      alt="Speaker preview"
                      className="h-20 w-20 object-cover rounded-full mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="edit-speaker_bio">Speaker Bio</Label>
              <Textarea
                id="edit-speaker_bio"
                value={formData.speaker_bio}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    speaker_bio: e.target.value,
                  }))
                }
                placeholder="Speaker background and bio"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-organizer_name">Organizer Name *</Label>
                <Input
                  id="edit-organizer_name"
                  value={formData.organizer_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      organizer_name: e.target.value,
                    }))
                  }
                  placeholder="Event organizer name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-organizer_icon">
                  Organizer Icon (Optional)
                </Label>
                <Input
                  id="edit-organizer_icon"
                  type="file"
                  accept="image/*"
                  onChange={handleOrganizerIconUpload}
                  disabled={uploadingOrganizerIcon}
                  className="cursor-pointer"
                />
                {uploadingOrganizerIcon && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploading...
                  </p>
                )}
                {formData.organizer_icon && (
                  <div className="mt-2">
                    <img
                      src={formData.organizer_icon}
                      alt="Organizer icon preview"
                      className="h-16 w-16 object-cover rounded-full mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event Visibility</Label>
              <RadioGroup
                defaultValue="public"
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, visibility: value }))
                }
              >
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="font-normal w-full">
                    <p>Public</p>
                    <p className="text-sm text-muted-foreground">
                      Shown on the events page and in search.
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <RadioGroupItem value="unlisted" id="unlisted" />
                  <Label htmlFor="unlisted" className="font-normal w-full">
                    <p>Unlisted</p>
                    <p className="text-sm text-muted-foreground">
                      Only accessible via a direct link.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <ReactQuill
                theme="snow"
                value={formData.notes}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, notes: value }))
                }
                placeholder="Additional notes or instructions for attendees"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-setlist">Setlist (Optional)</Label>
              <Select
                value={formData.setlist_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    setlist_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a setlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {setlists.map((setlist) => (
                    <SelectItem key={setlist.id} value={setlist.id}>
                      {setlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact Information (At least one required) *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-organizer_email">Email</Label>
                  <Input
                    id="organizer_email"
                    type="text"
                    placeholder="contact@example.com"
                    value={formData.organizer_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organizer_email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-organizer_phone">Phone</Label>
                  <Input
                    id="organizer_phone"
                    type="tel"
                    placeholder="+62 812 3456 7890"
                    value={formData.organizer_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organizer_phone: e.target.value.replace(/[^0-9+]/g, ""),
                      })
                    }
                  />
                </div>
              </div>

              {/* error messages ditaruh di bawah semua */}
              {!formData.organizer_email && !formData.organizer_phone && (
                <p className="text-sm text-destructive">
                  Please provide at least one contact method
                </p>
              )}

              {formData.organizer_email &&
                !isValidEmail(formData.organizer_email) && (
                  <p className="text-sm text-destructive">
                    Invalid email format
                  </p>
                )}

              {formData.organizer_phone &&
                !isValidPhone(formData.organizer_phone) && (
                  <p className="text-sm text-destructive">
                    Phone must contain only numbers
                  </p>
                )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={updateEvent}
                disabled={
                  !formData.title ||
                  !formData.date ||
                  !formData.start_time ||
                  !formData.location ||
                  (!formData.organizer_email && !formData.organizer_phone) || // minimal salah satu ada
                  !isValidEmail(formData.organizer_email) || // email format valid
                  !isValidPhone(formData.organizer_phone) // phone format valid
                }
                className="flex-1"
              >
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventToDelete?.title}"? This
              action cannot be undone.
              <br />
              <br />
              <strong>This will also delete:</strong>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>
                  All {eventToDelete?.current_registrations || 0} event
                  registrations
                </li>
                <li>All participant data and QR codes</li>
                <li>All event-related records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEvents;
