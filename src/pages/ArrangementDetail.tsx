import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PdfLikeViewer from "@/components/PdfLikeViewer";
import { Separator } from "@/components/ui/separator";
import wholeRestImg from "@/assets/whole_rest.svg";
import halfRestImg from "@/assets/half_rest.svg";
import quarterRestImg from "@/assets/quarter_rest.svg";
import eighthRestImg from "@/assets/eighth_rest.svg";
import segno from "@/assets/segno.svg";
import codaSign from "@/assets/coda_sign.svg";
import { storeIntendedUrl } from "@/utils/redirectUtils";
import { simplifyChord, simplifyChordLine } from "@/utils/chordSimplifier";
import PreviewFeatureTour from "@/components/tour/PreviewFeatureTour";
import { useIsMobile } from "@/hooks/use-mobile";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import { SectionComments } from "@/components/SectionComments";
import {
  transposeText,
  transposeChord,
  getSemitoneInterval,
} from "@/lib/transpose"; // Pastikan path-nya benar
import TransposeModal from "@/components/TransposeModal";
import sixteenthRestImg from "@/assets/sixteenth_rest.svg";
import {
  Play,
  Download,
  Heart,
  Share2,
  Edit,
  Music,
  Clock,
  Eye,
  Calendar,
  ArrowLeft,
  Copy,
  Settings,
  FileText,
  Headphones,
  Users,
  Tag,
  Folder,
  Star,
  TrendingUp,
  Volume2,
  MoreVertical,
  Sparkles,
  Globe,
  Lock,
  Youtube,
  Plus,
  Check,
  ArrowRightLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import ExportModal from "@/components/song-library/ExportModal";
import SequencerTab from "@/components/SequencerTab";
import SequencerHighlightCard from "@/components/SequencerHighlightCard";
import ChordsTab from "@/components/chords/ChordsTab";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/monetization/UpgradeModal";
import UpgradeModalLive from "@/components/UpgradeModalLivePreview";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  NotationDisplay,
  NoteType,
  NoteSymbol,
} from "@/components/chord-grid/NoteSymbols";
import { useLibraryLimit } from "@/hooks/useLibraryLimit";
import { LibraryLimitModal } from "@/components/LibraryLimitModal";
import PaymentModal from "@/components/payment/PaymentModal";
import { AddToSetlistPopover } from "@/components/AddToSetlistPopover";
// import { useSubscription } from "@/contexts/SubscriptionContext";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PublicationStatusCard } from "@/components/publication/PublicationStatusCard";
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
  youtube_link: string | null;
  youtube_thumbnail: string | null;
  user_id: string;
  original_creator_id?: string;
  sequencer_drive_link: string | null;
  sequencer_price: number | null;
  theme?: string | null;
  slug: string;
  folder?: {
    name: string;
    color: string;
  };
  creator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    creator_type?: string | null;
  } | null;
  sections?: Array<{
    id: string;
    section_type: string;
    lyrics: string | null;
    chords: string | null;
    name: string | null;
    bar_count: number | null;
    section_time_signature?: string | null;
  }>;
  arrangements?: Array<{
    id: string;
    position: number;
    repeat_count: number;
    notes: string | null;
    section: {
      id: string;
      section_type: string;
      name: string | null;
    };
  }>;
}

const UnlockPrompt = ({ subscriptionStatus, navigate }: any) => (
  <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background/50 p-8 text-center">
    <Lock className="h-10 w-10 text-primary mb-4" />
    <h3 className="text-xl font-bold text-foreground mb-2">
      Unlock Full Arrangement
    </h3>
    <p className="text-muted-foreground mb-6 max-w-sm">
      {subscriptionStatus?.canStartTrial
        ? "Subscribe to view the complete song details, chords, and structure."
        : "Your subscribe has ended. Subscribe now to unlock all features and view this arrangement."}
    </p>
    {!isCapacitorIOS() && (
      <Button
        size="lg"
        className="bg-gradient-worship hover:opacity-90 text-white"
        onClick={() => navigate("/pricing")}
      >
        <Lock className="h-4 w-4 mr-2" />
        Subscribe to Unlock
      </Button>
    )}
  </div>
);

// Helper function to extract YouTube video ID from URL
const extractYouTubeVideoId = (url: string): string => {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : "";
};

const IS_TRIAL_ENABLED = false;

