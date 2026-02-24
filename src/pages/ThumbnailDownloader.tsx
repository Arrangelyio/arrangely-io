import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Download,
  Image as ImageIcon,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

const ThumbnailDownloader = () => {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const BATCH_SIZE = 500; // Tentukan ukuran batch di sini

  useEffect(() => {
    fetchSongs();
  }, [currentPage]); // Fetch ulang setiap kali halaman berubah

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const from = currentPage * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;

      // Ambil data dengan range dan hitung total baris
      const { data, error, count } = await supabase
        .from("songs")
        .select("title, artist, youtube_link", { count: "exact" })
        .eq("is_public", true)
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSongs(data || []);
      if (count) setTotalCount(count);
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

  const getYouTubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const downloadCurrentBatchAsZip = async () => {
    setDownloading(true);
    const zip = new JSZip();
    const folder = zip.folder(`thumbnails_batch_${currentPage + 1}`);

    try {
      const promises = songs.map(async (song) => {
        const videoId = getYouTubeId(song.youtube_link);
        if (!videoId) return;

        // Mencoba mengambil kualitas tertinggi
        const imgUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        try {
          const response = await fetch(imgUrl);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          const fileName = `${song.artist} - ${song.title}.jpg`.replace(
            /[/\\?%*:|"<>]/g,
            "-"
          );
          folder?.file(fileName, blob);
        } catch (e) {
          // Fallback ke mqdefault jika maxres tidak ada
          try {
            const fallbackRes = await fetch(
              `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            );
            const blob = await fallbackRes.blob();
            const fileName = `${song.artist} - ${song.title}.jpg`.replace(
              /[/\\?%*:|"<>]/g,
              "-"
            );
            folder?.file(fileName, blob);
          } catch (err) {
            console.error(`Gagal mendownload: ${song.title}`);
          }
        }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Batch_${currentPage + 1}_${songs.length}_images.zip`);

      toast({
        title: "Success",
        description: `Batch ${currentPage + 1} berhasil didownload!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal membuat file ZIP",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / BATCH_SIZE);

  return (
    <div className="container mx-auto p-6 pt-24 min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link
            to="/community-library"
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Library
          </Link>
          <h1 className="text-3xl font-bold">Thumbnail Downloader</h1>
          <p className="text-muted-foreground">
            Menampilkan {songs.length} lagu dari total {totalCount}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Navigasi Halaman */}
          <div className="flex items-center bg-white dark:bg-slate-900 border rounded-md px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              Batch {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage >= totalPages - 1 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={downloadCurrentBatchAsZip}
            disabled={downloading || songs.length === 0 || loading}
            className="bg-primary"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Batch Ini ({songs.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {songs.map((song, index) => {
            const videoId = getYouTubeId(song.youtube_link);
            return (
              <Card key={index} className="overflow-hidden group">
                <CardContent className="p-0 relative aspect-video bg-muted">
                  {videoId ? (
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt={song.title}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                    <p className="text-xs font-bold line-clamp-1">
                      {song.title}
                    </p>
                    <p className="text-[10px] opacity-80">{song.artist}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThumbnailDownloader;
