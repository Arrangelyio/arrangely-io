// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MoreVertical,
  Edit,
  Download,
  Eye,
  Copy,
  Heart,
  HeartOff,
  Folder,
  FolderPlus,
  Clock,
  Star,
  Filter,
  Search,
  Music,
  Calendar,
  Users,
  Tag,
  ExternalLink,
  ArrowUpDown,
  Play,
  Settings,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  User,
  Globe,
  Lock,
  Youtube,
  Loader2,
  Grid,
  CloudOff,
} from "lucide-react";
import SetlistPlanner from "./SetlistPlanner";
import EditSongModal from "./song-library/EditSongModal";
import ExportModal from "./song-library/ExportModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { OfflineSetlistsView } from "@/components/capacitor/OfflineSetlistsView";
import { OfflineSongsView } from "@/components/capacitor/OfflineSongsView";
import { OfflineConnectionBanner } from "@/components/capacitor/OfflineConnectionBanner";

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
  user_id: string;
  original_creator_id?: string;
  folder?: {
    name: string;
    color: string;
  };
  creator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  sections?: Array<{
    id: string;
    section_type: string;
    lyrics: string | null;
    chords: string | null;
    name: string | null;
  }>;
  arrangements?: Array<{
    id: string;
    position: number;
    repeat_count: number;
    notes: string | null;
  }>;
}

interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  song_count?: number;
}

// Remove the SongDetailView component entirely since we're navigating to ArrangementDetail page instead

