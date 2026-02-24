import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface EventDetailsTabProps {
  event: any;
  onUpdate: () => void;
}

export function EventDetailsTab({ event, onUpdate }: EventDetailsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingSpeaker, setUploadingSpeaker] = useState(false);
  const [uploadingOrganizerIcon, setUploadingOrganizerIcon] = useState(false);
  const [uploadingStageSeating, setUploadingStageSeating] = useState(false);
  const [setlists, setSetlists] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || "",
    location: event.location,
    address: event.address || "",
    google_maps_link: event.google_maps_link || "",
    date: event.date,
    start_time: event.start_time,
    end_time: event.end_time || "",
    max_capacity: event.max_capacity || "",
    price: event.price || 0,
    speaker_name: event.speaker_name || "",
    speaker_bio: event.speaker_bio || "",
    notes: event.notes || "",
    setlist_id: event.setlist_id || "none",
    organizer_email: event.organizer_email || "",
    organizer_phone: event.organizer_phone || "",
    organizer_name: event.organizer_name || "",
    organizer_icon: event.organizer_icon || "",
    banner_image_url: event.banner_image_url || "",
    speaker_image_url: event.speaker_image_url || "",
    stage_seating_image_url: event.stage_seating_image_url || "",
    enable_max_purchase: event.enable_max_purchase || false,
    max_purchase: event.max_purchase || "",
    use_core_api: event.use_core_api ?? true,
  });

  useEffect(() => {
    fetchSetlists();
  }, []);

  const fetchSetlists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("setlists")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setSetlists(data || []);
    } catch (error) {
      console.error("Error fetching setlists:", error);
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `event-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, banner_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Banner image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast({
        title: "Error",
        description: "Failed to upload banner image",
        variant: "destructive"
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSpeakerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSpeaker(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `speaker-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, speaker_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Speaker image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading speaker image:', error);
      toast({
        title: "Error",
        description: "Failed to upload speaker image",
        variant: "destructive"
      });
    } finally {
      setUploadingSpeaker(false);
    }
  };

  const handleOrganizerIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOrganizerIcon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `organizer-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, organizer_icon: publicUrl }));

      toast({
        title: "Success",
        description: "Organizer icon uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading organizer icon:', error);
      toast({
        title: "Error",
        description: "Failed to upload organizer icon",
        variant: "destructive"
      });
    } finally {
      setUploadingOrganizerIcon(false);
    }
  };

  const handleStageSeatingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingStageSeating(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `stage-seating-${Date.now()}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, stage_seating_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Stage seating image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading stage seating image:', error);
      toast({
        title: "Error",
        description: "Failed to upload stage seating image",
        variant: "destructive"
      });
    } finally {
      setUploadingStageSeating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const updateData = { ...formData, event_id: event.id };

      const { data, error } = await supabase.functions.invoke("update-event-organizer", {
        body: updateData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error updating event:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update event",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Event Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="Event location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps_link">Google Maps Link</Label>
            <Input
              id="google_maps_link"
              placeholder="https://maps.google.com/..."
              value={formData.google_maps_link}
              onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (IDR)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                id="max_capacity"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable_max_purchase" className="text-base font-semibold">
                  Enable Maximum Purchase Limit
                </Label>
                <p className="text-sm text-muted-foreground">
                  Limit the number of tickets each user can purchase
                </p>
              </div>
              <Switch
                id="enable_max_purchase"
                checked={formData.enable_max_purchase}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enable_max_purchase: checked })
                }
              />
            </div>

            {formData.enable_max_purchase && (
              <div className="space-y-2">
                <Label htmlFor="max_purchase">Maximum Tickets Per User</Label>
                <Input
                  id="max_purchase"
                  type="number"
                  min="1"
                  placeholder="e.g., 5"
                  value={formData.max_purchase}
                  onChange={(e) =>
                    setFormData({ ...formData, max_purchase: Number(e.target.value) })
                  }
                  required={formData.enable_max_purchase}
                />
                <p className="text-xs text-muted-foreground">
                  Each user will be limited to this many tickets across all categories
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use_core_api" className="text-base font-semibold">
                  Enable Payment Method Selection
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to choose between QRIS, Virtual Account, and Credit Card. Disable for direct checkout.
                </p>
              </div>
              <Switch
                id="use_core_api"
                checked={formData.use_core_api}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, use_core_api: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_image">Banner Image</Label>
            <Input
              id="banner_image"
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              disabled={uploadingBanner}
            />
            {uploadingBanner && (
              <p className="text-sm text-muted-foreground">Uploading banner...</p>
            )}
            {formData.banner_image_url && (
              <img 
                src={formData.banner_image_url} 
                alt="Banner preview" 
                className="w-full h-32 object-cover rounded"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage_seating_image">Stage & Seating Area (Optional)</Label>
            <Input
              id="stage_seating_image"
              type="file"
              accept="image/*"
              onChange={handleStageSeatingUpload}
              disabled={uploadingStageSeating}
            />
            {uploadingStageSeating && (
              <p className="text-sm text-muted-foreground">Uploading stage seating image...</p>
            )}
            {formData.stage_seating_image_url && (
              <img 
                src={formData.stage_seating_image_url} 
                alt="Stage seating preview" 
                className="w-full h-32 object-cover rounded"
              />
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
                onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="speaker_image">Speaker Image</Label>
              <Input
                id="speaker_image"
                type="file"
                accept="image/*"
                onChange={handleSpeakerUpload}
                disabled={uploadingSpeaker}
              />
              {uploadingSpeaker && (
                <p className="text-sm text-muted-foreground">Uploading speaker image...</p>
              )}
              {formData.speaker_image_url && (
                <img 
                  src={formData.speaker_image_url} 
                  alt="Speaker preview" 
                  className="w-20 h-20 object-cover rounded-full"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaker_bio">Speaker Bio</Label>
            <Textarea
              id="speaker_bio"
              placeholder="Speaker background and bio"
              value={formData.speaker_bio}
              onChange={(e) => setFormData({ ...formData, speaker_bio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setlist">Setlist (Optional)</Label>
            <Select
              value={formData.setlist_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, setlist_id: value === "none" ? null : value })}
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <ReactQuill
              theme="snow"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              placeholder="Additional notes or instructions for attendees"
              className="bg-background"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizer_name">Organizer Name *</Label>
              <Input
                id="organizer_name"
                placeholder="Event organizer name"
                value={formData.organizer_name}
                onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizer_icon">Organizer Icon (Optional)</Label>
              <Input
                id="organizer_icon"
                type="file"
                accept="image/*"
                onChange={handleOrganizerIconUpload}
                disabled={uploadingOrganizerIcon}
              />
              {uploadingOrganizerIcon && (
                <p className="text-sm text-muted-foreground">Uploading organizer icon...</p>
              )}
              {formData.organizer_icon && (
                <img 
                  src={formData.organizer_icon} 
                  alt="Organizer icon preview" 
                  className="w-16 h-16 object-cover rounded-full"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Information (At least one required) *</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizer_email">Email</Label>
                <Input
                  id="organizer_email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.organizer_email}
                  onChange={(e) => setFormData({ ...formData, organizer_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer_phone">Phone Number</Label>
                <Input
                  id="organizer_phone"
                  type="tel"
                  placeholder="+62 812 3456 7890"
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                />
              </div>
            </div>
            {!formData.organizer_email && !formData.organizer_phone && (
              <p className="text-sm text-destructive">
                Please provide at least one contact method (email or phone)
              </p>
            )}

            {formData.organizer_email && !isValidEmail(formData.organizer_email) && (
              <p className="text-sm text-destructive">Invalid email format</p>
            )}

            {formData.organizer_phone && !isValidPhone(formData.organizer_phone) && (
              <p className="text-sm text-destructive">Phone must contain only numbers</p>
            )}
          </div>

          <Button type="submit" disabled={loading || 
            !formData.organizer_name || // organizer name required
            (!formData.organizer_email && !formData.organizer_phone) || // minimal salah satu ada
                !isValidEmail(formData.organizer_email) || // email format valid
                !isValidPhone(formData.organizer_phone)   // phone format valid
          }>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
