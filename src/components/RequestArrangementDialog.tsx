import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";
import { useNavigate } from "react-router-dom";

// Fetch YouTube info helper
const fetchYouTubeInfo = async (url: string) => {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oEmbedUrl);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || "",
      artist: data.author_name || "",
    };
  } catch (error) {
    console.error("Error fetching YouTube info:", error);
    return null;
  }
};

interface ExistingSong {
  id: string;
  title: string;
  artist: string | null;
}

export const RequestArrangementDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    youtube_link: "",
  });
  const [existingSong, setExistingSong] = useState<ExistingSong | null>(null);
  const [youtubeError, setYoutubeError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({ title: "", artist: "", youtube_link: "" });
      setExistingSong(null);
      setYoutubeError("");
    }
  }, [open]);

  const checkForDuplicates = async (youtubeLink: string, title: string, artist: string) => {
    const videoId = extractYouTubeVideoId(youtubeLink);
    
    // Check by YouTube video ID
    if (videoId) {
      const { data: songsByVideo } = await supabase
        .from("songs")
        .select("id, title, artist, youtube_link")
        .eq("is_public", true);

      if (songsByVideo) {
        const matchingByVideo = songsByVideo.find((song) => {
          if (!song.youtube_link) return false;
          const songVideoId = extractYouTubeVideoId(song.youtube_link);
          return songVideoId === videoId;
        });

        if (matchingByVideo) {
          return matchingByVideo;
        }
      }
    }

    // Check by title and artist (case-insensitive)
    if (title && artist) {
      const { data: songsByTitleArtist } = await supabase
        .from("songs")
        .select("id, title, artist")
        .eq("is_public", true)
        .ilike("title", title.trim())
        .ilike("artist", artist.trim())
        .limit(1);

      if (songsByTitleArtist && songsByTitleArtist.length > 0) {
        return songsByTitleArtist[0];
      }
    }

    return null;
  };

  const handleYouTubeLinkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, youtube_link: url });
    setExistingSong(null);
    setYoutubeError("");

    if (!url) {
      setFormData((prev) => ({ ...prev, title: "", artist: "" }));
      return;
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      setYoutubeError("Please enter a valid YouTube URL");
      return;
    }

    setFetchingYouTube(true);
    try {
      // Fetch YouTube info
      const info = await fetchYouTubeInfo(url);
      if (info) {
        setFormData((prev) => ({
          ...prev,
          title: info.title,
          artist: info.artist,
        }));

        // Check for duplicates
        const duplicate = await checkForDuplicates(url, info.title, info.artist);
        if (duplicate) {
          setExistingSong(duplicate);
        }
      }
    } catch (error) {
      console.error("Error processing YouTube link:", error);
    } finally {
      setFetchingYouTube(false);
    }
  };

  const handleTitleArtistChange = async (field: "title" | "artist", value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setExistingSong(null);

    // Check for duplicates when both title and artist are filled
    if (newFormData.title && newFormData.artist) {
      const duplicate = await checkForDuplicates(
        newFormData.youtube_link,
        newFormData.title,
        newFormData.artist
      );
      if (duplicate) {
        setExistingSong(duplicate);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.youtube_link) {
      toast({
        title: "YouTube link required",
        description: "Please provide a YouTube link for the song",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractYouTubeVideoId(formData.youtube_link);
    if (!videoId) {
      toast({
        title: "Invalid YouTube link",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.artist) {
      toast({
        title: "Required fields missing",
        description: "Please fill in the song title and artist",
        variant: "destructive",
      });
      return;
    }

    if (existingSong) {
      toast({
        title: "Song already exists",
        description: "This song is already available in our library",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to request arrangements",
          variant: "destructive",
        });
        return;
      }

      // Insert request to database
      const { error: dbError } = await supabase
        .from("request_arrangements")
        .insert({
          user_id: user.id,
          title: formData.title,
          artist: formData.artist,
          youtube_link: formData.youtube_link,
        });

      if (dbError) throw dbError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke(
        "send-arrangement-request",
        {
          body: {
            title: formData.title,
            artist: formData.artist,
            youtube_link: formData.youtube_link,
            user_email: user.email,
          },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
      }

      toast({
        title: "Request submitted!",
        description: "We'll review your arrangement request soon.",
      });

      setFormData({ title: "", artist: "", youtube_link: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewExisting = () => {
    if (existingSong) {
      setOpen(false);
      navigate(`/arrangement/${existingSong.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Music className="h-4 w-4" />
          Request an Arrangement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request a Song Arrangement</DialogTitle>
          <DialogDescription>
            Can't find the arrangement you're looking for? Let us know what
            you'd like to see!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube_link">
              YouTube Link <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="youtube_link"
                type="url"
                value={formData.youtube_link}
                onChange={handleYouTubeLinkChange}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
              {fetchingYouTube && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {youtubeError && (
              <p className="text-sm text-destructive">{youtubeError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Song Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleArtistChange("title", e.target.value)}
              placeholder="Enter song title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">
              Artist <span className="text-destructive">*</span>
            </Label>
            <Input
              id="artist"
              value={formData.artist}
              onChange={(e) => handleTitleArtistChange("artist", e.target.value)}
              placeholder="Enter artist name"
              required
            />
          </div>

          {existingSong && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                This song already exists in our library!
              </p>
              <p className="text-sm text-muted-foreground">
                "{existingSong.title}" by {existingSong.artist || "Unknown Artist"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleViewExisting}
              >
                <ExternalLink className="h-4 w-4" />
                View Existing Arrangement
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !!existingSong}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
