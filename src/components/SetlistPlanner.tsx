// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Play,
  Edit,
  FileText,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Search,
  CloudOff,
} from "lucide-react";
import UpgradeModal from "@/components/UpgradeModalSetlist";
import { SetlistDownloadButton } from "@/components/capacitor/SetlistDownloadButton";
import { DownloadStatusBadge } from "@/components/capacitor/OfflineIndicator";
import { useSetlistDownload } from "@/hooks/useSetlistDownload";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { Capacitor } from "@capacitor/core";


interface Song {
  id: string;
  title: string;
  artist: string | null;
  current_key: string;
  original_key: string;
  tempo: number | null;
  tags: string[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  views_count: number;
  is_favorite: boolean;
  rating: number | null;
  folder_id: string | null;
  notes: string | null;
  time_signature: string;
  capo: number | null;
  last_viewed_at: string | null;
}

interface Setlist {
  id: string;
  name: string;
  date: string;
  theme: string;
  songs: Song[];
  created_at: string;
  user_id: string;
}

interface SetlistPlannerProps {
  songs: Song[];
  userId?: string;
}

const SetlistPlanner = ({ songs, userId }: SetlistPlannerProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isOnline } = useOfflineDetection();
  const { isSetlistDownloaded } = useSetlistDownload();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [performanceMode, setPerformanceMode] = useState<Setlist | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [completedSongs, setCompletedSongs] = useState<Set<string>>(new Set());
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [selectedSongForPreview, setSelectedSongForPreview] =
    useState<Song | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [newSetlist, setNewSetlist] = useState({
    name: "",
    date: "",
    theme: "",
    songs: [] as Song[],
  });