const SongLibrary = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isOnline } = useOfflineDetection();
  const isNative = Capacitor.isNativePlatform();
  const isOfflineNative = isNative && !isOnline;

  const [songs, setSongs] = useState<Song[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [chordGridFilter, setChordGridFilter] = useState<string>("all");
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [exportingSong, setExportingSong] = useState<Song | null>(null);
  const [isAnalyzingYoutube, setIsAnalyzingYoutube] = useState(false);
  const [youtubeAnalysisResults, setYoutubeAnalysisResults] = useState<any[]>(
    []
  );
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const songsPerPage = 12;
  const [plannerSongs, setPlannerSongs] = useState<Song[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, [
    currentPage,
    sortBy,
    searchTerm,
    selectedFolder,
    filterBy,
    themeFilter,
    chordGridFilter,
  ]);

  useEffect(() => {
    fetchPlannerSongs();
    fetchCurrentUser();
    fetchFolders();
  }, []);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const fetchPlannerSongs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Ambil semua lagu tanpa paginasi, tapi beri batas aman (misal 1000)
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("user_id", user.id)
        .limit(1000);

      if (error) {
        console.error("Error fetching all songs for planner:", error);
        return;
      }

      setPlannerSongs(data || []);
    } catch (error) {
      console.error("Error in fetchPlannerSongs:", error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .single();
        setCurrentUser({ ...user, profile });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const from = (currentPage - 1) * songsPerPage;
      const to = from + songsPerPage - 1;

      // Base query with exact count enabled
      let query = supabase
        .from("songs")
        .select(
          `
                    *,
                    folder:song_folders(name, color),
                    sections:song_sections(*),
                    arrangements(*)
                `,
          { count: "exact" }
        )
        .eq("user_id", user.id);

      // Server-side search
      if (searchTerm && !isYouTubeUrl(searchTerm)) {
        const searchPattern = `%${searchTerm}%`;
        query = query.or(
          `title.ilike.${searchPattern},artist.ilike.${searchPattern}`
        );
      }

      // Server-side folder filtering
      if (selectedFolder === "favorites") {
        query = query.eq("is_favorite", true);
      } else if (selectedFolder === "unfiled") {
        query = query.is("folder_id", null);
      } else if (selectedFolder !== "all") {
        query = query.eq("folder_id", selectedFolder);
      }

      // Server-side attribute filtering
      if (filterBy === "favorites") {
        query = query.eq("is_favorite", true);
      } else if (filterBy === "recent") {
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        query = query.gte("created_at", sevenDaysAgo);
      } else if (filterBy === "public") {
        query = query.eq("is_public", true);
      } else if (filterBy === "private") {
        query = query.eq("is_public", false);
      }

      // Theme filtering
      if (themeFilter === "worship") {
        query = query.eq("theme", "worship");
      }

      // Chord grid filtering
      if (chordGridFilter === "chord_grid") {
        query = query.eq("theme", "chord_grid");
      }

      // Sorting and Pagination
      query = query
        .order(sortBy === "title" ? "title" : sortBy, {
          ascending: sortBy === "title",
        })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching songs:", error);
        toast({
          title: "Error",
          description: "Failed to load songs.",
          variant: "destructive",
        });
        return;
      }

      const songsWithCreatorProfiles = await Promise.all(
        (data || []).map(async (song) => {
          if (song.original_creator_id) {
            const { data: creatorProfile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", song.original_creator_id)
              .single();
            return { ...song, creator_profile: creatorProfile };
          }
          return song;
        })
      );

      setSongs((songsWithCreatorProfiles as unknown as Song[]) || []);
      setTotalSongs(count || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("song_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) {
        console.error("Error fetching folders:", error);
        return;
      }

      // Get song counts for each folder
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder) => {
          const { count } = await supabase
            .from("songs")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);

          return { ...folder, song_count: count || 0 };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const toggleFavorite = async (songId: string, currentFavorite: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update song favorite status
      const { error: songError } = await supabase
        .from("songs")
        .update({ is_favorite: !currentFavorite })
        .eq("id", songId)
        .eq("user_id", user.id);

      if (songError) {
        console.error("Error updating favorite:", songError);
        return;
      }

      // Log activity
      await supabase.from("song_activity").insert({
        user_id: user.id,
        song_id: songId,
        activity_type: currentFavorite ? "unfavorite" : "favorite",
      });

      // Update local state
      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId ? { ...song, is_favorite: !currentFavorite } : song
        )
      );

      toast({
        title: currentFavorite
          ? "Removed from favorites"
          : "Added to favorites",
        description: currentFavorite
          ? "Song removed from your favorites."
          : "Song added to your favorites.",
        duration: 1000,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const recordView = async (songId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Use the database function to increment views properly
      await supabase.rpc("increment_song_views", { song_id: songId });

      // Update local state
      setSongs((prev) =>
        prev.map((s) =>
          s.id === songId ? { ...s, views_count: s.views_count + 1 } : s
        )
      );

      // Log activity
      await supabase.from("song_activity").insert({
        user_id: user.id,
        song_id: songId,
        activity_type: "view",
      });
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };

  const duplicateSong = async (song: Song) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newSong = {
        title: `${song.title} (Copy)`,
        artist: song.artist,
        current_key: song.current_key as
          | "C"
          | "C#"
          | "Db"
          | "D"
          | "D#"
          | "Eb"
          | "E"
          | "F"
          | "F#"
          | "Gb"
          | "G"
          | "G#"
          | "Ab"
          | "A"
          | "A#"
          | "Bb"
          | "B",
        original_key: song.original_key as
          | "C"
          | "C#"
          | "Db"
          | "D"
          | "D#"
          | "Eb"
          | "E"
          | "F"
          | "F#"
          | "Gb"
          | "G"
          | "G#"
          | "Ab"
          | "A"
          | "A#"
          | "Bb"
          | "B",
        tempo: song.tempo,
        tags: song.tags,
        is_public: false,
        user_id: user.id,
        time_signature: song.time_signature as "4/4",
        capo: song.capo,
        notes: song.notes,
        original_creator_id: song.original_creator_id || song.user_id, // Track original creator
      };

      const { data, error } = await supabase
        .from("songs")
        .insert(newSong)
        .select()
        .single();

      if (error) {
        console.error("Error duplicating song:", error);
        toast({
          title: "Error",
          description: "Failed to duplicate song.",
          variant: "destructive",
          duration: 1000,
        });
        return;
      }

      // Copy sections from original song
      const { data: originalSections } = await supabase
        .from("song_sections")
        .select("*")
        .eq("song_id", song.id);

      if (originalSections && originalSections.length > 0) {
        const newSections = originalSections.map((section) => ({
          song_id: data.id,
          section_type: section.section_type,
          name: section.name,
          lyrics: section.lyrics,
          chords: section.chords,
          bar_count: section.bar_count,
          section_time_signature: section.section_time_signature,
        }));

        const { data: duplicatedSections } = await supabase
          .from("song_sections")
          .insert(newSections)
          .select();

        // Copy arrangements from original song
        const { data: originalArrangements } = await supabase
          .from("arrangements")
          .select("*")
          .eq("song_id", song.id);

        if (
          originalArrangements &&
          originalArrangements.length > 0 &&
          duplicatedSections
        ) {
          // Create a mapping from old section IDs to new section IDs
          const sectionIdMap = new Map();
          originalSections.forEach((originalSection, index) => {
            sectionIdMap.set(originalSection.id, duplicatedSections[index].id);
          });

          const newArrangements = originalArrangements.map((arrangement) => ({
            song_id: data.id,
            section_id: sectionIdMap.get(arrangement.section_id),
            position: arrangement.position,
            repeat_count: arrangement.repeat_count,
            notes: arrangement.notes,
          }));

          await supabase.from("arrangements").insert(newArrangements);
        }
      }

      toast({
        title: "Song Duplicated",
        description: "Song has been duplicated to your library.",
        duration: 1000,
      });

      fetchSongs(); // Refresh the list
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteSong = async (song: Song) => {
    if (song.is_public) {
      toast({
        title: "Action Prohibited",
        description: "Public songs cannot be deleted, please chat admin",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (song.original_creator_id) {
        // 🔹 Kalau ada original_creator_id → archive, bukan delete
        const { error } = await supabase
          .from("songs")
          .update({ status: "archived" })
          .eq("id", song.id)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error archiving song:", error);
          toast({
            title: "Error",
            description: "Failed to archive song.",
            variant: "destructive",
            duration: 1000,
          });
          return;
        }

        toast({
          title: "Song Archived",
          description: "Song has been archived.",
          duration: 1000,
        });
      } else {
        // 🔹 Kalau bukan hasil clone → hard delete
        await supabase.from("arrangements").delete().eq("song_id", song.id);
        await supabase.from("song_sections").delete().eq("song_id", song.id);
        await supabase.from("song_activity").delete().eq("song_id", song.id);

        const { error } = await supabase
          .from("songs")
          .delete()
          .eq("id", song.id)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error deleting song:", error);
          toast({
            title: "Error",
            description: "Failed to delete song.",
            variant: "destructive",
            duration: 1000,
          });
          return;
        }

        toast({
          title: "Song Deleted",
          description: "Song has been deleted from your library.",
          duration: 1000,
        });
      }

      fetchSongs();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete song.",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  const openDetailView = (song: Song) => {
    recordView(song.id);
    navigate(`/arrangement/${song.id}/${song.slug}?source=library`);
  };

  // YouTube URL parsing utility
  const extractYouTubeVideoId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  // Check if search term is a YouTube URL
  const isYouTubeUrl = (term: string): boolean => {
    return term.includes("youtube.com") || term.includes("youtu.be");
  };

  // Analyze YouTube URL and get song details
  const analyzeYouTubeUrl = async (url: string) => {
    if (!isYouTubeUrl(url)) return;

    setIsAnalyzingYoutube(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-youtube-audio",
        {
          body: { youtubeUrl: url },
        }
      );

      if (error) {
        console.error("YouTube analysis error:", error);
        toast({
          title: "Analysis Failed",
          description: "Could not analyze the YouTube video. Please try again.",
          variant: "destructive",
          duration: 1000,
        });
        return;
      }

      if (data) {
        // Add the analyzed song to the youtube results
        const videoId = extractYouTubeVideoId(url);
        const analysisResult = {
          id: `youtube-${videoId}`,
          title: data.title || "Unknown Title",
          artist: data.artist || "Unknown Artist",
          current_key: data.key || "C",
          original_key: data.key || "C",
          tempo: data.tempo || 120,
          time_signature: data.timeSignature || "4/4",
          tags: data.tags || [],
          is_public: false,
          is_favorite: false,
          views_count: 0,
          rating: null,
          folder_id: null,
          notes: null,
          capo: null,
          last_viewed_at: null,
          user_id: currentUser?.id || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          youtube_link: url,
          isYouTubeAnalysis: true,
          sections: data.sections || [],
          arrangements: [],
        };

        setYoutubeAnalysisResults([analysisResult]);

        toast({
          title: "YouTube Analysis Complete",
          description: `Found: ${analysisResult.title} by ${analysisResult.artist}`,
          duration: 1000,
        });
      }
    } catch (error) {
      console.error("Error analyzing YouTube URL:", error);
      toast({
        title: "Analysis Error",
        description: "An error occurred while analyzing the video.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsAnalyzingYoutube(false);
    }
  };

  // Enhanced search function
  const handleSearchSubmit = () => {
    setSearchTerm(inputValue);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (isYouTubeUrl(inputValue)) {
      analyzeYouTubeUrl(inputValue);
    }
  }, [inputValue]);
  
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "songs";

  // Filter and search logic
  const allSongs = [...songs, ...youtubeAnalysisResults];
  const filteredSongs = allSongs.filter((song) => {
    // Exclude archived songs
    if (song.status === "archived") return false;

    // Search filter
    const matchesSearch =
      !searchTerm ||
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (song.youtube_link &&
        song.youtube_link.toLowerCase().includes(searchTerm.toLowerCase()));

    // Folder filter
    const matchesFolder =
      selectedFolder === "all" ||
      (selectedFolder === "favorites" && song.is_favorite) ||
      (selectedFolder === "unfiled" && !song.folder_id) ||
      song.folder_id === selectedFolder;

    // Type filter
    const matchesFilter =
      filterBy === "all" ||
      (filterBy === "favorites" && song.is_favorite) ||
      (filterBy === "recent" &&
        new Date(song.created_at) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (filterBy === "public" && song.is_public) ||
      (filterBy === "private" && !song.is_public);

    const matchesTheme =
      themeFilter === "all" ||
      (themeFilter === "worship" && song.theme === "worship");

    const matchesChordGrid =
      chordGridFilter === "all" ||
      (chordGridFilter === "chord_grid" && song.theme === "chord_grid");

    return (
      matchesSearch &&
      matchesFolder &&
      matchesFilter &&
      matchesTheme &&
      matchesChordGrid
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-sanctuary pb-10 px-1 sm:px-1 
        ${Capacitor.isNativePlatform() ? "pt-36" : "pt-24"}
    `}
    >
      <div className="container mx-auto max-w-7xl">
        {/* Offline Connection Banner for native platforms */}
        <OfflineConnectionBanner isOnline={isOnline} className="mb-6" />

        <div className="mb-8">
          {/* Hide Back to Home link in mobile view */}
          {/* {!new URLSearchParams(window.location.search).get('isMobile') && (
    >
      <div className="container mx-auto max-w-7xl">
        <div className={isNative ? "mb-4" : "mb-8"}>
          {/* Hide Back to Home link in mobile view */}
          {/* {!new URLSearchParams(window.location.search).get('isMobile') && (
                    <Link to="/">
                        <Button variant="outline" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                )} */}
          <h1
            className={`${
              isNative ? "text-2xl" : "text-4xl"
            } font-bold text-primary mb-1 bg-gradient-worship bg-clip-text text-transparent pb-1`}
          >
            {/* Song Library */}
            {t("songLibrary.title")}
          </h1>
          <p
            className={`text-muted-foreground ${
              isNative ? "text-sm" : "text-lg"
            }`}
          >
            {/* Browse and manage your song arrangements */}
            {t("songLibrary.subtitle")}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setSearchParams({ tab: val })}
          className="space-y-6"
        >
          <TabsList
            className={`grid w-full grid-cols-2 ${isNative ? "h-10" : "h-12"}`}
          >
            <TabsTrigger
              value="songs"
              className={`${isNative ? "text-sm" : "text-base"}`}
            >
              <Music className="h-4 w-4 mr-2" />
              {t("songLibrary.song")} ({songs.length})
            </TabsTrigger>
            <TabsTrigger
              value="setlists"
              className={`${isNative ? "text-sm" : "text-base"}`}
            >
              <Users className="h-4 w-4 mr-2" />
              {t("songLibrary.setlist")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="space-y-6">
            {isOfflineNative ? (
              <OfflineSongsView />
            ) : (
              <>
                {/* Enhanced Filters and Search */}
                <Card className={isNative ? "p-3" : "p-6"}>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-5 ${
                      isNative ? "gap-2" : "gap-4"
                    }`}
                  >
                    <div className="md:col-span-2">
                      <div className="flex w-full items-center gap-2">
                        <div className="relative flex-grow">
                          <Search
                            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                              isNative ? "h-3 w-3" : "h-4 w-4"
                            } text-muted-foreground`}
                          />
                          {isAnalyzingYoutube && (
                            <Loader2
                              className={`pl-9 ${
                                isNative ? "h-9 text-sm" : "h-11"
                              }`}
                            />
                          )}
                          <Input
                            placeholder={t("songLibrary.valueSearch")}
                            // 1. Use the new inputValue state
                            value={inputValue}
                            // 2. Update only the inputValue on change
                            onChange={(e) => setInputValue(e.target.value)}
                            // 3. Trigger search on "Enter" key
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSearchSubmit();
                              }
                            }}
                            className={`pl-10 h-11 ${
                              isAnalyzingYoutube ? "pr-10" : ""
                            }`}
                          />
                        </div>
                        {/* 4. Add a search button */}
                        <Button
                          onClick={handleSearchSubmit}
                          className={isNative ? "h-9 text-xs px-3" : "h-11"}
                        >
                          {/* Search */}
                          {t("songLibrary.search")}
                        </Button>
                      </div>
                      {isYouTubeUrl(inputValue) && (
                        <p className="text-xs text-muted-foreground mt-1 ml-1">
                          <Youtube className="h-3 w-3 inline mr-1" />
                          Analyzing YouTube video...
                        </p>
                      )}
                    </div>

                    {/* <Select
                                    value={selectedFolder}
                                    onValueChange={handleFilterChange(
                                        setSelectedFolder
                                    )} // Updated handler
                                >
                                    <SelectTrigger className="h-11">
                                        <Folder className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Folders
                                        </SelectItem>
                                        <SelectItem value="favorites">
                                            ⭐ Favorites
                                        </SelectItem>
                                        <SelectItem value="unfiled">
                                            📁 Unfiled
                                        </SelectItem>
                                        {folders.map((folder) => (
                                            <SelectItem
                                                key={folder.id}
                                                value={folder.id}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                folder.color,
                                                        }}
                                                    />
                                                    {folder.name} (
                                                    {folder.song_count})
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filterBy}
                                    onValueChange={handleFilterChange(
                                        setFilterBy
                                    )} // Updated handler
                                >
                                    <SelectTrigger className="h-11">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Songs
                                        </SelectItem>
                                        <SelectItem value="favorites">
                                            ⭐ Favorites
                                        </SelectItem>
                                        <SelectItem value="recent">
                                            🕒 Recent (7 days)
                                        </SelectItem>
                                        <SelectItem value="public">
                                            🌍 Public
                                        </SelectItem>
                                        <SelectItem value="private">
                                            🔒 Private
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={themeFilter}
                                    onValueChange={handleFilterChange(
                                        setThemeFilter
                                    )}
                                >
                                    <SelectTrigger className="h-11">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="General" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All General
                                        </SelectItem>
                                        <SelectItem value="worship">
                                            Worship
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={chordGridFilter}
                                    onValueChange={handleFilterChange(
                                        setChordGridFilter
                                    )}
                                >
                                    <SelectTrigger className="h-11">
                                        <Grid className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Chord Grid" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Types
                                        </SelectItem>
                                        <SelectItem value="chord_grid">
                                            Chord Grid
                                        </SelectItem>
                                    </SelectContent>
                                </Select> */}

                    <Dialog
                      open={isCreateModalOpen}
                      onOpenChange={setCreateModalOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className={`w-full ${
                            isNative ? "h-9 text-sm" : "h-11"
                          } bg-gradient-worship hover:opacity-90 text-white font-medium`}
                        >
                          <Plus
                            className={`${
                              isNative ? "h-3 w-3" : "h-4 w-4"
                            } mr-1`}
                          />
                          {t("songLibrary.buttonNewArr")}
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-[450px] bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-6">
                        <DialogHeader className="space-y-2">
                          <DialogTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                            {/* Create New Arrangement */}
                            {t("exploreFeatures.createNewArr")}
                          </DialogTitle>
                          <DialogDescription className="text-gray-500">
                            {/* Choose how you want to start your new song arrangement. */}
                            {t("createNewSong.subtile")}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-6">
                          {/* OPSI 1: Editor Standar */}
                          <Link
                            to="/editor"
                            onClick={() => setCreateModalOpen(false)}
                            className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 hover:scale-[1.02] hover:shadow-lg transition-all"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                              <Music className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-blue-700">
                                {/* Use Standard Chord */}
                                {t("createNewSong.descStandar")}
                              </p>
                              <p className="text-sm text-gray-500">
                                {/* Use the standard editor for manual input. */}
                                {t("createNewSong.standar")}
                              </p>
                            </div>
                          </Link>

                          {/* OPSI 2: Chord Grid */}
                          <Link
                            to="/chord-grid-generator"
                            onClick={() => setCreateModalOpen(false)}
                            className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 hover:scale-[1.02] hover:shadow-lg transition-all"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                              <Grid className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-blue-700">
                                {/* Use Chord Grid */}
                                {t("createNewSong.grid")}
                              </p>
                              <p className="text-sm text-gray-500">
                                {/* Use the professional editor. */}
                                {t("createNewSong.descGrid")}
                              </p>
                            </div>
                          </Link>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {/* Showing  */}
                      {t("songLibrary.showing")}
                      {songs.length} of {totalSongs} songs
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-48">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">
                          Sort by Date Created
                        </SelectItem>
                        <SelectItem value="title">Sort by Title</SelectItem>
                        <SelectItem value="updated_at">
                          Sort by Last Updated
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                {/* Enhanced Songs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="group border-border hover:shadow-worship transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
                      onClick={() => openDetailView(song)}
                    >
                      <CardHeader className="p-5 sm:p-6 pb-3 space-y-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle
                              className={`text-primary ${
                                isNative ? "text-base" : "text-xl sm:text-lg"
                              } leading-tight line-clamp-1`}
                            >
                              {song.title}
                            </CardTitle>
                            {song.isYouTubeAnalysis && (
                              <Badge variant="secondary" className="text-xs">
                                <Youtube className="h-3 w-3 mr-1" />
                                AI Analysis
                              </Badge>
                            )}
                            {song.theme === "chord_grid" && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                <Grid className="h-3 w-3 mr-1" />
                                Chord Grid
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {song.is_favorite && (
                              <Heart className="h-4 w-4 text-red-500 fill-current" />
                            )}
                            <Badge
                              variant={song.is_public ? "default" : "secondary"}
                              className="text-xs flex items-center gap-1"
                            >
                              {song.is_public ? (
                                <Globe className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <p className="text-sm text-muted-foreground truncate">
                            by {song.artist || "Unknown"}
                          </p>
                          {song.original_creator_id &&
                            song.creator_profile &&
                            song.creator_profile.display_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  On behalf of{" "}
                                  {song.creator_profile.display_name}
                                </span>
                              </div>
                            )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="space-y-3">
                          {/* Musical Info */}
                          <div className="flex items-center gap-2 text-sm">
                            <Badge
                              variant="outline"
                              className="bg-accent/20 text-accent-foreground border-accent/30"
                            >
                              {t("songLibrary.key")}: {song.current_key}
                            </Badge>
                            {song.tempo && (
                              <Badge
                                variant="outline"
                                className="bg-primary/10 text-primary border-primary/30"
                              >
                                {song.tempo} BPM
                              </Badge>
                            )}
                          </div>

                          {/* Tags */}
                          {song.tags && song.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {song.tags
                                .filter(
                                  (tag) =>
                                    ![
                                      "beginner",
                                      "intermediate",
                                      "advanced",
                                      "easy",
                                      "hard",
                                      "difficult",
                                    ].includes(tag.toLowerCase())
                                )
                                .slice(0, 2)
                                .map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs bg-muted"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              {song.tags.filter(
                                (tag) =>
                                  ![
                                    "beginner",
                                    "intermediate",
                                    "advanced",
                                    "easy",
                                    "hard",
                                    "difficult",
                                  ].includes(tag.toLowerCase())
                              ).length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-muted"
                                >
                                  +
                                  {song.tags.filter(
                                    (tag) =>
                                      ![
                                        "beginner",
                                        "intermediate",
                                        "advanced",
                                        "easy",
                                        "hard",
                                        "difficult",
                                      ].includes(tag.toLowerCase())
                                  ).length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Folder */}
                          {song.folder && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: song.folder.color,
                                }}
                              />
                              <span className="truncate">
                                {song.folder.name}
                              </span>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>
                              {new Date(song.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-3">
                              {song.views_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {song.views_count}
                                </span>
                              )}
                              {song.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  {song.rating}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 transition-opacity">
                          {/* Removed opacity-0 group-hover:opacity-100 so buttons are always visible */}
                          <Link
                            to={`/arrangement/${song.id}/${song.slug}`}
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => recordView(song.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(song.id, song.is_favorite);
                            }}
                          >
                            {song.is_favorite ? (
                              <HeartOff className="h-3 w-3" />
                            ) : (
                              <Heart className="h-3 w-3" />
                            )}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {song.theme === "chord_grid" && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      to={`/chord-grid-generator?songId=${song.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Grid className="h-4 w-4 mr-2" />
                                      Edit in Chord Grid
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => setExportingSong(song)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateSong(song);
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={
                                  song.original_creator_id
                                    ? ""
                                    : "text-destructive"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSong(song);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {song.original_creator_id
                                  ? "Archive"
                                  : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls - NEW */}
                {totalSongs > songsPerPage && (
                  <div
                    className={`mt-8 flex items-center justify-center gap-4 ${
                      isNative ? "pb-12" : "pb-4"
                    }`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of{" "}
                      {Math.ceil(totalSongs / songsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(p + 1, Math.ceil(totalSongs / songsPerPage))
                        )
                      }
                      disabled={currentPage * songsPerPage >= totalSongs}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />{" "}
                      {/* Assuming you add ArrowRight to lucide-react imports */}
                    </Button>
                  </div>
                )}

                {filteredSongs.length === 0 && !loading && (
                  <Card className="text-center py-10 sm:py-16">
                    <CardContent>
                      {/* PERBAIKAN: Ukuran ikon dibuat responsif */}
                      <Music className="h-10 w-10 sm:h-12 sm:h-12 text-muted-foreground mx-auto mb-4" />

                      {/* PERBAIKAN: Ukuran font judul dibuat responsif */}
                      <h3 className="text-base sm:text-lg font-semibold text-primary mb-2">
                        {searchTerm ||
                        selectedFolder !== "all" ||
                        filterBy !== "all" ||
                        themeFilter !== "all" ||
                        chordGridFilter !== "all"
                          ? "No songs found matching your filters"
                          : "No songs in your library yet"}
                      </h3>

                      {/* PERBAIKAN: Ukuran font paragraf dibuat responsif */}
                      <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xs mx-auto">
                        {searchTerm ||
                        selectedFolder !== "all" ||
                        filterBy !== "all" ||
                        themeFilter !== "all" ||
                        chordGridFilter !== "all"
                          ? "Try adjusting your search or filter criteria."
                          : "Create your first worship song arrangement to get started."}
                      </p>
                      <Link to="/editor">
                        {/* PERBAIKAN: Tombol dibuat full-width di mobile */}
                        <Button className="bg-gradient-worship hover:opacity-90 w-full sm:w-auto px-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Arrangement
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="setlists">
            {isOfflineNative ? (
              <OfflineSetlistsView />
            ) : (
              <SetlistPlanner songs={plannerSongs} userId={currentUser?.id} />
            )}
          </TabsContent>
        </Tabs>

        {/* Remove the modal entirely since we navigate to ArrangementDetail page */}

        {/* Edit Modal */}
        {editingSong && (
          <EditSongModal
            song={editingSong}
            isOpen={!!editingSong}
            onClose={() => setEditingSong(null)}
            onSave={fetchSongs}
          />
        )}

        {/* Export Modal */}
        {exportingSong && (
          <ExportModal
            song={exportingSong}
            isOpen={!!exportingSong}
            onClose={() => setExportingSong(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SongLibrary;
