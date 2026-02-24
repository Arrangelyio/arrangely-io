import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Upload, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PromoNews {
  id: string;
  title: string;
  image_url: string;
  order_index: number;
  is_active: boolean;
}

interface PromoNewsManagerProps {
  eventId: string;
}

export function PromoNewsManager({ eventId }: PromoNewsManagerProps) {
  const [newsItems, setNewsItems] = useState<PromoNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PromoNews | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    order_index: 0,
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPromoNews();
  }, [eventId]);

  const fetchPromoNews = async () => {
    try {
      const { data, error } = await supabase
        .from("event_promotional_news")
        .select("*")
        .eq("event_id", eventId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error("Error fetching promotional news:", error);
      toast({
        title: "Error",
        description: "Failed to load promotional news",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("event-images")
        .upload(`promo-news/${fileName}`, file, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("event-images")
        .getPublicUrl(`promo-news/${fileName}`);

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image_url) {
      toast({
        title: "Error",
        description: "Image is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.order_index < 0 || formData.order_index > 4) {
      toast({
        title: "Error",
        description: "Order index must be between 0 and 4",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("event_promotional_news")
          .update({
            title: formData.title,
            image_url: formData.image_url,
            order_index: formData.order_index,
            is_active: formData.is_active,
          })
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promotional news updated successfully",
        });
      } else {
        if (newsItems.length >= 5) {
          toast({
            title: "Error",
            description: "Maximum 5 promotional news items allowed",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase
          .from("event_promotional_news")
          .insert({
            event_id: eventId,
            ...formData,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promotional news added successfully",
        });
      }

      fetchPromoNews();
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving promotional news:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save promotional news",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional news?"))
      return;

    try {
      const { error } = await supabase
        .from("event_promotional_news")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotional news deleted successfully",
      });

      fetchPromoNews();
    } catch (error: any) {
      console.error("Error deleting promotional news:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete promotional news",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (item: PromoNews) => {
    try {
      const { error } = await supabase
        .from("event_promotional_news")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;

      fetchPromoNews();

      toast({
        title: "Success",
        description: `Promotional news ${!item.is_active ? "activated" : "deactivated"}`,
      });
    } catch (error: any) {
      console.error("Error toggling active status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: PromoNews) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      image_url: item.image_url,
      order_index: item.order_index,
      is_active: item.is_active,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData({
      title: "",
      image_url: "",
      order_index: newsItems.length,
      is_active: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Promotional News Carousel</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={newsItems.length >= 5}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    order_index: newsItems.length,
                  }))
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add News ({newsItems.length}/5)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} Promotional News
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter promotional news title"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="image">Banner Image * (21:9 ratio)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading && <span className="text-sm">Uploading...</span>}
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="order">Display Order (0-4) *</Label>
                  <Input
                    id="order"
                    type="number"
                    min="0"
                    max="4"
                    value={formData.order_index}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        order_index: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Order in which this news appears in the carousel
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {editingItem ? "Update" : "Add"} News
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : newsItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No promotional news yet. Add up to 5 items.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Preview</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newsItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {item.order_index}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-20 h-10 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
