import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import codaSign from "@/assets/coda_sign.svg";
import segno from "@/assets/segno.svg";
import wholeRestImg from "@/assets/whole_rest.svg";
import halfRestImg from "@/assets/half_rest.svg";
import quarterRestImg from "@/assets/quarter_rest.svg";
import eighthRestImg from "@/assets/eighth_rest.svg";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Music,
  Check,
  List,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { ChordClickableText } from "@/components/setlist/ChordClickableText";
import { MetronomeWidget } from "@/components/setlist/MetronomeWidget";
import { TeleprompterLyrics } from "@/components/TeleprompterLyrics";
import { transposeText } from "@/lib/transpose";
import {
  NotationDisplay,
  NoteType,
  NoteSymbol,
} from "@/components/chord-grid/NoteSymbols";
import { offlineDatabase } from "@/lib/capacitor/offlineDatabase";
import { useLivePerformance } from "@/hooks/useLivePerformance";
import { MDServerInfo } from "@/components/capacitor";

interface OfflineSong {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  time_signature: string | null;
  capo: number | null;
  youtube_link?: string | null;
  theme?: string;
  sections?: Array<{
    id: string;
    section_type: string | null;
    lyrics: string | null;
    chords: string | null;
    name: string;
    section_time_signature: string | null;
  }>;
  arrangements?: Array<{
    id: string;
    position: number;
    repeat_count: number | null;
    notes: string | null;
    section: {
      id: string;
      section_type: string | null;
      name: string | null;
      section_time_signature: string | null;
      lyrics?: string | null;
      chords?: string | null;
    } | null;
  }>;
}

interface LiveState {
  currentSectionId: string | null;
  currentArrangementId: string | null;
  isPlaying: boolean;
  tempo: number;
  transpose: number;
}

interface OfflineSetlist {
  id: string;
  name: string;
  date: string;
  theme: string | null;
  songs: OfflineSong[];
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
};

