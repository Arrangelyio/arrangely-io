import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Image as ImageIcon, Video, Trash2, Download } from "lucide-react";

interface EventMediaManagerProps {
  eventId: string;
  isOrganizer?: boolean;
}

export function EventMediaManager({ eventId, isOrganizer = true }: EventMediaManagerProps) {
  const { toast } = useToast();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMedia, setNewMedia] = useState({
    media_type: "photo",
    caption: "",
  });
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [eventId]);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from("event_media")
        .select("*")
        .eq("event_id", eventId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setMedia(data || []);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({
          title: "Error",
          description: "Please select an image or video file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setNewMedia(prev => ({ ...prev, media_type: isImage ? "photo" : "video" }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('event-media')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-media')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from("event_media").insert({
        event_id: eventId,
        media_type: newMedia.media_type,
        media_url: publicUrl,
        caption: newMedia.caption,
        uploaded_by: userData.user?.id,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });

      setSelectedFile(null);
      setNewMedia({ media_type: "photo", caption: "" });
      fetchMedia();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      const { error } = await supabase.from("event_media").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media deleted successfully",
      });

      fetchMedia();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (mediaUrl: string, fileName: string) => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download media",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Event Media</CardTitle>
            <CardDescription>Add photos or videos from the event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({newMedia.media_type})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Caption (Optional)</Label>
              <Textarea
                placeholder="Add a caption..."
                value={newMedia.caption}
                onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
              />
            </div>

            <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Media"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Loading media...</div>
      ) : media.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No media uploaded yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div 
                  className="aspect-video bg-muted rounded-md flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.media_type === "photo" ? (
                    <img
                      src={item.media_url}
                      alt={item.caption || "Event media"}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {item.caption && (
                  <p className="text-sm text-muted-foreground mb-2">{item.caption}</p>
                )}
                {isOrganizer && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMedia(item.id)}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.caption || "Event Media"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMedia?.media_type === "photo" ? (
              <img
                src={selectedMedia.media_url}
                alt={selectedMedia.caption || "Event media"}
                className="w-full h-auto rounded-md"
              />
            ) : (
              <video
                src={selectedMedia?.media_url}
                controls
                className="w-full h-auto rounded-md"
              />
            )}
            <Button
              onClick={() => handleDownload(
                selectedMedia.media_url,
                `event-media-${selectedMedia.id}.${selectedMedia.media_type === 'photo' ? 'jpg' : 'mp4'}`
              )}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
