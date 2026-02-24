import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // 1. Tambahkan Import
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // 2. Tambahkan Import
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react"; // 3. Tambahkan Import
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateEventDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setlists, setSetlists] = useState<any[]>([]);

  // 4. State untuk loading upload gambar
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingSpeaker, setUploadingSpeaker] = useState(false);
  const [uploadingOrganizerIcon, setUploadingOrganizerIcon] = useState(false);
  const [uploadingStageSeating, setUploadingStageSeating] = useState(false);

  // 5. State formData diperbarui
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    address: "",
    google_maps_link: "",
    date: "",
    start_time: "",
    end_time: "",
    max_capacity: "",
    price: "", // Ubah ke string
    speaker_name: "",
    speaker_bio: "",
    notes: "",
    setlist_id: "none",
    organizer_email: "",
    organizer_phone: "",
    organizer_name: "",
    organizer_icon: "",
    visibility: "public", // Tambahkan field
    enable_max_purchase: false,
    max_purchase: "",
    use_core_api: true,
    banner_image_url: "", // Tambahkan field
    speaker_image_url: "", // Tambahkan field
    stage_seating_image_url: "", // Tambahkan field
    show_spots_left: true, // Tambahkan field
  });

  useEffect(() => {
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
        .eq("user_id", user.id)
        .eq("is_production", true)
        .order("name");

      if (error) throw error;
      setSetlists(data || []);
    } catch (error) {
      console.error("Error fetching setlists:", error);
    }
  };

  const isValidEmail = (email: string) => {
    if (!email) return true;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    if (!phone) return true;
    return /^\+?[0-9]+$/.test(phone);
  };

  // 6. Fungsi uploadImage generik (dari file 1, sedikit dimodifikasi)
  const uploadImage = async (file: File, folder: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-images").getPublicUrl(filePath);

    return publicUrl;
  };

  // 7. Handler baru untuk upload langsung (seperti di AdminEvents)
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    stateSetter: (loading: boolean) => void,
    formField: keyof typeof formData
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stateSetter(true);
    try {
      const publicUrl = await uploadImage(file, folder);
      setFormData((prev) => ({ ...prev, [formField]: publicUrl }));
      toast({
        title: "Success",
        description: `${formField.replace(/_/g, " ")} uploaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      stateSetter(false);
    }
  };

  // 8. handleSubmit disederhanakan (tanpa logika upload)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Logika upload gambar sudah dipindahkan ke handleFileChange

      const eventData: any = {
        ...formData,
        organizer_id: user.id,
        status: "pending",
        is_production: true,
        // Konversi ke number saat submit
        price: Number(formData.price) || 0,
        max_capacity: formData.max_capacity
          ? Number(formData.max_capacity)
          : null,
        max_purchase: formData.max_purchase
          ? Number(formData.max_purchase)
          : null,
      };

      if (!eventData.setlist_id || eventData.setlist_id === "none") {
        eventData.setlist_id = null;
      }

      // Hapus properti yg tidak perlu/kosong jika ada
      delete eventData.address; // address tidak ada di form ini

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      // Logika pembuatan tiket default (sudah benar)
      const { data: ticketType, error: ticketTypeError } = await supabase
        .from("event_ticket_types")
        .insert({
          event_id: newEvent.id,
          name: "General",
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

      const { error: categoryError } = await supabase
        .from("event_ticket_categories")
        .insert({
          ticket_type_id: ticketType.id,
          event_id: newEvent.id,
          name: "Regular",
          description: "Regular ticket",
          price: Number(formData.price) || 0,
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
        description: "Event submitted for approval with default ticket",
      });
      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Title & Location */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="Event location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Google Maps Link */}
          <div className="space-y-2">
            <Label htmlFor="google_maps_link">Google Maps Link</Label>
            <Input
              id="google_maps_link"
              placeholder="https://maps.app.goo.gl/..."
              value={formData.google_maps_link}
              onChange={(e) =>
                setFormData({ ...formData, google_maps_link: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
              />
            </div>
          </div>

          {/* Price & Max Capacity (9. Modifikasi Input) */}
          {/* <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (IDR)</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formData.price}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, "");
                  setFormData({ ...formData, price: numericValue });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                id="max_capacity"
                type="text"
                inputMode="numeric"
                placeholder="Leave empty for unlimited"
                value={formData.max_capacity}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, "");
                  setFormData({ ...formData, max_capacity: numericValue });
                }}
              />
            </div>
          </div> */}

          {/* 10. Tambahkan "Show Spots Left" */}
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
                setFormData({ ...formData, show_spots_left: checked })
              }
            />
          </div>

          {/* 11. Ganti Checkbox ke Switch */}
          {/* <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Purchase Limit per User</Label>
                <p className="text-sm text-muted-foreground">
                  Limit how many tickets each user can purchase.
                </p>
              </div>
              <Switch
                checked={formData.enable_max_purchase}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    enable_max_purchase: checked,
                    max_purchase: checked ? formData.max_purchase : "",
                  })
                }
                className="h-4 w-4"
              />
            </div>
            {formData.enable_max_purchase && (
              <div className="space-y-2">
                <Label htmlFor="max_purchase">Maximum Tickets per User</Label>
                <Input
                  id="max_purchase"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g., 5"
                  value={formData.max_purchase}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, max_purchase: numericValue });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  This limit applies to the total tickets a user can buy.
                </p>
              </div>
            )}
          </div> */}

          {/* Payment Method */}

          {/* 12. Modifikasi Input File */}
          <div className="space-y-2">
            <Label htmlFor="banner_image">Banner Image</Label>
            <Input
              id="banner_image"
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileChange(
                  e,
                  "event-banners", // Folder di storage
                  setUploadingBanner,
                  "banner_image_url" // Nama field di formData
                )
              }
              disabled={uploadingBanner}
              className="cursor-pointer"
            />
            {uploadingBanner && <Loader2 className="animate-spin" />}
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

          <div className="space-y-2">
            <Label htmlFor="stage_seating_image">
              Stage & Seating Area (Optional)
            </Label>
            <Input
              id="stage_seating_image"
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileChange(
                  e,
                  "event-images",
                  setUploadingStageSeating,
                  "stage_seating_image_url"
                )
              }
              disabled={uploadingStageSeating}
              className="cursor-pointer"
            />
            {uploadingStageSeating && <Loader2 className="animate-spin" />}
            {formData.stage_seating_image_url && (
              <div className="mt-2">
                <img
                  src={formData.stage_seating_image_url}
                  alt="Stage seating preview"
                  className="h-32 w-full object-cover rounded-md"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a seating area image to show ticket buyers the venue layout
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="speaker_name">Speaker Name (Optional)</Label>
              <Input
                id="speaker_name"
                placeholder="Speaker or instructor name"
                value={formData.speaker_name}
                onChange={(e) =>
                  setFormData({ ...formData, speaker_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speaker_image">Speaker Image</Label>
              <Input
                id="speaker_image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleFileChange(
                    e,
                    "event-images",
                    setUploadingSpeaker,
                    "speaker_image_url"
                  )
                }
                disabled={uploadingSpeaker}
              />
              {uploadingSpeaker && <Loader2 className="animate-spin" />}
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

          <div className="space-y-2">
            <Label htmlFor="speaker_bio">Speaker Bio</Label>
            <Textarea
              id="speaker_bio"
              placeholder="Speaker background and bio"
              value={formData.speaker_bio}
              onChange={(e) =>
                setFormData({ ...formData, speaker_bio: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizer_name">Organizer Name *</Label>
              <Input
                id="organizer_name"
                placeholder="Organization or your name"
                value={formData.organizer_name}
                onChange={(e) =>
                  setFormData({ ...formData, organizer_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizer_icon">Organizer Icon (Optional)</Label>
              <Input
                id="organizer_icon"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleFileChange(
                    e,
                    "event-images",
                    setUploadingOrganizerIcon,
                    "organizer_icon"
                  )
                }
                disabled={uploadingOrganizerIcon}
              />
              {uploadingOrganizerIcon && <Loader2 className="animate-spin" />}
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
            <Label htmlFor="setlist">Setlist (Optional)</Label>
            {/* ... (Konten Setlist Select Anda sudah benar) ... */}
            <Select
              value={formData.setlist_id || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  setlist_id: value === "none" ? "" : value,
                })
              }
            >
              {" "}
              <SelectTrigger>
                <SelectValue placeholder="Select a setlist" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                <SelectItem value="none">None</SelectItem>{" "}
                {setlists.map((setlist) => (
                  <SelectItem key={setlist.id} value={setlist.id}>
                    {setlist.name}{" "}
                  </SelectItem>
                ))}{" "}
              </SelectContent>{" "}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <ReactQuill
              theme="snow"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              placeholder="Additional notes or instructions for attendees"
              className="bg-background"
            />
          </div>

          {/* 13. Tambahkan "Event Visibility" */}
          <div className="space-y-2">
            <Label>Event Visibility</Label>
            <RadioGroup
              value={formData.visibility}
              onValueChange={(value) =>
                setFormData({ ...formData, visibility: value })
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

          {/* Contact Info */}
          <div className="space-y-2">
            <Label>Contact Information (At least one required) *</Label>
            {/* ... (Konten Contact Info Anda sudah benar) ... */}
            <div className="grid md:grid-cols-2 gap-4">
              {" "}
              <div className="space-y-2">
                <Label htmlFor="organizer_email">Email</Label>{" "}
                <Input
                  id="organizer_email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.organizer_email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organizer_email: e.target.value,
                    })
                  }
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label htmlFor="organizer_phone">Phone Number</Label>{" "}
                <Input
                  id="organizer_phone"
                  type="tel"
                  placeholder="+62 812 3456 7890"
                  value={formData.organizer_phone}
                  onChange={(
                    e // hanya izinkan angka dan "+"
                  ) =>
                    setFormData({
                      ...formData,
                      organizer_phone: e.target.value.replace(/[^0-9+]/g, ""),
                    })
                  }
                />{" "}
              </div>{" "}
            </div>{" "}
            {!formData.organizer_email && !formData.organizer_phone && (
              <p className="text-sm text-destructive">
                Please provide at least one contact method (email or phone){" "}
              </p>
            )}{" "}
            {formData.organizer_email &&
              !isValidEmail(formData.organizer_email) && (
                <p className="text-sm text-destructive">Invalid email format</p>
              )}{" "}
            {formData.organizer_phone &&
              !isValidPhone(formData.organizer_phone) && (
                <p className="text-sm text-destructive">
                  Phone must contain only numbers{" "}
                </p>
              )}
          </div>

          {/* 14. Modifikasi Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                uploadingBanner ||
                uploadingOrganizerIcon ||
                uploadingSpeaker ||
                uploadingStageSeating ||
                !formData.title ||
                !formData.date ||
                !formData.start_time ||
                !formData.location ||
                !formData.organizer_name ||
                (!formData.organizer_email && !formData.organizer_phone) ||
                !isValidEmail(formData.organizer_email) ||
                !isValidPhone(formData.organizer_phone)
              }
            >
              {loading ? <Loader2 className="animate-spin" /> : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