  const [draggedSong, setDraggedSong] = useState<Song | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSongs, setFilteredSongs] = useState<Song[]>(songs);

  // Load setlists from database
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await Promise.all([loadSetlists(), checkSubscriptionStatus()]);
      setLoading(false);
    };
    initialLoad();
  }, []);

  // Filter songs based on search query
  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) {
      setFilteredSongs(songs);
      return;
    }

    const results = songs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(lowerCaseQuery);
      const artistMatch = song.artist?.toLowerCase().includes(lowerCaseQuery);
      const tagMatch = song.tags?.some((tag) =>
        tag.toLowerCase().includes(lowerCaseQuery)
      );
      return titleMatch || artistMatch || tagMatch;
    });
    setFilteredSongs(results);
  }, [searchQuery, songs]);

  const checkSubscriptionStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: hasLivePreview, error } = await supabase.rpc(
        "get_user_feature",
        {
          user_id_param: user.id,
          feature_key: "setlist_plan",
        }
      );

      if (error) {
        console.error("Error fetching feature:", error);
        setIsSubscribed(false);
        return;
      }

      setIsSubscribed(hasLivePreview || false);
    } catch (err) {
      console.error("Error in checkSubscriptionStatus:", err);
      setIsSubscribed(false);
    }
  };

  const loadSetlists = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: setlistsData, error } = await supabase
        .from("setlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading setlists:", error);
        toast({
          title: "Error",
          description: "Failed to load setlists.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Convert database setlists to component format
      const formattedSetlists: Setlist[] = await Promise.all(
        (setlistsData || []).map(async (setlist) => {
          // Get songs for this setlist
          const setlistSongs: Song[] = [];
          if (setlist.song_ids && setlist.song_ids.length > 0) {
            const { data: songsData } = await supabase
              .from("songs")
              .select("*")
              .in("id", setlist.song_ids)
              .limit(1000);

            if (songsData) {
              // Maintain the order from song_ids array
              setlist.song_ids.forEach((songId) => {
                const song = songsData.find((s) => s.id === songId);
                if (song) {
                  setlistSongs.push(song);
                }
              });
            }
          }

          return {
            id: setlist.id,
            name: setlist.name,
            date: setlist.date,
            theme: setlist.theme || "",
            songs: setlistSongs,
            created_at: setlist.created_at,
            user_id: setlist.user_id,
          };
        })
      );

      setSetlists(formattedSetlists);
    } catch (error) {
      console.error("Error loading setlists:", error);
      toast({
        title: "Error",
        description: "Failed to load setlists.",
        variant: "destructive",
      });
    }
  };

  const handleStartPerformanceClick = (setlist: Setlist) => {
    if (isSubscribed) {
      startPerformance(setlist);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const createSetlist = async () => {
    if (!newSetlist.name.trim() || !newSetlist.date) {
      toast({
        title: "Missing Information",
        description: "Please fill in name and date.",
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create setlists.",
          variant: "destructive",
        });
        return;
      }

      const songIds = newSetlist.songs.map((song) => song.id);

      const { data, error } = await supabase
        .from("setlists")
        .insert({
          user_id: user.id,
          name: newSetlist.name,
          date: newSetlist.date,
          theme: newSetlist.theme,
          song_ids: songIds,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating setlist:", error);
        toast({
          title: "Error",
          description: "Failed to create setlist.",
          variant: "destructive",
        });
        return;
      }

      // Reload setlists
      await loadSetlists();

      setNewSetlist({ name: "", date: "", theme: "", songs: [] });
      setShowCreateModal(false);
      setSearchQuery("");

      toast({
        title: "Setlist Created",
        description: `"${newSetlist.name}" has been saved successfully.`,
      });
    } catch (error) {
      console.error("Error creating setlist:", error);
      toast({
        title: "Error",
        description: "Failed to create setlist.",
        variant: "destructive",
      });
    }
  };

  const deleteSetlist = async (setlistId: string) => {
    try {
      const { error } = await supabase
        .from("setlists")
        .delete()
        .eq("id", setlistId);

      if (error) {
        console.error("Error deleting setlist:", error);
        toast({
          title: "Error",
          description: "Failed to delete setlist.",
          variant: "destructive",
        });
        return;
      }

      // Reload setlists
      await loadSetlists();

      toast({
        title: "Setlist Deleted",
        description: "Setlist has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting setlist:", error);
      toast({
        title: "Error",
        description: "Failed to delete setlist.",
        variant: "destructive",
      });
    }
  };

  const handleEditModalClose = (isOpen: boolean) => {
    if (!isOpen) {
      cancelEdit();
    }
    setShowEditModal(isOpen);
  };

  const handleCreateModalClose = (isOpen: boolean) => {
    if (!isOpen) {
      setNewSetlist({ name: "", date: "", theme: "", songs: [] });
      setSearchQuery("");
    }
    setShowCreateModal(isOpen);
  };

  const editSetlist = (setlist: Setlist) => {
    setEditingSetlist(setlist);
    setNewSetlist({
      name: setlist.name,
      date: setlist.date,
      theme: setlist.theme,
      songs: [...setlist.songs],
    });
    setShowEditModal(true);
  };

  const updateSetlist = async () => {
    if (!editingSetlist || !newSetlist.name.trim() || !newSetlist.date) {
      toast({
        title: "Missing Information",
        description: "Please fill in name and date.",
        variant: "destructive",
      });
      return;
    }

    try {
      const songIds = newSetlist.songs.map((song) => song.id);

      const { error } = await supabase
        .from("setlists")
        .update({
          name: newSetlist.name,
          date: newSetlist.date,
          theme: newSetlist.theme,
          song_ids: songIds,
        })
        .eq("id", editingSetlist.id);

      if (error) {
        console.error("Error updating setlist:", error);
        toast({
          title: "Error",
          description: "Failed to update setlist.",
          variant: "destructive",
        });
        return;
      }

      // Reload setlists
      await loadSetlists();

      setNewSetlist({ name: "", date: "", theme: "", songs: [] });
      setEditingSetlist(null);
      setShowEditModal(false);
      setSearchQuery("");

      toast({
        title: "Setlist Updated",
        description: `"${newSetlist.name}" has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating setlist:", error);
      toast({
        title: "Error",
        description: "Failed to update setlist.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingSetlist(null);
    setNewSetlist({ name: "", date: "", theme: "", songs: [] });
    setShowEditModal(false);
    setSearchQuery("");
  };

  const addSongToSetlist = (song: Song) => {
    if (!newSetlist.songs.find((s) => s.id === song.id)) {
      setNewSetlist((prev) => ({
        ...prev,
        songs: [...prev.songs, song],
      }));
    }
  };

  const removeSongFromSetlist = (songId: string) => {
    setNewSetlist((prev) => ({
      ...prev,
      songs: prev.songs.filter((s) => s.id !== songId),
    }));
  };

  const handleDragStart = (song: Song, index: number) => {
    setDraggedSong(song);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedSong === null) return;

    const newSongs = [...newSetlist.songs];
    newSongs.splice(draggedIndex, 1);
    newSongs.splice(dropIndex, 0, draggedSong);

    setNewSetlist((prev) => ({ ...prev, songs: newSongs }));
    setDraggedSong(null);
    setDraggedIndex(null);
  };

  const exportSetlistPDF = (setlist: Setlist) => {
    toast({
      title: "Exporting PDF",
      description: `Exporting "${setlist.name}" as PDF...`,
    });
  };

  const exportSetlistSlides = (setlist: Setlist) => {
    toast({
      title: "Exporting Slides",
      description: `Exporting "${setlist.name}" as slides...`,
    });
  };

  const startPerformance = (setlist: Setlist) => {
    // Navigate to the dedicated setlist performance page with first song and source
    if (setlist.songs.length > 0) {
      window.location.href = `/setlist-performance/${setlist.id}/${setlist.songs[0].id}?source=setlist`;
    }
  };

  const exitPerformance = () => {
    setPerformanceMode(null);
    setCurrentSongIndex(0);
    setCompletedSongs(new Set());
  };

  const nextSong = () => {
    if (
      performanceMode &&
      currentSongIndex < performanceMode.songs.length - 1
    ) {
      setCurrentSongIndex((prev) => prev + 1);
    }
  };

  const previousSong = () => {
    if (currentSongIndex > 0) {
      setCurrentSongIndex((prev) => prev - 1);
    }
  };

  const toggleSongComplete = (songId: string) => {
    setCompletedSongs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const openSongLivePreview = (song: Song, index: number) => {
    setSelectedSongForPreview(song);
    setCurrentSongIndex(index);
    setShowLivePreview(true);
  };

  const closeLivePreview = () => {
    setShowLivePreview(false);
    setSelectedSongForPreview(null);
  };

  // Performance Mode with Live Preview Integration
  if (performanceMode) {
    const currentSong = performanceMode.songs[currentSongIndex];
    const isLastSong = currentSongIndex === performanceMode.songs.length - 1;
    const isFirstSong = currentSongIndex === 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="flex h-screen">
          {/* Main Content Area - Live Preview */}
          <div className="flex-1">
            {showLivePreview && selectedSongForPreview ? (
              <iframe
                src={`/live-preview/${selectedSongForPreview.id}`}
                className="w-full h-full border-0"
                title={`Live Preview - ${selectedSongForPreview.title}`}
              />
            ) : (
              // Fallback if no song selected
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-2xl">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Select a Song
                  </h2>
                  <p className="text-xl text-white/70 mb-8">
                    Choose a song from the setlist to start the live preview.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Setlist Overview Sidebar - Always Visible */}
          <div className="w-80 bg-slate-900/95 border-l border-white/10 p-4 overflow-y-auto">
            {/* Header with Performance Info */}
            <div className="mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">
                  {performanceMode.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitPerformance}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-white/70 mb-3">
                {performanceMode.date} • {performanceMode.songs.length} songs
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (completedSongs.size / performanceMode.songs.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-white/70">
                {completedSongs.size} of {performanceMode.songs.length}{" "}
                completed
              </div>
            </div>

            <div className="space-y-2">
              {performanceMode.songs.map((song, index) => (
                <div
                  key={song.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                    selectedSongForPreview?.id === song.id && showLivePreview
                      ? "bg-blue-500/20 border-blue-400/50"
                      : completedSongs.has(song.id)
                      ? "bg-green-500/10 border-green-400/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                  onClick={() => openSongLivePreview(song, index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        selectedSongForPreview?.id === song.id &&
                        showLivePreview
                          ? "bg-blue-500 text-white"
                          : completedSongs.has(song.id)
                          ? "bg-green-500 text-white"
                          : "bg-white/20 text-white/70 group-hover:bg-white/30 group-hover:text-white"
                      }`}
                    >
                      {completedSongs.has(song.id) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {song.title}
                      </div>
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>{song.current_key}</span>
                        {song.tempo && (
                          <>
                            <span>•</span>
                            <span>{song.tempo} BPM</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {selectedSongForPreview?.id === song.id &&
                        showLivePreview && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSongComplete(song.id);
                        }}
                        className={`w-6 h-6 p-0 ${
                          completedSongs.has(song.id)
                            ? "text-green-400 hover:text-green-300"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-white border-white/20 hover:bg-white/10"
                onClick={() => {
                  const nextIncomplete = performanceMode.songs.find(
                    (song) => !completedSongs.has(song.id)
                  );
                  if (nextIncomplete) {
                    const index = performanceMode.songs.indexOf(nextIncomplete);
                    openSongLivePreview(nextIncomplete, index);
                  }
                }}
                disabled={completedSongs.size === performanceMode.songs.length}
              >
                <Play className="h-4 w-4 mr-2" />
                Next Incomplete
              </Button>

              {completedSongs.size === performanceMode.songs.length && (
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 text-center">
                  <Check className="h-5 w-5 text-green-400 mx-auto mb-1" />
                  <div className="text-sm text-green-300 font-medium">
                    Setlist Complete!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Responsive - Show setlist overview as overlay */}
        <div className="lg:hidden">
          {/* Mobile setlist toggle would go here */}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {/* Setlist Planner */}
              {t("setlistPlanner.title")}
            </h2>
            <p className="text-muted-foreground">
              {/* Create and manage your worship service setlists */}
              {t("setlistPlanner.subtitle")}
            </p>
          </div>
          <Button
            className="bg-gradient-worship hover:opacity-90"
            onClick={() => setShowCreateModal(true)}
          >
            {/* + Create New Setlist */}
            {t("setlistPlanner.buttonCreate")}
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {/* PERBAIKAN: Header dibuat responsif */}
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left: Title & Subtitle */}
      <div className="flex flex-col text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold text-primary leading-tight">
          {t("setlistPlanner.title")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t("setlistPlanner.subtitle")}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
        {Capacitor.isNativePlatform() && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/offline-downloads")}
          >
            <CloudOff className="h-4 w-4 mr-2" />
            Offline Downloads
          </Button>
        )}

        <Button
          className="w-full sm:w-auto bg-gradient-worship hover:opacity-90"
          onClick={() => setShowCreateModal(true)}
        >
          {t("setlistPlanner.buttonCreate")}
        </Button>
      </div>
    </div>

      {/* Existing Setlists */}
      {setlists.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {/* No setlists yet */}
            {t("createNewSetlit.noSetlist")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {/* Create your first setlist to get started */}
            {t("createNewSetlit.noSetlistCreate")}
          </p>
          <Button
            className="bg-gradient-worship hover:opacity-90"
            onClick={() => setShowCreateModal(true)}
          >
            {/* + Create Your First Setlist */}
            {t("createNewSetlit.firstSetlist")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setlists.map((setlist) => (
            <Card
              key={setlist.id}
              className="border-border hover:shadow-worship transition-all duration-300"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-primary text-lg">
                      {setlist.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {setlist.date}
                    </p>
                  </div>
                  <Badge variant="outline">{setlist.songs.length} songs</Badge>
                </div>
                {setlist.theme && (
                  <p className="text-sm text-muted-foreground">
                    Theme: {setlist.theme}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {setlist.songs.slice(0, 3).map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">{song.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {song.current_key}
                      </span>
                    </div>
                  ))}
                  {setlist.songs.length > 3 && (
                    <div className="text-sm text-muted-foreground text-center">
                      +{setlist.songs.length - 3} more songs
                    </div>
                  )}
                </div>

                {/* PERBAIKAN: Layout diubah menjadi kolom di mobile, dan baris di desktop */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="sm:flex-1 bg-gradient-worship hover:opacity-90"
                    onClick={() => handleStartPerformanceClick(setlist)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {/* Start Performance */}
                    {t("setlistPlanner.buttonStart")}
                  </Button>

                  {Capacitor.isNativePlatform() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="sm:flex-1"
                      onClick={() => navigate(`/live/${setlist.id}`)}
                      disabled={!isSetlistDownloaded(setlist.id)}
                    >
                      <DownloadStatusBadge isDownloaded={isSetlistDownloaded(setlist.id)} />
                      <span className="ml-2">Offline Live</span>
                    </Button>
                  )}

                  <div className="flex gap-2">
                    {Capacitor.isNativePlatform() && userId && (
                      <SetlistDownloadButton
                        setlistId={setlist.id}
                        userId={userId}
                        size="sm"
                        showLabel={false}
                        className="h-9"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => editSetlist(setlist)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteSetlist(setlist.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Setlist Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleCreateModalClose}>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {showEditModal ? "Edit Setlist" : "Create New Setlist"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-4 -mr-4">
            {/* Setlist Details */}
            <div className="space-y-4">
              <div className="pl-1">
                <Label htmlFor="setlist-name">Setlist Name</Label>
                <Input
                  id="setlist-name"
                  value={newSetlist.name}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="live session, acoustic night, etc"
                />
              </div>

              <div className="pl-1">
                <Label htmlFor="setlist-date">Event Date</Label>
                <Input
                  id="setlist-date"
                  type="date"
                  value={newSetlist.date}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="pl-1">
                <Label htmlFor="setlist-theme">Theme (Optional)</Label>
                <Input
                  id="setlist-theme"
                  value={newSetlist.theme}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      theme: e.target.value,
                    }))
                  }
                  placeholder="Hope & Faith"
                />
              </div>

              {/* Selected Songs */}
              <div>
                <Label>Selected Songs ({newSetlist.songs.length})</Label>
                <div className="border border-border rounded-lg min-h-[200px] p-3 space-y-2">
                  {newSetlist.songs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg cursor-move"
                      draggable
                      onDragStart={() => handleDragStart(song, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{song.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {song.artist} • Key: {song.current_key}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSongFromSetlist(song.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {newSetlist.songs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Add songs from the library to create your setlist
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Available Songs */}
            <div className="space-y-4">
              <Label>Available Songs</Label>
              {/* -- START: Input Pencarian Ditambahkan -- */}
              <div className="relative">
                <Input
                  placeholder="Search by title, artist, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="border border-border rounded-lg max-h-[50vh] lg:max-h-[400px] overflow-y-auto p-3 space-y-2">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{song.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {song.artist} • Key: {song.current_key} • {song.tempo}{" "}
                        BPM
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSongToSetlist(song)}
                      disabled={newSetlist.songs.some((s) => s.id === song.id)}
                    >
                      {newSetlist.songs.some((s) => s.id === song.id)
                        ? "Added"
                        : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSetlist}
              className="bg-gradient-worship hover:opacity-90"
            >
              Create Setlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Setlist Modal */}
      <Dialog open={showEditModal} onOpenChange={handleEditModalClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit Setlist</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 overflow-y-auto pr-4 -mr-4">
            {/* Setlist Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-setlist-name">Setlist Name</Label>
                <Input
                  id="edit-setlist-name"
                  value={newSetlist.name}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Live session, Acoustic night, etc"
                />
              </div>

              <div>
                <Label htmlFor="edit-setlist-date">Event Date</Label>
                <Input
                  id="edit-setlist-date"
                  type="date"
                  value={newSetlist.date}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-setlist-theme">Theme (Optional)</Label>
                <Input
                  id="edit-setlist-theme"
                  value={newSetlist.theme}
                  onChange={(e) =>
                    setNewSetlist((prev) => ({
                      ...prev,
                      theme: e.target.value,
                    }))
                  }
                  placeholder="Hope & Faith"
                />
              </div>

              {/* Selected Songs */}
              <div>
                <Label>Selected Songs ({newSetlist.songs.length})</Label>
                <div className="border border-border rounded-lg min-h-[200px] p-3 space-y-2">
                  {newSetlist.songs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg cursor-move"
                      draggable
                      onDragStart={() => handleDragStart(song, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{song.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {song.artist} • Key: {song.current_key}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSongFromSetlist(song.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {newSetlist.songs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Add songs from the library to edit your setlist
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Available Songs */}
            <div className="space-y-4 order-first lg:order-none">
              <Label>Available Songs</Label>
              <div className="relative">
                <Input
                  placeholder="Search by title, artist, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="border border-border rounded-lg max-h-[50vh] lg:max-h-[400px] overflow-y-auto p-3 space-y-2">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{song.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {song.artist} • Key: {song.current_key} • {song.tempo}{" "}
                        BPM
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSongToSetlist(song)}
                      disabled={newSetlist.songs.some((s) => s.id === song.id)}
                    >
                      {newSetlist.songs.some((s) => s.id === song.id)
                        ? "Added"
                        : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 mt-auto border-t">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={updateSetlist}
              className="bg-gradient-worship hover:opacity-90"
            >
              Update Setlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetlistPlanner;
