import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  current_key: string;
}

interface CreateSetlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to get source from current location
function getSourceFromPath(pathname: string): string {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/community-library")) return "community-library";
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/setlist")) return "setlist";
  return "library"; // default
}

export function CreateSetlistDialog({ open, onOpenChange }: CreateSetlistDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [newSetlist, setNewSetlist] = useState({
    name: "",
    date: "",
    theme: "",
    songs: [] as Song[],
  });

  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);

  // Load user's library songs when dialog opens
  useEffect(() => {
    if (open) {
      loadUserSongs();
    }
  }, [open]);

  // Filter songs based on search query
  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) {
      setFilteredSongs(availableSongs);
      return;
    }

    const results = availableSongs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(lowerCaseQuery);
      const artistMatch = song.artist?.toLowerCase().includes(lowerCaseQuery);
      return titleMatch || artistMatch;
    });
    setFilteredSongs(results);
  }, [searchQuery, availableSongs]);

  const loadUserSongs = async () => {
    setLoadingSongs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's own songs from the songs table
      const { data: songsData, error } = await supabase
        .from("songs")
        .select("id, title, artist, current_key")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const songs: Song[] = (songsData || []).map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        current_key: song.current_key || "C",
      }));

      setAvailableSongs(songs);
      setFilteredSongs(songs);
    } catch (error) {
      console.error("Error loading songs:", error);
    } finally {
      setLoadingSongs(false);
    }
  };

  const addSongToSetlist = (song: Song) => {
    if (newSetlist.songs.find((s) => s.id === song.id)) {
      toast({
        title: "Song already added",
        description: "This song is already in the setlist.",
      });
      return;
    }
    setNewSetlist((prev) => ({ ...prev, songs: [...prev.songs, song] }));
  };

  const removeSongFromSetlist = (songId: string) => {
    setNewSetlist((prev) => ({
      ...prev,
      songs: prev.songs.filter((s) => s.id !== songId),
    }));
  };

  const createSetlist = async () => {
    if (!newSetlist.name.trim() || !newSetlist.date) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and date for your setlist.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("setlists")
        .insert({
          user_id: user.id,
          name: newSetlist.name,
          date: newSetlist.date,
          theme: newSetlist.theme || null,
          song_ids: newSetlist.songs.map((s) => s.id),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Setlist Created",
        description: `"${newSetlist.name}" has been created successfully.`,
      });

      // Reset form and close dialog
      setNewSetlist({ name: "", date: "", theme: "", songs: [] });
      setSearchQuery("");
      onOpenChange(false);

      // Navigate to the performance page with first song ID and source param
      const source = getSourceFromPath(location.pathname);
      if (data?.id && newSetlist.songs.length > 0) {
        navigate(`/setlist-performance/${data.id}/${newSetlist.songs[0].id}?source=${source}`);
      } else if (data?.id) {
        navigate(`/setlist-performance/${data.id}?source=${source}`);
      }
    } catch (error) {
      console.error("Error creating setlist:", error);
      toast({
        title: "Error",
        description: "Failed to create setlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewSetlist({ name: "", date: "", theme: "", songs: [] });
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-primary">Create New Setlist</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 overflow-hidden flex-1">
          {/* Setlist Details */}
          <div className="space-y-4 flex flex-col">
            <div>
              <Label htmlFor="setlist-name">Setlist Name</Label>
              <Input
                id="setlist-name"
                value={newSetlist.name}
                onChange={(e) =>
                  setNewSetlist((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Sunday Service, Acoustic Night, etc."
              />
            </div>

            <div>
              <Label htmlFor="setlist-date">Event Date</Label>
              <Input
                id="setlist-date"
                type="date"
                value={newSetlist.date}
                onChange={(e) =>
                  setNewSetlist((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="setlist-theme">Theme (Optional)</Label>
              <Input
                id="setlist-theme"
                value={newSetlist.theme}
                onChange={(e) =>
                  setNewSetlist((prev) => ({ ...prev, theme: e.target.value }))
                }
                placeholder="Hope & Faith, Christmas, etc."
              />
            </div>

            {/* Selected Songs */}
            <div className="flex-1 flex flex-col min-h-0">
              <Label className="mb-2">Selected Songs ({newSetlist.songs.length})</Label>
              <ScrollArea className="flex-1 border border-border rounded-lg p-2">
                <div className="space-y-1.5">
                  {newSetlist.songs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{song.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {song.artist} • Key: {song.current_key}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => removeSongFromSetlist(song.id)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {newSetlist.songs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      Add songs from your library
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Available Songs */}
          <div className="flex flex-col min-h-0">
            <Label className="mb-2">Your Library</Label>
            <div className="relative mb-2">
              <Input
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <ScrollArea className="flex-1 border border-border rounded-lg p-2">
              {loadingSongs ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Loading songs...
                </div>
              ) : filteredSongs.length > 0 ? (
                <div className="space-y-1">
                  {filteredSongs.map((song) => {
                    const isAdded = newSetlist.songs.some((s) => s.id === song.id);
                    return (
                      <div
                        key={song.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{song.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {song.artist} • Key: {song.current_key}
                          </div>
                        </div>
                        <Button
                          variant={isAdded ? "secondary" : "ghost"}
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => addSongToSetlist(song)}
                          disabled={isAdded}
                        >
                          <Plus className={`h-4 w-4 ${isAdded ? "opacity-50" : ""}`} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  {availableSongs.length === 0
                    ? "No songs in your library yet"
                    : "No songs match your search"}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={createSetlist} disabled={loading}>
            {loading ? "Creating..." : "Create Setlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