const ArrangementDetail = () => {
  const { t } = useLanguage();
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const { libraryUsage, recordLibraryAction } = useLibraryLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingSongAdd, setPendingSongAdd] = useState<{
    songId: string;
    title: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [transposedKey, setTransposedKey] = useState<string>("");
  const [showTransposeModal, setShowTransposeModal] = useState(false);
  const [simplifyChordsEnabled, setSimplifyChordsEnabled] = useState(() => localStorage.getItem('simplifyChords') === 'true');
  const { id, slug } = useParams<{
    id?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscription();

  const { toast } = useToast();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("preview");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [isFromCommunityLibrary, setIsFromCommunityLibrary] = useState(false);
  const isMobileView = useIsMobile();
  const viewRecordedRef = useRef<string | null>(null);
  const [userCopyId, setUserCopyId] = useState<string | null>(null);
  const [userCopySlug, setUserCopySlug] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [publicationStatus, setPublicationStatus] = useState<{
    status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'archived' | null;
    rejectedReason: string | null;
    validationResults: Record<string, unknown> | null;
  } | null>(null);

  const tabItems = [
    { value: "preview", label: t("arrDetail.songPreview") },
    // { value: "youtube", label: "YouTube" },
    // { value: "details", label: t("arrDetail.songPreview") },
    { value: "chords", label: t("arrEditor.key") },
  ];

  const inferNotesFromChord = (chordString: string) => {
    if (!chordString) return [];

    // 1. Pecah dulu berdasarkan spasi untuk mendeteksi durasi (.)
    const parts = chordString.split(" ").filter(Boolean);
    const inferredNotes: any[] = [];

    for (let i = 0; i < parts.length; i++) {
      const current = parts[i];
      if (current === ".") continue;

      // Hitung titik setelah chord ini untuk Whole/Half Note
      let dotCount = 0;
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[j] === ".") dotCount++;
        else break;
      }

      // 2. Cek apakah ini satu chord atau chord rapat (misal: ABCD)
      // Regex untuk memisahkan chord yang menempel: [A-G][#b]?
      const clusteredChords = current.match(/[A-G][#b]?[^A-G]*/g) || [current];

      clusteredChords.forEach((chord, clusterIndex) => {
        let type: NoteType = "quarter";

        // LOGIKA SESUAI GAMBAR 2 & 5
        if (dotCount === 3) {
          type = "whole"; // A . . .
        } else if (dotCount === 1) {
          type = "half"; // A .
        } else if (clusteredChords.length >= 4) {
          type = "sixteenth"; // ABCD (rapat)
        } else if (clusteredChords.length === 2) {
          type = "eighth"; // AB (rapat)
        } else {
          type = "quarter"; // A (standar)
        }

        inferredNotes.push({
          type,
          beat: (i + 1).toString(),
          isClustered: clusteredChords.length > 1,
          clusterIndex,
        });
      });
    }
    return inferredNotes;
  };

  const currentTabLabel = tabItems.find(
    (tab) => tab.value === currentTab,
  )?.label;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const getShareLinks = (song: Song) => {
    const url = `${window.location.origin}/arrangement/${song.id}/${song.slug}`;
    const text = `Check out this arrangement: ${song.title} - ${song.artist}`;

    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url,
      )}`,
      copy: url,
    };
  };

  const copyToClipboard = async (text: string, keepOpen = false) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
      if (!keepOpen) setShareDrawerOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  // Update the existing handleShare to open the drawer

  useEffect(() => {
    if (
      (subscriptionStatus?.hasActiveSubscription ||
        subscriptionStatus?.isTrialing) &&
      pendingSongAdd
    ) {
      toast({
        /* ... */
      });
      addToLibrary(); // Panggil ulang fungsi addToLibrary
      setPendingSongAdd(null); // Bersihkan aksi tertunda
    }
  }, [subscriptionStatus, pendingSongAdd]);

  useEffect(() => {
    if (song) {
      setTransposedKey(song.current_key);
    }
  }, [song]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view this live session.",
          variant: "destructive",
        });

        // Panggil fungsi dari file utilitas Anda
        storeIntendedUrl(window.location.href);

        navigate("/auth");
        return;
      }
    };
    checkAuth();
  }, [navigate, toast]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserId(null);
      }
      // if (!session) {
      //   navigate("/auth");
      //   return;
      // }
    };
    checkAuth();
  }, [navigate]);

  // useEffect(() => {
  //   const identifier = slug || id;
  //   if (!identifier) return;

  //   // Reset ref jika pindah ke lagu lain
  //   if (viewRecordedRef.current !== identifier) {
  //     viewRecordedRef.current = null;
  //   }

  //   const loadPageData = async () => {
  //     setLoading(true);
  //     try {
  //       // Siapkan promise array
  //       const promises = [
  //         fetchSong(),
  //         fetchLikeCount(),
  //         checkSubscriptionStatus(),
  //       ];

  //       // HANYA panggil recordView jika belum tercatat untuk ID lagu ini
  //       if (viewRecordedRef.current !== identifier) {
  //         promises.push(recordView());
  //         viewRecordedRef.current = identifier; // Tandai sudah dilihat
  //       }

  //       await Promise.all(promises);
  //     } catch (err) {
  //       console.error("Failed to load page data:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadPageData();

  //   // Tambahkan slug ke dependency array agar responsif jika URL berubah
  // }, [id, slug]);

  // Check library status after song is loaded
  const fetchSong = async () => {
    try {
      const identifier = slug || id;
      if (!identifier) return;

      // Query by slug first, then fallback to id
      let query = supabase.from("songs").select(
        `
                *,
                folder:song_folders(name, color),
                sections:song_sections(*),
                arrangements(
                    *,
                    section:song_sections(id, section_type, name)
                )
                `,
      );

      // Try slug first, then fallback to id
      if (id) {
        // Selalu prioritaskan ID jika ada di URL
        query = query.eq("id", id);
      } else if (slug) {
        // Baru fallback ke slug jika ID tidak ada
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error("Error fetching song:", error);
        toast({
          title: "Error",
          description: "Failed to load song details.",
          variant: "destructive",
        });
        return;
      }

      console.log(data);

      checkIfInLibrary(data);

      // Tentukan ID kreator yang profilnya akan diambil.
      // Prioritaskan 'original_creator_id' untuk lagu salinan, atau gunakan 'user_id' untuk lagu asli.
      const creatorId = data.original_creator_id || data.user_id;

      if (creatorId) {
        // Lakukan panggilan kedua untuk mengambil profil kreator secara eksplisit
        const { data: creatorProfile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, creator_type")
          .eq("user_id", creatorId)
          .single();

        if (profileError) {
          console.error("Gagal mengambil profil kreator:", profileError);
          // Tetap tampilkan data lagu meskipun profil gagal diambil
          setSong(data as Song);
        } else {
          const songWithCreator = {
            ...data,
            creator_profile: creatorProfile,
          } as Song;
          setSong(songWithCreator);
        }
      } else {
        // Jika tidak ada ID kreator, langsung set data lagu
        setSong(data as Song);
      }

      setIsLiked(data.is_favorite);
      
      // Fetch publication status for the song
      fetchPublicationStatus(data.id);
    } catch (error) {
      console.error("Error:", error);
      // Tambahkan toast error di sini jika diperlukan
    }
  };

  const fetchPublicationStatus = async (songId: string) => {
    try {
      const { data, error } = await supabase
        .from('creator_pro_publications')
        .select('status, rejected_reason, validation_results')
        .eq('song_id', songId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching publication status:', error);
        return;
      }

      if (data) {
        setPublicationStatus({
          status: data.status as any,
          rejectedReason: data.rejected_reason,
          validationResults: data.validation_results as Record<string, unknown> | null,
        });
      } else {
        setPublicationStatus(null);
      }
    } catch (error) {
      console.error('Error fetching publication status:', error);
    }
  };

  const showManagementButtons = useMemo(() => {
    if (!song || !currentUserId) return false;

    // ✅ HANYA owner + sedang buka lagu milik sendiri
    return song.user_id === currentUserId && song.id === id;
  }, [song, currentUserId, id]);


  useEffect(() => {
    const identifier = slug || id;
    if (!identifier) return;

    const loadPageData = async () => {
      setLoading(true); // Mulai loading untuk semua data
      try {
        // Jalankan semua pengambilan data secara paralel
        await Promise.all([
          fetchSong(),
          recordView(),
          fetchLikeCount(),
          checkSubscriptionStatus(),
        ]);
      } catch (err) {
        console.error("Failed to load page data:", err);
        // Opsional: Atur state error di sini
      } finally {
        // Selesai loading HANYA SETELAH semua data berhasil diambil
        setLoading(false);
      }
    };

    loadPageData();
  }, [id]);

  const saveTransposedSongChanges = async (transposedSong: Song) => {
    try {
      // Siapkan semua promise untuk update
      const updatePromises = [];

      // 1. Promise untuk update tabel 'songs'
      const songUpdatePromise = supabase
        .from("songs")
        .update({
          current_key: transposedSong.current_key,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transposedSong.id);

      updatePromises.push(songUpdatePromise);

      // 2. Promise untuk update setiap section di 'song_sections'
      transposedSong.sections?.forEach((section) => {
        const sectionUpdatePromise = supabase
          .from("song_sections")
          .update({
            lyrics: section.lyrics,
            chords: section.chords, // Pastikan kolom ini ada di RLS Anda
          })
          .eq("id", section.id);
        updatePromises.push(sectionUpdatePromise);
      });

      // Jalankan semua promise secara bersamaan
      const results = await Promise.all(updatePromises);

      // Cek jika ada error di salah satu promise
      const errorResult = results.find((result) => result.error);
      if (errorResult) {
        throw errorResult.error;
      }

      toast({
        title: "✅ Transpose Saved!",
        description: `Song successfully saved in the key of ${transposedSong.current_key}.`,
      });
    } catch (error: any) {
      console.error("Error saving transposed song:", error);
      toast({
        title: "Error Saving Changes",
        description: error.message || "Could not save changes to the database.",
        variant: "destructive",
      });
    }
  };

  const getTransposedSong = (
    song: Song,
    fromKey: string,
    toKey: string,
    preferSharps: boolean,
  ): Song => {
    const newSong = JSON.parse(JSON.stringify(song));
    newSong.current_key = toKey;

    const semitones = getSemitoneInterval(fromKey, toKey);
    if (semitones === 0) return song;

    // Regex untuk menemukan semua kemungkinan chord dalam satu baris
    const chordRegex =
      /([A-G](?:##|#|bb|b)?(?:maj|m|min|dim|aug|add|sus|M|\d)*(\/[A-G][#b]?)?)/g;

    newSong.sections?.forEach((section: any) => {
      const isInstrumental = [
        "intro",
        "outro",
        "interlude",
        "solo",
        "instrumental",
      ].includes(section.section_type.toLowerCase());
      // Logika untuk chord_grid tetap sama (sudah benar)
      if (song.theme === "chord_grid" && section.lyrics?.startsWith("[")) {
        try {
          const chordGridData = JSON.parse(section.lyrics);
          const bars = chordGridData.bars || chordGridData;
          const nonTransposableSymbols = [
              "WR", "HR", "QR", "ER", "SR", 
              "WR.", "HR.", "QR.", "ER.", "SR.", 
              "%", "//", "/.", "/"
            ];
          bars.forEach((bar: any) => {
            if (bar.chord) {
              const chordBeats = bar.chord
                ? bar.chord.split(" ").filter(Boolean)
                : [];
              if (bar.restType) {
                chordBeats.push(bar.restType);
              }
              if (bar.chordAfter) {
                // [!code focus:4]
                // PECAH chord tambahan agar masing-masing mendapat kolom grid sendiri
                const afterParts = bar.chordAfter.split(" ").filter(Boolean);
                chordBeats.push(...afterParts);
              }
              const transposedBeats = chordBeats.map((beat: string) => {
                // If the 'beat' is a known rest or musical symbol, return it without changes.
                if (nonTransposableSymbols.has(beat)) {
                  return beat;
                }
                // Otherwise, transpose it as a chord.
                return transposeChord(beat, semitones, preferSharps);
              });
              bar.chord = transposedBeats.join(" ");
            }
          });
          section.lyrics = JSON.stringify(chordGridData);
        } catch (e) {
          console.error("Gagal memproses JSON chord_grid:", e);
        }
      } else {
        // --- INI BAGIAN UTAMA PERUBAHAN ---
        const contentToTranspose = section.chords || section.lyrics;
        if (contentToTranspose) {
          const lines = contentToTranspose.split("\n");
          const transposedLines = lines.map((line, i) => {
            // Baris genap (0, 2, 4...) adalah chord line
            if (isInstrumental || i % 2 === 0) {
              // [!code ++]
              return line.replace(chordRegex, (match) => {
                // Gunakan transposeChord yang sudah pintar untuk setiap chord
                return transposeChord(match, semitones, preferSharps);
              });
            }
            // Jika bukan baris chord, kembalikan lirik apa adanya.
            return line;
          });

          const transposedContent = transposedLines.join("\n");

          if (section.chords) section.chords = transposedContent;
          if (section.lyrics) section.lyrics = transposedContent;
        }
      }
    });

    return newSong;
  };

  const handleTranspose = (newKey: string, preferSharps = true) => {
    if (!song) return;

    // 1. Ubah state lokal untuk respons UI yang cepat
    const transposedSong = getTransposedSong(
      song,
      song.current_key,
      newKey,
      preferSharps,
    );
    setSong(transposedSong);
    setTransposedKey(newKey);

    // 2. Panggil fungsi untuk menyimpan perubahan ke database
    saveTransposedSongChanges(transposedSong);
  };

  const fetchLikeCount = async () => {
    if (!id) return;
    try {
      const { data: likeCountData } = await supabase.rpc(
        "get_song_like_count",
        { song_id: id },
      );
      setLikeCount(likeCountData || 0);

      // Check if current user likes this song
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userLikesData } = await supabase.rpc("user_likes_song", {
          song_id: id,
          user_id: user.id,
        });
        setIsLiked(userLikesData || false);
      }
    } catch (error) {
      console.error("Error fetching like count:", error);
    }
  };
  const recordView = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !id) return;

      // Use the database function to increment views properly
      await supabase.rpc("increment_song_views", { song_id: id });

      // Update local state
      setSong((prev) =>
        prev ? { ...prev, views_count: prev.views_count + 1 } : prev,
      );

      // Log activity
      await supabase.from("song_activity").insert({
        user_id: user.id,
        song_id: id,
        activity_type: "view",
      });
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };
  const toggleFavorite = async () => {
    if (!song) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const newFavoriteStatus = !isLiked;
      const { error } = await supabase
        .from("songs")
        .update({
          is_favorite: newFavoriteStatus,
        })
        .eq("id", song.id)
        .eq("user_id", user.id);
      if (error) {
        console.error("Error updating favorite:", error);
        return;
      }

      // Log activity
      await supabase.from("song_activity").insert({
        user_id: user.id,
        song_id: song.id,
        activity_type: newFavoriteStatus ? "favorite" : "unfavorite",
      });
      setIsLiked(newFavoriteStatus);
      setSong((prev) =>
        prev
          ? {
              ...prev,
              is_favorite: newFavoriteStatus,
            }
          : null,
      );
      toast({
        title: newFavoriteStatus
          ? "Added to favorites"
          : "Removed from favorites",
        description: newFavoriteStatus
          ? "Song added to your favorites."
          : "Song removed from your favorites.",
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: hasLivePreview, error } = await supabase.rpc(
        "get_user_feature",
        {
          user_id_param: user.id,
          feature_key: "live_preview",
        },
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

  const checkIfInLibrary = async (song: any) => {
    if (!song) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Update logic: Jika user ID lagu TIDAK SAMA dengan user yang login, maka itu dari Community
      const isSongFromCommunityLibrary = song.user_id !== user.id;
      setIsFromCommunityLibrary(isSongFromCommunityLibrary);

      const { data: existingSong } = await supabase
        .from("songs")
        .select("id, slug")
        .eq("title", song.title)
        .eq("artist", song.artist)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsInLibrary(!!existingSong);
      console.log(existingSong);
      if (existingSong) {
        setUserCopyId(existingSong.id);
        setUserCopySlug(existingSong.slug);
      }
    } catch (error) {
      console.error("Error checking if song is in library:", error);
    }
  };

  const goToLibrarySong = () => {
    if (!userCopyId) return;
    navigate(`/arrangement/${userCopyId}/${userCopySlug}`);
  };

  const { id: urlSongId } = useParams<{ id?: string }>();

  const isOwner = useMemo(() => {
    if (!song || !currentUserId) return false;
    return song.user_id === currentUserId;
  }, [song, currentUserId]);

  const isViewingLibrarySong = useMemo(() => {
    if (!song || !id) return false;
    return song.user_id === currentUserId && song.id === id;
  }, [song, currentUserId, id]);


  const addToLibrary = async () => {
    if (!song) return;

    setAddingToLibrary(true);

    try {
      // 1️⃣ Pastikan user login
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("User not authenticated");
      }


      // 3️⃣ Panggil Edge Function (Atomic)
      const { data, error } = await supabase.functions.invoke(
        "add-song-to-library",
        {
          body: {
            originalSongId: song.id,
          },
        }
      );

      // 4️⃣ Handle network / invoke error
      if (error) {
        throw new Error(error.message || "Failed to add to library");
      }

      // 5️⃣ Handle business logic error (dari backend)
      if (!data?.success) {
        throw new Error(data?.error?.message || "Library action failed");
      }

      // 6️⃣ SUCCESS
      toast({
        title: "Added to Library",
        description: "Song has been successfully added to your library.",
      });

      setIsInLibrary(true);

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
          description: "Song is already in your library.",
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
          description: "Failed to add song to library.",
          variant: "destructive",
        });
      }
    } finally {
      setAddingToLibrary(false);
    }
  };

  const duplicateSong = async () => {
    if (!song) return;
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
        time_signature: song.time_signature as
          | "4/4"
          | "3/4"
          | "2/4"
          | "6/8"
          | "9/8"
          | "12/8"
          | "5/4"
          | "7/8",
        capo: song.capo,
        notes: song.notes,
        original_creator_id: song.original_creator_id || song.user_id, // Track original creator
        sequencer_drive_link: song.sequencer_drive_link,
        sequencer_price: song.sequencer_price,
      };
      const { data: duplicatedSong, error } = await supabase
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
          song_id: duplicatedSong.id,
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
            song_id: duplicatedSong.id,
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
      });
      navigate(`/arrangement/${duplicatedSong.id}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const handleShare = async () => {
    const shareData = {
      title: song?.title || "Arrangement",
      text: `Check out this arrangement: ${song?.title} - ${song?.artist}`,
      url: `${window.location.origin}/arrangement/${song?.id}/${song?.slug}`,
    };

    // Cek apakah ini mobile dan mendukung fitur native share
    if (isMobileView && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        
        // Jika user cancel share native, biasanya tidak perlu aksi tambahan
      }
    } else {
      // Jika di desktop, baru buka drawer custom kita
      setShareDrawerOpen(true);
    }
  };

  const isPreviewMode = useMemo(() => {
    // 1. Safety check: Jika data lagu belum load, kunci (Preview Mode)
    if (!song) return true;

    // 2. Apakah Pemilik? (Pastikan currentUserId ada isinya)
    if (currentUserId && song.user_id === currentUserId) {
      return false; // Buka kunci (Full Access)
    }

    // 3. Apakah sudah Add Library?
    if (isInLibrary) {
      return false; // Buka kunci (Full Access)
    }

    // 4. Apakah Subscriber?
    // Kita gunakan optional chaining (?.)
    // Jika subscriptionStatus masih loading/undefined, hasilnya undefined (falsy),
    // sehingga akan lanjut ke return true di bawah (Terkunci). Ini sesuai request.
    if (
      subscriptionStatus?.hasActiveSubscription ||
      subscriptionStatus?.isTrialing
    ) {
      return false; // Buka kunci (Full Access)
    }

    // 5. Default: Jika tidak ada yang true di atas (Belum login, bukan owner, bukan subs)
    // Maka return true (Masuk Mode Preview/Terkunci)
    return true;
  }, [song, subscriptionStatus, isInLibrary, currentUserId]);

  // const isChordLine = (line: string): boolean => {
  //   const trimmedLine = line.trim();
  //   if (!trimmedLine || trimmedLine.startsWith("[")) {
  //     return false;
  //   }

  //   const specialWordsPattern = /^(N\.C\.|NC|Tacet|STOP)$/i;
  //   const numberChordPattern = /^\d(b|#)?$/i;
  //   const solfegeNotationPattern = /^[A-G](is|es|s)?$/i;

  //   const chordPattern = new RegExp(
  //     "^" +
  //       "[A-G]" +
  //       "(?:#|##|b|bb)?" +
  //       "(?:" +
  //       "ma(j)?|M|" +
  //       "min|m|-|" +
  //       "dim|o|" +
  //       "aug|\\+|" +
  //       "sus|" +
  //       "add|" +
  //       "Δ|" +
  //       "\\d+|" + // Tetap izinkan angka
  //       // [!code focus start]
  //       "b|#" + // Ditambahkan: Izinkan 'b' dan '#' sebagai bagian dari modifier
  //       // [!code focus end]
  //       ")*" +
  //       "(?:\\(.*?\\))?" +
  //       "(?:\\/[A-G#b\\d]+)?" +
  //       "$",
  //     "i"
  //   );

  //   const words = trimmedLine.split(/[\s-]+/).filter((word) => word.length > 0);

  //   if (words.length === 0) {
  //     return false;
  //   }

  //   return words.every(
  //     (word) =>
  //       chordPattern.test(word) ||
  //       specialWordsPattern.test(word) ||
  //       numberChordPattern.test(word) ||
  //       solfegeNotationPattern.test(word)
  //   );
  // };
  const renderSongPreview = () => {
    if (!song) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No song data available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const sortedArrangements =
      song.arrangements?.sort((a, b) => a.position - b.position) || [];
    const sectionsToDisplay = isPreviewMode
      ? sortedArrangements.slice(0, 3)
      : sortedArrangements;

    const visibleSections = isPreviewMode
      ? sortedArrangements.slice(0, 3)
      : sortedArrangements;
    const blurredSections = isPreviewMode ? sortedArrangements.slice(3) : [];

    const renderArrangementSection = (arrangement: any) => {
      const section = song.sections?.find(
        (s) => s.id === arrangement.section.id,
      );
      if (!section) return null;

      const isMusicalSection = (sectionType: string) => {
        return [
          "intro",
          "outro",
          "interlude",
          "instrumental",
          "solo",
          "breakdown",
        ].some((musical) => sectionType.toLowerCase().includes(musical));
      };

      const sectionName = (section.name || section.section_type).toLowerCase();
      const isInstrumental = isMusicalSection(sectionName);

      return (
        <div
          key={arrangement.id}
          className="space-y-2 p-2 sm:p-4 rounded-lg border border-border bg-background"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
              {arrangement.position}
            </div>
            <h3 className="text-lg font-semibold text-primary border-b border-border pb-1 capitalize">
              [{arrangement.section.name || section.section_type}]
              {arrangement.repeat_count && arrangement.repeat_count > 1 && (
                <Badge variant="outline" className="text-xs ml-2">
                  x{arrangement.repeat_count}
                </Badge>
              )}
            </h3>
          </div>
          <div className="pl-1 sm:pl-4 w-full">
            {formatContent(section, isInstrumental)}
            <SectionComments
              songId={song.id}
              creatorId={song.user_id}
              sectionId={section.id}
            />
          </div>
        </div>
      );
    };

    const formatContent = (section: any, isInstrumental: boolean) => {
      interface ChordBar {
        id: string;
        chord: string;
        chordAfter?: string; // Tambahkan ini
        chordEnd?: string;
        restType?: string;
        trailingRestType?: string;
        beats: number;
        ending?: { type: string; isStart: boolean; isEnd: boolean };
        melody?: { notAngka?: string };
        notes?: Array<{
          type: NoteType;
          beat: string;
          chord?: string;
          tied?: boolean;
          dotted?: boolean;
          tieTo?: { bar: string; beat: string };
        }>;
        musicalSigns?: {
          segno?: boolean;
          coda?: boolean;
          dsAlCoda?: boolean;
          dcAlCoda?: boolean;
          ds?: boolean;
        };
        timeSignatureOverride?: string;
      }

      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      const barsPerLine = 4;

      if (
        song?.theme === "chord_grid" &&
        section.lyrics &&
        section.lyrics.startsWith("[") &&
        section.lyrics.endsWith("]")
      ) {
        try {
          const ChordDisplay = ({ chord: rawChord }: { chord: string | undefined }) => {
            if (!rawChord) return <>&nbsp;</>;
            const chord = simplifyChordsEnabled ? simplifyChord(rawChord) : rawChord;
            const renderChordPart = (part: string) => {
              const match = part.match(/^([A-G])([#b]?)(.*)$/);
              if (match) {
                const baseNote = match[1],
                  accidental = match[2],
                  restOfChord = match[3];
                const extMatch = restOfChord.match(/^([^0-9]*)(\d.*)$/);
                if (extMatch) {
                  const quality = extMatch[1],
                    extension = extMatch[2];
                  return (
                    <>
                      {baseNote}
                      {accidental && (
                        <sup className="text-[90%] -top-[0.4em] relative">
                          {accidental}
                        </sup>
                      )}
                      {quality}
                      <sup className="text-[80%] font-medium -top-[0.6em] relative">
                        {extension}
                      </sup>
                    </>
                  );
                }
                return (
                  <>
                    {baseNote}
                    {accidental && (
                      <sup className="text-[75%] -top-[0.4em] relative">
                        {accidental}
                      </sup>
                    )}
                    {restOfChord}
                  </>
                );
              }
              return <>{part}</>;
            };
            const restImages: Record<string, string> = {
              WR: wholeRestImg,
              HR: halfRestImg,
              QR: quarterRestImg,
              ER: eighthRestImg,
              SR: sixteenthRestImg,
            };
            const baseRestKey = chord.substring(0, 2); // Ambil "WR", "HR", dll
            const isRest = restImages[baseRestKey] !== undefined;

            if (isRest) {
              const isDotted = chord.endsWith(".");
              return (
                <div className="flex items-center self-end">
                  <img
                    src={restImages[baseRestKey]}
                    alt={chord}
                    className={`${
                      baseRestKey === "WR"
                        ? "w-[1em] h-[1.5em]"
                        : baseRestKey === "HR"
                        ? "w-[1em] h-[1.7em]"
                        : baseRestKey === "QR"
                        ? "w-[0.5em] h-[0.8em]"
                        : baseRestKey === "SR"   // <-- TAMBAHKAN KONDISI UNTUK SR
                        ? "w-[0.5em] h-[0.7em]"
                        : "w-[0.5em] h-[0.5em]"
                    } ml-1`}
                  />
                  {isDotted && (
                    <span className="font-bold text-lg leading-none mb-1">
                      .
                    </span>
                  )}
                </div>
              );
            }
            const restSizes: Record<string, string> = {
              WR: "w-[1em] h-[1.5em]",
              HR: "w-[1em] h-[1.7em]",
              QR: "w-[0.5em] h-[0.8em]",
              ER: "w-[0.5em] h-[0.5em]",
              SR: "w-[0.5em] h-[0.7em]",
            };
            if (restImages[chord])
              return (
                <img
                  src={restImages[chord]}
                  alt={chord}
                  className={`${restSizes[chord] ?? "w-[1em] h-[1em]"} ml-1`}
                />
              );
            if (chord === "/")
              return (
                <span className="relative flex items-center justify-center w-5 h-10">
                  <svg height="25" width="20" className="opacity-95">
                    <line
                      x1="0"
                      y1="25"
                      x2="20"
                      y2="0"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                  </svg>
                </span>
              );
            if (chord.includes("/")) {
              const [mainChord, bassNote] = chord.split("/");
              let mainChordClass = "",
                bassNoteClass = "";
              if (mainChord.length > 7)
                mainChordClass = "-translate-x-2 text-[55%]";
              else if (mainChord.length >= 5)
                mainChordClass = "-translate-x-2 text-[65%]";
              else if (mainChord.length > 1)
                mainChordClass = "-translate-x-2 text-[80%]";
              if (bassNote.length > 2) bassNoteClass = "text-[70%]";
              else if (bassNote.length > 1) bassNoteClass = "text-[80%]";
              return (
                <div className="relative inline-flex items-center justify-center w-20 h-28 sm:w-16 sm:h-16 leading-none">
                  <span
                    className={`absolute top-0 left-0 w-1/2 h-1/2 text-right ${mainChordClass}`}
                  >
                    {renderChordPart(mainChord)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg height="50" width="20" className="opacity-95">
                      <line
                        x1="0"
                        y1="40"
                        x2="20"
                        y2="0"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                  <span
                    className={`absolute bottom-0 right-0 w-1/2 h-1/2 text-left ${bassNoteClass}`}
                  >
                    {renderChordPart(bassNote)}
                  </span>
                </div>
              );
            }
            return <>{renderChordPart(chord)}</>;
          };

          const chordData = JSON.parse(section.lyrics);
          let bars: ChordBar[] = chordData.bars || chordData;
          const nonEmptyBars = bars.filter(
            (bar: ChordBar) => bar.chord && bar.chord.trim() !== "",
          );
          if (nonEmptyBars.length === 1) bars = nonEmptyBars;
          const combinedLines: JSX.Element[] = [];

          const getOrdinal = (nStr: string) => {
            const n = parseInt(nStr, 10);
            if (isNaN(n)) return "";
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return s[(v - 20) % 10] || s[v] || s[0];
          };

          const renderBarContent = (bar: ChordBar, lineHasMelody: boolean) => {
            const nonTransposableSymbols = [
              "WR", "HR", "QR", "ER", "SR", 
              "WR.", "HR.", "QR.", "ER.", "SR.", 
              "%", "//", "/.", "/"
            ];
            const trimmedChord = bar.chord?.trim();
            if (["%", "//", "/."].includes(trimmedChord)) {
              return (
                <div className="w-full flex items-center justify-center h-16 pt-2">
                  <span
                    className="text-black dark:text-cyan-300 text-3xl font-thin"
                    style={{ fontFamily: "MuseJazzText" }}
                  >
                    {trimmedChord}
                  </span>
                </div>
              );
            }
            const chordBeats = bar.chord
              ? bar.chord.split(" ").filter(Boolean)
              : [];
            if (bar.restType) chordBeats.push(bar.restType);

            if (bar.chordAfter) {
              // Gunakan split agar "C C" menjadi dua kolom terpisah
              const afterParts = bar.chordAfter.split(" ").filter(Boolean);
              chordBeats.push(...afterParts);
            }

            if (bar.trailingRestType) chordBeats.push(bar.trailingRestType);

            if (bar.chordEnd) {
              const endParts = bar.chordEnd.split(" ").filter(Boolean);
              chordBeats.push(...endParts);
            }

            const getGridColumnForNote = (note: any, noteIndex: number) => {
              // 1. PRIORITAS UTAMA: Cocokkan berdasarkan nama chord jika tersedia dari editor
              if (note.chord) {
                const foundIndex = chordBeats.findIndex(c => c === note.chord);
                if (foundIndex !== -1) {
                  return foundIndex + 1; // 1-based index untuk grid
                }
              }

              // 2. FALLBACK: note.beat adalah index chord (1-based, mengabaikan rest)
              const explicitBeat = note.beat ? parseInt(note.beat) : noteIndex + 1;
              let targetGridColumn = -1;
              let chordCounter = 0;
              
              for (let g = 0; g < chordBeats.length; g++) {
                // Jika elemen BUKAN simbol rest, berarti ini adalah chord
                if (!nonTransposableSymbols.includes(chordBeats[g])) {
                  chordCounter++;
                  if (chordCounter === explicitBeat) {
                    targetGridColumn = g + 1; 
                    break;
                  }
                }
              }
              return targetGridColumn;
            };

            const melodyBeats = bar.melody?.notAngka
              ? bar.melody.notAngka.split(" ").filter(Boolean)
              : [];
            const numBeats = Math.max(chordBeats.length, melodyBeats.length, 1);
            let regularFontSize, slashFontSize, melodyFontSize;
            const chordComplexities = chordBeats.map((c) => {
              if (!c) return 0;
              let x = c.length;
              if (c.includes("/")) x += 2;
              if (
                c.includes("add") ||
                c.includes("sus") ||
                c.includes("maj") ||
                c.includes("dim")
              )
                x += 2;
              return x;
            });
            const maxComplexity = Math.max(...chordComplexities, 0);
            const avgComplexity =
              chordComplexities.reduce((s, c) => s + c, 0) /
                chordComplexities.length || 0;

            // Menambahkan pengecekan densitas ekstrim (5 chord atau lebih, atau 4 chord panjang)
            const isExtremelyDense =
              numBeats >= 5 || (numBeats >= 4 && maxComplexity > 8);
            const isHighComplexity =
              maxComplexity > 12 || (numBeats > 1 && avgComplexity > 8);
            const isMediumComplexity =
              maxComplexity > 10 || (numBeats > 1 && avgComplexity > 6);

            if (isExtremelyDense) {
              // Ukuran font paling kecil agar muat di grid yang sangat padat
              regularFontSize = "text-sm sm:text-base";
              melodyFontSize = "text-xs sm:text-sm";
            } else if (numBeats >= 4 || isHighComplexity) {
              regularFontSize = "text-base sm:text-lg";
              melodyFontSize = "text-sm sm:text-base";
            } else if (numBeats === 3 || isMediumComplexity) {
              regularFontSize = "text-lg sm:text-xl";
              melodyFontSize = "text-base sm:text-lg";
            } else if (numBeats === 2) {
              regularFontSize = "text-xl sm:text-2xl";
              melodyFontSize = "text-lg sm:text-xl";
            } else {
              regularFontSize = "text-2xl sm:text-3xl";
              melodyFontSize = "text-xl sm:text-2xl";
            }

            slashFontSize = regularFontSize;

            // Penyesuaian Mobile yang lebih agresif
            if (isMobile) {
              if (numBeats >= 5) {
                regularFontSize = "text-xs"; // Ukuran terkecil untuk 5 chord
              } else if (numBeats === 4) {
                regularFontSize = "text-sm";
              } else if (numBeats === 3) {
                regularFontSize = "text-lg";
              } else if (numBeats === 2) {
                regularFontSize = "text-2xl";
              } else {
                regularFontSize = "text-4xl";
              }
              slashFontSize = regularFontSize;
              melodyFontSize = "text-xs";
            }
            const displayNotes = bar.notes && bar.notes.length > 0 ? bar.notes : [];
            return (
              <div className="relative">
                {bar.timeSignatureOverride && (
                  <div className="absolute top-5 -left-1 z-10">
                    <div
                      className={`flex flex-col items-center font-medium ${
                        isMobile ? "text-base gap-1" : "text-xs"
                      } text-muted-foreground`}
                    >
                      <span>{bar.timeSignatureOverride.split("/")[0]}</span>
                      <div
                        className={`${
                          isMobile ? "w-4" : "w-3"
                        } h-px bg-muted-foreground`}
                      ></div>
                      <span>{bar.timeSignatureOverride.split("/")[1]}</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col h-full justify-end">
                  <div
                    className="grid flex-grow"
                    style={{
                      gridTemplateColumns: `repeat(${numBeats}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: numBeats }).map((_, i) => {
                      // 1. Definisikan variabel pendukung
                      const rawChord = chordBeats[i];
                      const displayChord = rawChord; // Hilangkan titik dari teks chord
                      //   const displayChord = rawChord === "." ? "" : rawChord;

                      const isSlashChord = displayChord?.includes("/");
                      const chordFontSizeClass = isSlashChord
                        ? slashFontSize
                        : regularFontSize;

                      return (
                        <div
                          key={`chord-beat-${i}`}
                          className={`${chordFontSizeClass} font-bold text-black dark:text-cyan-300 flex items-baseline pl-2 pt-5 relative`}
                          style={{
                            fontFamily: "MuseJazzText",
                            minHeight: "2.5rem",
                          }}
                        >
                          {/* 2. RENDER SIMBOL NOTASI (RHYTHM) */}
                          {/* 2. RENDER SIMBOL NOTASI (RHYTHM) */}
                          {/* 2. RENDER SIMBOL NOTASI (RHYTHM) */}
                          {/* 2. RENDER SIMBOL NOTASI (RHYTHM) */}
                          {bar.notes &&
                            bar.notes.map((note, noteIndex) => {
                              // GUNAKAN HELPER BARU DI SINI
                              const targetBeat = getGridColumnForNote(note, noteIndex);
                              
                              // Pastikan hanya merender note di grid kolom yang tepat
                              if (targetBeat !== i + 1) return null;

                              // MENGHITUNG PANJANG GARIS TIE SECARA DINAMIS
                              let nextChordBeat = -1;
                              // Cari apakah ada chord lain setelah note ini di dalam bar yang sama
                              for (let j = targetBeat; j < chordBeats.length; j++) {
                                const beatStr = chordBeats[j];
                                // Abaikan titik (.), slash (/), dan simbol rest
                                if (beatStr !== "." && beatStr !== "/" && !nonTransposableSymbols.includes(beatStr)) {
                                  nextChordBeat = j + 1;
                                  break;
                                }
                              }

                              let isCrossBar = false;
                              let columnsToSpan = 1;

                              if (nextChordBeat !== -1) {
                                // Skenario 1: Menyambung ke chord lain di DALAM bar yang sama
                                columnsToSpan = nextChordBeat - targetBeat;
                              } else {
                                // Skenario 2: Menyambung ke bar BERIKUTNYA
                                isCrossBar = true;
                                columnsToSpan = (numBeats - targetBeat) + 1; // Sisa kolom + 1 kolom di bar sebelah
                              }

                              // Kembalikan Note dan Garis Tie
                              return [
                                <div
                                  key={`note-${noteIndex}`}
                                  className="absolute -top-5 left-[1.1rem] -translate-x-1/2 z-10 flex items-end"
                                >
                                  <NoteSymbol
                                    type={note.type}
                                    size="md"
                                    className="font-bold"
                                  />
                                  {note.dotted && (
                                    <span className="text-lg font-bold leading-none mb-[1px] ml-[-7px]">
                                      .
                                    </span>
                                  )}
                                </div>,
                                
                                note.tied && (
                                  <div
                                    key={`tie-${noteIndex}`}
                                    className="absolute -top-2 pointer-events-none z-0"
                                    style={{
                                      // Mulai sedikit bergeser ke kanan dari tengah chord saat ini agar pas di tangkai note
                                      // left: "55%", 
                                      // Menggunakan satuan 100% yang dikalikan jumlah kolom yang dilewati. 
                                      // Jika menyeberang bar, kita tambahkan kompensasi padding (+ 1rem).
                                      width: isCrossBar ? `calc(${columnsToSpan * 100}% + 1rem)` : `${columnsToSpan * 100}%`,
                                      height: "1.2rem" // Tinggi dinaikkan sedikit agar lengkungannya terlihat jelas
                                    }}
                                  >
                                    <svg
                                      viewBox="0 0 100 20"
                                      preserveAspectRatio="none"
                                      className="w-full h-full text-black dark:text-cyan-400 opacity-80"
                                    >
                                      <path
                                        d="M 0,15 C 25,0 75,0 100,15"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </div>
                                )
                              ];
                            })}

                          {/* UPDATE JUGA BAGIAN DISPLAY NOTES KEDUA INI */}
                          {/* {displayNotes.map((note, noteIndex) => {
                            // GUNAKAN HELPER BARU DI SINI
                            const targetBeat = getGridColumnForNote(note, noteIndex);
                            
                            if (targetBeat !== i + 1) return null;

                            return (
                              <div
                                key={noteIndex}
                                className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
                              >
                                <NoteSymbol type={note.type} size="sm" />
                              </div>
                            );
                          })} */}

                          <ChordDisplay chord={displayChord} />
                        </div>
                      );
                    })}
                  </div>
                  {lineHasMelody && (
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${numBeats}, 1fr)`,
                      }}
                    >
                      {Array.from({
                        length: numBeats,
                      }).map((_, i) => (
                        <div
                          key={`melody-beat-${i}`}
                          className={`${melodyFontSize} text-slate-800 dark:text-white/90 whitespace-pre flex items-center justify-start h-8 pl-2 sm:pl-3`}
                          style={{
                            fontFamily: "'Patrick Hand', cursive",
                          }}
                        >
                          {melodyBeats[i] || <>&nbsp;</>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          };

          const renderBarLineSymbol = (symbol: string) => {
            // Kita definisikan gaya garis secara manual agar presisi
            // h-[0.9em] membuat tinggi garis mengikuti ukuran font parent
            const thinLine = "w-[2px] h-[0.9em] bg-current";
            const thickLine = "w-[7px] h-[0.9em] bg-current";

            if (symbol === ":||") {
              return (
                <span className="inline-flex items-center leading-none translate-y-[2px]">
                  {/* Titik dua dengan sedikit margin negatif agar lebih dekat ke garis */}
                  <span className="mr-[6px] text-[0.7em] font-bold">:</span>
                  {/* Garis Tipis */}
                  <div className={thinLine}></div>
                  {/* Garis Tebal - Jarak antar garis diatur di ml-[2px] */}
                  <div className={`${thickLine} ml-[3px]`}></div>
                </span>
              );
            }

            if (symbol === "||:") {
              return (
                <span className="inline-flex items-center leading-none translate-y-[2px]">
                  {/* Garis Tebal */}
                  <div className={thickLine}></div>
                  {/* Garis Tipis */}
                  <div className={`${thinLine} ml-[3px]`}></div>
                  {/* Titik dua */}
                  <span className="ml-[3px] text-[0.7em] font-bold">:</span>
                </span>
              );
            }

            return <span>{symbol}</span>;
          };

          for (let i = 0; i < bars.length; i += barsPerLine) {
            const lineBars = bars.slice(i, i + barsPerLine);
            const mutableLineBars: ChordBar[] = JSON.parse(
              JSON.stringify(lineBars),
            );
            const barLineSymbols = new Array(mutableLineBars.length + 1).fill(
              "|",
            );

            mutableLineBars.forEach((bar, index) => {
              if (bar.chord.startsWith("|:")) {
                barLineSymbols[index] = "|:";
                bar.chord = bar.chord.substring(2).trim();
              } else if (bar.chord.startsWith("||:")) {
                barLineSymbols[index] = "||:";
                bar.chord = bar.chord.substring(3).trim();
              } else if (bar.chord.startsWith("/:.")) {
                barLineSymbols[index] = "|:";
                bar.chord = bar.chord.substring(3).trim();
              }
              if (bar.chord.endsWith(":||")) {
                barLineSymbols[index + 1] = ":||";
                bar.chord = bar.chord.slice(0, -3).trim();
              } else if (bar.chord.endsWith("://")) {
                barLineSymbols[index + 1] = ":||";
                bar.chord = bar.chord.slice(0, -3).trim();
              }
            });

            const lineHasMelody = mutableLineBars.some(
              (bar) =>
                bar.melody?.notAngka && bar.melody.notAngka.trim() !== "",
            );
            const isPartialLine = lineBars.length < barsPerLine;

            // [!code focus start]
            const musicalSignsRow = (
              <div className="flex flex-row" key={`musical-signs-row-${i}`}>
                <div className="w-4"></div>
                {mutableLineBars.map((bar, barIndex) => {
                  const { musicalSigns } = bar;
                  return (
                    <div
                      key={`musical-sign-${bar.id}`}
                      className={`relative h-6 min-w-0 ${
                        !isPartialLine ? "flex-1 basis-0" : "w-48 flex-none"
                      }`}
                    >
                      {musicalSigns?.segno && (
                        <img
                          src={segno}
                          alt="segno"
                          className={`absolute ${
                            isMobile ? "top-1 -left-3" : "top-2 -left-4"
                          }`}
                        />
                      )}
                      {musicalSigns?.coda && (
                        <img
                          src={codaSign}
                          alt="coda sign"
                          className={`absolute ${
                            isMobile ? "-top-1" : "top-2"
                          } ${barIndex === 0 ? "-left-3" : "right-0"} ${
                            barIndex === 0
                              ? isMobile
                                ? "w-6 h-6"
                                : "w-6 h-6"
                              : "w-5 h-5"
                          }`}
                        />
                      )}
                      {musicalSigns?.dsAlCoda && (
                        <span
                          className={`absolute right-0 top-2 font-semibold ${
                            isMobile ? "text-2xl" : "text-sm"
                          }`}
                          style={{
                            fontFamily: "MuseJazzText",
                          }}
                        >
                          D.S. al coda
                        </span>
                      )}
                      {musicalSigns?.ds && (
                        <span
                          className={`absolute right-0 top-2 font-semibold ${
                            isMobile ? "text-2xl" : "text-sm"
                          }`}
                          style={{
                            fontFamily: "MuseJazzText",
                          }}
                        >
                          D.S.
                        </span>
                      )}
                      {musicalSigns?.dcAlCoda && (
                        <span
                          className={`absolute right-0 top-2 font-semibold ${
                            isMobile ? "text-2xl" : "text-sm"
                          }`}
                          style={{
                            fontFamily: "MuseJazzText",
                          }}
                        >
                          D.C.
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="w-4"></div>
              </div>
            );

            const endingsRow = (
              <div className="flex flex-row" key={`ending-row-${i}`}>
                <div className="w-4"></div>
                {mutableLineBars.map((bar) => {
                  const { ending } = bar;
                  if (!ending)
                    return (
                      <div
                        key={`placeholder-${bar.id}`}
                        className="flex-1 h-4"
                      ></div>
                    );
                  const label = ending.isStart
                    ? `${ending.type}${getOrdinal(ending.type)} ending`
                    : null;
                  return (
                    <div
                      key={`ending-${bar.id}`}
                      className="flex-1 relative h-4 text-slate-600 dark:text-slate-300"
                    >
                      <div className="absolute top-2 left-0 w-full border-t border-slate-500 dark:border-slate-400"></div>
                      {ending.isStart && (
                        <div className="absolute top-2 left-0 h-2 border-l border-slate-500 dark:border-slate-400"></div>
                      )}
                      {label && (
                        <span className="absolute top-2 left-2 text-sm font-semibold">
                          {label}
                        </span>
                      )}
                      {ending.isEnd && (
                        <div className="absolute top-2 right-0 h-2 border-r border-slate-500 dark:border-slate-400"></div>
                      )}
                    </div>
                  );
                })}
                <div className="w-4"></div>
              </div>
            );
            const lineHasEndings = mutableLineBars.some((bar) => bar.ending);

            combinedLines.push(
              <div key={`line-group-${i}`} className="flex flex-col">
                {musicalSignsRow}
                {lineHasEndings && endingsRow}
                {/* [!code focus end] */}
                <div
                  className={`flex flex-row items-start min-w-0 ${
                    isPartialLine ? "justify-start" : ""
                  }`}
                >
                  {mutableLineBars.map((bar, index) => (
                    <div
                      key={bar.id || `bar-${i}-${index}`}
                      className={`flex items-stretch min-w-0 ${
                        !isPartialLine ? "flex-1 basis-0" : "w-48 flex-none"
                      }`}
                    >
                      <div className="flex flex-col text-3xl leading-tight">
                        <span
                          className={`text-black-500 dark:text-black-300 font-thin text-6xl leading-none ${
                            barLineSymbols[index].includes(":")
                              ? "tracking-[-0.1em]"
                              : ""
                          }`}
                        >
                          {renderBarLineSymbol(barLineSymbols[index])}
                        </span>
                        {lineHasMelody && (
                          <span className="text-slate-800 dark:text-white/90">
                            &nbsp;
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-full min-w-0 overflow-visible ${
                          barLineSymbols[index].includes(":") ? "pl-2" : ""
                        }`}
                      >
                        {renderBarContent(bar, lineHasMelody)}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col text-3xl leading-tight">
                    <span
                      className={`text-black-500 dark:text-black-300 font-thin text-6xl leading-none ${
                        barLineSymbols[mutableLineBars.length].includes(":")
                          ? "tracking-[-0.1em]"
                          : ""
                      }`}
                    >
                      {renderBarLineSymbol(
                        barLineSymbols[mutableLineBars.length],
                      )}
                    </span>
                    {lineHasMelody && (
                      <span className="text-slate-800 dark:text-white/90">
                        &nbsp;
                      </span>
                    )}
                  </div>
                </div>
              </div>,
            );
          }

          return (
            <div className="-mt-4">
              <PdfLikeViewer>
                <div className="formatted-content -mb-44">{combinedLines}</div>
              </PdfLikeViewer>
            </div>
          );
        } catch (e) {
          console.error("Gagal parse JSON chord_grid", e);
          return <pre>{section.chords || section.lyrics}</pre>;
        }
      }

      const content = section.chords || section.lyrics;
      if (!content)
        return (
          <div className="text-muted-foreground italic text-sm">No content</div>
        );
      const lines = content.split("\n");
      return (
        <div className="formatted-content w-full overflow-x-auto">
          {lines.map((line, i) => {
            const useIsChordLine = isInstrumental || i % 2 === 0;
            return (
              <div
                key={`line-${i}`}
                className={`${useIsChordLine ? "mb-1" : "mb-3"}`}
              >
                <pre
                  className={`font-mono text-xs sm:text-sm ${
                    useIsChordLine
                      ? "font-bold text-blue-600"
                      : "text-foreground"
                  } leading-tight whitespace-pre`}
                >
                  {line ? (useIsChordLine && simplifyChordsEnabled ? simplifyChordLine(line) : line) : <>&nbsp;</>}
                </pre>
              </div>
            );
          })}
        </div>
      );
    };

    const songPreviewContent = (
      <>
        {!song.sections || song.sections.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No song sections found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-primary">
                    {song.title}
                  </h1>
                  {song.artist && (
                    <p className="text-lg text-muted-foreground">
                      {song.artist}
                    </p>
                  )}
                  <div className="flex justify-center flex-wrap gap-4">
                    <Badge variant="outline" className="text-sm">
                      {t("arrDetail.key")} {song.current_key}
                    </Badge>
                    {song.tempo && (
                      <Badge variant="outline" className="text-sm">
                        {song.tempo} BPM
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-sm">
                      {song.time_signature}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {song.youtube_link && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-600" />
                    YouTube Player
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {/* Play the original song to validate your
                                        arrangement */}
                    {t("arrDetail.titleYt")}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video overflow-hidden rounded-lg">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${extractYouTubeVideoId(
                        song.youtube_link,
                      )}`}
                      title={`${song.title} - ${song.artist}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </CardContent>
                <CardContent className="pt-2">
                  <a
                    href={song.youtube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Youtube className="h-6 w-6 text-red-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">
                            {/* Original Song Reference */}
                            {t("arrDetail.subtitleYt")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {/* Use this to validate
                                                        your arrangement matches
                                                        the original */}
                            {t("arrDetail.subtitileYt2")}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-primary flex-shrink-0 whitespace-nowrap">
                        {/* Open in YouTube → */}
                        {t("arrDetail.openInYt")}
                      </div>
                    </div>
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Sequencer Highlight Card - Below YouTube Player */}
            <SequencerHighlightCard song={song} />

            {sectionsToDisplay.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" /> Song Preview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {isPreviewMode
                      ? "Showing first 3 sections of the arrangement."
                      : t("arrDetail.descSongPre")}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 bg-muted/30 p-2 sm:p-6 rounded-lg">
                    {/* [LANGKAH 1]: Render 3 section pertama yang selalu terlihat */}
                    {visibleSections.map(renderArrangementSection)}

                    {/* [LANGKAH 2]: Jika dalam mode preview, tampilkan prompt dan konten blur secara berurutan */}
                    {isPreviewMode && blurredSections.length > 0 && (
                      <>
                        {/* Hanya tampilkan UnlockPrompt jika BUKAN iOS */}
                        {!isCapacitorIOS() && (
                          <div className="flex justify-center pt-6 pb-2">
                            <UnlockPrompt
                              subscriptionStatus={subscriptionStatus}
                              navigate={navigate}
                            />
                          </div>
                        )}

                        {/* Blur tetap selalu ada */}
                        <div className="blur-md pointer-events-none select-none space-y-9">
                          {blurredSections.slice(0, 10).map(renderArrangementSection)}
                        </div>
                      </>
                    )}

                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" /> Song Preview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Available sections (no arrangement set)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 bg-muted/30 p-2 sm:p-6 rounded-lg">
                    {song.sections.map((section) => {
                      const isInstrumental = [
                        "intro",
                        "outro",
                        "interlude",
                        "solo",
                        "instrumental",
                      ].includes(section.section_type.toLowerCase());
                      return (
                        <div
                          key={section.id}
                          className="space-y-2 p-2 sm:p-4 rounded-lg border border-border bg-background"
                        >
                          <h3 className="text-lg font-semibold text-primary border-b border-border pb-1 capitalize">
                            [{section.name || section.section_type}]
                          </h3>
                          <div
                            className="pl-1 sm:pl-4 w-full"
                            style={{
                              minWidth: "max-content",
                            }}
                          >
                            {formatContent(section, isInstrumental)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </>
    );

    {
      isPreviewMode && (
        <UnlockPrompt
          subscriptionStatus={subscriptionStatus}
          navigate={navigate}
        />
      );
    }
    return songPreviewContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }
  if (!song) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary mb-2">
              Song Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The song you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleLivePreviewClick = () => {
    if (isSubscribed) {
      const targetId = userCopyId || song?.id;
      // Gunakan userCopySlug jika ada, agar URL konsisten dengan library user
      const targetSlug = userCopySlug || song?.slug;

      if (targetId && targetSlug) {
        // [!code ++] Gunakan targetId, BUKAN song.id
        navigate(`/live-preview/${targetId}/${targetSlug}`);
      }
    } else {
      setShowUpgradeModal(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${song.title} by ${
          song.artist || "Unknown Artist"
        } - Arrangely`}</title>
        <meta
          name="description"
          content={`View and learn ${song.title} by ${
            song.artist || "Unknown Artist"
          }. Chord arrangements, lyrics, and music notation available on Arrangely.`}
        />
        <meta
          name="keywords"
          content={`${song.title}, ${
            song.artist || "Unknown Artist"
          }, chords, arrangement, music, lyrics, ${song.current_key} key`}
        />

        {/* Open Graph meta tags */}
        <meta
          property="og:title"
          content={`${song.title} by ${song.artist || "Unknown Artist"}`}
        />
        <meta
          property="og:description"
          content={`View and learn ${song.title} by ${
            song.artist || "Unknown Artist"
          }. Chord arrangements, lyrics, and music notation available on Arrangely.`}
        />
        <meta property="og:type" content="music.song" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="Arrangely" />
        {song.youtube_thumbnail ? (
          <meta property="og:image" content={song.youtube_thumbnail} />
        ) : (
          <meta
            property="og:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          property="og:image:alt"
          content={`${song.title} by ${
            song.artist || "Unknown Artist"
          } arrangement`}
        />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${song.title} by ${song.artist || "Unknown Artist"}`}
        />
        <meta
          name="twitter:description"
          content={`View and learn ${song.title} by ${
            song.artist || "Unknown Artist"
          }. Chord arrangements, lyrics, and music notation available on Arrangely.`}
        />
        {song.youtube_thumbnail ? (
          <meta name="twitter:image" content={song.youtube_thumbnail} />
        ) : (
          <meta
            name="twitter:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          name="twitter:image:alt"
          content={`${song.title} by ${
            song.artist || "Unknown Artist"
          } arrangement`}
        />

        {/* Additional music-specific meta */}
        <meta property="music:song:url" content={window.location.href} />
        {song.artist && (
          <meta property="music:musician" content={song.artist} />
        )}
        <meta property="music:duration" content="0" />
      </Helmet>
      <div className="min-h-screen bg-gradient-sanctuary pt-[calc(4rem+env(safe-area-inset-top))]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-4 mt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  const searchParams = new URLSearchParams(location.search);
                  const source = searchParams.get("source");
                  
                  if (source === "home") {
                    navigate("/");
                  } else if (source === "community-library") {
                    navigate("/community-library");
                  } else if (source === "community") {
                    navigate("/community");
                  } else if (source === "library") {
                    navigate("/library");
                  } else if (isFromCommunityLibrary) {
                    navigate("/community-library");
                  } else {
                    navigate("/library");
                  }
                }}
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Compact Header */}
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Song Icon and Info */}
                  <div className="flex gap-4 flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-worship rounded-xl flex items-center justify-center flex-shrink-0">
                      <Music className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl md:text-3xl font-bold text-primary">
                        {song.title}
                      </h1>
                      <p className="text-sm sm:text-lg text-muted-foreground mb-1 truncate">
                        by {song.artist || "Unknown Artist"}
                      </p>
                      {song.creator_profile?.display_name &&
                        (isFromCommunityLibrary ||
                          song.original_creator_id) && (
                          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {/* [!code focus start] */}
                            <span>
                              {song.creator_profile.creator_type ===
                              "creator_arrangely"
                                ? "Creator Arrangely"
                                : `${t("arrDetail.onBehalf")} ${
                                    song.creator_profile.display_name
                                  }`}
                            </span>
                            {/* [!code focus end] */}
                          </p>
                        )}
                      {/* Musical Info & Status - Compact */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {t("arrDetail.key")} {song.current_key}
                        </Badge>
                        {song.tempo && (
                          <Badge variant="outline" className="text-xs">
                            {song.tempo} BPM
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {song.time_signature}
                        </Badge>
                        {/* {song.capo && song.capo > 0 && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    Capo {song.capo}
                                                </Badge>
                                            )} */}

                        {/* Public/Private Status */}
                        <Badge
                          variant={song.is_public ? "default" : "secondary"}
                          className={`text-xs ${
                            song.is_public
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }`}
                        >
                          {song.is_public ? (
                            <>
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </>
                          )}
                        </Badge>
                      </div>

                      {/* Tags - Compact */}
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {song.tags.slice(0, 3).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {song.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{song.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats - Enhanced with Love Count */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span className="font-medium">
                            {song.views_count || 0}
                          </span>
                          <span>views</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          <span className="font-medium">{likeCount}</span>
                          <span>likes</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(song.created_at).toLocaleDateString()}
                        </div>

                        {song.is_favorite && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span>Favorited</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary Actions - Mobile Optimized */}
                  <div className="flex flex-col gap-2 sm:w-48">
                    {/* ADD TO LIBRARY */}
                    {!showManagementButtons && song?.is_public && isInLibrary && (
                    <Button
                      onClick={() =>
                        navigate(`/arrangement/${userCopyId}/${userCopySlug}`)
                      }
                      className="w-full bg-green-600 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      In Library
                    </Button>
                  )}

                  {!showManagementButtons && song?.is_public && !isInLibrary && (
                    <Button
                      onClick={() => song && addToLibrary()}
                      disabled={addingToLibrary || isPreviewMode}
                      className="w-full bg-gradient-worship hover:opacity-90"
                    >
                      {addingToLibrary ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("arrDetail.addToLibrary")}
                        </>
                      )}
                    </Button>
                  )}

                  {/* MANAGEMENT BUTTONS — ONLY IF SONG.ID === URL ID */}
                  {showManagementButtons && isViewingLibrarySong && (
                    <>
                      <Link
                        to={
                          song?.theme === "chord_grid"
                            ? `/chord-grid-generator?currentChordGridId=${song?.id}`
                            : `/editor?edit=${song?.id}`
                        }
                        className="block"
                      >
                        <Button variant="outline" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          {t("arrDetail.editArr")}
                        </Button>
                      </Link>

                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow"
                        onClick={() => setShowTransposeModal(true)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transpose
                      </Button>

                      <Button
                        variant={simplifyChordsEnabled ? "default" : "outline"}
                        className={`w-full ${simplifyChordsEnabled ? "bg-green-500 hover:bg-green-600 text-white shadow" : ""}`}
                        onClick={() => {
                          const newVal = !simplifyChordsEnabled;
                          setSimplifyChordsEnabled(newVal);
                          localStorage.setItem('simplifyChords', String(newVal));
                        }}
                      >
                        <Music className="h-4 w-4 mr-2" />
                        {simplifyChordsEnabled ? "Simplified ✓" : "Simplify Chords"}
                      </Button>

                      <Button
                        className="w-full bg-gradient-worship hover:opacity-90"
                        onClick={handleLivePreviewClick}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Live Preview
                      </Button>
                    </>
                  )}
                </div>

                </div>

                {/* Secondary Actions - Mobile Optimized */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFavorite}
                    className={`flex-1 min-w-[120px] ${
                      isLiked ? "text-red-500" : ""
                    }`}
                    disabled={isPreviewMode}
                  >
                    <Heart
                      className={`h-4 w-4 mr-1 ${
                        isLiked ? "fill-current" : ""
                      }`}
                    />
                    {isLiked ? t("arrDetail.liked") : t("arrDetail.like")}
                  </Button>

                  {/* Gunakan variabel yang sama: showManagementButtons */}
                  {showManagementButtons && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare()}
                        disabled={isPreviewMode}
                        className="flex-1 min-w-[120px]"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        {t("arrDetail.share")}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={duplicateSong}
                        disabled={isPreviewMode}
                        className="flex-1 min-w-[120px]"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {t("arrDetail.duplicate")}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExportModal(true)}
                        disabled={isPreviewMode}
                        className="flex-1 min-w-[120px]"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>

                      <AddToSetlistPopover
                        songId={song?.id || ""}
                        songTitle={song?.title || ""}
                        disabled={isPreviewMode}
                      />
                    </>
                  )}
                </div>

                {/* Quick Edit - Collapsible */}
              </CardContent>
            </Card>
            {/* testtt */}
            
            {/* Publication Status Card - Only shown to owner if there's a publication */}
            {publicationStatus && song && song.theme === 'worship' && currentUserId === song.user_id && (
              <div className="mb-6">
                <PublicationStatusCard
                    songId={song.id}
                    status={publicationStatus.status}
                    rejectedReason={publicationStatus.rejectedReason}
                    validationResults={publicationStatus.validationResults}
                    isOwner={currentUserId === song.user_id}
                    theme={song.theme}
                  />
              </div>
            )}

            {/* Content Tabs - Mobile Optimized */}
            <Tabs
              value={currentTab}
              onValueChange={setCurrentTab}
              className="w-full"
            >
              <div className="w-full overflow-x-auto pb-2">
                {/* Desktop Tabs (Grid Layout) */}
                <div className="hidden sm:block">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    {tabItems.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Mobile Tabs (Dropdown) */}
                <div className="sm:hidden mb-4 flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-between px-6"
                      >
                        <span>{currentTabLabel}</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[--radix-dropdown-menu-trigger-width]"
                    >
                      {tabItems.map((tab) => (
                        <DropdownMenuItem
                          key={tab.value}
                          onSelect={() => setCurrentTab(tab.value)}
                        >
                          {tab.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <TabsContent value="preview">{renderSongPreview()}</TabsContent>

              <TabsContent value="youtube" className="mt-0">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-600" />
                      YouTube Player
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Play the original song to validate your arrangement
                    </p>
                  </CardHeader>
                  <CardContent>
                    {song.youtube_link ? (
                      // Tampilan jika link YouTube ada
                      <div className="space-y-4">
                        <div className="aspect-video overflow-hidden rounded-lg bg-black">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${extractYouTubeVideoId(
                              song.youtube_link,
                            )}`}
                            title={`${song.title} - ${song.artist}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    ) : (
                      // Tampilan jika link YouTube tidak ada
                      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
                        <Youtube className="h-12 w-12 text-muted-foreground/80" />
                        <h3 className="mt-4 text-lg font-semibold">
                          No YouTube Reference
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Add a YouTube link in the editor to display the video
                          player here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sequencer" className="mt-0">
                <SequencerTab song={song} />
              </TabsContent>

              <TabsContent value="chords" className="mt-0">
                <ChordsTab song={song} />
              </TabsContent>

              <TabsContent value="details" className="mt-0">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      {/* Technical Details */}
                      {t("arrDetail.technicalDetails")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {/* Original Key */}
                          {t("arrDetail.originalKey")}
                        </p>
                        <p className="text-sm font-semibold">
                          {song.original_key}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {/* Current Key */}
                          {t("arrDetail.currentKey")}
                        </p>
                        <p className="text-sm font-semibold">
                          {song.current_key}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Tempo
                        </p>
                        <p className="text-sm font-semibold">
                          {song.tempo ? `${song.tempo} BPM` : "Not set"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Time Signature
                        </p>
                        <p className="text-sm font-semibold">
                          {song.time_signature}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Sections
                        </p>
                        <p className="text-sm font-semibold">
                          {song.sections?.length || "None"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Arrangement
                        </p>
                        <p className="text-sm font-semibold">
                          {song.arrangements?.length
                            ? `${song.arrangements.length} steps`
                            : "Not set"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Visibility
                        </p>
                        <p className="text-sm font-semibold">
                          {song.is_public ? "Public" : "Private"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Rating
                        </p>
                        <div className="flex items-center gap-1">
                          {song.rating ? (
                            <>
                              {Array.from(
                                {
                                  length: 5,
                                },
                                (_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < song.rating!
                                        ? "text-yellow-500 fill-current"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ),
                              )}
                              <span className="ml-1 text-xs font-semibold">
                                {song.rating}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not rated
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(song.folder || song.notes) && (
                      <div className="mt-6 pt-4 border-t space-y-4">
                        {song.folder && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Folder
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: song.folder.color,
                                }}
                              />
                              <span className="text-sm">
                                {song.folder.name}
                              </span>
                            </div>
                          </div>
                        )}

                        {song.notes && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Notes
                            </p>
                            <p className="text-sm bg-muted/50 p-3 rounded border">
                              {song.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Activity History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Activity history coming soon</p>
                      <p className="text-xs mt-1 opacity-75">
                        Track views, edits, and collaboration history
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Export Modal tess*/}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          song={song}
        />
        <UpgradeModalLive
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />

        <TransposeModal
          isOpen={showTransposeModal}
          onClose={() => setShowTransposeModal(false)}
          currentKey={transposedKey}
          onTranspose={(newKey, preferSharps) => {
            handleTranspose(newKey, preferSharps);
            setShowTransposeModal(false);
          }}
        />

        {/* Preview Feature Tour with Screenshots */}
        {!isMobileView && <PreviewFeatureTour tourType="arrangement" />}
      </div>

      <LibraryLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={libraryUsage.currentCount}
        limit={libraryUsage.limit}
        isTrialing={subscriptionStatus?.isTrialing || false}
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
      {!isMobileView && (
        <Drawer open={shareDrawerOpen} onOpenChange={setShareDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-center">Share to</DrawerTitle>
                <DrawerDescription className="text-center">
                  Share this arrangement with your team or friends
                </DrawerDescription>
              </DrawerHeader>

              <div className="grid grid-cols-4 gap-4 p-6">
                {/* WhatsApp */}
                <a
                  href={song ? getShareLinks(song).whatsapp : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.845-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.82-.981z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium">WhatsApp</span>
                </a>

                {/* Facebook */}
                <a
                  href={song ? getShareLinks(song).facebook : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium">Facebook</span>
                </a>

                {/* Instagram */}
                <button
                  onClick={() => {
                    if (song) {
                      const link = getShareLinks(song).copy;
                      copyToClipboard(link, true);
                      toast({
                        title: "Link Copied!",
                        description: "Opening Instagram...",
                      });
                      setTimeout(() => {
                        window.open("https://www.instagram.com/", "_blank");
                      }, 1000);
                    }
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium">Instagram</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() =>
                    song && copyToClipboard(getShareLinks(song).copy)
                  }
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground transition-transform group-active:scale-90 shadow-sm">
                    <Copy className="h-5 w-5" />
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
      )}
    </>
  );
};
export default ArrangementDetail;
