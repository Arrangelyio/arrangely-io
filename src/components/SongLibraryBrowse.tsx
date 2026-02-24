// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useLibraryLimit } from "@/hooks/useLibraryLimit";
import { LibraryLimitModal } from "@/components/LibraryLimitModal";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Heart,
  Star,
  Play,
  Music,
  Clock,
  Eye,
  Share2, // Pastikan ini ada
  Plus,
  ArrowLeft,
  ArrowRight,
  Youtube,
  UserPlus,
  UserCheck,
  Verified,
  Crown,
  Lock,
  Grid,
  List,
  Loader2,
  Sparkles,
  Upload,
  Check,
  ListFilter,
  Users,
  X,
} from "lucide-react";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useYouTubeImportLimit } from "@/hooks/useYouTubeImportLimit";
import UpgradeModal from "@/components/monetization/UpgradeModal";
import PaymentModal from "@/components/payment/PaymentModal";
import { ResponsiveFilterDialog } from "@/components/ResponsiveFilterDialog"; // Ganti path jika perlu
import { RequestArrangementDialog } from "@/components/RequestArrangementDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
// import { ListFilter } from "lucide-react"; // Pastikan ListFilter sudah diimpor
import { Capacitor } from "@capacitor/core";
import {
  MarketplaceTabs,
  type MarketplaceTab,
} from "@/components/marketplace/MarketplaceTabs";
import { CommunityLibraryHero } from "@/components/marketplace/CommunityLibraryHero";
import { CreatorProSection } from "@/components/marketplace/CreatorProSection";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";
import { MusicAnimatedBackground } from "@/components/backgrounds/MusicAnimatedBackground";
import GlobalSearchBar from "./search/GlobalSearchBar";
import { Share } from "@capacitor/share";
import { useCommunityCreators } from "@/hooks/useCommunityCreators";

const IS_TRIAL_ENABLED = false;

// Function to detect arrangement type based on lyrics format
const detectArrangementType = (song: {
  song_sections?: Array<{ lyrics?: string | null }>;
  theme?: string;
}): "chord_grid" | "chord_lyrics" => {
  // First check: Use theme property if available
  if (song.theme === "chord_grid") {
    return "chord_grid";
  }

  // Second check: Check if song has song_sections with lyrics
  if (song.song_sections && song.song_sections.length > 0) {
    // Look for any section with chord grid format (JSON format)
    const hasChordGrid = song.song_sections.some((section) => {
      if (section.lyrics && typeof section.lyrics === "string") {
        const trimmedLyrics = section.lyrics.trim();

        // Check if lyrics is JSON array format (starts with [ and ends with ])
        if (trimmedLyrics.startsWith("[") && trimmedLyrics.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmedLyrics);

            // Additional check: ensure it's an array with chord objects
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Check if first object has chord-related properties
              const firstItem = parsed[0];
              if (firstItem && typeof firstItem === "object") {
                // Look for chord grid specific properties
                return (
                  firstItem.hasOwnProperty("chord") ||
                  firstItem.hasOwnProperty("id") ||
                  firstItem.hasOwnProperty("beats")
                );
              }
            }
            return false;
          } catch (e) {
            return false;
          }
        }
      }
      return false;
    });

    if (hasChordGrid) {
      return "chord_grid";
    }
  }

  // Default to chord + lyrics format
  return "chord_lyrics";
};