// ChordZoom component
const ChordZoom: React.FC<{
  storageKey: string;
  children: React.ReactNode;
  initial?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}> = ({
  storageKey,
  children,
  initial = 1,
  min = 0.3,
  max = 1,
  step = 0.1,
  className = "",
}) => {
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Number(saved) || initial : initial;
    } catch {
      return initial;
    }
  });

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const setClamped = (v: number) => setZoom(clamp(Number(v.toFixed(2))));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(zoom));
    } catch {}
  }, [zoom, storageKey]);

  const scaledWidth = (1 / zoom) * 100;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="sticky top-0 z-20 flex justify-end pointer-events-none">
        <div className="mt-2 mr-2 inline-flex items-center gap-2 bg-white/85 dark:bg-slate-900/70 backdrop-blur rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 shadow-sm pointer-events-auto">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setClamped(zoom - step)}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setClamped(zoom + step)}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
      <div
        className="block"
        style={{
          width: `${scaledWidth}%`,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Helper functions
const isChordLine = (line: string): boolean => {
  if (!line || line.trim() === "") return false;
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0) return false;

  const chordPattern =
    /^[A-Ga-g](#|b)?(m|M|maj|min|dim|aug|sus|add|dom)?[0-9]?(?:\/[A-Ga-g](#|b)?)?$/;
  const specialSymbols = ["|", "%", "//", "/.", "-", "WR", "HR", "QR", "ER"];
  const validTokens = tokens.filter(
    (token) => chordPattern.test(token) || specialSymbols.includes(token)
  );
  return validTokens.length / tokens.length >= 0.5;
};

const getYouTubeID = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

interface ChordBar {
  chord: string;
  melody?: { notAngka?: string };
  timeSignatureOverride?: string;
}

const OfflineLivePreview = () => {
  const { setlistId, songId } = useParams<{
    setlistId?: string;
    songId?: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [song, setSong] = useState<OfflineSong | null>(null);
  const [setlist, setSetlist] = useState<OfflineSetlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [completedSongs, setCompletedSongs] = useState<Set<string>>(new Set());
  const [liveState, setLiveState] = useState<LiveState>({
    currentSectionId: null,
    currentArrangementId: null,
    isPlaying: false,
    tempo: 120,
    transpose: 0,
  });

  const isMobile = useMediaQuery("(max-width: 1023px)");
  const liveStateRef = useRef(liveState);
  const songRef = useRef(song);

  // Live performance hook for MD functionality
  const livePerformance = useLivePerformance(setlistId || "");

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  // Load offline data from SQLite
  useEffect(() => {
    const loadOfflineData = async () => {
      if (!setlistId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      

      try {
        const initialized = await offlineDatabase.initialize();
        if (!initialized) {
          toast({
            title: "Offline Mode Unavailable",
            description: "SQLite is only available on native platforms.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const fullData = await offlineDatabase.getFullSetlistData(setlistId);
        if (!fullData) {
          toast({
            title: "Setlist Not Found",
            description: "This setlist has not been downloaded for offline use.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        

        // Transform data to match expected format
        const transformedSongs: OfflineSong[] = fullData.songs.map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          key: s.key,
          bpm: s.bpm,
          time_signature: s.time_signature,
          capo: s.capo,
          youtube_link: s.youtube_link,
          theme: s.theme || "default",
          sections: s.sections?.map((sec: any) => ({
            id: sec.id,
            section_type: sec.section_type,
            lyrics: sec.lyrics,
            chords: sec.chords,
            name: sec.name,
            section_time_signature: sec.section_time_signature,
          })),
          arrangements: s.arrangements?.map((arr: any) => ({
            id: arr.id,
            position: arr.position,
            repeat_count: arr.repeat_count,
            notes: arr.notes,
            section: arr.section,
          })),
        }));

        const offlineSetlist: OfflineSetlist = {
          id: fullData.setlist.id,
          name: fullData.setlist.name,
          date: fullData.setlist.date,
          theme: fullData.setlist.theme,
          songs: transformedSongs,
        };

        setSetlist(offlineSetlist);

        // Set initial song
        if (songId) {
          const songIndex = transformedSongs.findIndex((s) => s.id === songId);
          if (songIndex >= 0) {
            setCurrentSongIndex(songIndex);
            setSong(transformedSongs[songIndex]);
            setLiveState((prev) => ({
              ...prev,
              tempo: transformedSongs[songIndex].bpm || 120,
              currentArrangementId: transformedSongs[songIndex].arrangements?.[0]?.id || null,
              currentSectionId: transformedSongs[songIndex].arrangements?.[0]?.section?.id || null,
            }));
          }
        } else if (transformedSongs.length > 0) {
          setSong(transformedSongs[0]);
          setLiveState((prev) => ({
            ...prev,
            tempo: transformedSongs[0].bpm || 120,
            currentArrangementId: transformedSongs[0].arrangements?.[0]?.id || null,
            currentSectionId: transformedSongs[0].arrangements?.[0]?.section?.id || null,
          }));
        }
      } catch (error) {
        console.error("[OfflineLivePreview] Error loading offline data:", error);
        toast({
          title: "Error",
          description: "Failed to load offline data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadOfflineData();
  }, [setlistId, songId, toast]);

  const setlistSongs = setlist?.songs || [];
  const sortedArrangements = song?.arrangements?.sort((a, b) => a.position - b.position) || [];

  const changeSection = useCallback((direction: "next" | "previous") => {
    const currentSong = songRef.current;
    const currentLiveState = liveStateRef.current;

    const sorted = currentSong?.arrangements?.sort((a, b) => a.position - b.position) || [];
    if (sorted.length === 0) return;

    const currentIndex = sorted.findIndex((arr) => arr.id === currentLiveState.currentArrangementId);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < sorted.length) {
      const newArrangement = sorted[newIndex];
      setLiveState((prev) => ({
        ...prev,
        currentArrangementId: newArrangement.id,
        currentSectionId: newArrangement.section?.id || null,
      }));

      // Broadcast to connected devices
      if (livePerformance.isMD) {
        livePerformance.changeSection(newIndex);
      }

      toast({
        title: direction === "next" ? "Next Section" : "Previous Section",
        description: `Moved to ${newArrangement.section?.name || "section"}.`,
        duration: 500,
      });
    }
  }, [toast, livePerformance]);

  const navigateToSong = (targetSongId: string) => {
    const targetSong = setlistSongs.find((s) => s.id === targetSongId);
    if (!targetSong) return;

    const targetIndex = setlistSongs.findIndex((s) => s.id === targetSongId);
    setCurrentSongIndex(targetIndex);
    setSong(targetSong);
    setLiveState((prev) => ({
      ...prev,
      tempo: targetSong.bpm || 120,
      currentArrangementId: targetSong.arrangements?.[0]?.id || null,
      currentSectionId: targetSong.arrangements?.[0]?.section?.id || null,
    }));

    // Broadcast to connected devices
    if (livePerformance.isMD) {
      livePerformance.changeSong(targetIndex);
    }

    navigate(`/offline-live/${setlistId}/${targetSongId}`, { replace: true });
  };

  const handleTranspose = (semitones: number) => {
    setLiveState((prev) => ({
      ...prev,
      transpose: prev.transpose + semitones,
    }));
    
    if (livePerformance.isMD) {
      livePerformance.setTranspose(liveState.transpose + semitones);
    }
  };

  // Format content for display
  const formatContent = (section: any) => {
    if (!section) return null;

    const content = section.chords || section.lyrics;
    if (!content) {
      return <div className="text-slate-400 italic text-sm">No content available</div>;
    }

    // Check if chord grid JSON
    if (content.trim().startsWith("[") && content.trim().endsWith("]")) {
      try {
        const chordData = JSON.parse(content);
        const bars: ChordBar[] = chordData.bars || chordData;
        const beatsPerBar = parseInt(song?.time_signature?.split("/")[0] || "4");

        return (
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600/30">
              <div className="text-cyan-600 dark:text-cyan-300 text-sm font-semibold mb-4 uppercase tracking-wide">
                Chord Grid - {section.section_type || section.name}
                {section.section_time_signature ? ` (${section.section_time_signature})` : ""}
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {bars.map((bar, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600/30 text-center"
                  >
                    <div className="text-xl font-semibold text-slate-900 dark:text-white">
                      <ChordClickableText text={bar.chord || "-"} userRole="guitarist" />
                    </div>
                    {bar.melody?.notAngka && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {bar.melody.notAngka}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      } catch (e) {
        // Fall through to text display
      }
    }

    // Standard chord/lyrics display
    const lines = content.split("\n");
    return (
      <div className="space-y-1">
        {lines.map((line: string, idx: number) => {
          if (isChordLine(line)) {
            return (
              <div
                key={idx}
                className="font-mono text-lg font-semibold text-blue-600 dark:text-cyan-400"
              >
                <ChordClickableText text={line} userRole="guitarist" />
              </div>
            );
          }
          return (
            <p key={idx} className="text-lg text-slate-800 dark:text-slate-200">
              {line || <span>&nbsp;</span>}
            </p>
          );
        })}
      </div>
    );
  };

  // Find current section data
  const currentArrangement = sortedArrangements.find(
    (arr) => arr.id === liveState.currentArrangementId
  );
  const currentSectionData = currentArrangement?.section
    ? song?.sections?.find((s) => s.id === currentArrangement.section?.id) || currentArrangement.section
    : song?.sections?.[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading offline data...</p>
        </div>
      </div>
    );
  }

  if (!setlist || !song) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-semibold mb-2">No Offline Data</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This setlist has not been downloaded for offline use.
            </p>
            <Button onClick={() => navigate("/offline-downloads")}>
              Go to Downloads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Main Content */}
      <div className="flex-1 flex flex-col order-2 lg:order-1">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/offline-downloads")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="font-semibold text-slate-900 dark:text-white">
                  {song.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {song.artist || "Unknown Artist"} • Key: {song.key || "?"} • {song.bpm || "?"} BPM
                </p>
              </div>
            </div>

            {/* Offline Badge */}
            <Badge variant="outline" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          </div>
        </div>

        {/* MD Server Info - Show when MD */}
        {livePerformance.isMD && (
          <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-4 py-2">
            <MDServerInfo isActive={livePerformance.isConnected} setlistId={setlistId || ""} />
          </div>
        )}

        {/* Transport Controls */}
        <div className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeSection("previous")}
                disabled={sortedArrangements.findIndex((a) => a.id === liveState.currentArrangementId) <= 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={liveState.isPlaying ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  setLiveState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
                  if (livePerformance.isMD) {
                    livePerformance.setPlaying(!liveState.isPlaying);
                  }
                }}
              >
                {liveState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeSection("next")}
                disabled={sortedArrangements.findIndex((a) => a.id === liveState.currentArrangementId) >= sortedArrangements.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Transpose Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Transpose:</span>
              <Button variant="outline" size="sm" onClick={() => handleTranspose(-1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-mono w-8 text-center">
                {liveState.transpose > 0 ? `+${liveState.transpose}` : liveState.transpose}
              </span>
              <Button variant="outline" size="sm" onClick={() => handleTranspose(1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Metronome */}
            <MetronomeWidget tempo={liveState.tempo} isPlaying={liveState.isPlaying} />
          </div>
        </div>

        {/* Section Content */}
        <div className="flex-1 overflow-auto p-4">
          <Card className="h-full">
            <CardContent className="p-6">
              {currentSectionData ? (
                <ChordZoom storageKey="offline-chord-zoom">
                  <div className="mb-4">
                    <Badge variant="secondary" className="mb-2">
                      {currentSectionData.name || currentSectionData.section_type}
                      {currentSectionData.section_time_signature && 
                        ` (${currentSectionData.section_time_signature})`}
                    </Badge>
                  </div>
                  {formatContent(currentSectionData)}
                </ChordZoom>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Music className="h-12 w-12 mx-auto mb-4" />
                  <p>Select a section to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Setlist Sidebar */}
      <div className="w-full lg:w-80 bg-slate-100 dark:bg-slate-900/95 border-l-0 lg:border-l border-t lg:border-t-0 border-slate-200 dark:border-slate-800 p-4 overflow-y-auto order-1 lg:order-2">
        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            {setlist.name}
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {setlist.date} • {setlistSongs.length} songs
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all"
                style={{
                  width: `${(completedSongs.size / setlistSongs.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {completedSongs.size} of {setlistSongs.length} completed
          </div>
        </div>

        {/* Song List */}
        <div className="space-y-2">
          {setlistSongs.map((setlistSong, index) => (
            <div
              key={setlistSong.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                song?.id === setlistSong.id
                  ? "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50"
                  : completedSongs.has(setlistSong.id)
                  ? "bg-green-100 dark:bg-green-500/10 border-green-300 dark:border-green-400/30"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onClick={() => navigateToSong(setlistSong.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    song?.id === setlistSong.id
                      ? "bg-blue-500 text-white"
                      : completedSongs.has(setlistSong.id)
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {completedSongs.has(setlistSong.id) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {setlistSong.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {setlistSong.artist || "Unknown"} • {setlistSong.key || "?"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section List for current song */}
        {sortedArrangements.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Sections
            </h4>
            <div className="space-y-1">
              {sortedArrangements.map((arr, idx) => (
                <button
                  key={arr.id}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    arr.id === liveState.currentArrangementId
                      ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                  onClick={() => {
                    setLiveState((prev) => ({
                      ...prev,
                      currentArrangementId: arr.id,
                      currentSectionId: arr.section?.id || null,
                    }));
                    if (livePerformance.isMD) {
                      livePerformance.changeSection(idx);
                    }
                  }}
                >
                  {idx + 1}. {arr.section?.name || arr.section?.section_type || "Section"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineLivePreview;
