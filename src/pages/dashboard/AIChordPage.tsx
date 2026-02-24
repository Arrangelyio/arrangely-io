import { useState, useRef, useEffect } from "react";
import {
  Music,
  Wand2,
  Play,
  Pause,
  Download,
  Loader2,
  RefreshCw,
  Grid3X3,
  AlignLeft,
  Youtube,
  Search,
  Link,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";

import AIChordGrid from "@/components/IChordGrid";
import AIChordLyricView from "@/components/AIChordLyricView";

// --- INTERFACES ---
interface ChordResult {
  chord: string;
  start: number;
  end: number;
  confidence: number;
}

interface AnalysisResult {
  chords: ChordResult[];
  duration: number;
  beats_data?: {
    beats: number[];
    bpm: number;
    time_signature: string;
  };
  lyrics?: {
    synced?: string;
    plain?: string;
    source?: "youtube" | "genius" | "unknown";
  } | null;
  title?: string;
  artist?: string;
}

type InputMode = "file" | "youtube";

export default function AIChordPage() {
  // --- STATE ---
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeLink, setYoutubeLink] = useState("");

  // Status Loading
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");

  // Manual Lyric Search State
  const [lyricSearchQuery, setLyricSearchQuery] = useState("");

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<"grid" | "lyrics">("grid");

  // --- HELPER: Clean Filename ---
  const cleanFilename = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/official video/gi, "")
      .replace(/lyrics/gi, "")
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // --- API: Fetch Genius Lyrics ---
  const fetchGeniusLyrics = async (query: string) => {
    if (!query.trim()) return;
    setIsFetchingLyrics(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-lyrics", {
        body: { query },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.synced || data.plain) {
        setResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            lyrics: { synced: data.synced, plain: data.plain, source: "genius" },
          };
        });
        toast.success("Lirik ditemukan via Genius!");
        if (viewMode !== "lyrics") setViewMode("lyrics");
      } else {
        toast.warning("Lirik tidak ditemukan di Genius.");
      }
    } catch (error: any) {
      console.error("Lyric Fetch Error:", error);
      toast.error("Gagal mengambil lirik: " + (error.message || error));
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  // --- HANDLER: Analyze via File Upload ---
  const handleAnalyzeFile = async () => {
    if (!file) return;
    setIsAnalyzingAudio(true);
    setLoadingMessage("Menganalisa audio & chord...");
    setResult(null);

    try {
      const localAudioUrl = URL.createObjectURL(file);
      setAudioUrl(localAudioUrl);

      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("new-analyze-song", {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Analisis Audio Selesai!");

      const title = cleanFilename(file.name);
      setSongTitle(title);
      setLyricSearchQuery(title);
      await fetchGeniusLyrics(title);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal: " + error.message);
    } finally {
      setIsAnalyzingAudio(false);
      setLoadingMessage("");
    }
  };

  // --- HANDLER: Analyze via YouTube URL ---
  const handleAnalyzeYoutube = async () => {
    const videoId = extractYouTubeVideoId(youtubeLink);
    if (!videoId) {
      toast.error("URL YouTube tidak valid. Pastikan formatnya benar.");
      return;
    }

    setIsAnalyzingAudio(true);
    setLoadingMessage("Mengekstrak audio dari YouTube...");
    setResult(null);

    try {
      // Set YouTube embed as audio source for playback
      setAudioUrl(null); // Will use YouTube player or no audio preview for now

      const { data, error } = await supabase.functions.invoke("convert-youtube-audio", {
        body: { youtubeUrl: youtubeLink, videoId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.cached) {
        toast.success("Hasil analisis ditemukan di cache!");
      } else {
        toast.success("Analisis YouTube Selesai!");
      }

      const title = data.title || "";
      const artist = data.artist || "";
      setSongTitle(title);
      setSongArtist(artist);

      setResult({
        chords: data.chords || [],
        duration: data.duration || 0,
        beats_data: data.beats_data || undefined,
        lyrics: data.lyrics || undefined,
        title,
        artist,
      });

      // Auto-fetch lyrics if not already present
      if (!data.lyrics?.synced && !data.lyrics?.plain) {
        const searchQuery = title ? `${artist} ${title}`.trim() : "";
        if (searchQuery) {
          setLyricSearchQuery(searchQuery);
          setLoadingMessage("Mencari lirik...");
          await fetchGeniusLyrics(searchQuery);
        }
      } else {
        setLyricSearchQuery(`${artist} ${title}`.trim());
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal: " + error.message);
    } finally {
      setIsAnalyzingAudio(false);
      setLoadingMessage("");
    }
  };

  // --- HANDLER: Main Analyze (dispatches based on mode) ---
  const handleAnalyze = () => {
    if (inputMode === "youtube") {
      handleAnalyzeYoutube();
    } else {
      handleAnalyzeFile();
    }
  };

  // --- PLAYER HANDLERS ---
  const handleSeek = (time: number) => {
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
      audioRef.current.play().catch((e) => console.error("Play failed:", e));
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFile(null);
    setYoutubeLink("");
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setViewMode("grid");
    setLyricSearchQuery("");
    setSongTitle("");
    setSongArtist("");
  };

  const canAnalyze = inputMode === "youtube" ? youtubeLink.trim().length > 0 : !!file;
  const displayTitle = songTitle || file?.name || "Untitled";

  return (
    <div className="container mx-auto p-6 max-w-5xl min-h-screen flex flex-col font-sans">
      {/* --- PAGE HEADER --- */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
          <Wand2 className="h-8 w-8 text-primary" />
          AI Smart Transcriber
        </h1>
        <p className="text-muted-foreground mt-2">
          Tempel link YouTube atau upload file audio. AI akan mendeteksi Chord & BPM, lalu mencari lirik secara otomatis.
        </p>
      </div>

      <div className="flex-1">
        {/* --- STATE 1: INPUT FORM --- */}
        {!result && !isAnalyzingAudio && (
          <Card className="bg-muted/30 border-2 border-dashed border-border shadow-none">
            <CardContent className="pt-8 pb-8 space-y-8">
              {/* Input Mode Tabs */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-lg border border-border bg-background p-1 gap-1">
                  <button
                    onClick={() => setInputMode("youtube")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === "youtube"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube Link
                  </button>
                  <button
                    onClick={() => setInputMode("file")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === "file"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </button>
                </div>
              </div>

              {/* YouTube Input */}
              {inputMode === "youtube" && (
                <div className="flex flex-col items-center gap-4 max-w-lg mx-auto text-center">
                  <div className="bg-red-100 p-4 rounded-full">
                    <Youtube className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      Paste YouTube Link
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Audio akan diekstrak otomatis dari video YouTube
                    </p>
                  </div>
                  <div className="w-full relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      className="pl-10 bg-background"
                      onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
                    />
                  </div>
                  {youtubeLink && extractYouTubeVideoId(youtubeLink) && (
                    <div className="w-full rounded-lg overflow-hidden border border-border">
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeVideoId(youtubeLink)}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* File Upload Input */}
              {inputMode === "file" && (
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Music className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      Upload Audio File
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Format MP3 atau WAV (Max 10MB)
                    </p>
                  </div>
                  <div className="w-full">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }}
                      className="cursor-pointer bg-background file:text-primary file:font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="max-w-xs mx-auto">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="w-full h-12 text-lg font-medium shadow-md transition-all hover:scale-[1.02]"
                >
                  <Wand2 className="mr-2 h-5 w-5" /> Mulai Analisa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- LOADING STATE --- */}
        {isAnalyzingAudio && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">
              {loadingMessage || "Sedang menganalisa..."}
            </p>
            {inputMode === "youtube" && (
              <p className="text-xs text-muted-foreground/70">
                Proses ini bisa memakan waktu 1-2 menit untuk video YouTube
              </p>
            )}
          </div>
        )}

        {/* --- STATE 2: RESULT VIEW --- */}
        {result && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Sticky Player Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-background p-4 rounded-xl border shadow-sm sticky top-4 z-30 gap-4 ring-1 ring-border">
              {/* Left: Play Button & Info */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {audioUrl && (
                  <Button
                    variant={isPlaying ? "default" : "outline"}
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-12 w-12 rounded-full shadow-sm shrink-0"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
                  </Button>
                )}

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground line-clamp-1 max-w-[250px]">
                    {displayTitle}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {result.beats_data?.bpm && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                        {Math.round(result.beats_data.bpm)} BPM
                      </span>
                    )}
                    {audioUrl && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.floor(currentTime / 60)}:
                        {Math.floor(currentTime % 60).toString().padStart(2, "0")}
                        <span className="mx-1">/</span>
                        {Math.floor(result.duration / 60)}:
                        {Math.floor(result.duration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: View Switcher */}
              <Tabs
                value={viewMode}
                onValueChange={(v) => setViewMode(v as "grid" | "lyrics")}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="grid">
                    <Grid3X3 className="mr-2 h-4 w-4" /> Grid
                  </TabsTrigger>
                  <TabsTrigger value="lyrics">
                    <AlignLeft className="mr-2 h-4 w-4" /> Lyrics
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Right: Actions */}
              <div className="flex gap-2 hidden sm:flex">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" /> New Song
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
              </div>
            </div>

            {/* Hidden Audio Element */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
                style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
              />
            )}

            {/* Main Visualization Card */}
            <Card className="min-h-[500px] bg-background border-border shadow-md overflow-hidden">
              <CardContent className="p-0 sm:p-8">
                {/* --- GRID VIEW --- */}
                {viewMode === "grid" && (
                  <AIChordGrid
                    chords={result.chords}
                    duration={result.duration}
                    beats={result.beats_data?.beats}
                    bpm={result.beats_data?.bpm}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                  />
                )}

                {/* --- LYRICS VIEW --- */}
                {viewMode === "lyrics" && (
                  <div className="flex flex-col h-full">
                    {/* Manual Search Bar */}
                    <div className="mb-6 bg-muted/50 p-4 rounded-lg border border-border">
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                        Cari / Koreksi Judul Lagu
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={lyricSearchQuery}
                          onChange={(e) => setLyricSearchQuery(e.target.value)}
                          placeholder="Contoh: Separuh Nafas - Dewa 19"
                          className="bg-background"
                          onKeyDown={(e) =>
                            e.key === "Enter" && fetchGeniusLyrics(lyricSearchQuery)
                          }
                        />
                        <Button
                          onClick={() => fetchGeniusLyrics(lyricSearchQuery)}
                          disabled={isFetchingLyrics}
                        >
                          {isFetchingLyrics ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-2">
                        Jika lirik otomatis salah atau tidak muncul, ketik judul yang benar di sini.
                      </p>
                    </div>

                    {/* Source Badge */}
                    {result.lyrics?.source && (
                      <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <span>Source:</span>
                        <span className="flex items-center text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded">
                          Genius Lyrics
                        </span>
                      </div>
                    )}

                    {/* Lyric Component */}
                    <AIChordLyricView
                      chords={result.chords}
                      lyrics={result.lyrics?.synced || result.lyrics?.plain || ""}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