const SongLibraryBrowse = () => {
  const { t } = useLanguage();
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [songToShare, setSongToShare] = useState<any>(null);
  const isNative = Capacitor.isNativePlatform();
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]); // [!code ++]
  const [trendingLoading, setTrendingLoading] = useState(true); // [!code ++]
  const isMobileView = useIsMobile();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("verified");
  const [communitySongs, setCommunitySongs] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  // Note: Community songs now use the main `songs` state and `loadingSong` state
  const [searchParams] = useSearchParams();
  const urlSearchTerm = searchParams.get("search") || "";

  const [newTrustedArrangerSongs, setNewTrustedArrangerSongs] = useState<any[]>(
    [],
  );
  const [newTrustedArrangerLoading, setNewTrustedArrangerLoading] =
    useState(true);

  const [christmasSongs, setChristmasSongs] = useState<any[]>([]);
  const [christmasLoading, setChristmasLoading] = useState(true);
  const christmasScrollRef = useRef<HTMLDivElement>(null);

  const [showTrendingSongs, setShowTrendingSongs] = useState(true);

  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const newTrustedArrangerScrollRef = useRef<HTMLDivElement>(null);
  const [showNewTrustedArrangerLeftArrow, setShowNewTrustedArrangerLeftArrow] =
    useState(false);
  const [
    showNewTrustedArrangerRightArrow,
    setShowNewTrustedArrangerRightArrow,
  ] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const [showChristmasLeftArrow, setShowChristmasLeftArrow] = useState(false);
  const [showChristmasRightArrow, setShowChristmasRightArrow] = useState(false);

  const arrangersScrollRef = useRef<HTMLDivElement>(null);
  const [showArrangersLeftArrow, setShowArrangersLeftArrow] = useState(false);
  const [showArrangersRightArrow, setShowArrangersRightArrow] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUserRole();
  const { subscriptionStatus, startFreeTrial } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [loadingSong, setLoadingSong] = useState(true);
  const [loadingTrusted, setLoadingTrusted] = useState(true);
  const [songs, setSongs] = useState<any[]>([]);
  const [trustedArrangers, setTrustedArrangers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [chordGridFilter, setChordGridFilter] = useState("all");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [previewSong, setPreviewSong] = useState<any>(null);
  const [previewSections, setPreviewSections] = useState<any[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const {
    libraryUsage,
    loading: libraryLoading,
    recordLibraryAction,
  } = useLibraryLimit();
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [pendingSongAdd, setPendingSongAdd] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isAnalyzingYoutube, setIsAnalyzingYoutube] = useState(false);
  const [youtubeAnalysisResults, setYoutubeAnalysisResults] = useState<any[]>(
    [],
  );
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());

  const [librarySongIds, setLibrarySongIds] = useState<Map<string, string>>(
    new Map(),
  );
  const [archivedSongs, setArchivedSongs] = useState<Map<string, string>>(
    new Map(),
  );
  const [addingToLibrary, setAddingToLibrary] = useState<Set<string>>(
    new Set(),
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { importUsage, recordImport } = useYouTubeImportLimit();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [songsPerPage] = useState(12); // Tentukan jumlah lagu per halaman, misal 12
  const [totalSongs, setTotalSongs] = useState(0);
  const [creatorIdFilter, setCreatorIdFilter] = useState<string | null>(null);
  const [creatorTypeFilter, setCreatorTypeFilter] = useState<string | null>(
    null,
  );
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const isSearchActive = searchTerm.length > 0;
  const [marketplaceTab, setMarketplaceTab] =
    useState<MarketplaceTab>("verified");
  
  // Fetch community creators using the edge function (independent from pagination)
  const { data: communityCreators = [], isLoading: communityCreatorsLoading } = useCommunityCreators();

  const [artistsList, setArtistsList] = useState<any[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const artistsScrollRef = useRef<HTMLDivElement>(null);
  const [showArtistsLeftArrow, setShowArtistsLeftArrow] = useState(false);
  const [showArtistsRightArrow, setShowArtistsRightArrow] = useState(false);

  // Following creators songs state
  const [followingSongs, setFollowingSongs] = useState<any[]>([]);
  const [followingLoading, setFollowingLoading] = useState(true);
  const followingScrollRef = useRef<HTMLDivElement>(null);
  const [showFollowingLeftArrow, setShowFollowingLeftArrow] = useState(false);
  const [showFollowingRightArrow, setShowFollowingRightArrow] = useState(false);

  const FilterForm = (
    <div className="p-4 pb-0 space-y-4">
      {/* highlight-start */}
      {/* onValueChange sekarang juga menutup dialog */}
      <Select
        value={sortBy}
        onValueChange={(value) => {
          setSortBy(value);
          setIsFilterDialogOpen(false); // Menutup dialog
        }}
      >
        {/* highlight-end */}
        <SelectTrigger>
          <SelectValue placeholder="Urutkan berdasarkan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Terbaru</SelectItem>
          <SelectItem value="popular">Populer</SelectItem>
          <SelectItem value="liked">Paling Disukai</SelectItem>
          <SelectItem value="title">A-Z</SelectItem>
        </SelectContent>
      </Select>
      {/* highlight-start */}
      <Select
        value={themeFilter}
        onValueChange={(value) => {
          setThemeFilter(value);
          setIsFilterDialogOpen(false); // Menutup dialog
        }}
      >
        {/* highlight-end */}
        <SelectTrigger>
          <SelectValue placeholder="Tema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tema</SelectItem>
          <SelectItem value="worship">Worship</SelectItem>
        </SelectContent>
      </Select>
      {/* highlight-start */}
      <Select
        value={chordGridFilter}
        onValueChange={(value) => {
          setChordGridFilter(value);
          setIsFilterDialogOpen(false); // Menutup dialog
        }}
      >
        {/* highlight-end */}
        <SelectTrigger>
          <SelectValue placeholder="Tipe Aransemen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tipe</SelectItem>
          <SelectItem value="chord_grid">Chord Grid</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const checkArtistsArrowVisibility = () => {
    if (artistsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = artistsScrollRef.current;
      setShowArtistsLeftArrow(scrollLeft > 0);
      setShowArtistsRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scrollArtistsCarousel = (direction: "left" | "right") => {
    if (artistsScrollRef.current) {
      const scrollAmount = artistsScrollRef.current.clientWidth / 2;
      if (direction === "left") {
        artistsScrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        artistsScrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    if (urlSearchTerm) {
      setSearchTerm(urlSearchTerm);
      setDebouncedSearchTerm(urlSearchTerm);
      setShowTrendingSongs(false); // Sembunyikan trending jika ada search
    } else {
      // RESET STATE SAAT URL BERSIH (Tombol X diklik)
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setShowTrendingSongs(true); // Tampilkan kembali trending
      setCurrentPage(1);
    }
  }, [urlSearchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setCreatorIdFilter(null);
      setCreatorTypeFilter(null);
      setShowTrendingSongs(false);
    }
  }, [debouncedSearchTerm]);
  // Note: Community tab now uses the main fetchSongs function which properly handles search
  // This separate effect is removed to avoid duplicate fetching and search filter bypass
  useEffect(() => {
    setCurrentPage(1); // Reset ke halaman 1 setiap kali ganti tab marketplace
  }, [marketplaceTab]);

  useEffect(() => {
    const scrollElement = artistsScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkArtistsArrowVisibility);
      window.addEventListener("resize", checkArtistsArrowVisibility);
      const timer = setTimeout(checkArtistsArrowVisibility, 500);

      return () => {
        scrollElement.removeEventListener(
          "scroll",
          checkArtistsArrowVisibility,
        );
        window.removeEventListener("resize", checkArtistsArrowVisibility);
        clearTimeout(timer);
      };
    }
  }, [artistsList]);

  useEffect(() => {
    const fetchCommunityArtists = async () => {
      try {
        setArtistsLoading(true);

        // 1. Query biasa ke tabel songs
        // Kita hanya butuh kolom 'artist' dan 'youtube_link'
        const { data: songsData, error } = await supabase
          .from("songs")
          .select(
            `
            artist,
            youtube_link
          `,
          )
          .eq("is_public", true)
          .not("artist", "is", null) // Jangan ambil lagu yang artisnya null
          .neq("artist", ""); // Jangan ambil lagu yang artisnya string kosong

        if (error) {
          console.error("Error fetching songs for artists:", error.message);
          if (!error.message.includes("No rows returned")) {
            toast({
              title: "Error",
              description: `Failed to load artists: ${error.message}`,
              variant: "destructive",
            });
          }
          setArtistsList([]);
          return;
        }

        if (songsData) {
          // 2. Proses pengelompokan (grouping) di JavaScript
          const artistsMap = new Map();

          // Pastikan fungsi 'extractYouTubeVideoId' tersedia di file Anda
          // (Anda sudah memilikinya di kode Anda)

          for (const song of songsData) {
            if (!song.artist) continue; // Lewati jika tidak ada artis

            const artistName = song.artist.trim();
            if (artistName === "") continue;

            // Jadikan nama artis (case-insensitive) sebagai kunci
            const mapKey = artistName.toLowerCase();

            // Ambil video ID dari youtube_link
            const videoId = extractYouTubeVideoId(song.youtube_link);
            // Buat URL thumbnail
            const thumbnail = videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : null;

            if (!artistsMap.has(mapKey)) {
              // Jika artis ini baru, buat entri baru
              artistsMap.set(mapKey, {
                artist_name: artistName, // Simpan nama asli (dengan huruf besar/kecil)
                total_songs: 0,
                random_thumbnail: thumbnail, // Set thumbnail pertama yang ditemukan
              });
            }

            // Tambah jumlah lagu untuk artis ini
            const artistEntry = artistsMap.get(mapKey);
            artistEntry.total_songs += 1;

            // Jika entri ini belum punya thumbnail (karena lagu pertama thumbnail-nya null),
            // coba pakai thumbnail dari lagu ini.
            if (!artistEntry.random_thumbnail && thumbnail) {
              artistEntry.random_thumbnail = thumbnail;
            }
          }

          // 3. Ubah Map menjadi Array dan urutkan
          const formattedArtistsList = Array.from(artistsMap.values());
          try {
            const sonyMusicIndex = formattedArtistsList.findIndex(
              (artist) =>
                artist.artist_name.toLowerCase() ===
                "sony music entertainment indonesia",
            );

            if (sonyMusicIndex > -1) {
              const sonyVideoId = "o9PicvdxNnY";
              formattedArtistsList[
                sonyMusicIndex
              ].random_thumbnail = `https://img.youtube.com/vi/${sonyVideoId}/mqdefault.jpg`;
            }
          } catch (e) {
            console.error("Error overriding Sony Music thumbnail:", e);
          }
          formattedArtistsList.sort((a, b) => b.total_songs - a.total_songs);

          setArtistsList(formattedArtistsList);
        } else {
          setArtistsList([]);
        }
      } catch (err: any) {
        console.error(
          "Unexpected error in fetchCommunityArtists:",
          err.message || err,
        );
        toast({
          title: "Error",
          description: `Unexpected error: ${err.message || "Unknown error"}`,
          variant: "destructive",
        });
        setArtistsList([]);
      } finally {
        setArtistsLoading(false);
      }
    };

    fetchCommunityArtists();
  }, [toast]); // 'extractYouTubeVideoId' tidak perlu di dependency array jika didefinisikan di luar komponen

  const checkArrangersArrowVisibility = () => {
    if (arrangersScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        arrangersScrollRef.current;
      setShowArrangersLeftArrow(scrollLeft > 0);
      setShowArrangersRightArrow(scrollLeft + clientWidth < scrollWidth);
    }
  };

  // Function to scroll the arrangers carousel
  const scrollArrangersCarousel = (direction: "left" | "right") => {
    if (arrangersScrollRef.current) {
      const scrollAmount = arrangersScrollRef.current.clientWidth / 2;
      if (direction === "left") {
        arrangersScrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        arrangersScrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    const fetchNewTrustedArrangerSongs = async () => {
      try {
        setNewTrustedArrangerLoading(true);

        // [PERUBAHAN UTAMA DI SINI]
        const { data, error } = await supabase
          .from("songs")
          // Mengubah cara select dan filter pada tabel relasi
          .select(
            `
                        id,
                        title,
                        artist,
                        slug,
                        youtube_link,
                        youtube_thumbnail,
                        current_key,
                        tempo,
                        views_count,
                        created_at,
                        profiles!inner ( 
                            display_name,
                            avatar_url,
                            creator_slug,
                            creator_type,
                            role
                        )
                    `,
          )
          .eq("is_public", true)
          // sintaks filter yang benar untuk tabel relasi
          .eq("profiles.creator_type", "creator_professional")
          .eq("profiles.role", "creator")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error(
            "Error fetching new professional creator songs:",
            error.message,
          );
          toast({
            title: "Error",
            description: `Failed to load professional creator songs: ${error.message}`,
            variant: "destructive",
          });
          setNewTrustedArrangerSongs([]);
          return;
        }

        if (data) {
          const formattedData = data.map((song) => ({
            ...song,
            views: song.views_count,
            youtubeLink: song.youtube_link,
            youtubeThumbnail: song.youtube_thumbnail,
            arranger: song.profiles?.display_name || "Professional Arranger",
            arranger_avatar: song.profiles?.avatar_url,
            arranger_slug:
              song.creator_slug ||
              song.profiles?.creator_slug ||
              song.arranger_slug,
            is_trusted: song.profiles?.creator_type === "creator_professional",
          }));
          // setSongs(formattedSongs); // Simpan data yang sudah di-format
          // setTotalSongs(data.total || 0);
          setNewTrustedArrangerSongs(formattedData);
        } else {
          setNewTrustedArrangerSongs([]);
        }
      } catch (err: any) {
        // ... (error handling)
      } finally {
        setNewTrustedArrangerLoading(false);
      }
    };

    fetchNewTrustedArrangerSongs();

    const fetchChristmasSongs = async () => {
      try {
        setChristmasLoading(true);

        const christmasTags = [
          "christmas",
          "Christmas",
          "christmas song",
          "Christmas Song",
          "natal",
          "Natal",
          "chrismast",
          "Chrismast", // Typo included
          "Chrismats", // Original typo included
        ];

        const { data, error } = await supabase
          .from("songs")
          .select(
            `
                id,
                title,
                artist,
                slug,
                youtube_link,
                youtube_thumbnail,
                current_key,
                tempo,
                views_count,
                tags,
                profiles!inner (
                    display_name,
                    avatar_url,
                    creator_slug,
                    creator_type,
                    role
                )
                `,
          )
          .eq("is_public", true)
          .overlaps("tags", christmasTags)
          .order("views_count", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching Christmas songs:", error.message);
          if (!error.message.includes("No rows returned")) {
            toast({
              title: "Error",
              description: `Failed to load Christmas songs: ${error.message}`,
              variant: "destructive",
            });
          }
          setChristmasSongs([]);
          return;
        }

        if (data) {
          const formattedData = data.map((song) => ({
            ...song,
            views: song.views_count,
            youtubeLink: song.youtube_link,
            youtubeThumbnail: song.youtube_thumbnail,
            arranger:
              song.profiles?.creator_type === "creator_arrangely"
                ? "Creator Arrangely"
                : song.profiles?.display_name || "Unknown Arranger",
            // [!code focus start]
            // Set avatar ke null jika creator_arrangely
            arranger_avatar:
              song.profiles?.creator_type === "creator_arrangely"
                ? null // Set null agar avatar tidak ditampilkan
                : song.profiles?.avatar_url, // Gunakan avatar jika bukan creator_arrangely
            // [!code focus end]
            arranger_slug: song.profiles?.creator_slug,
            is_trusted:
              song.profiles?.creator_type === "creator_professional" ||
              song.profiles?.creator_type === "creator_arrangely",
          }));
          setChristmasSongs(formattedData);
        } else {
          setChristmasSongs([]);
        }
      } catch (err: any) {
        console.error(
          "Unexpected error in fetchChristmasSongs:",
          err.message || err,
        );
        toast({
          title: "Error",
          description: `Unexpected error: ${err.message || "Unknown error"}`,
          variant: "destructive",
        });
        setChristmasSongs([]);
      } finally {
        setChristmasLoading(false);
      }
    };

    fetchChristmasSongs();
  }, [toast]);

  useEffect(() => {
    const scrollElement = arrangersScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkArrangersArrowVisibility);
      window.addEventListener("resize", checkArrangersArrowVisibility);
      // Initial check after content loads
      const timer = setTimeout(checkArrangersArrowVisibility, 500);

      return () => {
        scrollElement.removeEventListener(
          "scroll",
          checkArrangersArrowVisibility,
        );
        window.removeEventListener("resize", checkArrangersArrowVisibility);
        clearTimeout(timer);
      };
    }
  }, [trustedArrangers]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07, // delay per item
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } },
  };

  const cleanSongTitle = (title: string): string => {
    // Hapus konten dalam tanda kurung, misalnya "(Live at Lokananta)"
    return title.replace(/\s*\([^)]*\)\s*/g, "").trim();
  };

  const checkArrowVisibility = () => {
    if (trendingScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        trendingScrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth);
    }
  };

  // Function to scroll the carousel
  const scrollCarousel = (direction: "left" | "right") => {
    if (trendingScrollRef.current) {
      const scrollAmount = trendingScrollRef.current.clientWidth / 2; // Scroll by half the visible width
      if (direction === "left") {
        trendingScrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        trendingScrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  // Add event listeners for scroll and resize
  useEffect(() => {
    const scrollElement = trendingScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkArrowVisibility);
      window.addEventListener("resize", checkArrowVisibility);
      // Initial check after content loads
      const timer = setTimeout(checkArrowVisibility, 500); // Give some time for content to render

      return () => {
        scrollElement.removeEventListener("scroll", checkArrowVisibility);
        window.removeEventListener("resize", checkArrowVisibility);
        clearTimeout(timer);
      };
    }
  }, [trendingSongs]);

  useEffect(() => {
    const fetchTrendingSongs = async () => {
      try {
        setTrendingLoading(true);

        // [!code focus start]
        // Query langsung ke tabel 'songs' dan join dengan 'profiles'
        const { data, error } = await supabase
          .from("songs")
          .select(
            `
              id, 
              title, 
              artist, 
              slug,
              youtube_link,
              youtube_thumbnail, 
              current_key, 
              tempo, 
              views_count,
              profiles (
                  display_name,
                  avatar_url,
                  creator_slug,
                  creator_type
              )
            `,
          )
          .eq("is_public", true)
          .order("views_count", { ascending: false })
          .limit(10); // Ambil 10 lagu teratas
        // [!code focus end]

        if (error) {
          console.error("Error fetching trending songs:", error.message);
          toast({
            title: "Error",
            description: `Failed to load trending songs: ${error.message}`,
            variant: "destructive",
          });
          setTrendingSongs([]);
          return;
        }

        // [!code focus start]
        // Format data agar sesuai dengan yang dibutuhkan UI
        if (data) {
          const formattedData = data.map((song) => ({
            ...song,
            views: song.views_count, // Ganti nama kolom agar konsisten dengan UI
            youtubeLink: song.youtube_link,
            youtubeThumbnail: song.youtube_thumbnail,
            // Logika kondisional untuk nama arranger
            arranger:
              song.profiles?.creator_type === "creator_arrangely"
                ? "Creator Arrangely"
                : song.profiles?.display_name || "Unknown Arranger",
            arranger_avatar: song.profiles?.avatar_url,
            arranger_slug: song.profiles?.creator_slug,
            is_trusted: song.profiles?.creator_type === "creator_arrangely",
          }));
          setTrendingSongs(formattedData);
        } else {
          setTrendingSongs([]);
        }
        // [!code focus end]
      } catch (err: any) {
        console.error(
          "Unexpected error in fetchTrendingSongs:",
          err.message || err,
        );
        toast({
          title: "Error",
          description: `Unexpected error: ${err.message || "Unknown error"}`,
          variant: "destructive",
        });
        setTrendingSongs([]);
      } finally {
        setTrendingLoading(false);
      }
    };

    fetchTrendingSongs();
  }, [toast]);

  // Fetch songs from creators the user follows
  useEffect(() => {
    const fetchFollowingSongs = async () => {
      if (!user) {
        setFollowingSongs([]);
        setFollowingLoading(false);
        return;
      }

      try {
        setFollowingLoading(true);

        // Get list of creators the user follows
        const { data: followingData, error: followingError } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (followingError) {
          console.error("Error fetching following list:", followingError);
          setFollowingSongs([]);
          return;
        }

        const followingIds = (followingData || []).map((f) => f.following_id);

        if (followingIds.length === 0) {
          setFollowingSongs([]);
          return;
        }

        // Filter to only creator_pro or creator_professional
        const { data: creatorProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select(
            "user_id, display_name, avatar_url, creator_type, creator_slug",
          )
          .in("user_id", followingIds)
          .in("creator_type", ["creator_pro", "creator_professional"]);

        if (profilesError) {
          console.error("Error fetching creator profiles:", profilesError);
          setFollowingSongs([]);
          return;
        }

        const validCreatorIds = (creatorProfiles || []).map((p) => p.user_id);
        const creatorMap = new Map(
          (creatorProfiles || []).map((p) => [p.user_id, p]),
        );

        if (validCreatorIds.length === 0) {
          setFollowingSongs([]);
          return;
        }

        // Fetch latest songs from these creators
        const { data: songsData, error: songsError } = await supabase
          .from("songs")
          .select(
            "id, title, artist, youtube_link, youtube_thumbnail, user_id, created_at, views_count",
          )
          .eq("is_public", true)
          .in("user_id", validCreatorIds)
          .order("created_at", { ascending: false })
          .limit(12);

        if (songsError) {
          console.error("Error fetching following songs:", songsError);
          setFollowingSongs([]);
          return;
        }

        const formattedData = (songsData || []).map((song) => {
          const creator = creatorMap.get(song.user_id);
          return {
            id: song.id,
            title: song.title,
            artist: song.artist,
            youtubeLink: song.youtube_link,
            youtubeThumbnail: song.youtube_thumbnail,
            user_id: song.user_id,
            arranger_name: creator?.display_name || "Unknown",
            arranger_avatar: creator?.avatar_url,
            arranger_slug: creator?.creator_slug,
            creator_type: creator?.creator_type,
          };
        });

        setFollowingSongs(formattedData);
      } catch (err: any) {
        console.error("Error fetching following songs:", err);
        setFollowingSongs([]);
      } finally {
        setFollowingLoading(false);
      }
    };

    fetchFollowingSongs();
  }, [user]);

  useEffect(() => {
    if (debouncedSearchTerm.length > 0) {
      const term = debouncedSearchTerm.toLowerCase();
      // MODIFICATION: Remove .slice() to include all matching songs
      const newSuggestions = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(term) ||
          song.artist.toLowerCase().includes(term),
      );
      setSearchSuggestions(newSuggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [debouncedSearchTerm, songs]);

  // 1️⃣ Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearchTerm !== searchTerm) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // 2️⃣ Reset currentPage saat search berubah
  // useEffect(() => {
  //   if (debouncedSearchTerm && currentPage !== 1) {
  //     setCurrentPage(1);
  //   }
  // }, [debouncedSearchTerm, currentPage]);

  // 3️⃣ Fetch current user dan check songs + follows (gabungkan fetch untuk kurangi re-render)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (user) {
          // Gabungkan fetch library & follows
          await Promise.all([
            checkSongsInLibrary(user.id),
            fetchUserFollows(user.id),
          ]);
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };

    getCurrentUser();
  }, []);

  // 4️⃣ Handle subscription + pendingSongAdd
  useEffect(() => {
    // Pastikan subscriptionStatus sudah tersedia dan ada lagu tertunda
    if (
      subscriptionStatus?.isLoaded &&
      (subscriptionStatus.hasActiveSubscription ||
        subscriptionStatus.isTrialing) &&
      pendingSongAdd
    ) {
      toast({
        title: "🎉 Free Trial Activated!",
        description: "Now adding the song to your library...",
      });

      continueAddToLibrary(pendingSongAdd.id, pendingSongAdd.title);
      setPendingSongAdd(null); // hapus penanda aksi tertunda
    }
  }, [subscriptionStatus, pendingSongAdd]);

  // Handle navigation state for creator filter
  // Handle navigation state for creator filter
  useEffect(() => {
    if (location.state?.creatorFilter) {
      setCreatorIdFilter(location.state.creatorFilter);
      setShowTrendingSongs(false); // <-- TAMBAHKAN BARIS INI // Clear the state to prevent it from persisting on refresh
      navigate(location.pathname, { replace: true, state: {} }); // Update cara clear state
    }
  }, [location, navigate]); // Dependency array sudah benar

  const handleCreatorIdFilter = (arranger: any) => {
    const creatorId = arranger.user_id;

    // Cek apakah ini grup spesial "Arrangely Creator"
    if (arranger.name === "Arrangely Creator") {
      if (creatorTypeFilter === "creator_arrangely") {
        // Jika diklik lagi, hapus semua filter
        setCreatorIdFilter(null);
        setCreatorTypeFilter(null);
        setShowTrendingSongs(true);
      } else {
        // Jika baru diklik
        setCreatorIdFilter(null); // Hapus filter ID
        setCreatorTypeFilter("creator_arrangely"); // Atur filter TIPE
        setShowTrendingSongs(false);
      }
    } else {
      // Ini adalah kreator normal (Ben Silaban, dll.)
      if (creatorIdFilter === creatorId) {
        // Jika diklik lagi, hapus semua filter
        setCreatorIdFilter(null);
        setCreatorTypeFilter(null);
        setShowTrendingSongs(true);
      } else {
        // Jika kreator normal baru diklik
        setCreatorIdFilter(creatorId); // Atur filter ID
        setCreatorTypeFilter(null); // Hapus filter TIPE
        setShowTrendingSongs(false);
      }
    }

    setCurrentPage(1); // Selalu reset ke halaman pertama
  };

  // Function to check which songs are already in user's library
  const checkSongsInLibrary = async (userId: string) => {
    try {
      const { data: userSongs } = await supabase
        .from("songs")
        .select("id, title, artist, status")
        .eq("user_id", userId);

      if (userSongs) {
        const activeSet = new Set<string>();
        const archivedMap = new Map<string, string>();
        // [!code ++] Map baru untuk menyimpan ID
        const idMap = new Map<string, string>();

        userSongs.forEach((userSong) => {
          const songKey = `${userSong.title}-${userSong.artist}`;

          if (userSong.status === "archived") {
            const key = `${userSong.title
              .trim()
              .toLowerCase()}|${userSong.artist.trim().toLowerCase()}`;
            archivedMap.set(key, userSong.id);
          } else {
            activeSet.add(songKey);
            // [!code ++] Simpan ID lagu milik user ke map
            idMap.set(songKey, userSong.id);
          }
        });

        setSongsInLibrary(activeSet);
        setArchivedSongs(archivedMap);
        // [!code ++] Update state map ID
        setLibrarySongIds(idMap);
      }
    } catch (error) {
      console.error("Error checking songs in library:", error);
    }
  };

  const checkNewTrustedArrangerArrowVisibility = () => {
    if (newTrustedArrangerScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        newTrustedArrangerScrollRef.current;
      setShowNewTrustedArrangerLeftArrow(scrollLeft > 0);
      setShowNewTrustedArrangerRightArrow(
        scrollLeft + clientWidth < scrollWidth,
      );
    }
  };

  const scrollNewTrustedArrangerCarousel = (direction: "left" | "right") => {
    if (newTrustedArrangerScrollRef.current) {
      const scrollAmount = newTrustedArrangerScrollRef.current.clientWidth / 2;
      if (direction === "left") {
        newTrustedArrangerScrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        newTrustedArrangerScrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    const scrollElement = newTrustedArrangerScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener(
        "scroll",
        checkNewTrustedArrangerArrowVisibility,
      );
      window.addEventListener("resize", checkNewTrustedArrangerArrowVisibility);
      const timer = setTimeout(checkNewTrustedArrangerArrowVisibility, 500);

      return () => {
        // ... (cleanup listeners)
      };
    }
  }, [newTrustedArrangerSongs]);

  const checkChristmasArrowVisibility = () => {
    if (christmasScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        christmasScrollRef.current;
      setShowChristmasLeftArrow(scrollLeft > 0);
      setShowChristmasRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scrollChristmasCarousel = (direction: "left" | "right") => {
    if (christmasScrollRef.current) {
      const scrollAmount = christmasScrollRef.current.clientWidth / 2;
      if (direction === "left") {
        christmasScrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        christmasScrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    const scrollElement = christmasScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkChristmasArrowVisibility);
      window.addEventListener("resize", checkChristmasArrowVisibility);
      const timer = setTimeout(checkChristmasArrowVisibility, 500);

      return () => {
        scrollElement.removeEventListener(
          "scroll",
          checkChristmasArrowVisibility,
        );
        window.removeEventListener("resize", checkChristmasArrowVisibility);
        clearTimeout(timer);
      };
    }
  }, [christmasSongs]);

  const handleUnarchive = async (
    songId: string,
    title: string,
    artist: string,
  ) => {
    try {
      // update status archived jadi false/null di Supabase
      const { error } = await supabase
        .from("songs")
        .update({ status: null }) // pastikan kamu pakai kolom archived (boolean)
        .eq("id", songId)
        .eq("user_id", currentUser.id);

      if (error) {
        throw new Error("Failed to unarchive song");
      }

      const songKey = `${title.trim().toLowerCase()}|${artist
        .trim()
        .toLowerCase()}`;
      const songKeyInLibrary = `${title}-${artist}`;

      // Hapus dari archivedSongs
      setArchivedSongs((prev) => {
        const newMap = new Map(prev);
        newMap.delete(songKey);
        return newMap;
      });

      // Tambahin ke songsInLibrary
      setSongsInLibrary((prev) => new Set(prev).add(songKeyInLibrary));

      setLibrarySongIds((prev) => new Map(prev).set(songKeyInLibrary, songId));

      toast({
        title: "Song Unarchived",
        description: `"${title}" has been moved back to your library.`,
      });
    } catch (err) {
      console.error("Error unarchiving song:", err);
      toast({
        title: "Error",
        description: "Failed to unarchive this song. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to fetch user follows
  const fetchUserFollows = async (userId: string) => {
    try {
      const { data: follows, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) throw error;

      if (follows) {
        const followedIds = new Set<string>(follows.map((f) => f.following_id));
        setFollowedCreatorIds(followedIds);
      }
    } catch (error) {
      console.error("Error fetching user follows:", error);
    }
  };

  // Fetch public songs from database
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoadingSong(true);

        // Determine creatorTypeFilter based on marketplace tab
        const effectiveCreatorTypeFilter =
          marketplaceTab === "community"
            ? "creator_pro"
            : marketplaceTab === "verified"
            ? "creator_professional"
            : creatorTypeFilter; // "all" tab uses no type filter

        let typeFilter = null;
        if (!creatorIdFilter) {
          if (marketplaceTab === "community") typeFilter = "creator_pro";
          else if (marketplaceTab === "verified")
            typeFilter = "creator_professional";
        }
        if (creatorTypeFilter) typeFilter = creatorTypeFilter;

        const { data, error } = await supabase.functions.invoke("songs-list", {
          body: {
            currentPage,
            songsPerPage,
            creatorFilter: creatorIdFilter,
            creatorTypeFilter:
              marketplaceTab === "all" ? null : effectiveCreatorTypeFilter,
            searchTerm: debouncedSearchTerm,
            showFollowedOnly,
            followedCreatorIds: Array.from(followedCreatorIds),
            selectedCategory,
            themeFilter,
            chordGridFilter,
            sortBy,
            currentUserId: currentUser?.id ?? null,
            marketplaceTab,
          },
        });

        if (error) {
          console.error("Error fetching songs:", error);
          toast({
            title: "Error",
            description: "Failed to load songs.",
            variant: "destructive",
          });
          return;
        }

        setSongs(data.songs || []);
        setTotalSongs(data.total || 0);
      } catch (err) {
        console.error("Unexpected error in fetchSongs:", err);
        toast({
          title: "Error",
          description: "Unexpected error while loading songs.",
          variant: "destructive",
        });
      } finally {
        setLoadingSong(false);
      }
    };

    fetchSongs();
  }, [
    currentUser,
    toast,
    currentPage,
    sortBy,
    creatorIdFilter,
    creatorTypeFilter,
    debouncedSearchTerm,
    showFollowedOnly,
    followedCreatorIds,
    selectedCategory,
    themeFilter,
    chordGridFilter,
    marketplaceTab, // Added to re-fetch when tab changes
  ]);

  useEffect(() => {
    const fetchTrustedArrangers = async () => {
      setLoadingTrusted(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "trusted-arrangers",
        );

        if (error) {
          console.error("Error fetching trusted arrangers:", error);
          toast({
            title: "Error",
            description: "Failed to load trusted arrangers.",
            variant: "destructive",
          });
          return;
        }

        setTrustedArrangers(data);
      } catch (error) {
        console.error("Error in fetchTrustedArrangers:", error);
        toast({
          title: "Error",
          description: "Failed to load trusted arrangers.",
          variant: "destructive",
        });
      }
    };

    fetchTrustedArrangers();

    setLoadingTrusted(false);
  }, [toast]);

  // Mengupdate dependency array menjadi lebih bersih

  // All handler functions (handleLike, handleFavorite, handleAddToLibrary, etc.)
  const handleLike = async (songId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like songs",
        variant: "destructive",
      });
      return;
    }

    try {
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      if (song.isLiked) {
        // Unlike
        const { error } = await supabase
          .from("song_likes")
          .delete()
          .eq("song_id", songId)
          .eq("user_id", currentUser.id);
        if (error) throw error;
        setSongs((prev) =>
          prev.map((s) =>
            s.id === songId
              ? {
                  ...s,
                  isLiked: false,
                  likes: Math.max(0, s.likes - 1),
                }
              : s,
          ),
        );
        toast({
          title: "Song Unliked",
          description: "Removed from your liked arrangements",
        });
      } else {
        // Like
        const { error } = await supabase
          .from("song_likes")
          .insert({ song_id: songId, user_id: currentUser.id });
        if (error) throw error;
        setSongs((prev) =>
          prev.map((s) =>
            s.id === songId ? { ...s, isLiked: true, likes: s.likes + 1 } : s,
          ),
        );
        toast({
          title: "Song Liked",
          description: "Added to your liked arrangements",
        });
      }
    } catch (error) {
      console.error("Error liking song:", error);
      toast({
        title: "Error",
        description: "Failed to like song",
        variant: "destructive",
      });
    }
  };

  const handleFavorite = async (songId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to favorite songs",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Added to Favorites",
      description: "Song saved to your favorites collection",
    });
  };

  const handleStartTrial = async () => {
    // 1. Tutup modal trial
    setShowTrialModal(false);

    // 2. Tampilkan notifikasi bahwa proses sedang berjalan
    toast({
      title: "Activating Free Trial...",
      description: "Please wait a moment.",
    });

    try {
      // 3. Panggil fungsi untuk mengaktifkan trial dari useSubscription context
      //    Asumsinya, fungsi ini akan mengupdate status langganan pengguna.
      const result = await startFreeTrial();

      if (result) {
        // 4. Jika berhasil, useEffect akan menangani penambahan lagu
        //    Tidak perlu melakukan apa-apa lagi di sini karena useEffect
        //    akan mendeteksi perubahan subscriptionStatus.
      } else {
        // Jika gagal, tampilkan pesan error
        toast({
          title: "Activation Failed",
          description: "Could not start your free trial. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Tangani error yang tidak terduga
      toast({
        title: "An Error Occurred",
        description: "Something went wrong. Please contact support.",
        variant: "destructive",
      });
      console.error("Error starting free trial:", error);
    }

    // Kode untuk membuka PaymentModal bisa dihapus jika startFreeTrial() sudah menanganinya,
    // atau tetap dipertahankan jika Anda ingin pengguna mengatur pembayaran setelah aktivasi.
    // Untuk saat ini, kita fokus pada aktivasi trial terlebih dahulu.
  };

  const continueAddToLibrary = async (songId: string, title: string) => {
    setAddingToLibrary((prev) => new Set(prev).add(songId));

    try {
      // 1️⃣ Pastikan user login
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // 2️⃣ Panggil Edge Function (Atomic)
      const { data, error } = await supabase.functions.invoke(
        "add-song-to-library",
        {
          body: {
            originalSongId: songId,
          },
        }
      );

      // 3️⃣ Network error
      if (error) {
        throw new Error(error.message || "Failed to add to library");
      }

      // 4️⃣ Business logic error
      if (!data?.success) {
        throw new Error(data?.error?.message || "Library action failed");
      }

      // 5️⃣ SUCCESS

      // increment views (optional, kalau masih mau)
      await supabase.rpc("increment_song_views", { song_id: songId });

      setSongs((prev) =>
        prev.map((s) =>
          s.id === songId ? { ...s, views: s.views + 1 } : s
        )
      );

      const songKey = `${title}`;

      setSongsInLibrary((prev) => new Set(prev).add(songKey));

      setLibrarySongIds((prev) => {
        const newMap = new Map(prev);
        newMap.set(songKey, data.song_id);
        return newMap;
      });

      toast({
        title: "Added to Your Library",
        description: `"${title}" is now available in your personal library.`,
      });

      navigate(`/arrangement/${data.song_id}`);

    } catch (error: any) {
      console.error("Add to library error:", error);

      const message = error?.message || "";

      if (message.includes("Library limit")) {
        toast({
          title: "Limit Reached",
          description: "Library limit reached. Upgrade your subscription.",
          variant: "destructive",
        });
      } else if (message.includes("already")) {
        toast({
          title: "Already in Library",
          description: `"${title}" is already in your library.`,
        });
      } else if (message.includes("Too many")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please wait a moment.",
          variant: "destructive",
        });
      } else if (message.includes("Unauthorized")) {
        toast({
          title: "Unauthorized",
          description: "Please login first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add song to your library.",
          variant: "destructive",
        });
      }

    } finally {
      setAddingToLibrary((prev) => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  const handleAddToLibrary = async (songId: string, title: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add songs to your library",
        variant: "destructive",
      });
      return;
    }
    if (!libraryUsage.canAddMore) {
      setShowLimitModal(true); // Tampilkan modal jika limit tercapai
      return; // Hentikan eksekusi
    }
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
          id,
          plan_id,
          subscription_plans (
            id,
            library_limit
          )
        `,
      )
      .eq("user_id", user.id)
      .maybeSingle(); // to avoid error if no active

    if (
      !subscriptionStatus?.hasActiveSubscription &&
      !subscriptionStatus?.isTrialing
    ) {
      // Only redirect to pricing if not on iOS Capacitor
      if (!isCapacitorIOS()) {
        navigate("/pricing");
      }
      return;
    }
    await continueAddToLibrary(songId, title);
  };

  const handleFollow = async (creatorId: string, creatorName: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to follow creators",
        variant: "destructive",
      });
      return;
    }

    // === PERUBAHAN UTAMA DIMULAI DI SINI ===

    // Jika yang diklik adalah GRUP "Arrangely Creator"
    if (creatorId === "arrangely_creator_group") {
      try {
        // 1. Dapatkan semua ID user yang termasuk dalam grup "creator_arrangely"
        const { data: groupMembers, error: membersError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("creator_type", "creator_arrangely");

        if (membersError) throw membersError;
        if (!groupMembers || groupMembers.length === 0) {
          toast({ title: "No members found in this group." });
          return;
        }

        const memberIds = groupMembers.map((m) => m.user_id);

        // 2. Cek apakah pengguna sudah mem-follow SEMUA anggota grup
        const isFollowingAll = memberIds.every((id) =>
          followedCreatorIds.has(id),
        );

        if (isFollowingAll) {
          // --- Proses Unfollow Massal ---
          const { error: unfollowError } = await supabase
            .from("user_follows")
            .delete()
            .eq("follower_id", currentUser.id)
            .in("following_id", memberIds);

          if (unfollowError) throw unfollowError;

          // Update state secara lokal
          setFollowedCreatorIds((prev) => {
            const newSet = new Set(prev);
            memberIds.forEach((id) => newSet.delete(id));
            // Hapus juga ID grup virtualnya
            newSet.delete("arrangely_creator_group");
            return newSet;
          });
          toast({
            title: `Unfollowed all creators in ${creatorName}`,
          });
        } else {
          // --- Proses Follow Massal ---
          const followsToInsert = memberIds.map((id) => ({
            follower_id: currentUser.id,
            following_id: id,
          }));

          const { error: followError } = await supabase
            .from("user_follows")
            .upsert(followsToInsert, {
              onConflict: "follower_id,following_id",
              ignoreDuplicates: true,
              //testtt
            });

          if (followError) throw followError;

          // Update state secara lokal
          setFollowedCreatorIds((prev) => {
            const newSet = new Set(prev);
            memberIds.forEach((id) => newSet.add(id));
            // Tambahkan ID grup virtual agar tombol berubah menjadi "Unfollow"
            newSet.add("arrangely_creator_group");
            return newSet;
          });
          toast({
            title: `You are now following all creators in ${creatorName}`,
          });
        }
      } catch (error) {
        console.error("Error handling group follow:", error);
        toast({
          title: "Error",
          description: "Could not perform group follow action.",
          variant: "destructive",
        });
      }
      return; // Hentikan eksekusi setelah menangani grup
    }

    // Jika yang diklik adalah KREATOR INDIVIDU (logika lama tetap berjalan)
    try {
      const isCurrentlyFollowed = followedCreatorIds.has(creatorId);

      if (isCurrentlyFollowed) {
        // Unfollow
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", creatorId);
        if (error) throw error;

        setFollowedCreatorIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(creatorId);
          return newSet;
        });
        toast({
          title: "Unfollowed Creator",
          description: `You are no longer following ${creatorName}`,
        });
      } else {
        // Follow
        const { error } = await supabase.from("user_follows").insert({
          follower_id: currentUser.id,
          following_id: creatorId,
        });
        if (error) throw error;

        setFollowedCreatorIds((prev) => new Set(prev).add(creatorId));
        toast({
          title: "Following Creator",
          description: `You are now following ${creatorName}.`,
        });
      }
    } catch (error) {
      console.error("Error following creator:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (song: any) => {
    try {
      await supabase.rpc("increment_song_views", { song_id: song.id });
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, views: s.views + 1 } : s)),
      );
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
    const songKey = `${song.title}-${song.artist}`;
    const userCopyId = librarySongIds.get(songKey);
    // if (userCopyId) {
    //     // [!code ++] Jika ada di library, arahkan ke ID milik user (yang punya akses edit/live preview)
    //     // Anda bisa mengarahkan ke /arrangement/{id} karena di page detail,
    //     // jika user adalah owner, tombol edit & live preview akan muncul.
    //     navigate(
    //         `/arrangement/${userCopyId}/${song.slug}?source=community-library`,
    //     );
    // } else {
    // [!code ++] Jika belum ada, arahkan ke ID public (preview mode)
    navigate(`/arrangement/${song.id}/${song.slug}?source=community-library`, {
      state: {
        from: "community-library",
        isPreview:
          !subscriptionStatus?.hasActiveSubscription &&
          !subscriptionStatus?.isTrialing,
      },
    });
    // }
  };

  const handleCreatorProfile = (song: any) => {
    // Cek semua kemungkinan nama field slug
    const slug =
      song.arranger_slug ||
      song.creator_slug ||
      song.creatorSlug ||
      song.profiles?.creator_slug;

    if (slug) {
      navigate(`/creator/${slug}`);
    } else {
      toast({
        title: "Creator Profile",
        description: "Creator profile slug is missing for this song",
        variant: "destructive",
      });
    }
  };
  // --- START CORRECTED YOUTUBE URL EXTRACTION AND CHECK ---
  const extractYouTubeVideoId = (url: string | null | undefined): string => {
    // Perbarui tipe parameter
    if (!url) {
      // Tambahkan pengecekan eksplisit untuk null atau undefined
      return "";
    }
    const regExp =
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1] && match[1].length === 11 ? match[1] : "";
  };

  const isYouTubeUrl = (term: string): boolean => {
    // Memeriksa apakah string adalah URL YouTube yang valid (mengandung domain YouTube)
    return term.includes("youtube.com/") || term.includes("youtu.be/");
  };
  // --- END CORRECTED YOUTUBE URL EXTRACTION AND CHECK ---

  const analyzeYouTubeUrl = async (url: string) => {
    setIsAnalyzingYoutube(true);
    setYoutubeAnalysisResults([]); // Clear previous results

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube video URL.",
        variant: "destructive",
      });
      setIsAnalyzingYoutube(false);
      return;
    }

    try {
      // In a real application, you'd make an API call here to fetch YouTube video metadata.
      // For this example, let's simulate a fetch or use a placeholder
      // If you have a backend endpoint to fetch YouTube data, use it here.
      // Example:
      // const { data } = await supabase.functions.invoke('get-youtube-video-data', { videoId });

      // Simulate fetching data for the YouTube video
      // A common thumbnail format is mqdefault.jpg, hqdefault.jpg, or maxresdefault.jpg
      const youtubeThumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      const simulatedYoutubeData = {
        id: `yt-${videoId}`, // Unique ID for YouTube imported songs
        title: `YouTube Arrangement for Video: ${videoId}`, // More descriptive title
        artist: "Original YouTube Artist", // Placeholder for actual artist
        arranger: "Auto-Import",
        arrangerAvatar: null,
        key: "C", // Placeholder, actual key needs analysis
        tempo: 120, // Placeholder, actual tempo needs analysis
        theme: "Worship",
        tags: ["youtube", "import", "auto-generated"], // Add relevant tags
        difficulty: "Medium",
        likes: 0,
        views: 0,
        followers: 0,
        isLiked: false,
        isFavorited: false,
        isFollowed: false,
        isPublic: false, // Imported songs are typically private by default
        isPremium: false,
        isTrusted: false,
        createdAt: new Date().toISOString(),
        duration: "0:00", // Placeholder for actual video duration
        youtubeLink: url,
        youtubeThumbnail: youtubeThumbnailUrl,
        user_id: currentUser?.id, // Assign to current user for potential adding to library
      };

      setYoutubeAnalysisResults([simulatedYoutubeData]);
      toast({
        title: "YouTube Video Analyzed",
        description:
          "Found details for the YouTube video. You can now add it to your library.",
      });
    } catch (error) {
      console.error("Error analyzing YouTube URL:", error);
      toast({
        title: "Error Analyzing YouTube Video",
        description:
          "Could not fetch details for the YouTube URL. Please check the URL or try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingYoutube(false);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
  };

  // Filter youtube results separately, karena mereka lokal
  const filteredYoutubeResults = youtubeAnalysisResults.filter((song) => {
    const searchTermLower = searchTerm.toLowerCase();

    // Logic pencarian HANYA untuk title, link, dan tags. Bukan arranger.
    const matchesSearch =
      song.title.toLowerCase().includes(searchTermLower) ||
      // song.arranger.toLowerCase().includes(searchTermLower) || // <-- DIHAPUS
      (song.youtubeLink &&
        song.youtubeLink.toLowerCase().includes(searchTermLower)) ||
      (song.tags &&
        song.tags.some((tag: string) =>
          tag.toLowerCase().includes(searchTermLower),
        ));

    // Filter lainnya tetap berlaku untuk hasil YouTube
    const matchesFollowed =
      !showFollowedOnly || followedCreatorIds.has(song.user_id);
    const matchesCategory =
      selectedCategory === "all" ||
      song.category === selectedCategory ||
      (!song.category && selectedCategory === "uncategorized");
    const matchesTheme =
      themeFilter === "all" ||
      (themeFilter === "worship" && song.theme === "worship");
    const matchesChordGrid =
      chordGridFilter === "all" ||
      (chordGridFilter === "chord_grid" && song.theme === "chord_grid");

    return (
      matchesSearch &&
      matchesFollowed &&
      matchesCategory &&
      matchesTheme &&
      matchesChordGrid
    );
  });

  // `songs` is already filtered by the backend (including search for all tabs)
  // Just combine with YouTube analysis results
  const filteredSongs = [...songs, ...filteredYoutubeResults];

  const totalPages = Math.ceil(totalSongs / songsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0); // Scroll ke atas saat ganti halaman
    }
  };

  // Function to handle sharing
  const handleShare = async (song) => {
    const shareUrl = `https://arrangely.io/arrangement/${song?.id}/${song?.slug}`;

    // Jika di Native App (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: song?.title,
          text: `Check out this arrangement for "${song?.title}" by ${song?.arranger} on Arrangely!`,
          url: shareUrl,
          dialogTitle: "Share arrangement",
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
    // Jika di Browser Mobile yang support Web Share
    else if (navigator.share) {
      try {
        await navigator.share({
          title: song?.title,
          text: `Check out this arrangement for "${song?.title}" by ${song?.arranger} on Arrangely!`,
          url: shareUrl,
        });
      } catch (err) {
        // Jika user cancel atau Web Share gagal, fallback ke Drawer
        setSongToShare(song);
        setShareDrawerOpen(true);
      }
    }
    // Desktop atau browser tanpa Web Share
    else {
      setSongToShare(song);
      setShareDrawerOpen(true);
    }
  };
  const getShareLinks = (song: any) => {
    // Ganti window.location.origin dengan domain asli kamu
    const productionUrl = "https://arrangely.io";

    const shareUrl = `${productionUrl}/arrangement/${song?.id}/${song?.slug}`;
    const urlEncoded = encodeURIComponent(shareUrl);
    const textEncoded = encodeURIComponent(
      `View this arrangement for "${song?.title}" by ${song?.arranger} on Arrangely!`,
    );

    return {
      whatsapp: `https://wa.me/?text=${textEncoded}%20${urlEncoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`,
      copy: shareUrl,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copied!",
      description: "Link has been copied to your clipboard.",
    });
    setShareDrawerOpen(false);
  };

  const handleClearCreatorFilter = () => {
    setCreatorIdFilter(null);
    setCreatorTypeFilter(null);
    setShowTrendingSongs(true); // Tampilkan lagi section trending
    setCurrentPage(1); // Reset ke halaman 1
  };

  // Logic untuk mencari info creator yang sedang dipilih
  const selectedCreatorInfo = creatorIdFilter
    ? trustedArrangers.find((arranger) => arranger.user_id === creatorIdFilter)
    : creatorTypeFilter === "creator_arrangely"
    ? trustedArrangers.find((arranger) => arranger.name === "Arrangely Creator")
    : null;

  return (
    <div
      className={`
        min-h-screen bg-gradient-sanctuary relative pb-5
        ${
          Capacitor.isNativePlatform()
            ? "pt-24 sm:pt-20 lg:pt-16"
            : "pt-16 sm:pt-8 lg:pt-2"
        }
    `}
    >
      {/* Animated Music Background */}
      {/* <MusicAnimatedBackground variant="subtle" /> */}

      {isMobileView && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-1 relative z-20"
        >
          <GlobalSearchBar
            className="w-full mt-10"
            defaultValue={urlSearchTerm}
            onClear={() => {
              setSearchTerm("");
              setDebouncedSearchTerm("");

              setShowTrendingSongs(true);

              setCurrentPage(1);
            }}
          />
        </motion.div>
      )}

      <div
        className={`container mx-auto max-w-7xl relative z-10 ${
          // 2. Tambahkan padding-top dinamis jika mobile agar tidak kepotong
          isMobileView
            ? "pt-0"
            : Capacitor.isNativePlatform()
            ? "pt-24"
            : "pt-0"
        }`}
      >
        {/* 3. Marketplace Tabs sekarang berada di urutan pertama di dalam container */}
        <div className="mb-4">
          <MarketplaceTabs
            activeTab={marketplaceTab}
            onTabChange={setMarketplaceTab}
          />
        </div>

        {/* Search Bar for Community Library */}
        {/* <div className="mb-6 px-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        {isAnalyzingYoutube && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Input
                            placeholder={"What do you want to play?"}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-10 h-10 bg-muted/50 border-muted focus:bg-background focus:border-primary/50 rounded-xl"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div> */}

        {marketplaceTab === "community" ? (
          // --- TAMPILAN KHUSUS TAB COMMUNITY DENGAN CARD YANG SAMA ---
          <div className="space-y-2">
            {/* Community Creators Section - Uses dedicated edge function for all creators */}
            <div className="px-2">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  Creator Community
                </h2>
              </div>

              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {/* Join Us Card - Compact Version */}
                <div
                  className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                  onClick={() => navigate("/creator-community")}
                >
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all">
                    <Crown className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Join Us
                  </span>
                </div>

                {/* Loading state for community creators */}
                {communityCreatorsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-muted animate-pulse" />
                      <div className="w-16 h-3 bg-muted animate-pulse rounded" />
                    </div>
                  ))
                ) : (
                  /* Community Creators from edge function */
                  communityCreators.map((creator) => (
                    <div
                      key={creator.user_id}
                      className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                      onClick={() => {
                        if (creator.user_id === "arrangely_creator_group") {
                          // For Arrangely group, filter songs by creator_arrangely type
                          setCreatorTypeFilter("creator_arrangely");
                          setCreatorIdFilter(null);
                        } else if (creator.creator_slug) {
                          navigate(`/creator/${creator.creator_slug}`);
                        }
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 transition-transform duration-300 group-hover:scale-105 border border-muted">
                          <AvatarImage
                            src={creator.user_id === "arrangely_creator_group" ? "/LOGO_BACK.png" : (creator.avatar_url || creator.avatar)}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/5 text-sm">
                            {creator.display_name?.[0] || creator.name?.[0] || "C"}
                          </AvatarFallback>
                        </Avatar>
                        {/* Badge verified kecil di avatar */}
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
                          <Verified className="h-4 w-4 text-primary fill-white" />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-foreground truncate w-20 text-center">
                        {(creator.display_name || creator.name || "Creator").split(" ")[0]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <CreatorProSection
              currentUserId={currentUser?.id}
              onAddToLibrary={handleAddToLibrary}
              libraryIds={Array.from(songsInLibrary)}
              className="mb-8"
            />

            <h2 className="text-xl font-bold text-gray-800 dark:text-white px-2">
              Pro Community Arrangements
            </h2>

            {loadingSong ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-muted animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              ></motion.div>
            )}
          </div>
        ) : (
          // --- INI TAMPILAN DEFAULT (Verified / All) ---
          // Pindahkan semua kode lamamu (Trending, Christmas, Search Results, dsb) ke sini
          <>
            <AnimatePresence>
              {/* Masukkan (creatorIdFilter || creatorTypeFilter) logic di sini */}
            </AnimatePresence>

            {!isSearchActive && (
              <>
                {/* Masukkan Trusted Arrangers section di sini */}
                {/* Masukkan Trending Songs section di sini */}
                {/* Masukkan Browse by Artist section di sini */}
              </>
            )}

            {/* Masukkan List Utama (filteredSongs) di sini */}
          </>
        )}

        {marketplaceTab !== "community" && (
          <AnimatePresence>
            {(creatorIdFilter || creatorTypeFilter) && selectedCreatorInfo && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2"
              >
                <span className="text-sm text-muted-foreground">
                  Filtering By:
                </span>
                <Badge
                  variant="default"
                  className="flex items-center gap-2 py-1 px-2 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/80 dark:text-blue-200 dark:hover:bg-blue-900"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={
                        selectedCreatorInfo.name === "Arrangely Creator"
                          ? "/LOGO_BACK.png"
                          : selectedCreatorInfo.avatar
                      }
                    />
                    <AvatarFallback>
                      {selectedCreatorInfo.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {selectedCreatorInfo.name}
                  </span>
                  <button
                    onClick={handleClearCreatorFilter}
                    className="ml-1 rounded-full text-blue-600 hover:bg-blue-300/50 p-0.5"
                    aria-label="Clear filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Trusted Arrangers - with Follow Button */}

        {!isSearchActive &&
          marketplaceTab !== "community" &&
          marketplaceTab !== "all" && (
            <>
              {/* Trusted Arrangers - with Follow Button */}
              {loadingTrusted ? (
                <div className="mb-12">
                  <div className="mb-5 text-center sm:text-left">
                    <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-4 sm:gap-8 overflow-x-auto p-4 -m-4 scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-2 text-center w-32 flex-shrink-0"
                      >
                        <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
                        <div className="w-14 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mt-3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                trustedArrangers.length > 0 && (
                  <div className="mb-12 relative group">
                    {/* <div className="pointer-events-none absolute left-0 top-0 h-full w-2 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 rounded-l-3xl"></div> */}

                    {/* <div className="pointer-events-none absolute right-0 top-0 h-full w-2 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 rounded-r-3xl"></div> */}

                    <div className="mb-5 text-center sm:text-left">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {" "}
                        {/* Diubah dari text-2xl */}
                        {t("communityLib.title2")}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {" "}
                        {/* Diubah dari text-base/muted & mt-1 */}
                        {t("communityLib.subtitle2")}
                      </p>
                    </div>
                    <>
                      {isMobileView ? (
                        // ✅ MOBILE VERSION
                        <div className="relative group">
                          {/* Gradasi Blur Kiri - Muncul hanya saat sudah di-scroll */}
                          {showArrangersLeftArrow && (
                            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
                          )}

                          {/* Gradasi Blur Kanan - Hilang saat mencapai ujung kanan */}
                          {showArrangersRightArrow && (
                            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/40 to-transparent z-10" />
                          )}
                          <div
                            ref={arrangersScrollRef}
                            onScroll={checkArrangersArrowVisibility}
                            className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-10 scrollbar-hide"
                          >
                            <AnimatePresence>
                              {trustedArrangers.map((arranger) => (
                                <motion.div
                                  key={arranger.user_id}
                                  initial={{
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    y: -20,
                                    scale: 0.95,
                                  }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeOut",
                                  }}
                                  className="flex flex-col items-center gap-2 text-center w-24 sm:w-28 flex-shrink-0 cursor-pointer group transition-transform duration-300 hover:scale-105"
                                  onClick={() =>
                                    handleCreatorIdFilter(arranger)
                                  }
                                >
                                  <Avatar
                                    className={`h-16 w-16 sm:h-20 sm:w-20 transition-all duration-300 ring-4 ring-offset-2 dark:ring-offset-blue-200 ${
                                      creatorIdFilter === arranger.user_id
                                        ? "ring-blue-500"
                                        : "ring-transparent group-hover:ring-blue-300"
                                    }`}
                                  >
                                    <AvatarImage
                                      src={
                                        arranger.name === "Arrangely Creator"
                                          ? "/LOGO_BACK.png"
                                          : arranger.avatar
                                      }
                                      className="object-cover h-full w-full"
                                    />
                                    <AvatarFallback className="text-2xl sm:text-3xl bg-gray-200 dark:bg-gray-700">
                                      {arranger.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="min-w-0 flex-grow flex flex-col justify-between w-full">
                                    <div className="px-1">
                                      <p
                                        className={`
                                        font-semibold text-[11px] sm:text-xs text-gray-900 dark:text-gray-100 text-center leading-tight
                                        ${
                                          arranger.name.split(" ").length >= 2
                                            ? "whitespace-normal break-words"
                                            : "truncate"
                                        }
                                      `}
                                      >
                                        {arranger.name}
                                      </p>
                                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                                        {arranger.arrangements} songs
                                      </p>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mockSong = {
                                          // Pastikan menggunakan nama field yang dikenali handleCreatorProfile
                                          arranger_slug: arranger.creator_slug,
                                        };
                                        handleCreatorProfile(mockSong);
                                      }}
                                    >
                                      {t("communityLib.viewProfile")}
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}

                              {/* JOIN US CARD */}
                              <motion.div
                                key="become-creator"
                                initial={{
                                  opacity: 0,
                                  y: 20,
                                  scale: 0.95,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: -20,
                                  scale: 0.95,
                                }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeOut",
                                }}
                                className="flex flex-col items-center justify-center gap-3 text-center w-28 flex-shrink-0 cursor-pointer group"
                                onClick={() => navigate("/become-creator")}
                              >
                                <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800/80 border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-blue-500 dark:group-hover:border-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/50 transition-all duration-300">
                                  <Crown className="h-10 w-10 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                    Join Us
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Become a Creator
                                  </p>
                                </div>
                              </motion.div>
                            </AnimatePresence>

                            {/* Arrows */}
                            {showArrangersLeftArrow && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => scrollArrangersCarousel("left")}
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                              >
                                <ArrowLeft className="h-5 w-5" />
                              </Button>
                            )}
                            {showArrangersRightArrow && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => scrollArrangersCarousel("right")}
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                              >
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        // ✅ DESKTOP VERSION
                        <div className="relative">
                          {showArrangersRightArrow && (
                            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-background to-transparent z-10" />
                          )}
                          <div
                            ref={arrangersScrollRef}
                            onScroll={checkArrangersArrowVisibility}
                            // snap-x agar berhenti pas di avatar
                            className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-10 px-2 scrollbar-hide snap-x snap-mandatory"
                          >
                            <AnimatePresence>
                              {trustedArrangers.map((arranger) => (
                                <motion.div
                                  key={arranger.user_id}
                                  initial={{
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    y: -20,
                                    scale: 0.95,
                                  }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeOut",
                                  }}
                                  className="flex flex-col items-center gap-2 text-center w-24 flex-shrink-0 cursor-pointer group transition-transform duration-300 group-hover:scale-110"
                                  onClick={() =>
                                    handleCreatorIdFilter(arranger)
                                  }
                                >
                                  <Avatar
                                    className={`h-16 w-16 sm:h-15 sm:w-15 transition-all duration-300 ring-4 ring-offset-2 dark:ring-offset-blue-200 ${
                                      creatorIdFilter === arranger.user_id
                                        ? "ring-blue-500"
                                        : "ring-transparent group-hover:ring-blue-300"
                                    }`}
                                  >
                                    <AvatarImage
                                      src={
                                        arranger.name === "Arrangely Creator"
                                          ? "/LOGO_BACK.png"
                                          : arranger.avatar
                                      }
                                      className="object-cover h-full w-full"
                                    />
                                    <AvatarFallback className="text-2xl sm:text-3xl bg-gray-200 dark:bg-gray-700">
                                      {arranger.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="min-w-0 flex-grow flex flex-col justify-between">
                                    <div>
                                      <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                                        {arranger.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {arranger.arrangements} songs
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mockSong = {
                                          creatorSlug: arranger.creator_slug,
                                        };
                                        handleCreatorProfile(mockSong);
                                      }}
                                      className="w-24 sm:w-24 mt-3 h-7 sm:h-8 text-xs"
                                    >
                                      {t("communityLib.viewProfile")}
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}

                              {/* JOIN US card */}
                              <motion.div
                                key="become-creator"
                                initial={{
                                  opacity: 0,
                                  y: 20,
                                  scale: 0.95,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: -20,
                                  scale: 0.95,
                                }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeOut",
                                }}
                                className="flex flex-col items-center justify-center gap-3 text-center w-32 flex-shrink-0 cursor-pointer group"
                                onClick={() => navigate("/become-creator")}
                              >
                                <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800/80 border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-blue-500 dark:group-hover:border-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/50 transition-all duration-300">
                                  <Crown className="h-10 w-10 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                    Join Us
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Become a Creator
                                  </p>
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </>
                  </div>
                )
              )}
              {/* Akhir dari Bagian 1 */}
            </>
          )}

        {!isSearchActive &&
          marketplaceTab !== "community" &&
          showTrendingSongs && (
            <div className="mb-12 relative group">
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                {t("communityLib.trendSong")}
              </h2>
              {trendingLoading ? (
                <div className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-none w-48 sm:w-56 animate-pulse"
                    >
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-32 sm:h-36 mb-3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : trendingSongs.length > 0 ? (
                <div className="relative">
                  <div
                    ref={trendingScrollRef}
                    className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide"
                    onScroll={checkArrowVisibility}
                  >
                    {trendingSongs.map((song) => {
                      return (
                        <motion.div
                          key={song.id}
                          initial={{
                            opacity: 0,
                            y: 20,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            duration: 0.3,
                          }}
                          className={`flex-none ${
                            isNative ? "w-40" : "w-48 sm:w-56"
                          }`}
                        >
                          <Card
                            className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                            onClick={() => handlePreview(song)}
                          >
                            <CardContent className="p-3 flex flex-col flex-grow">
                              <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted mb-3">
                                {song.youtubeThumbnail ? (
                                  <img
                                    src={song.youtubeThumbnail}
                                    alt={`${
                                      song.title || "Untitled Song"
                                    } thumbnail`}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : song.youtubeLink ? (
                                  <img
                                    src={`https://img.youtube.com/vi/${extractYouTubeVideoId(
                                      song.youtubeLink ?? "",
                                    )}/mqdefault.jpg`}
                                    alt={`${
                                      song.title || "Untitled Song"
                                    } thumbnail`}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Music className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-semibold line-clamp-2 leading-tight">
                                  {song.title}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {song.artist}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={song.arranger_avatar} />
                                  <AvatarFallback className="text-xs">
                                    {song.arranger
                                      ?.split(" ")
                                      .map((n: string) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                  {song.arranger}
                                  <Verified className="h-3 w-3 inline-block ml-1 text-blue-500" />
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                  {showLeftArrow && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollCarousel("left")}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </Button>
                  )}
                  {showRightArrow && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollCarousel("right")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                    >
                      <ArrowRight className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No trending songs available yet.
                </div>
              )}
            </div>
          )}

        {/* Latest From Creators You Follow */}
        {!isSearchActive &&
          marketplaceTab !== "community" &&
          showTrendingSongs &&
          user &&
          followingSongs.length > 0 && (
            <div className="mb-12 relative group">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  {t("communityLib.latestFromFollowing")}
                </h2>
                <Link
                  to="/songs?sort=following"
                  className="text-sm text-primary hover:underline"
                >
                  See All
                </Link>
              </div>
              {followingLoading ? (
                <div className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-none w-48 sm:w-56 animate-pulse"
                    >
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-32 sm:h-36 mb-3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <div
                    ref={followingScrollRef}
                    className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide"
                  >
                    {followingSongs.map((song) => (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex-none ${
                          isNative ? "w-40" : "w-48 sm:w-56"
                        }`}
                      >
                        <Card
                          className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                          onClick={() => handlePreview(song)}
                        >
                          <CardContent className="p-3 flex flex-col flex-grow">
                            <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted mb-3">
                              {song.youtubeThumbnail ? (
                                <img
                                  src={song.youtubeThumbnail}
                                  alt={`${
                                    song.title || "Untitled Song"
                                  } thumbnail`}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : song.youtubeLink ? (
                                <img
                                  src={`https://img.youtube.com/vi/${extractYouTubeVideoId(
                                    song.youtubeLink ?? "",
                                  )}/mqdefault.jpg`}
                                  alt={`${
                                    song.title || "Untitled Song"
                                  } thumbnail`}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <Music className="h-12 w-12 text-primary/40" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <div className="space-y-1 flex-grow flex flex-col justify-between">
                              <div>
                                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                  {song.title || "Untitled Song"}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {song.artist || "Unknown Artist"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={song.arranger_avatar || ""}
                                  />
                                  <AvatarFallback className="text-[10px]">
                                    {(song.arranger_name || "U").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                  {song.arranger_name || "Unknown"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* [PERBAIKAN] Separator ini hanya muncul jika ada pencarian aktif, agar tidak ada double separator */}

        {!isSearchActive &&
          marketplaceTab !== "community" &&
          showTrendingSongs && (
            <>
              {!isSearchActive && artistsLoading ? (
                <div className="mb-12">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Music className="h-5 w-5 text-purple-500" />
                    {t("communityLib.browseByArtist") || "Browse by Artist"}
                  </h2>
                  <div className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="flex-none w-48 sm:w-56 animate-pulse"
                      >
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-32 sm:h-36 mb-3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : artistsList.length > 0 ? (
                <div className="mb-12 relative group">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-500" />
                      {t("communityLib.browseByArtist") || "Browse by Artist"}
                    </h2>
                    {/* Tombol ini akan mengarah ke halaman baru */}
                    <Button asChild variant="outline" size="sm">
                      <Link to="/artists">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <div className="relative">
                    <div
                      ref={artistsScrollRef}
                      className="flex gap-4 overflow-x-auto p-4 -m-4 scrollbar-hide"
                      onScroll={checkArtistsArrowVisibility}
                    >
                      {artistsList.map((artist) => (
                        <motion.div
                          key={artist.artist_name} // [!code focus] Ganti key ke artist_name
                          initial={{
                            opacity: 0,
                            y: 20,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            duration: 0.3,
                          }}
                          className="flex-none w-48 sm:w-56"
                        >
                          <Card
                            className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                            // [!code focus start]
                            // Ganti onClick untuk memfilter berdasarkan nama artis
                            onClick={() =>
                              navigate(
                                `/artist/${encodeURIComponent(
                                  artist.artist_name,
                                )}`,
                              )
                            }
                            // [!code focus end]
                          >
                            <CardContent className="p-3 flex flex-col flex-grow">
                              <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted mb-3">
                                {artist.random_thumbnail ? (
                                  <img
                                    src={artist.random_thumbnail}
                                    alt={`${artist.artist_name} thumbnail`}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  // Fallback jika tidak ada thumbnail
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-semibold line-clamp-2 leading-tight">
                                  {artist.artist_name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {artist.total_songs} songs
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                    {showArtistsLeftArrow && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scrollArtistsCarousel("left")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                      >
                        <ArrowLeft className="h-6 w-6" />
                      </Button>
                    )}
                    {showArtistsRightArrow && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scrollArtistsCarousel("right")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm hover:bg-white z-10 hidden sm:flex opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                      >
                        <ArrowRight className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No artists found.
                </div>
              )}
              <Separator className="my-10" />
            </>
          )}

        {/* Songs Display */}
        {loadingSong ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              // === SKELETON LOADER BARU ===
              <div
                key={i}
                className="flex flex-col rounded-lg border bg-white dark:bg-gray-800 p-3 animate-pulse"
              >
                {/* Title + Buttons */}
                <div className="flex items-start justify-between gap-2 min-h-[60px] mb-2">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="w-full h-32 sm:h-36 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>

                {/* Meta (key, tempo, etc.) */}
                <div className="flex gap-3 mb-2">
                  <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Arranger */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSongs.length > 0 ||
          (isSearchActive && viewMode === "grid") ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {filteredSongs.map((song) => (
              <motion.div key={song.id} variants={itemVariants} layout>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-start justify-between gap-2 min-h-[60px]">
                      <div className="flex-1 min-w-0">
                        <CardTitle
                          className={`${
                            isNative ? "text-sm" : "text-base sm:text-lg"
                          } font-bold line-clamp-1 leading-tight`}
                        >
                          {song.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {song.artist}
                        </p>
                        <div className="mt-2">
                          <Badge
                            variant={
                              detectArrangementType(song) === "chord_grid"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {detectArrangementType(song) === "chord_grid"
                              ? "Chord Grid"
                              : "Chord + Lyrics"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLike(song.id)}
                          className={song.isLiked ? "text-red-500" : ""}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              song.isLiked ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFavorite(song.id)}
                          className={song.isFavorited ? "text-yellow-500" : ""}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              song.isFavorited ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShare(song)}
                          className="sm:hidden"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 space-y-3 flex flex-col flex-grow">
                    <div className="space-y-1">
                      <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted">
                        {song.youtubeThumbnail || song.youtubeLink ? (
                          <img
                            src={
                              song.youtubeThumbnail ||
                              `https://img.youtube.com/vi/${extractYouTubeVideoId(
                                song.youtubeLink,
                              )}/mqdefault.jpg`
                            }
                            alt={`${song.title} thumbnail`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Music className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex flex-wrap items-center ${
                          isNative ? "gap-x-2" : "gap-x-4"
                        } gap-y-1 ${
                          isNative ? "text-[10px]" : "text-xs"
                        } text-muted-foreground pt-1`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Music className={isNative ? "h-3 w-3" : "h-4 w-4"} />
                          <span className="truncate">{song.key}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className="truncate">{song.tempo} BPM</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-4 w-4" />
                          <span className="truncate">{song.likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />
                          <span className="truncate">{song.views}</span>
                        </div>
                      </div>
                      {song.category && (
                        <div className="mb-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
                          >
                            {song.category}
                          </Badge>
                        </div>
                      )}
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                        onClick={() => handleCreatorProfile(song)}
                      >
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={song.arrangerAvatar} />
                          <AvatarFallback className="text-xs">
                            {song.arranger
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground truncate pt-3 pb-3 hover:text-primary transition-colors cursor-pointer">
                          by{" "}
                          <span className="hover:underline">
                            {song.arranger}
                          </span>
                        </span>
                      </div>
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {song.tags.map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 pt-1 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(song)}
                        className={`w-full ${
                          isNative ? "h-7 text-[10px]" : "h-8 sm:h-9 sm:text-sm"
                        }`}
                      >
                        <Play className="h-4 w-4 mr-1" /> {/* Preview */}
                        {t("communityLib.preview")}
                      </Button>
                      {(() => {
                        const isSongInLibrary = songsInLibrary.has(
                          `${song.title}-${song.artist}`,
                        );
                        const key = `${(song.title ?? "")
                          .trim()
                          .toLowerCase()}|${(song.artist ?? "")
                          .trim()
                          .toLowerCase()}`;

                        const archivedId = archivedSongs.get(key);
                        const isAdding = addingToLibrary.has(song.id);

                        if (isAdding) {
                          return (
                            <Button
                              size="sm"
                              disabled
                              className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                            >
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                              Adding...
                            </Button>
                          );
                        }
                        if (archivedId) {
                          return (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleUnarchive(
                                  archivedId,
                                  song.title,
                                  song.artist,
                                )
                              }
                              className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                              variant="secondary"
                            >
                              <Upload className="h-4 w-4 mr-1" /> Unarchive
                            </Button>
                          );
                        }
                        if (isSongInLibrary) {
                          return (
                            <Button
                              size="sm"
                              disabled
                              className="w-full bg-green-600 hover:bg-green-600 h-8 text-xs sm:h-9 sm:text-sm"
                            >
                              <Check className="h-4 w-4 mr-1" /> In Library
                            </Button>
                          );
                        }
                        const isSubscriptionLocked =
                          !subscriptionStatus?.hasActiveSubscription &&
                          (!IS_TRIAL_ENABLED ||
                            !subscriptionStatus?.isTrialing);
                        if (isSubscriptionLocked) {
                          return (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAddToLibrary(song.id, song.title)
                              }
                              className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />{" "}
                              {/* Add to Library */}
                              {t("communityLib.addToLibrary")}
                            </Button>
                          );
                        }
                        return (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddToLibrary(song.id, song.title)
                            }
                            className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add to Library
                          </Button>
                        );
                      })()}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShare(song)}
                        className="w-full hidden sm:inline-flex"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        {/* Share */}
                        {t("communityLib.share")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {isSearchActive && (
              <div className="px-4 mb-4 flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/10">
                <p className="text-sm">
                  Hasil pencarian untuk:{" "}
                  <span className="font-bold">"{searchTerm}"</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    // Hapus query param dari URL agar bersih kembali
                    navigate(location.pathname, {
                      replace: true,
                    });
                  }}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" /> Hapus Pencarian
                </Button>
              </div>
            )}

            {/* Request Arrangement Card */}
            {isSearchActive && viewMode === "grid" && (
              <motion.div
                key="request-arrangement-card"
                variants={itemVariants}
                layout
              >
                <Card className="h-full flex flex-col items-center justify-center p-6 border-2 border-dashed bg-muted/50 hover:border-primary hover:bg-muted/80 transition-colors">
                  <div className="text-center">
                    <Music className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Can't find the song?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Let us know and we might arrange it for you.
                    </p>
                    <RequestArrangementDialog />
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t("communityLib.noArr")}
              </h3>
              <p className="text-muted-foreground mb-4">
                No public arrangements available yet. Be the first to share!
              </p>
              {/* Ganti RequestArrangementDialog dengan Button di bawah ini */}
              <Button onClick={() => navigate("/creator-community")}>
                <Users className="mr-2 h-4 w-4" />{" "}
                {/* Opsional: tambah icon Users */}
                Join Pro Community
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {((marketplaceTab === "community" && !communityLoading) ||
          (marketplaceTab !== "community" && !loadingSong)) &&
          totalPages > 1 && (
            <div
              className={`flex justify-center items-center gap-2 mt-8 ${
                isNative ? "pb-24" : "pb-4"
              }`}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                {/* Previous */}
                {t("communityLib.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("communityLib.page")} {currentPage} {t("communityLib.of")}{" "}
                {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className={isNative ? "h-8 text-[10px]" : ""}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
      </div>

      {/* Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
      <LibraryLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={libraryUsage.currentCount}
        limit={libraryUsage.limit}
        isTrialing={libraryUsage.isTrialing}
      />
      {selectedPlan && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            window.location.reload();
          }}
          plan={selectedPlan}
        />
      )}
      {/* {!isMobileView && ( */}
      <Drawer open={shareDrawerOpen} onOpenChange={setShareDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-center">Share to</DrawerTitle>
              <DrawerDescription className="text-center">
                Share this arrangement with your friends
              </DrawerDescription>
            </DrawerHeader>

            <div className="grid grid-cols-4 gap-4 p-6">
              {/* WhatsApp */}
              <a
                href={songToShare ? getShareLinks(songToShare).whatsapp : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white transition-transform group-active:scale-90">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.845-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.82-.981z" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">WhatsApp</span>
              </a>

              {/* Facebook */}
              <a
                href={songToShare ? getShareLinks(songToShare).facebook : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white transition-transform group-active:scale-90">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">Facebook</span>
              </a>

              {/* Instagram (Copy Link focus) */}
              {/* Instagram (Copy Link + Open Instagram) */}
              {/* Instagram (Copy Link + Redirect) */}
              <button
                onClick={() => {
                  const link = getShareLinks(songToShare).copy;
                  copyToClipboard(link, true); // keepOpen = true agar drawer tidak langsung hilang

                  toast({
                    title: "Link Copied!",
                    description:
                      "Instagram doesn't support direct sharing. Please paste the link manually.",
                  });

                  // Tunggu sebentar agar user baca toast, lalu buka Instagram
                  setTimeout(() => {
                    window.open("https://www.instagram.com/", "_blank");
                  }, 1000);
                }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center text-white transition-transform group-active:scale-90">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">Instagram</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={() => copyToClipboard(getShareLinks(songToShare).copy)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-transform group-active:scale-90">
                  <Share2 className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium">Copy Link</span>
              </button>
            </div>

            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
      {/* )} */}
    </div>
  );
};

export default SongLibraryBrowse;
