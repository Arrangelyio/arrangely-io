// src/pages/ArtistListPage.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button"; // [!code ++]

// Utility function, sama seperti di SongLibraryBrowse
const extractYouTubeVideoId = (url: string | null | undefined): string => {
  if (!url) {
    return "";
  }
  const regExp =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match && match[1] && match[1].length === 11 ? match[1] : "";
};

const ArtistListPage = () => {
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // [!code focus start]
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [artistsPerPage] = useState(18); // Tampilkan 18 per halaman (6 kolom x 3 baris)
  // [!code focus end]

  useEffect(() => {
    // Fungsi lengkap untuk fetch semua artis
    const fetchAllCommunityArtists = async () => {
      try {
        setLoading(true);

        const { data: songsData, error } = await supabase
          .from("songs")
          .select(
            `
            artist,
            youtube_link
            `
          )
          .eq("is_public", true)
          .not("artist", "is", null)
          .neq("artist", "");

        if (error) {
          console.error("Error fetching songs for artists:", error.message);
          if (!error.message.includes("No rows returned")) {
            toast({
              title: "Error",
              description: `Failed to load artists: ${error.message}`,
              variant: "destructive",
            });
          }
          setAllArtists([]);
          return;
        }

        if (songsData) {
          const artistsMap = new Map();

          for (const song of songsData) {
            if (!song.artist) continue;
            const artistName = song.artist.trim();
            if (artistName === "") continue;

            const mapKey = artistName.toLowerCase();
            const videoId = extractYouTubeVideoId(song.youtube_link);
            const thumbnail = videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : null;

            if (!artistsMap.has(mapKey)) {
              artistsMap.set(mapKey, {
                artist_name: artistName,
                total_songs: 0,
                random_thumbnail: thumbnail,
              });
            }

            const artistEntry = artistsMap.get(mapKey);
            artistEntry.total_songs += 1;

            if (!artistEntry.random_thumbnail && thumbnail) {
              artistEntry.random_thumbnail = thumbnail;
            }
          }

          const formattedArtistsList = Array.from(artistsMap.values());
          formattedArtistsList.sort((a, b) => b.total_songs - a.total_songs);

          setAllArtists(formattedArtistsList);
          setFilteredArtists(formattedArtistsList);
        } else {
          setAllArtists([]);
        }
      } catch (err: any) {
        console.error(
          "Unexpected error in fetchAllCommunityArtists:",
          err.message || err
        );
        toast({
          title: "Error",
          description: `Unexpected error: ${err.message || "Unknown error"}`,
          variant: "destructive",
        });
        setAllArtists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCommunityArtists();
  }, [toast]);

  useEffect(() => {
    // Filter artis berdasarkan searchTerm
    if (searchTerm === "") {
      setFilteredArtists(allArtists);
    } else {
      const lowerCaseSearch = searchTerm.toLowerCase();
      setFilteredArtists(
        allArtists.filter((artist) =>
          artist.artist_name.toLowerCase().includes(lowerCaseSearch)
        )
      );
    }
    setCurrentPage(1); // [!code ++] Reset ke halaman 1 setiap kali filter berubah
  }, [searchTerm, allArtists]);

  // Varian untuk animasi fade-in
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // [!code focus start]
  // --- Logika Pagination ---
  const totalArtists = filteredArtists.length;
  const totalPages = Math.ceil(totalArtists / artistsPerPage);

  // Ambil artis untuk halaman saat ini
  const paginatedArtists = filteredArtists.slice(
    (currentPage - 1) * artistsPerPage,
    currentPage * artistsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0); // Scroll ke atas saat ganti halaman
    }
  };
  // [!code focus end]

  return (
    <div className="container mx-auto max-w-7xl pt-20 pb-12 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-5">
        All Artists
      </h1>

      {/* Search Bar Khusus Artis */}
      <div className="relative w-full sm:max-w-lg mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search artist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Tampilan Grid Vertikal */}
      {loading ? (
        // Skeleton Loader
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 animate-pulse"
            >
              {/* [!code focus] Avatar lebih kecil */}
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-28 w-28"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        // Grid "Seperti Spotify" dengan Avatar Bulat
        <AnimatePresence>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* [!code focus] Gunakan paginatedArtists */}
            {paginatedArtists.map((artist) => (
              <motion.div
                key={artist.artist_name}
                variants={itemVariants}
                className="w-full"
              >
                <Link
                  to={`/artist/${encodeURIComponent(artist.artist_name)}`}
                  className="group flex flex-col items-center text-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50"
                >
                  {/* [!code focus start] Avatar lebih kecil */}
                  <Avatar className="h-28 w-28 shadow-md transition-transform group-hover:scale-105">
                    <AvatarImage
                      src={artist.random_thumbnail}
                      alt={artist.artist_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                      <Users className="h-10 w-10 text-gray-400" />
                    </AvatarFallback>
                  </Avatar>
                  {/* [!code focus end] */}
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-base line-clamp-2">
                      {artist.artist_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {artist.total_songs} songs
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* [!code focus start] */}
      {/* Kontrol Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
      {/* [!code focus end] */}
    </div>
  );
};

export default ArtistListPage;
