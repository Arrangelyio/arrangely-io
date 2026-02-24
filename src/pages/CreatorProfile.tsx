import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import {
  Music,
  Eye,
  Calendar,
  MapPin,
  UserPlus,
  UserMinus,
  Crown,
  Copy,
  Edit,
  Youtube,
  Users,
  Share,
  Link,
  Plus,
  Loader2,
  Lock,
  Upload,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { supabase } from "@/integrations/supabase/client";
import { useLibraryLimit } from "@/hooks/useLibraryLimit";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradeModal from "@/components/monetization/UpgradeModal";
import PaymentModal from "@/components/payment/PaymentModal";
import { LibraryLimitModal } from "@/components/LibraryLimitModal";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import { CreatorLessonsTab } from "@/components/creator/CreatorLessonsTab";
import { CreatorSetlistsTab } from "@/components/creator/CreatorSetlistsTab";
import { CreatorSequencerTab } from "@/components/creator/CreatorSequencerTab";
import { SequencerBadge } from "@/components/sequencer/SequencerBadge";

/**
 * The CreatorSong interface correctly defines 'youtube_link' and 'youtube_thumbnail'.
 * If you are seeing a TypeScript error, please ensure your TypeScript server is
 * restarted or your project cache is cleared, as the definition is present.
 */
interface CreatorSong {
  id: string;
  title: string | null;
  artist: string | null;
  original_key: string | null;
  current_key: string | null;
  tempo: number | null;
  time_signature: string | null;
  capo: number | null;
  difficulty: string | null;
  theme: string | null;
  tags: string[] | null;
  youtubeLink: string | null;
  youtubeThumbnail: string | null;
  is_public: boolean;
  is_favorite: boolean;
  user_id: string;
  created_at: string;
  views_count: number;
  status?: string | null;
  song_sections?: any[];
  arrangements?: any[];
  hasSequencer?: boolean;
  sequencerTrackCount?: number;
  sequencerPrice?: number;
}

interface CreatorProfileData {
  profile: any;
  songs: CreatorSong[];
  stats: any;
  loading: boolean;
  isFollowing: boolean;
  toggleFollow: () => void;
}

const extractYouTubeVideoId = (url: string): string => {
  const regExp =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match && match[1] && match[1].length === 11 ? match[1] : "";
};

const IS_TRIAL_ENABLED = false;
const CreatorProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile, songs, stats, loading, isFollowing, toggleFollow } =
    useCreatorProfile(slug);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(profile);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());
  const [archivedSongs, setArchivedSongs] = useState<Map<string, string>>(
    new Map()
  );
  const [addingToLibrary, setAddingToLibrary] = useState<Set<string>>(
    new Set()
  );
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { libraryUsage, recordLibraryAction } = useLibraryLimit();
  const { subscriptionStatus, startFreeTrial } = useSubscription();
  const [isPaymentModalOpen, setIsPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [pendingSongAdd, setPendingSongAdd] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await checkSongsInLibrary(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (profile) {
      setProfileData(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (
      subscriptionStatus &&
      (subscriptionStatus.hasActiveSubscription ||
        subscriptionStatus.isTrialing) &&
      pendingSongAdd
    ) {
      // Hanya tampilkan toast 'Free Trial Activated' jika trial baru dimulai dan tidak ada langganan aktif
      if (
        subscriptionStatus.isTrialing &&
        !subscriptionStatus.hasActiveSubscription
      ) {
        toast.success(
          "🎉 Free Trial Diaktifkan! Menambahkan lagu ke library Anda..."
        );
      } else if (subscriptionStatus.hasActiveSubscription) {
        // Jika sudah memiliki langganan aktif
        toast.success("Langganan aktif! Menambahkan lagu ke library Anda...");
      }
      continueAddToLibrary(pendingSongAdd.id, pendingSongAdd.title);
      setPendingSongAdd(null);
    }
  }, [subscriptionStatus, pendingSongAdd]);

  const isOwnProfile = currentUser?.id === profile?.user_id;

  const checkSongsInLibrary = async (userId: string) => {
    try {
      const { data: userSongs } = await supabase
        .from("songs")
        .select("id, title, artist, status, youtube_link, youtube_thumbnail")
        .eq("user_id", userId);

      if (userSongs) {
        const activeSet = new Set<string>();
        const archivedMap = new Map<string, string>();

        userSongs.forEach((userSong) => {
          const songKey = `${userSong.title}-${userSong.artist}`;
          if (userSong.status === "archived") {
            const key = `${userSong.title
              ?.trim()
              .toLowerCase()}|${userSong.artist?.trim().toLowerCase()}`;
            archivedMap.set(key, userSong.id);
          } else {
            activeSet.add(songKey);
          }
        });
        setSongsInLibrary(activeSet);
        setArchivedSongs(archivedMap);
      }
    } catch (error) {
      console.error("Error checking songs in library:", error);
    }
  };

  const handleUnarchive = async (
    songId: string,
    title: string,
    artist: string
  ) => {
    try {
      const { error } = await supabase
        .from("songs")
        .update({ status: null })
        .eq("id", songId)
        .eq("user_id", currentUser.id);

      if (error) {
        throw new Error("Failed to unarchive song");
      }

      const songKey = `${title.trim().toLowerCase()}|${artist
        .trim()
        .toLowerCase()}`;
      const songKeyInLibrary = `${title}-${artist}`;

      setArchivedSongs((prev) => {
        const newMap = new Map(prev);
        newMap.delete(songKey);
        return newMap;
      });

      setSongsInLibrary((prev) => new Set(prev).add(songKeyInLibrary));

      toast.success(`"${title}" has been moved back to your library.`);
    } catch (err) {
      console.error("Error unarchiving song:", err);
      toast.error("Failed to unarchive this song. Please try again.");
    }
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

      // 2️⃣ Call Edge Function (Atomic)
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
        console.error("🚫 Edge function error:", error);
        throw new Error(error.message || "Failed to add to library");
      }

      // 4️⃣ Business logic error (returned from DB function)
      if (!data?.success) {
        throw new Error(data?.error?.message || "Library action failed");
      }

      // 5️⃣ Optional: increment views
      await supabase.rpc("increment_song_views", { song_id: songId });

      // 6️⃣ Update local state
      const songKey = `${title || ""}`;

      setSongsInLibrary((prev) => new Set(prev).add(songKey));

      toast.success(`"${title}" is now available in your personal library.`);

      navigate(`/arrangement/${data.song_id}`);

    } catch (error: any) {
      console.error("Error adding to library:", error);

      const message = error?.message || "";

      if (message.includes("Library limit")) {
        toast.error("Library limit reached. Upgrade your subscription.");
      } else if (message.includes("already")) {
        toast.error(`"${title}" is already in your library`);
      } else if (message.includes("Too many")) {
        toast.error("Too many requests. Please wait a moment.");
      } else if (message.includes("Unauthorized") || message.includes("authenticated")) {
        toast.error("Please login first.");
      } else {
        toast.error("Failed to add song to your library. Please try again.");
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
    console.log(
      "handleAddToLibrary called for songId:",
      songId,
      "title:",
      title
    );
    if (!currentUser) {
      toast.error("Please login to add songs to your library");
      
      return;
    }
    if (!libraryUsage.canAddMore) {
      setShowLimitModal(true);
      
      return;
    }

    // SCENARIO 1: Pengguna sudah pernah membayar (hasSuccessfulPayment) tetapi tidak memiliki langganan aktif atau trial.
    // Dalam kasus ini, mereka harus langsung diarahkan ke halaman pricing untuk memperbarui langganan.
    if (
      !subscriptionStatus?.hasActiveSubscription &&
      (!IS_TRIAL_ENABLED || !subscriptionStatus?.isTrialing)
    ) {
      // ❌ Jangan tampilkan toast di iOS
      if (!isCapacitorIOS()) {
        toast.info(
          "Langganan Anda telah berakhir. Harap perbarui untuk menambahkan lebih banyak lagu."
        );
        navigate("/pricing");
      }

      return;
    }

    // SCENARIO 2: Pengguna tidak memiliki langganan aktif atau trial, DAN belum pernah membayar sebelumnya
    // (atau status hasSuccessfulPayment tidak relevan untuk redirect langsung).
    // Dalam kasus ini, kita tunjukkan modal pembayaran/trial.
    if (
      !subscriptionStatus?.hasActiveSubscription &&
      !subscriptionStatus?.isTrialing
    ) {
      console.log(
        "🚫 Langganan terkunci, menampilkan modal pembayaran (pengguna baru/trial berakhir)."
      );
      const planDetails = {
        name: "Monthly",
        price: 29000,
        features: [
          "Everything in Free",
          "Unlimited access to premium arrangements",
          "Unlimited PDF downloads",
          "+ 9 more features",
        ],
        interval_type: "month",
      };

      if (IS_TRIAL_ENABLED && subscriptionStatus?.canStartTrial) {
        setSelectedPlan({
          ...planDetails,
          id: "2f75a824-20ac-4da0-ac8d-879a03737a89",
          description:
            "Mulai free trial 7 hari Anda untuk membuka semua fitur.",
          withTrial: true, // Menampilkan opsi trial di modal
        });
      } else {
        // Pengguna tidak bisa memulai trial (mungkin sudah pernah), jadi langsung ke pembayaran.
        setSelectedPlan({
          ...planDetails,
          id: "plan_monthly_standard",
          description:
            "Free trial Anda telah berakhir. Langganan sekarang untuk membuka semua fitur.",
          withTrial: false, // TIDAK menampilkan opsi trial di modal
        });
      }
      setPendingSongAdd({ id: songId, title });
      setIsPaymentModal(true);
      return;
    }

    // Jika tidak ada kondisi di atas yang terpenuhi, berarti pengguna memiliki langganan aktif atau sedang trial
    // dan belum mencapai batas library. Lanjutkan menambahkan lagu.
    console.log(
      "✅ Kondisi terpenuhi, melanjutkan menambahkan lagu ke library."
    );
    await continueAddToLibrary(songId, title);
  };

  const handleStartTrial = async () => {
    setShowLimitModal(false);
    setIsPaymentModal(false);
    toast.loading("Activating Free Trial...", { duration: Infinity });
    try {
      const result = await startFreeTrial();
      if (result) {
        toast.dismiss();
      } else {
        toast.dismiss();
        toast.error("Activation Failed", {
          description: "Could not start your free trial. Please try again.",
        });
      }
    } catch (error) {
      toast.dismiss();
      toast.error("An Error Occurred", {
        description: "Something went wrong. Please contact support.",
      });
      console.error("Error starting free trial:", error);
    }
  };

  const shareSong = (song: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/arrangement/${song.id}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success(`"${song.title}" link copied to clipboard!`);
      })
      .catch(() => {
        toast.error("Failed to copy link, please copy manually.");
        console.error("Failed to copy share link:", shareUrl);
      });
  };

  if (loading) {
    return (
      <div className="container mt-12 mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Creator Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The creator profile you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/library")}>
              Browse All Creators
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileUrl = `arrangely.io/creator/${profile.creator_slug}`;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`https://${profileUrl}`);
    toast.success("Profile link copied to clipboard!");
  };

  return (
    <>
      <Helmet>
        <title>{`${
          profile.display_name || "Creator"
        } - Professional Music Arranger | Arrangely`}</title>
        <meta
          name="description"
          content={`Explore ${
            profile.display_name || "this creator"
          }'s music arrangements and worship songs. ${profile.bio || ""} ${
            stats?.totalSongs || 0
          } arrangements available.`}
        />
        <meta
          name="keywords"
          content={`${
            profile.display_name
          }, music arranger, worship arrangements, ${profile.city || ""}, ${
            profile.country || ""
          }, chord charts, music creator`}
        />

        {/* Open Graph meta tags */}
        <meta
          property="og:title"
          content={`${profile.display_name || "Creator"} - Music Arranger`}
        />
        <meta
          property="og:description"
          content={`${
            profile.bio ||
            `Check out ${profile.display_name}'s music arrangements`
          }. ${stats?.totalSongs || 0} arrangements | ${
            stats?.totalFollowers || 0
          } followers`}
        />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="Arrangely" />
        {profile.avatar_url ? (
          <meta property="og:image" content={profile.avatar_url} />
        ) : (
          <meta
            property="og:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          property="og:image:alt"
          content={`${profile.display_name || "Creator"}'s profile picture`}
        />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${profile.display_name || "Creator"} - Music Arranger`}
        />
        <meta
          name="twitter:description"
          content={`${
            profile.bio ||
            `Check out ${profile.display_name}'s music arrangements`
          }. ${stats?.totalSongs || 0} arrangements available.`}
        />
        {profile.avatar_url ? (
          <meta name="twitter:image" content={profile.avatar_url} />
        ) : (
          <meta
            name="twitter:image"
            content={`${window.location.origin}/placeholder.svg`}
          />
        )}
        <meta
          name="twitter:image:alt"
          content={`${profile.display_name || "Creator"}'s profile picture`}
        />

        {/* Profile-specific structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: profile.display_name,
              description: profile.bio,
              image: profile.avatar_url,
              url: window.location.href,
              ...(profile.city && {
                homeLocation: {
                  "@type": "Place",
                  name: `${profile.city}, ${profile.country || ""}`,
                },
              }),
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-sanctuary pt-4 pb-5">
        <div className="container mt-12 mx-auto px-4 py-8 space-y-6">
          <Card className="overflow-hidden shadow-lg rounded-2xl">
            {/* Banner Latar Belakang */}{" "}
            <div className="relative h-40 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              {" "}
              <div className="absolute inset-0 bg-black opacity-30"></div>{" "}
            </div>{" "}
            <CardContent className="p-6 relative -mt-5">
              {" "}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                {/* Avatar tetap sama */}
                <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-800 shadow-lg mx-auto">
                  <AvatarImage
                    src={profile.avatar_url}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl">
                    {profile.display_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex flex-col sm:flex-row justify-between items-center w-full text-center sm:text-left">
                  <div className="space-y-1">
                    {/* Mengubah div ini untuk mengatur responsivitas nama dan badge */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start sm:gap-3">
                      {/* Mengubah ukuran font nama: text-2xl di mobile, text-3xl di sm ke atas */}
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
                        {profile.display_name}{" "}
                      </h2>
                      {profile.creator_type === "creator_professional" && (
                        <Badge
                          // Tambahkan mt-2 untuk jarak di mobile, sm:mt-0 untuk reset di desktop
                          className="bg-gradient-worship text-primary-foreground mt-2 sm:mt-0"
                        >
                          <Crown className="h-3 w-2 mr-2" />
                          Professional{" "}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {profile.bio}
                    </p>
                    {(profile.city || profile.country) && (
                      <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                        <MapPin className="h-4 w-4" />{" "}
                        {[profile.city, profile.country]
                          .filter(Boolean)
                          .join(", ")}{" "}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0 mr-12">
                    <Button
                      variant="outline"
                      onClick={copyProfileLink}
                      // Menambahkan kelas untuk ukuran yang lebih kecil di mobile
                      className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    {!isOwnProfile && (
                      <Button
                        onClick={toggleFollow}
                        variant={isFollowing ? "outline" : "default"}
                        // Menambahkan kelas untuk ukuran yang lebih kecil di mobile
                        className={`h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm ${
                          isFollowing
                            ? ""
                            : "bg-gradient-worship hover:opacity-90 text-white"
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" /> Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>{" "}
                </div>{" "}
              </div>
              {/* BAGIAN STATISTIK BARU */}{" "}
              <div className="mt-4 pt-6 border-t dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
                {" "}
                <div className="flex flex-col items-center gap-1">
                  {" "}
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {stats?.totalFollowers || 0}
                  </div>{" "}
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Followers
                  </div>{" "}
                </div>{" "}
                <div className="flex flex-col items-center gap-1">
                  {" "}
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {stats?.totalSongs || 0}
                  </div>{" "}
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Arrangements
                  </div>{" "}
                </div>{" "}
                <div className="flex flex-col items-center gap-1">
                  {" "}
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {stats?.totalViews || 0}
                  </div>{" "}
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Total Views
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>

          <Tabs defaultValue="arrangements" className="space-y-6">
            {/* UBAH BAGIAN INI: Tambahkan class untuk scroll horizontal pada mobile */}
            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 rounded-lg no-scrollbar">
              <TabsTrigger
                value="arrangements"
                className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Arrangements ({stats?.totalSongs || 0})
              </TabsTrigger>
              <TabsTrigger
                value="lessons"
                className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Music Lab
              </TabsTrigger>
              <TabsTrigger
                value="setlists"
                className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Setlist Songs
              </TabsTrigger>
              <TabsTrigger
                value="sequencer"
                className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Sequencer
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Recent Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="arrangements">
              <Card>
                <CardHeader>
                  <CardTitle>Public Arrangements</CardTitle>
                </CardHeader>
                <CardContent>
                  {songs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {songs.map((song) => (
                        <Card
                          key={song.id}
                          className="group hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full"
                          onClick={() => navigate(`/arrangement/${song.id}`)}
                        >
                          <CardContent className="p-3 sm:p-4 space-y-3 flex flex-col flex-grow">
                            <div className="space-y-1">
                              <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted">
                                {/* Display YouTube Thumbnail */}
                                {song.youtubeThumbnail ||
                                song.youtubeLink ||
                                (song as any).youtubeThumbnail ||
                                (song as any).youtubeLink ? (
                                  <img
                                    src={
                                      song.youtubeThumbnail ||
                                      (song as any).youtubeThumbnail ||
                                      `https://img.youtube.com/vi/${extractYouTubeVideoId(
                                        song.youtubeLink ||
                                          (song as any).youtubeLink
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
                                
                                {/* Sequencer Badge */}
                                {(song as any).hasSequencer && (
                                  <div className="absolute top-2 left-2">
                                    <SequencerBadge 
                                      variant="compact"
                                      trackCount={(song as any).sequencerTrackCount}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Stats Row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground pt-1">
                                <div className="flex items-center gap-1.5">
                                  <Music className="h-4 w-4" />
                                  <span className="truncate">
                                    {song.current_key || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate">
                                    {song.time_signature || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate">
                                    {song.tempo || "N/A"}
                                    {""}
                                    bpm
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Eye className="h-4 w-4" />
                                  <span className="truncate">
                                    {song.views_count || 0}
                                  </span>
                                </div>
                              </div>

                              {/* Title and Artist */}
                              <div className="space-y-1 pt-2">
                                <h3 className="font-medium text-sm leading-tight line-clamp-2">
                                  {song.title}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  by {song.artist}
                                </p>
                              </div>

                              {/* Creator Info */}
                              <div className="flex items-center gap-2 pt-1">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={profile?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {profile?.display_name?.charAt(0) || "C"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground truncate">
                                  arranged by {profile?.display_name}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex w-full items-center gap-2 pt-1 mt-auto">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/arrangement/${song.id}`);
                                  }}
                                  className="w-full h-8 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>

                                {(() => {
                                  const isSongInLibrary = songsInLibrary.has(
                                    `${song.title || ""}-${song.artist || ""}`
                                  );
                                  const archivedId = archivedSongs.get(
                                    `${
                                      song.title?.trim().toLowerCase() || ""
                                    }|${
                                      song.artist?.trim().toLowerCase() || ""
                                    }`
                                  );
                                  const isAdding = addingToLibrary.has(song.id);
                                  const isSubscriptionLocked =
                                    !subscriptionStatus?.hasActiveSubscription &&
                                    (!IS_TRIAL_ENABLED ||
                                      !subscriptionStatus?.isTrialing);

                                  if (isAdding) {
                                    return (
                                      <Button
                                        size="sm"
                                        disabled
                                        className="w-full h-8 text-xs"
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUnarchive(
                                            archivedId,
                                            song.title,
                                            song.artist
                                          );
                                        }}
                                        className="w-full h-8 text-xs"
                                        variant="secondary"
                                      >
                                        <Upload className="h-3 w-3 mr-1" />{" "}
                                        Unarchive
                                      </Button>
                                    );
                                  }

                                  if (isSongInLibrary) {
                                    return (
                                      <Button
                                        size="sm"
                                        disabled
                                        className="w-full bg-green-600 hover:bg-green-600 h-8 text-xs"
                                      >
                                        <Check className="h-4 w-4 mr-1" /> In
                                        Library
                                      </Button>
                                    );
                                  }

                                  return (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToLibrary(song.id, song.title);
                                      }}
                                      className="w-full h-8 text-xs"
                                      variant={
                                        isSubscriptionLocked
                                          ? "outline"
                                          : "default"
                                      }
                                    >
                                      {isSubscriptionLocked ? (
                                        <Lock className="h-3 w-3 mr-1" />
                                      ) : (
                                        <Plus className="h-3 w-3 mr-1" />
                                      )}
                                      Add to Library
                                    </Button>
                                  );
                                })()}

                                <Button
                                  size="icon" // Mengubah size menjadi "icon"
                                  variant="outline"
                                  onClick={(e) => shareSong(song, e)}
                                  className="h-8 w-8 text-xs flex-shrink-0" // Menyesuaikan kelas untuk ukuran ikon
                                >
                                  <Link className="h-3 w-3" />{" "}
                                  {/* Menghilangkan sm:mr-1 dan span kosong */}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No arrangements yet</h3>
                      <p className="text-sm text-muted-foreground">
                        {isOwnProfile
                          ? "Start creating arrangements to showcase your work"
                          : `${profile.display_name} hasn't published any arrangements yet`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lessons">
              <Card>
                <CardHeader>
                  <CardTitle>Music Lab</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorLessonsTab creatorId={profile.user_id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* <TabsContent value="setlists">
            <Card>
              <CardHeader>
                <CardTitle>Setlist Songs</CardTitle>
              </CardHeader>
              <CardContent>
                <CreatorSetlistsTab creatorId={profile.user_id} creatorType={profile.creator_type} />
              </CardContent>
            </Card>
          </TabsContent> */}

            <TabsContent value="sequencer">
              <CreatorSequencerTab 
                creatorId={profile.user_id} 
                creatorName={profile.display_name || "Creator"} 
              />
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {songs.slice(0, 5).map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <Music className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Published "{song.title}"
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(song.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {song.views_count || 0} views
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {selectedPlan && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModal(false)}
            onSuccess={() => {
              setIsPaymentModal(false);
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }}
            plan={selectedPlan}
            onStartTrial={selectedPlan.withTrial ? handleStartTrial : undefined}
          />
        )}

        <LibraryLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          currentCount={libraryUsage.currentCount}
          limit={libraryUsage.limit}
          isTrialing={subscriptionStatus?.isTrialing}
          onUpgrade={() => {
            setShowLimitModal(false);
            setIsPaymentModal(true);
            setSelectedPlan({
              name: "Monthly",
              price: 29000,
              features: [
                "Everything in Free",
                "Unlimited access to premium arrangements",
                "Unlimited PDF downloads",
                "+ 9 more features",
              ],
              interval_type: "month",
              id: "plan_monthly_standard",
              description: "Upgrade to unlock unlimited library additions.",
              withTrial: false,
            });
          }}
          onStartTrial={handleStartTrial}
        />
      </div>
    </>
  );
};

export default CreatorProfile;
