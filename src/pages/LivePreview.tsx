import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { offlineDatabase } from "@/lib/capacitor/offlineDatabase";
import { useLivePerformance } from "@/hooks/useLivePerformance";
import { localNetworkSync } from "@/lib/capacitor/localNetworkSync";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { useGuestBroadcast } from "@/hooks/useGuestBroadcast";
import { MDServerInfo } from "@/components/capacitor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import PdfLikeViewer from "@/components/PdfLikeViewer";
import YouTube from "react-youtube";
import codaSign from "@/assets/coda_sign.svg";
import segno from "@/assets/segno.svg";
import wholeRestImg from "@/assets/whole_rest.svg";
import halfRestImg from "@/assets/half_rest.svg";
import quarterRestImg from "@/assets/quarter_rest.svg";
import eighthRestImg from "@/assets/eighth_rest.svg";
import FeatureTour from "@/components/tour/FeatureTour";
import { Capacitor } from "@capacitor/core";
import {
    ArrowLeft,
    ArrowRight,
    Users,
    Play,
    Pause,
    Settings,
    Share2,
    Music,
    Check,
    List,
    Waves,
    ListMusic,
    Video,
    X,
    Youtube,
    Sun,
    Moon,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Plus,
    Minus,
    Edit,
    Eye,
    Music2,
    ChevronsUpDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { storeIntendedUrl } from "@/utils/redirectUtils";
import { simplifyChord, simplifyChordLine } from "@/utils/chordSimplifier";
import GestureDetection from "@/components/GestureDetection";
import {
    RoleSelectionModal,
    UserRole,
} from "@/components/setlist/RoleSelectionModal";
import { ViewersList } from "@/components/setlist/ViewersList";
import { ChordClickableText } from "@/components/setlist/ChordClickableText";
import { MetronomeWidget } from "@/components/setlist/MetronomeWidget";
import ShareSessionModal from "@/components/ShareSessionModal";
import DrawingCanvas from "@/components/DrawingCanvas";
import { TeleprompterLyrics } from "@/components/TeleprompterLyrics";
import TransposeModal from "@/components/TransposeModal";
import { transposeText } from "@/lib/transpose";
import {
    NotationDisplay,
    NoteType,
    NoteSymbol,
} from "@/components/chord-grid/NoteSymbols";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
// Tambahkan baris ini di bawahnya atau gabungkan
import { StatusBar, Style } from "@capacitor/status-bar";

interface Song {
    id: string;
    title: string;
    artist: string | null;
    current_key: string;
    tempo: number | null;
    time_signature: string;
    capo: number | null;
    user_id?: string;
    youtube_link?: string | null;
    theme?: string;
    sections?: Array<{
        id: string;
        section_type: string;
        lyrics: string | null;
        chords: string | null;
        name: string | null;
        section_time_signature: string | null;
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
            section_time_signature: string | null;
        };
    }>;
}
interface LiveState {
    currentSectionId: string | null;
    currentArrangementId: string | null;
    isPlaying: boolean;
    tempo: number;
    viewerCount: number;
    showAllSections: boolean;
    isAutoScrolling: boolean;
    scrollSpeedMultiplier: number;
}
interface Setlist {
    id: string;
    name: string;
    date: string;
    theme: string;
    songs: Song[];
    created_at: string;
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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === "+" || e.key === "=") {
                e.preventDefault();
                setClamped(zoom + step);
            }
            if (e.key === "-") {
                e.preventDefault();
                setClamped(zoom - step);
            }
            if (e.key === "0") {
                e.preventDefault();
                setClamped(1);
            }
        };
        window.addEventListener("keydown", onKey, { passive: false });
        return () => window.removeEventListener("keydown", onKey);
    }, [zoom, step]);

    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = document.documentElement;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setClamped(zoom + (e.deltaY > 0 ? -step : step));
            }
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [zoom, step]);

    // Menghitung lebar dinamis agar konten pas saat di-zoom
    const scaledWidth = (1 / zoom) * 100;

    return (
        <div ref={wrapRef} className={`relative w-full ${className}`}>
            <div className="sticky top-0 z-20 flex justify-end pointer-events-none">
                <div
                    className="mt-2 mr-2 inline-flex items-center gap-2 bg-white/85 dark:bg-slate-900/70 backdrop-blur
                                 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 shadow-sm
                                 pointer-events-auto"
                >
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

const getYouTubeID = (url: string): string | null => {
    if (!url) return null;
    const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

// Vocalist Highlighted View Component
const VocalistHighlightedView = ({
    arrangements,
    currentArrangementId,
    formatContent,
}: {
    arrangements: any[];
    currentArrangementId: string | null;
    formatContent: (section: any) => JSX.Element;
}) => {
    const currentIndex = arrangements.findIndex(
        (arr) => arr.id === currentArrangementId,
    );

    return (
        <div className="space-y-8">
            {arrangements.map((arrangement, index) => {
                const isCurrentSection =
                    arrangement.id === currentArrangementId;
                const isPrevNext = Math.abs(index - currentIndex) === 1;
                const isContext = Math.abs(index - currentIndex) <= 2; // Show 2 lines before/after

                if (!isContext) return null; // Don't show sections that are too far

                let sectionClassName = "transition-all duration-300";

                if (isCurrentSection) {
                    // Current section - fully highlighted
                    sectionClassName +=
                        " relative z-10 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-6 shadow-lg";
                } else if (isPrevNext) {
                    // Previous/next sections - slightly highlighted
                    sectionClassName +=
                        " relative z-5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4 opacity-75";
                } else {
                    // Context sections - blurred
                    sectionClassName +=
                        " relative z-0 blur-sm opacity-40 grayscale";
                }

                return (
                    <div key={arrangement.id} className={sectionClassName}>
                        {formatContent(arrangement.section)}
                    </div>
                );
            })}
        </div>
    );
};

const LivePreview = () => {
    const activeSongIdRef = useRef<string | undefined>(undefined);
    const [isSectionsExpanded, setIsSectionsExpanded] = useState(true);
    // const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [openYouTubeId, setOpenYouTubeId] = useState<string | null>(null);
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    const { id, setlistId, songId, slug, setlistSlug, songSlug } = useParams<{
        id?: string;
        setlistId?: string;
        songId?: string;
        slug?: string;
        setlistSlug?: string;
        songSlug?: string;
    }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Offline mode detection - use network status from Capacitor
    const { isOnline } = useOfflineDetection();
    const isOfflineRoute = location.pathname.startsWith("/offline-live");
    const isOfflineMode = !isOnline || isOfflineRoute;
    const livePerformance = useLivePerformance(setlistId || "");
    const { broadcastToGuests } = useGuestBroadcast();

    const [song, setSong] = useState<Song | null>(null);
    const [loading, setLoading] = useState(true);
    const [liveState, setLiveState] = useState<LiveState>({
        currentSectionId: null,
        currentArrangementId: null,
        isPlaying: false,
        tempo: 120,
        viewerCount: 1,
        showAllSections: true,
        isAutoScrolling: false,
        scrollSpeedMultiplier: parseFloat(
            localStorage.getItem("livePreviewScrollSpeed") || "1.0",
        ),
    });
    const isMobile = useMediaQuery("(max-width: 1023px)");
    const liveStateRef = useRef(liveState);
    const songRef = useRef(song);
    const [isOwner, setIsOwner] = useState(false);
    const [channel, setChannel] = useState<any>(null);
    const [sequencerChannel, setSequencerChannel] = useState<any>(null);
    const [sequencerId, setSequencerId] = useState<string | null>(null);
    const [setlist, setSetlist] = useState<Setlist | null>(null);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [completedSongs, setCompletedSongs] = useState<Set<string>>(() => {
        if (!setlistId) return new Set();

        try {
            const key = `completedSongs-${setlistId}`;
            const savedCompletedSongs = localStorage.getItem(key);
            if (savedCompletedSongs) {
                const initialValue = JSON.parse(savedCompletedSongs);
                return new Set(initialValue);
            }
        } catch (error) {
            console.error(
                "Failed to parse completed songs from localStorage",
                error,
            );
        }

        return new Set();
    });
    const [viewingMode, setViewingMode] = useState<
        "live" | "setlist" | "browse"
    >("live");
    const [independentSection, setIndependentSection] = useState<string | null>(
        null,
    );
    const [showAllSections, setShowAllSections] = useState(true);
    const [gestureMode, setGestureMode] = useState(false);
    const viewingModeRef = useRef(viewingMode);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [viewers, setViewers] = useState<
        Array<{
            id: string;
            name: string;
            avatar_url?: string;
            role?: UserRole;
            isOwner?: boolean;
        }>
    >([]);

    const [showShareModal, setShowShareModal] = useState(false);

    // Transpose modal state
    const [showTransposeModal, setShowTransposeModal] = useState(false);

    // Simplify chords state
    const [simplifyChordsEnabled, setSimplifyChordsEnabled] = useState(
        () => localStorage.getItem("simplifyChords") === "true",
    );

    // Annotation state
    const [annotationsEnabled, setAnnotationsEnabled] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(false);
    const [annotations, setAnnotations] = useState<any>(null);

    const [scrollSpeedMultiplier, setScrollSpeedMultiplier] = useState(() => {
        // Ambil nilai tersimpan dari localStorage, atau default ke 1.0
        const savedSpeed = localStorage.getItem("livePreviewScrollSpeed");
        return savedSpeed ? parseFloat(savedSpeed) : 1.0;
    });

    // useEffect(() => {
    //     localStorage.setItem(
    //         "livePreviewScrollSpeed",
    //         scrollSpeedMultiplier.toString()
    //     );
    // }, [scrollSpeedMultiplier]);

    const [isAllSectionsFullscreen, setIsAllSectionsFullscreen] =
        useState(false);

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();

        const handleStatusBar = async () => {
            if (isNative) {
                try {
                    // 1. Style.Light = Icon (Baterai/Jam) jadi PUTIH
                    await StatusBar.setStyle({ style: Style.Dark });

                    // 2. Set background hitam agar sistem Android sinkron
                    if (Capacitor.getPlatform() === "android") {
                        await StatusBar.setBackgroundColor({
                            color: "#302929ff",
                        });
                    }
                } catch (err) {
                    console.error(
                        "Gagal setting Status Bar di Live Preview:",
                        err,
                    );
                }
            }
        };

        handleStatusBar();

        // CLEANUP: Saat keluar dari Live Preview, kembalikan ke Hitam (Style.Dark)
        return () => {
            if (isNative) {
                StatusBar.setStyle({ style: Style.Dark });
                if (Capacitor.getPlatform() === "android") {
                    StatusBar.setBackgroundColor({ color: "#000000ff" });
                }
            }
        };
    }, []);

    // Logika untuk Auto-Scrolling (yang disempurnakan)
    useEffect(() => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }

        if (liveState.isAutoScrolling && song && song.time_signature) {
            const scrollTarget = isAllSectionsFullscreen
                ? document.getElementById("fullscreen-scroll-container")
                : window;

            if (!scrollTarget) return;
            const BASE_LINE_HEIGHT_PX = 160;
            const adjustedLineHeight =
                BASE_LINE_HEIGHT_PX * liveState.scrollSpeedMultiplier;
            const tempo = liveState.tempo || 120;
            const beatsPerMeasure =
                parseInt(song.time_signature.split("/")[0]) || 4;
            const secondsPerBeat = 60 / tempo;
            const beatsPerLine = beatsPerMeasure * 4;
            const secondsPerLine = secondsPerBeat * beatsPerLine;
            const pixelsPerSecond = adjustedLineHeight / secondsPerLine;
            const tickIntervalMs = 50;
            const scrollAmountPerTick =
                pixelsPerSecond * (tickIntervalMs / 1000);

            scrollIntervalRef.current = setInterval(() => {
                if (scrollTarget === window) {
                    scrollTarget.scrollBy({
                        top: scrollAmountPerTick,
                        left: 0,
                        behavior: "auto",
                    });
                } else {
                    (scrollTarget as HTMLElement).scrollTop +=
                        scrollAmountPerTick;
                }
            }, tickIntervalMs);
        }

        return () => {
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
        };
    }, [
        liveState.isAutoScrolling,
        liveState.scrollSpeedMultiplier,
        song,
        liveState.tempo,
        isAllSectionsFullscreen,
        userRole,
    ]);

    useEffect(() => {
        setLiveState((prev) => ({ ...prev, isAutoScrolling: false }));
    }, [songId]);

    useEffect(() => {
        activeSongIdRef.current = songSlug || songId || slug || id;
    }, [songSlug, songId, slug, id]);

    useEffect(() => {
        if (isOwner) {
            broadcastAutoScrollState(
                liveState.isAutoScrolling,
                liveState.scrollSpeedMultiplier,
            );
            localStorage.setItem(
                "livePreviewScrollSpeed",
                liveState.scrollSpeedMultiplier.toString(),
            );
        }
    }, [liveState.isAutoScrolling, liveState.scrollSpeedMultiplier, isOwner]);

    useEffect(() => {
        const handlePopState = () => {
            if (isAllSectionsFullscreen) {
                setIsAllSectionsFullscreen(false);
            }
        };

        if (isAllSectionsFullscreen) {
            window.history.pushState({ modalOpen: true }, "");
            window.addEventListener("popstate", handlePopState);
        }

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isAllSectionsFullscreen]);

    // Role-based functionality states

    // Share session modal state

    const lastActionTime = useRef(0);
    // const isNavigatingRef = useRef(false);
    // const lastManualNavigation = useRef(0);
    // const currentSongIdRef = useRef<string | undefined>(songId);

    // Determine the mode: setlist with slugs, setlist with IDs, or single song
    // const isSetlistMode =
    //     !!(setlistSlug || setlistId) && !!(songSlug || songId);
    const isSetlistMode = !!setlistId || !!setlistSlug;
    const isSlugBasedSetlist = !!(setlistSlug && songSlug);
    const effectiveSetlistId = setlistSlug || setlistId;
    const effectiveSongId = songSlug || songId || slug || id;

    const MAX_AVATARS_TO_SHOW = 15;
    const visibleViewers = viewers.slice(0, MAX_AVATARS_TO_SHOW);
    const remainingViewersCount = viewers.length - MAX_AVATARS_TO_SHOW;

    const getShareLinks = (title: string) => {
        const productionUrl = "https://arrangely.io";
        const currentPath = location.pathname;
        const finalUrl = `${productionUrl}${currentPath}`;

        // Tentukan Judul: Jika mode setlist, gunakan nama setlist. Jika tidak, gunakan judul lagu.
        const sessionName = isSetlistMode && setlist ? setlist.name : title;
        const sessionType = isSetlistMode ? "setlist" : "song";

        const urlEncoded = encodeURIComponent(finalUrl);
        const textEncoded = encodeURIComponent(
            `Join my live ${sessionType} session: "${sessionName}" on Arrangely!`,
        );

        return {
            whatsapp: `https://wa.me/?text=${textEncoded}%20${urlEncoded}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`,
            copy: finalUrl,
        };
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Link copied!",
            description: "Session link has been copied to your clipboard.",
        });
        // Jangan tutup drawer jika ingin user lanjut buka Instagram
    };

    // --- HELPER BARU: Ambil preview baris pertama section selanjutnya ---
    // --- HELPER BARU: Ambil preview baris pertama section selanjutnya ---
    // --- HELPER BARU: Preview dengan Presisi Spasi (Monospace) ---
    const getNextSectionPreview = (
        nextArrangement: any,
        theme: string = "default",
    ) => {
        if (!nextArrangement || !nextArrangement.section) return null;

        const nextSection = nextArrangement.section;
        const nextTitle = nextSection.name || nextSection.section_type;

        // Jika Chord Grid, return title saja
        if (theme === "chord_grid") {
            return { title: nextTitle, chords: "", lyrics: "..." };
        }

        // Gabungkan field chords & lyrics
        let rawContent = nextSection.chords || nextSection.lyrics || "";

        // Split jadi array baris
        const allLines = rawContent.split("\n");

        // Cari index baris pertama yang berisi konten (bukan baris kosong atau tag [..])
        let firstContentIndex = -1;
        for (let i = 0; i < allLines.length; i++) {
            // Kita trim HANYA untuk pengecekan isi, tapi nanti ambil raw string-nya
            const lineCheck = allLines[i].trim();
            if (lineCheck !== "" && !lineCheck.startsWith("[")) {
                firstContentIndex = i;
                break;
            }
        }

        if (firstContentIndex === -1) {
            return { title: nextTitle, chords: "", lyrics: "(Instrumental)" };
        }

        let chordsLine = "";
        let lyricsLine = "";

        // Ambil baris mentah (raw) agar spasi di depan terjaga
        const firstLineRaw = allLines[firstContentIndex].replace(/\r/g, "");
        const isFirstLineChord = isChordLine(firstLineRaw);

        // LOGIKA:
        // Jika baris ini Chord, ambil baris ini sbg Chord, dan baris berikutnya sbg Lirik
        if (isFirstLineChord) {
            chordsLine = firstLineRaw;

            // Cek baris berikutnya untuk lirik
            if (firstContentIndex + 1 < allLines.length) {
                lyricsLine = allLines[firstContentIndex + 1].replace(/\r/g, "");
            }
        } else {
            // Jika baris pertama bukan chord, anggap itu lirik, chord kosong
            lyricsLine = firstLineRaw;
        }

        return { title: nextTitle, chords: chordsLine, lyrics: lyricsLine };
    };

    // Role selection handler
    const handleRoleSelect = async (role: UserRole) => {
        setUserRole(role);

        // Update presence with role information
        if (channel) {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("display_name, avatar_url")
                    .eq("user_id", user.id)
                    .single();

                await channel.track({
                    user_id: user.id,
                    name:
                        profileData?.display_name ||
                        user.email?.split("@")[0] ||
                        "Anonymous",
                    avatar_url: profileData?.avatar_url,
                    role: role,
                    isOwner: isOwner,
                    online_at: new Date().toISOString(),
                });
            }
        }
    };

    // Auto-set role for chord grid songs
    useEffect(() => {
        if (song && song.theme === "chord_grid" && !userRole && !isOwner) {
            // Auto-set as vocalist for chord grid songs if no role is selected
            setUserRole("vocalist");

            // Update presence with auto-set role
            if (channel) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        supabase
                            .from("profiles")
                            .select("display_name, avatar_url")
                            .eq("user_id", user.id)
                            .single()
                            .then(({ data: profileData }) => {
                                channel.track({
                                    user_id: user.id,
                                    name:
                                        profileData?.display_name ||
                                        user.email?.split("@")[0] ||
                                        "Anonymous",
                                    avatar_url: profileData?.avatar_url,
                                    role: "vocalist",
                                    isOwner: isOwner,
                                    online_at: new Date().toISOString(),
                                });
                            });
                    }
                });
            }
        }
    }, [song, userRole, isOwner, channel]);

    // Handle transpose
    const handleTranspose = () => {
        setShowTransposeModal(true);
    };

    const handleTransposeApply = async (
        newKey: string,
        preferSharps: boolean,
    ) => {
        if (!song) return;

        const oldKey = song.current_key;

        const updatedSong = { ...song, current_key: newKey };

        // Symbols to ignore during transposition, including rests and simile marks
        const ignoreSymbols = ["WR", "HR", "QR", "ER", "%", "//", "/."];

        // Helper function to handle transposition, aware of chord_grid JSON format
        const transposeContent = (content: string | null | undefined) => {
            if (!content) return content;

            // Check if the section uses the chord_grid theme and content is likely JSON
            if (
                song.theme === "chord_grid" &&
                content.trim().startsWith("[") &&
                content.trim().endsWith("]")
            ) {
                try {
                    const chordData = JSON.parse(content);
                    // Handle both {"bars": [...]} and [...] formats
                    const bars = chordData.bars || chordData;

                    const transposedBars = bars.map((bar: any) => {
                        if (bar.chord && typeof bar.chord === "string") {
                            const beats = bar.chord.split(" ");
                            const transposedBeats = beats.map(
                                (beat: string) => {
                                    // Only transpose if it's not an ignored symbol
                                    if (
                                        beat &&
                                        !ignoreSymbols.includes(beat.trim())
                                    ) {
                                        return transposeText(
                                            beat,
                                            oldKey,
                                            newKey,
                                            preferSharps,
                                        );
                                    }
                                    return beat; // Return the symbol as is
                                },
                            );
                            return { ...bar, chord: transposedBeats.join(" ") };
                        }
                        return bar;
                    });

                    // Reconstruct the original data structure before stringifying
                    const newChordData = Array.isArray(chordData)
                        ? transposedBars
                        : { ...chordData, bars: transposedBars };

                    return JSON.stringify(newChordData);
                } catch (e) {
                    console.error(
                        "Failed to parse/transpose chord_grid JSON, falling back to text transpose:",
                        e,
                        content,
                    );
                    // Fallback for safety
                    return transposeText(content, oldKey, newKey, preferSharps);
                }
            } else {
                // For standard text (chord-over-lyrics), transpose the whole string
                return transposeText(content, oldKey, newKey, preferSharps);
            }
        };

        if (song.sections) {
            updatedSong.sections = song.sections.map((section) => {
                const transposedSection = { ...section };

                // Apply the new aware transposition to both fields
                transposedSection.chords = transposeContent(section.chords);
                if (section.lyrics && song.theme !== "chord_grid") {
                    transposedSection.lyrics = section.lyrics
                        .split("\n")
                        .map((line) => {
                            // Hanya transpose baris yang diidentifikasi sebagai baris chord
                            if (isChordLine(line)) {
                                return transposeText(
                                    line,
                                    oldKey,
                                    newKey,
                                    preferSharps,
                                );
                            }
                            // Biarkan baris lirik tidak tersentuh
                            return line;
                        })
                        .join("\n");
                } else {
                    // Untuk chord_grid atau jika lirik kosong, gunakan logika lama
                    transposedSection.lyrics = transposeContent(section.lyrics);
                }

                return transposedSection;
            });
        }

        if (updatedSong.sections && song.arrangements) {
            updatedSong.arrangements = song.arrangements.map((arrangement) => {
                // Cari section yang sudah ditranspose dari array updatedSong.sections
                const updatedSection = updatedSong.sections.find(
                    (s) => s.id === arrangement.section.id,
                );

                // Kembalikan arrangement baru dengan section yang sudah diperbarui
                return {
                    ...arrangement,
                    section: updatedSection || arrangement.section, // Fallback jika tidak ditemukan
                };
            });
        }

        setSong(updatedSong);

        // Save transpose changes to database (songs table)
        try {
            const { error: songError } = await supabase
                .from("songs")
                .update({
                    current_key: newKey,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", song.id);

            if (songError) {
                console.error("Error saving transpose to songs:", songError);
            }

            // Update song sections in database
            if (song.sections && updatedSong.sections) {
                for (let i = 0; i < updatedSong.sections.length; i++) {
                    const section = updatedSong.sections[i];
                    if (section.id) {
                        const { error: sectionError } = await supabase
                            .from("song_sections")
                            .update({
                                chords: section.chords,
                                lyrics: section.lyrics,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", section.id);

                        if (sectionError) {
                            console.error(
                                "Error saving section transpose:",
                                sectionError,
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error saving transpose to database:", error);
        }

        // Broadcast transpose change to other users via realtime
        if (channel && isOwner) {
            channel.send({
                type: "broadcast",
                event: "transpose_change",
                payload: {
                    newKey,
                    preferSharps,
                    oldKey,
                    sections: updatedSong.sections,
                    timestamp: Date.now(),
                },
            });
        }

        setShowTransposeModal(false);

        toast({
            title: "Transposed Successfully",
            description: `Song transposed from ${oldKey} to ${newKey}`,
            duration: 2000,
        });
    };

    useEffect(() => {
        viewingModeRef.current = viewingMode;
    }, [viewingMode]);

    useEffect(() => {
        if (setlistId) {
            try {
                const key = `completedSongs-${setlistId}`;
                const completedArray = Array.from(completedSongs);
                localStorage.setItem(key, JSON.stringify(completedArray));
            } catch (error) {
                console.error(
                    "Failed to save completed songs to localStorage",
                    error,
                );
            }
        }
    }, [completedSongs, setlistId]);

    useEffect(() => {
        liveStateRef.current = liveState;
    }, [liveState]);

    useEffect(() => {
        songRef.current = song;
    }, [song]);

    // useEffect(() => {
    //     currentSongIdRef.current = songId;
    // }, [songId]);

    // Offline data loading from SQLite
    useEffect(() => {
        if (!isOfflineMode || !setlistId) return;

        const loadOfflineData = async () => {
            setLoading(true);

            try {
                const initialized = await offlineDatabase.initialize();
                if (!initialized) {
                    toast({
                        title: "Offline Mode Unavailable",
                        description:
                            "SQLite is only available on native platforms.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }

                const fullData = await offlineDatabase.getFullSetlistData(
                    setlistId,
                );
                if (!fullData) {
                    toast({
                        title: "Setlist Not Found",
                        description:
                            "This setlist has not been downloaded for offline use.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }

                // Transform songs to match the expected format
                const transformedSongs: Song[] = fullData.songs.map(
                    (s: any) => ({
                        id: s.id,
                        title: s.title,
                        artist: s.artist,
                        current_key: s.key,
                        tempo: s.bpm,
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
                    }),
                );

                const offlineSetlist: Setlist = {
                    id: fullData.setlist.id,
                    name: fullData.setlist.name,
                    date: fullData.setlist.date,
                    theme: fullData.setlist.theme || "",
                    songs: transformedSongs,
                    created_at:
                        (fullData.setlist as any).created_at ||
                        new Date().toISOString(),
                };

                setSetlist(offlineSetlist);
                setIsOwner(true); // In offline mode, treat as owner/MD

                // Set initial song
                const effectiveSongIdToUse = songId || songSlug;

                // Start as MD (Music Director) for local broadcasting (prefer Bluetooth on native)
                const initialSongIndex = effectiveSongIdToUse
                    ? transformedSongs.findIndex(
                          (s) => s.id === effectiveSongIdToUse,
                      )
                    : 0;
                const effectiveIndex =
                    initialSongIndex >= 0 ? initialSongIndex : 0;

                // Initialize local network sync for offline broadcasting
                const initialState = {
                    setlistId: setlistId || "",
                    currentSongIndex: effectiveIndex,
                    currentSongId: transformedSongs[effectiveIndex]?.id,
                    currentSectionIndex: 0,
                    currentBar: 0,
                    transpose: 0,
                    isPlaying: false,
                    timestamp: Date.now(),
                };

                let started = false;
                if (Capacitor.isNativePlatform()) {
                    try {
                        // BLE functionality disabled - package not installed
                        // Skip Bluetooth check since BLE plugin is not available

                        started = await localNetworkSync.startAsMDBluetooth(
                            initialState,
                        );
                        if (!started) {
                            toast({
                                title: "Bluetooth not available",
                                description:
                                    "Please turn on Bluetooth to share offline. Falling back to local channel.",
                                variant: "destructive",
                            });
                        }
                    } catch (err) {
                        console.error(
                            "[LivePreview] Failed to start BLE MD mode:",
                            err,
                        );
                        toast({
                            title: "Enable Bluetooth",
                            description:
                                "Turn on Bluetooth to broadcast this offline session. Using fallback channel for now.",
                            variant: "destructive",
                        });
                    }
                }
                if (!started) {
                    await localNetworkSync.startAsMD(initialState);
                }

                if (effectiveSongIdToUse) {
                    const songIndex = transformedSongs.findIndex(
                        (s) => s.id === effectiveSongIdToUse,
                    );
                    if (songIndex >= 0) {
                        setCurrentSongIndex(songIndex);
                        setSong(transformedSongs[songIndex]);
                        setLiveState((prev) => ({
                            ...prev,
                            tempo: transformedSongs[songIndex].tempo || 120,
                            currentArrangementId:
                                transformedSongs[songIndex].arrangements?.[0]
                                    ?.id || null,
                            currentSectionId:
                                transformedSongs[songIndex].arrangements?.[0]
                                    ?.section?.id || null,
                        }));
                    }
                } else if (transformedSongs.length > 0) {
                    setSong(transformedSongs[0]);
                    setLiveState((prev) => ({
                        ...prev,
                        tempo: transformedSongs[0].tempo || 120,
                        currentArrangementId:
                            transformedSongs[0].arrangements?.[0]?.id || null,
                        currentSectionId:
                            transformedSongs[0].arrangements?.[0]?.section
                                ?.id || null,
                    }));
                }
            } catch (error) {
                console.error(
                    "[LivePreview] Error loading offline data:",
                    error,
                );
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setlistId, songId, songSlug, isOfflineMode, toast]);

    // Listen for offline broadcast messages (for clients connecting to MD)
    useEffect(() => {
        if (!isOfflineMode) return;

        const unsubscribe = localNetworkSync.onMessage((message) => {
            console.log(
                "[LivePreview] Received offline broadcast:",
                message.type,
                message.payload,
            );

            if (
                message.type === "section_change" &&
                message.payload.currentSectionIndex !== undefined
            ) {
                // Update to new section based on index
                const arrangements = song?.arrangements || [];
                const sortedArrangements = [...arrangements].sort(
                    (a, b) => a.position - b.position,
                );
                const newIndex = message.payload.currentSectionIndex;

                if (newIndex >= 0 && newIndex < sortedArrangements.length) {
                    const newArrangement = sortedArrangements[newIndex];
                    setLiveState((prev) => ({
                        ...prev,
                        currentSectionId: newArrangement.section.id,
                        currentArrangementId: newArrangement.id,
                        showAllSections: false,
                    }));
                }
            }

            if (
                message.type === "song_change" &&
                message.payload.currentSongIndex !== undefined
            ) {
                const songs = setlist?.songs || [];
                const newSongIndex = message.payload.currentSongIndex;
                if (
                    songs.length > 0 &&
                    newSongIndex >= 0 &&
                    newSongIndex < songs.length
                ) {
                    const newSong = songs[newSongIndex];
                    setSong(newSong);
                    setCurrentSongIndex(newSongIndex);
                    setLiveState((prev) => ({
                        ...prev,
                        tempo: newSong.tempo || 120,
                        currentArrangementId:
                            newSong.arrangements?.[0]?.id || null,
                        currentSectionId:
                            newSong.arrangements?.[0]?.section?.id || null,
                    }));
                    // Navigate to new song
                    navigate(`/offline-live/${setlistId}/${newSong.id}`);
                }
            }
        });

        return () => {
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isOfflineMode,
        song?.arrangements,
        setlist?.songs,
        setlistId,
        navigate,
    ]);

    // Cleanup livePerformance on unmount
    useEffect(() => {
        return () => {
            if (isOfflineMode) {
                localNetworkSync.disconnect();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOfflineMode]);

    useEffect(() => {
        if (isOfflineMode) return; // Skip in offline mode

        const controller = new AbortController();

        const loadSetlistData = async () => {
            if (isSetlistMode && setlistId) {
                try {
                    const { data: setlistData, error: setlistError } =
                        await supabase
                            .from("setlists")
                            .select("*")
                            .eq("id", setlistId)
                            .abortSignal(controller.signal)
                            .single();
                    if (setlistError) throw setlistError;
                    if (!setlistData) throw new Error("Setlist not found");

                    const { data: songsData, error: songsError } =
                        await supabase
                            .from("songs")
                            .select(
                                "id, title, artist, current_key, tempo, user_id, youtube_link",
                            )
                            .in("id", setlistData.song_ids)
                            .abortSignal(controller.signal);
                    if (songsError) throw songsError;

                    const finalSongs = setlistData.song_ids
                        .map((sId) => songsData?.find((s) => s.id === sId))
                        .filter(Boolean);
                    const loadedSetlist: Setlist = {
                        id: setlistData.id,
                        name: setlistData.name,
                        date: setlistData.date,
                        theme: setlistData.theme || "",
                        songs: finalSongs as Song[],
                        created_at: setlistData.created_at,
                    };

                    setSetlist(loadedSetlist);
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user && finalSongs.some((s) => s.user_id === user.id)) {
                        setIsOwner(true);
                    } else {
                        setIsOwner(false);
                        setViewingMode("setlist");
                        // Show role selection modal for non-owners
                        if (!userRole) {
                            setShowRoleModal(true);
                        }
                    }
                } catch (error) {
                    if (error.name !== "AbortError") {
                        console.error("Failed to load setlist data:", error);
                        toast({
                            title: "Error",
                            description: "Could not load the setlist.",
                            variant: "destructive",
                        });
                    }
                }
            }
        };

        loadSetlistData();
        return () => {
            controller.abort();
        };
    }, [setlistId, isSetlistMode, isOfflineMode]);

    // Online song data loading (skip in offline mode)
    useEffect(() => {
        if (isOfflineMode) return; // Skip in offline mode - data already loaded from SQLite

        // setShowAllSections(false);
        const controller = new AbortController();
        const songIdToLoad = isSetlistMode ? effectiveSongId : slug || id;

        const loadSongData = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to view this live session.",
                    variant: "destructive",
                });
                storeIntendedUrl(window.location.href);
                navigate("/auth");
                return;
            }

            if (!songIdToLoad) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setSong(null);

            try {
                let query = supabase
                    .from("songs")
                    .select(
                        `*, sections:song_sections(*), arrangements(id, position, repeat_count, notes, section:song_sections(*))`,
                    );

                // Query by slug first, then fallback to ID
                if (songSlug || (slug && !isSetlistMode)) {
                    query = query.eq("slug", songSlug || slug);
                } else {
                    query = query.eq("id", songIdToLoad);
                }

                const { data: songData, error: songError } = await query
                    .abortSignal(controller.signal)
                    .single();

                if (songError) throw songError;
                if (!songData) throw new Error("Song not found");

                if (user && songData.user_id === user.id) {
                    setIsOwner(true);
                } else {
                    setIsOwner(false);
                    // Show role selection modal for non-owners
                    if (!userRole) {
                        setShowRoleModal(true);
                    }
                }

                setSong(songData);
                setLiveState((prev) => ({
                    ...prev,
                    tempo: songData.tempo || 120,
                    currentSectionId:
                        songData.arrangements?.[0]?.section?.id || null,
                    currentArrangementId:
                        songData.arrangements?.[0]?.id ||
                        songData.sections?.[0]?.id ||
                        null,
                }));

                // if (channel) supabase.removeChannel(channel);
                setupRealtimeChannel(songIdToLoad);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Failed to fetch song:", error);
                    setSong(null);
                }
            } finally {
                setLoading(false);
            }
        };

        // loadSongData();
        const timeoutId = setTimeout(() => {
            loadSongData();
        }, 200);
        return () => {
            clearTimeout(timeoutId);
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            controller.abort();
            if (channel) {
                supabase.removeChannel(channel);
                setChannel(null);
            }
            if (sequencerChannel) {
                supabase.removeChannel(sequencerChannel);
                setSequencerChannel(null);
            }
        };
    }, [songId, id, isSetlistMode, isOfflineMode]);

    const loadSetlist = async () => {
        try {
            // Try to get setlist data - use a more permissive approach
            const { data: setlistData, error } = await supabase
                .from("setlists")
                .select("*")
                .eq("id", setlistId!)
                .single();

            if (error) {
                console.error("Error loading setlist:", error);
                toast({
                    title: "Error",
                    description:
                        "Unable to load setlist data. Please check your access permissions.",
                    variant: "destructive",
                });
                return;
            }

            if (!setlistData) {
                console.error("No setlist data found for ID:", setlistId);
                return;
            }

            // Get songs for this setlist with more permissive query
            const setlistSongs: any[] = [];
            if (setlistData.song_ids && setlistData.song_ids.length > 0) {
                // Use a more permissive query that should work for invited viewers
                const { data: songsData, error: songsError } = await supabase
                    .from("songs")
                    .select(
                        `
                                    id,
                                    title,
                                    artist,
                                    current_key,
                                    tempo,
                                    time_signature,
                                    capo,
                                    user_id
                                `,
                    )
                    .in("id", setlistData.song_ids);

                if (songsError) {
                    console.error("Error loading songs:", songsError);
                    toast({
                        title: "Warning",
                        description:
                            "Some songs could not be loaded. You may have limited access to certain songs.",
                        variant: "default",
                    });
                }

                if (songsData && songsData.length > 0) {
                    // Maintain the order from song_ids array
                    setlistData.song_ids.forEach((songId: string) => {
                        const song = songsData.find((s) => s.id === songId);
                        if (song) {
                            setlistSongs.push(song);
                        }
                    });
                } else {
                    console.warn("No songs data found or accessible");
                }
            }

            const loadedSetlist: Setlist = {
                id: setlistData.id,
                name: setlistData.name,
                date: setlistData.date,
                theme: setlistData.theme || "",
                songs: setlistSongs,
                created_at: setlistData.created_at,
            };

            setSetlist(loadedSetlist);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user && loadedSetlist.songs.length > 0) {
                const ownsAnySetlistSong = loadedSetlist.songs.some(
                    (song) => song.user_id === user.id,
                );
                if (ownsAnySetlistSong) {
                    setIsOwner(true);
                } else {
                    // Show role selection modal for non-owners
                    if (!userRole) {
                        setShowRoleModal(true);
                    }
                }
            }

            // Set current song index based on the songId parameter
            if (songId && setlistSongs.length > 0) {
                const songIndex = setlistSongs.findIndex(
                    (s) => s.id === songId,
                );
                if (songIndex >= 0) {
                    setCurrentSongIndex(songIndex);
                }
            }
        } catch (error) {
            console.error("Unexpected error loading setlist:", error);
            toast({
                title: "Error",
                description:
                    "An unexpected error occurred while loading the setlist.",
                variant: "destructive",
            });
        }
    };
    // const fetchSong = async (songIdParam: string) => {
    //     try {
    //         const {
    //             data: { user },
    //         } = await supabase.auth.getUser();

    //         // Check if user is authenticated
    //         if (!user) {
    //             // Simpan URL yang diminta sebelum redirect
    //             storeIntendedUrl(window.location.href);
    //             console.log(
    //                 "[Guard] Stored intended URL:",
    //                 window.location.href
    //             );

    //             toast({
    //                 title: "Authentication Required",
    //                 description: "Please log in to view this live preview.",
    //                 variant: "destructive",
    //             });

    //             navigate("/auth");
    //             return;
    //         }

    //         // For live preview access, we use a more permissive query that should work for all authenticated users
    //         // This handles both individual song previews and setlist navigation
    //         const { data, error } = await supabase
    //             .from("songs")
    //             .select(
    //                 `
    //       *,
    //       sections:song_sections(*),
    //       arrangements(
    //         id,
    //         position,
    //         repeat_count,
    //         notes,
    //         section:song_sections(id, section_type, name)
    //       )
    //     `
    //             )
    //             .eq("id", songIdParam)
    //             .single();

    //         if (error) {
    //             console.error("Error fetching song for live preview:", error);
    //
    //
    //             toast({
    //                 title: "Error",
    //                 description: `Unable to access song for live preview. ${error.message}`,
    //                 variant: "destructive",
    //             });
    //             return;
    //         }

    //         if (!data) {
    //             toast({
    //                 title: "Error",
    //                 description: "Song not found.",
    //                 variant: "destructive",
    //             });
    //             return;
    //         }

    //         setSong(data);

    //         // Check ownership - compare with both song owner and setlist owner
    //         const isSongOwner = user?.id === data.user_id;

    //         // For setlist mode, we need to check if user owns the setlist
    //         // Since setlist interface doesn't have user_id, use a different approach
    //         let ownershipStatus = isSongOwner; // Default to song ownership

    //         if (isSetlistMode && setlist) {
    //             // In setlist mode, check if any song in setlist belongs to current user
    //             // This is a reasonable assumption for setlist ownership
    //             ownershipStatus =
    //                 setlist.songs?.some((song) => song.user_id === user?.id) ||
    //                 false;
    //         }

    //         setIsOwner(ownershipStatus);
    //         setLiveState((prev) => ({
    //             ...prev,
    //             tempo: data.tempo || 120,
    //             currentSectionId: data.arrangements?.[0]?.section?.id,
    //             currentArrangementId:
    //                 data.arrangements?.[0]?.id ||
    //                 data.sections?.[0]?.id ||
    //                 null,
    //         }));
    //     } catch (error) {
    //         console.error("Error:", error);
    //         toast({
    //             title: "Error",
    //             description: "Failed to load song for live preview.",
    //             variant: "destructive",
    //         });
    //     } finally {
    //         setLoading(false);
    //     }
    // };
    const setupRealtimeChannel = (songIdParam: string) => {
        const channelId = isSetlistMode
            ? `setlist-performance-${setlistId}`
            : `live-preview-${songIdParam}`;
        console.log(
            "[LivePreview] Setting up realtime channel:",
            channelId,
            "isSetlistMode:",
            isSetlistMode,
        );
        const realtimeChannel = supabase
            .channel(channelId, {
                // <-- Tambahkan parameter kedua di sini
                config: {
                    broadcast: {
                        self: false, // <-- Ini bagian terpenting
                    },
                },
            })
            .on(
                "presence",
                {
                    event: "sync",
                },
                () => {
                    const presenceState = realtimeChannel.presenceState();
                    const viewerCount = Object.keys(presenceState).length;

                    // Update viewers list with role information
                    const viewersList = Object.values(presenceState)
                        .flat()
                        .map((presence: any) => ({
                            id: presence.user_id,
                            name: presence.name || "Anonymous",
                            avatar_url: presence.avatar_url,
                            role: presence.role,
                            isOwner: presence.isOwner || false,
                        }));

                    setViewers(viewersList);
                    setLiveState((prev) => ({
                        ...prev,
                        viewerCount: viewerCount,
                    }));
                },
            )
            .on(
                "presence",
                {
                    event: "join",
                },
                ({ newPresences }) => {},
            )
            .on(
                "presence",
                {
                    event: "leave",
                },
                ({ leftPresences }) => {},
            )
            .on(
                "broadcast",
                { event: "show_all_sections_change" },
                ({ payload }) => {
                    // Hanya update jika user dalam mode "live"
                    if (viewingModeRef.current === "live") {
                        setLiveState((prev) => ({
                            ...prev,
                            showAllSections: payload.showAllSections,
                        }));
                    }
                },
            )
            .on("broadcast", { event: "section-change" }, ({ payload }) => {
                console.log(
                    "%c📩 RECEIVED BROADCAST: section-change",
                    "color:#4ade80;font-weight:bold",
                );

                // Hanya update jika user dalam mode "live"
                if (viewingModeRef.current === "live") {
                    setLiveState((prev) => ({
                        ...prev,
                        currentSectionId: payload.sectionId,
                        currentArrangementId: payload.arrangementId,
                        isPlaying: payload.isPlaying,
                        showAllSections: payload.showAllSections,
                    }));
                }
            })

            .on("broadcast", { event: "auto_scroll_change" }, ({ payload }) => {
                // Hanya viewer dalam mode 'live' yang mengikuti
                if (viewingModeRef.current === "live") {
                    setLiveState((prev) => ({
                        ...prev,
                        isAutoScrolling: payload.isScrolling,
                        scrollSpeedMultiplier: payload.scrollSpeed,
                    }));
                }
            })
            .on("broadcast", { event: "tempo-change" }, ({ payload }) => {
                // Hanya update jika user dalam mode "live"
                if (viewingModeRef.current === "live") {
                    setLiveState((prev) => ({
                        ...prev,
                        tempo: payload.tempo,
                    }));
                }
            })
            .on("broadcast", { event: "transpose_change" }, ({ payload }) => {
                // Hanya update jika user dalam mode "live" dan bukan owner
                if (viewingModeRef.current === "live" && !isOwner) {
                    setSong((prevSong) => {
                        if (!prevSong) return prevSong;
                        return {
                            ...prevSong,
                            current_key: payload.newKey,
                            sections: payload.sections,
                        };
                    });

                    toast({
                        title: "Song Transposed",
                        description: `Song transposed from ${payload.oldKey} to ${payload.newKey}`,
                        duration: 2000,
                    });
                }
            })
            .on("broadcast", { event: "song-change" }, ({ payload }) => {
                const currentId = activeSongIdRef.current;
                console.log(
                    "[LivePreview] Current song ID:",
                    currentId,
                    "New song ID:",
                    payload.songId,
                    "Mode:",
                    viewingModeRef.current,
                );
                // Hanya navigasi jika user dalam mode "live"
                if (
                    isSetlistMode &&
                    payload.songId !== currentId &&
                    viewingModeRef.current === "live"
                ) {
                    navigate(
                        `/setlist-performance/${setlistId}/${payload.songId}`,
                    );
                }
            })
            .on("broadcast", { event: "setlist-sync" }, ({ payload }) => {
                // Hanya lakukan sinkronisasi penuh jika user dalam mode "live"
                if (isSetlistMode && viewingModeRef.current === "live") {
                    setLiveState((prev) => ({
                        ...prev,
                        currentSectionId: payload.sectionId,
                        currentArrangementId: payload.arrangementId,
                        isPlaying: payload.isPlaying,
                        tempo: payload.tempo,
                    }));
                    setCurrentSongIndex(payload.currentSongIndex || 0);
                    if (
                        payload.activeSongId &&
                        payload.activeSongId !== songId
                    ) {
                        navigate(
                            `/setlist-performance/${setlistId}/${payload.activeSongId}`,
                        );
                    }
                }
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    // Track user presence with role information
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                        // Get user profile data for name and avatar
                        const { data: profileData } = await supabase
                            .from("profiles")
                            .select("display_name, avatar_url")
                            .eq("user_id", user.id)
                            .single();

                        await realtimeChannel.track({
                            user_id: user.id,
                            name:
                                profileData?.display_name ||
                                user.email?.split("@")[0] ||
                                "Anonymous",
                            avatar_url: profileData?.avatar_url,
                            role: userRole,
                            isOwner: isOwner,
                            online_at: new Date().toISOString(),
                        });
                    }

                    // If owner in setlist mode, broadcast current state to sync new viewers
                    if (isOwner && isSetlistMode) {
                        if (syncTimeoutRef.current) {
                            clearTimeout(syncTimeoutRef.current);
                        }
                        setTimeout(() => {
                            broadcastSetlistSync();
                        }, 1000);
                    }
                }
            });
        setChannel(realtimeChannel);
    };

    // Setup sequencer channel listener
    const setupSequencerChannel = (sequencerFileId: string) => {
        // Clean up existing channel if any
        if (sequencerChannel) {
            supabase.removeChannel(sequencerChannel);
        }

        const seqChannel = supabase
            .channel(`sequencer_${sequencerFileId}`)
            .on("broadcast", { event: "section_change" }, ({ payload }) => {
                // Handle the section change broadcast from Electron sequencer
                // Update UI or state as needed
                toast({
                    title: "Sequencer Section Changed",
                    description: `Now playing: ${payload.section_name}`,
                });

                // You can add additional logic here to:
                // - Highlight the current section in the UI
                // - Auto-scroll to the section
                // - Update any section-related state
            })
            .subscribe((status) => {});

        setSequencerChannel(seqChannel);
    };

    // Fetch sequencer file for the current song
    useEffect(() => {
        if (!song?.id) return;

        const fetchSequencerFile = async () => {
            try {
                const { data, error } = await supabase
                    .from("sequencer_files")
                    .select("id")
                    .eq("song_id", song.id)
                    .eq("is_production", true)
                    .maybeSingle();

                if (error) {
                    console.error("Error fetching sequencer file:", error);
                    return;
                }

                if (data) {
                    setSequencerId(data.id);
                    setupSequencerChannel(data.id);
                } else {
                    // No sequencer file for this song
                    setSequencerId(null);
                    if (sequencerChannel) {
                        supabase.removeChannel(sequencerChannel);
                        setSequencerChannel(null);
                    }
                }
            } catch (error) {
                console.error("Error in fetchSequencerFile:", error);
            }
        };

        fetchSequencerFile();

        return () => {
            if (sequencerChannel) {
                supabase.removeChannel(sequencerChannel);
                setSequencerChannel(null);
            }
        };
    }, [song?.id]);

    const broadcastAutoScrollState = (scrolling: boolean, speed: number) => {
        if (channel && isOwner) {
            channel.send({
                type: "broadcast",
                event: "auto_scroll_change",
                payload: { isScrolling: scrolling, scrollSpeed: speed },
            });
        }
    };

    const broadcastShowAllSections = (showAll: boolean) => {
        if (channel && isOwner) {
            channel.send({
                type: "broadcast",
                event: "show_all_sections_change",
                payload: { showAllSections: showAll },
            });
            setLiveState((prev) => ({ ...prev, showAllSections: showAll }));
        }
    };

    const broadcastSectionChange = (
        arrangementId: string,
        sectionId: string,
        playing: boolean,
    ) => {
        if (channel && isOwner) {
            channel.send({
                type: "broadcast",
                event: "section-change",
                payload: {
                    sectionId,
                    arrangementId,
                    isPlaying: playing,
                    songId: activeSongIdRef.current,
                    setlistId: isSetlistMode ? setlistId : null,
                    showAllSections: false,
                    // The broadcast payload could also include this, though it's not strictly necessary if the listener handles it.
                },
            });
            setLiveState((prev) => ({
                ...prev,
                currentSectionId: sectionId,
                currentArrangementId: arrangementId,
                isPlaying: playing,
                showAllSections: false, // <-- ADD THIS LINE
            }));
        }
    };
    const broadcastTempoChange = (newTempo: number) => {
        if (channel && isOwner) {
            channel.send({
                type: "broadcast",
                event: "tempo-change",
                payload: {
                    tempo: newTempo,
                    songId: activeSongIdRef.current, // Include current song ID
                    setlistId: isSetlistMode ? setlistId : null,
                },
            });
            setLiveState((prev) => ({
                ...prev,
                tempo: newTempo,
            }));
        }
    };

    const changeSection = useCallback(
        (direction: "next" | "previous") => {
            if (!isOwner && !isOfflineMode) return;

            const currentSong = songRef.current;
            const currentLiveState = liveStateRef.current;

            const sortedArrangements =
                currentSong?.arrangements?.sort(
                    (a, b) => a.position - b.position,
                ) || [];
            if (sortedArrangements.length === 0) return;

            const currentIndex = sortedArrangements.findIndex(
                (arr) => arr.id === currentLiveState.currentArrangementId,
            );

            if (currentIndex === -1) {
                console.warn(
                    "Current section not found in arrangements.",
                    "arrangementId: ",
                    currentLiveState.currentArrangementId,
                    "sorted:",
                    sortedArrangements,
                );
                return;
            }

            const newIndex =
                direction === "next" ? currentIndex + 1 : currentIndex - 1;

            if (newIndex >= 0 && newIndex < sortedArrangements.length) {
                const newArrangement = sortedArrangements[newIndex];
                const newArrangementId = newArrangement.id;
                const newArrangementName =
                    newArrangement.section.name || "Unnamed Section";

                // In offline mode, update local state and broadcast via local server (use singleton directly)
                if (isOfflineMode) {
                    setLiveState((prev) => ({
                        ...prev,
                        currentSectionId: newArrangement.section.id,
                        currentArrangementId: newArrangementId,
                        showAllSections: false,
                    }));
                    // Broadcast to connected clients via local network using singleton directly
                    localNetworkSync.changeSection(newIndex);
                } else {
                    broadcastSectionChange(
                        newArrangementId,
                        newArrangement.section.id,
                        currentLiveState.isPlaying,
                    );
                }
                toast({
                    title:
                        direction === "next"
                            ? "Next Section"
                            : "Previous Section",
                    description: `Moved to ${newArrangementName}.`,
                    duration: 500,
                });
            } else {
                toast({
                    title:
                        direction === "next"
                            ? "End of Song"
                            : "Beginning of Song",
                    description: `You are at the ${
                        direction === "next" ? "last" : "first"
                    } section.`,
                    variant: "default",
                });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isOwner, isOfflineMode, toast, broadcastSectionChange],
    );

    const changeSong = (direction: "next" | "previous") => {
        if (!setlistSongs || setlistSongs.length === 0) return;

        const effectiveSongIdForNav = songId || songSlug || effectiveSongId;
        const currentIndex = setlistSongs.findIndex(
            (song) => song.id === effectiveSongIdForNav,
        );
        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        if (direction === "next" && currentIndex < setlistSongs.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === "previous" && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }

        // Kalau index berubah, navigasi ke lagu baru
        if (newIndex !== currentIndex) {
            const newSongId = setlistSongs[newIndex].id;
            const newSong = setlistSongs[newIndex];

            // In offline mode, update local state, broadcast via local server, and navigate
            if (isOfflineMode) {
                setSong(newSong);
                setCurrentSongIndex(newIndex);
                setLiveState((prev) => ({
                    ...prev,
                    tempo: newSong.tempo || 120,
                    currentArrangementId: newSong.arrangements?.[0]?.id || null,
                    currentSectionId:
                        newSong.arrangements?.[0]?.section?.id || null,
                }));
                // Broadcast to connected clients via local network using singleton directly
                localNetworkSync.changeSong(newIndex);
                navigate(`/offline-live/${setlistId}/${newSongId}`);
                return;
            }

            // Jika owner, broadcast perubahan song
            if (isOwner && channel) {
                channel.send({
                    type: "broadcast",
                    event: "song-change",
                    payload: {
                        songId: newSongId,
                        songIndex: newIndex,
                        setlistId: setlistId,
                    },
                });
            }

            // Navigasi ke halaman song baru
            setTimeout(() => {
                navigate(`/setlist-performance/${setlistId}/${newSongId}`);
            }, 150);
        }
    };
    const changeIndependentSection = useCallback(
        (direction: "next" | "previous") => {
            // Fungsi ini hanya untuk non-owner di setlist mode
            if (isOwner || viewingModeRef.current !== "setlist") return;

            const currentSong = songRef.current;
            if (!currentSong?.arrangements) return;

            const sortedArrangements = currentSong.arrangements.sort(
                (a, b) => a.position - b.position,
            );
            if (sortedArrangements.length === 0) return;

            // Tentukan section ID yang aktif saat ini (bisa dari state live atau independent)
            const currentActiveArrangementId = independentSection
                ? sortedArrangements.find(
                      (arr) => arr.section.id === independentSection,
                  )?.id
                : liveStateRef.current.currentArrangementId;

            let currentIndex = sortedArrangements.findIndex(
                (arr) => arr.id === currentActiveArrangementId,
            );

            // Jika tidak ketemu atau state independentSection belum diset, mulai dari awal/akhir
            if (currentIndex === -1) {
                currentIndex =
                    direction === "next" ? -1 : sortedArrangements.length;
            }

            const newIndex =
                direction === "next" ? currentIndex + 1 : currentIndex - 1;

            if (newIndex >= 0 && newIndex < sortedArrangements.length) {
                const newArrangement = sortedArrangements[newIndex];
                // Update state independentSection secara lokal
                setIndependentSection(newArrangement.section.id);

                // Optional: Beri feedback ke user
                toast({
                    title:
                        direction === "next"
                            ? "Next Section (Local)"
                            : "Previous Section (Local)",
                    description: `Browsing to ${
                        newArrangement.section.name ||
                        newArrangement.section.section_type
                    }.`,
                    duration: 500,
                });
            } else {
                // Optional: Beri feedback jika sudah di ujung
                toast({
                    title:
                        direction === "next"
                            ? "End of Song"
                            : "Beginning of Song",
                    description: "You are browsing independently.",
                    variant: "default",
                });
            }
        },
        [
            isOwner,
            viewingModeRef,
            songRef,
            independentSection,
            setIndependentSection,
            toast,
            liveStateRef,
        ],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (gestureMode) {
                return;
            }

            switch (event.key) {
                case "PageDown":
                    // event.preventDefault();
                    // changeSong('next'); // Implement this function
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    if (isOwner || isOfflineMode) {
                        changeSection("next");
                    } else if (viewingModeRef.current === "setlist") {
                        // Panggil fungsi navigasi lokal
                        changeIndependentSection("next");
                    }
                    break;
                case "PageUp":
                    //     event.preventDefault();
                    //     changeSong('previous'); // Implement this function
                    break;
                case "ArrowLeft":
                    event.preventDefault();
                    if (isOwner || isOfflineMode) {
                        changeSection("previous");
                    } else if (viewingModeRef.current === "setlist") {
                        // Panggil fungsi navigasi lokal
                        changeIndependentSection("previous");
                    }
                    break;
                default:
                    break;
            }
        },
        [
            isOwner,
            isOfflineMode,
            gestureMode,
            changeSection,
            changeIndependentSection,
        ],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    const handleGestureDetected = (gesture: string) => {
        if (!isOwner || !gestureMode) return; // Only allow owner to control with gestures and if gesture mode is ON

        console.log(
            "Current liveState.currentSection (before change):",
            liveStateRef.current.currentArrangementId,
        );
        const currentSectionFromRef = liveStateRef.current.currentArrangementId;

        const sortedArrangements =
            songRef.current?.arrangements?.sort(
                (a, b) => a.position - b.position,
            ) || [];
        console.log(
            "Sorted arrangements:",
            sortedArrangements.map((arr) => ({
                id: arr.section.id,
                name: arr.section.name,
                position: arr.position,
            })),
        );

        const currentIndex = sortedArrangements.findIndex(
            (arr) => arr.id === currentSectionFromRef,
        );

        let newArrangementId: string | null = null;
        let newArrangementName: string | null = null;

        switch (gesture) {
            case "next-section":
                if (
                    currentIndex !== -1 &&
                    currentIndex < sortedArrangements.length - 1
                ) {
                    const nextArrangement =
                        sortedArrangements[currentIndex + 1];
                    newArrangementId = nextArrangement.id;
                    newArrangementName = nextArrangement.section.name;
                    console.log(
                        "Attempting to go to next section:",
                        newArrangementName,
                        "ID:",
                        newArrangementId,
                    );
                    // Update local state immediately
                    broadcastSectionChange(
                        newArrangementId,
                        nextArrangement.section.id,
                        liveState.isPlaying,
                    );
                    toast({
                        title: "Next Section",
                        description: `Point right detected. Moving to ${newArrangementName}.`,
                    });
                } else {
                    console.log(
                        "Cannot move to next section. Current Index:",
                        currentIndex,
                        "Total arrangements:",
                        sortedArrangements.length,
                    );
                    toast({
                        title: "End of Song",
                        description: "No next section available.",
                        variant: "default",
                    });
                }
                break;
            case "previous-section":
                if (currentIndex > 0) {
                    const prevSection = sortedArrangements[currentIndex - 1];
                    newArrangementId = prevSection.id;
                    newArrangementName = prevSection.section.name;
                    console.log(
                        "Attempting to go to previous section:",
                        newArrangementName,
                        "ID:",
                        newArrangementId,
                    );
                    // Update local state immediately
                    broadcastSectionChange(
                        newArrangementId,
                        prevSection.section.id,
                        liveState.isPlaying,
                    );
                    toast({
                        title: "Previous Section",
                        description: `Point left detected. Moving to ${newArrangementName}.`,
                    });
                } else {
                    console.log(
                        "Cannot move to previous section. Current Index:",
                        currentIndex,
                    );
                    toast({
                        title: "Beginning of Song",
                        description: "No previous section available.",
                        variant: "default",
                    });
                }
                break;

            // case 'next-song': {
            //     const currentSongIndex = setlistSongs.findIndex(s => s.id === songId);
            //     if (currentSongIndex !== -1 && currentSongIndex < setlistSongs.length - 1) {
            //         const nextSongId = setlistSongs[currentSongIndex + 1].id;
            //         navigateToSong(nextSongId);
            //         toast({
            //             title: "Next Song",
            //             description: `Gesture detected. Moving to next song.`,
            //         });
            //     } else {
            //         toast({
            //             title: "End of Setlist",
            //             description: "No next song available.",
            //             variant: "default",
            //         });
            //     }
            //     break;
            // }

            // case 'previous-song': {
            //     const currentSongIndex = setlistSongs.findIndex(s => s.id === songId);
            //     if (currentSongIndex > 0) {
            //         const prevSongId = setlistSongs[currentSongIndex - 1].id;
            //         navigateToSong(prevSongId);
            //         toast({
            //             title: "Previous Song",
            //             description: `Gesture detected. Moving to previous song.`,
            //         });
            //     } else {
            //         toast({
            //             title: "Start of Setlist",
            //             description: "No previous song available.",
            //             variant: "default",
            //         });
            //     }
            //     break;
            // }
            // case 'point-left':
            //     // Decrease tempo
            //     const newTempoDown = Math.max(60, liveState.tempo - 5);
            //     setLiveState(prev => ({ ...prev, tempo: newTempoDown })); // Update local state immediately
            //     broadcastTempoChange(newTempoDown);
            //     toast({
            //         title: "Tempo Down",
            //         description: `Tempo set to ${newTempoDown} BPM.`,
            //     });
            //     break;
            // case 'point-right':
            //     // Increase tempo
            //     const newTempoUp = Math.min(200, liveState.tempo + 5);
            //     setLiveState(prev => ({ ...prev, tempo: newTempoUp })); // Update local state immediately
            //     broadcastTempoChange(newTempoUp);
            //     toast({
            //         title: "Tempo Up",
            //         description: `Tempo set to ${newTempoUp} BPM.`,
            //     });
            //     break;
        }
    };

    // Helper function to format chord bars as unbreakable units
    const formatChordBars = (content: string) => {
        return content
            .split("\n")
            .map((line) => {
                // If line contains bars, treat each complete bar as one unit
                if (line.includes("|")) {
                    // Split by bars but keep the bars with their content
                    const parts = line.split("|").filter((part) => part.trim());
                    const formattedBars = [];
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i].trim();
                        if (part) {
                            // Format the content within each bar
                            const formattedPart = part
                                .replace(/\s+/g, " ") // normalize spaces
                                .replace(/\.\s*/g, " . ") // add proper spacing around dots
                                .trim();

                            // Add the bar markers back
                            formattedBars.push(`| ${formattedPart} |`);
                        }
                    }

                    // Join bars with space but keep them as unbreakable units
                    return formattedBars.join("  ");
                }
                return line;
            })
            .join("\n");
    };

    // Format chord grid sections with bars per beat display
    const formatChordGridSection = (section: any) => {
        const content = section.chords;
        if (!content) {
            return (
                <div className="text-gray-400 italic text-sm">
                    No chord data
                </div>
            );
        }

        try {
            const data = JSON.parse(content);
            const {
                bars = [],
                melody = "",
                musicalSigns = {},
                timeSignatureOverrides = {},
            } = data;

            const beatsPerBar = parseInt(
                song?.time_signature?.split("/")[0] || "4",
            );

            return (
                <div className="space-y-6">
                    {melody && (
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600/30">
                            <div className="text-yellow-500 dark:text-yellow-300 text-sm font-semibold mb-2 uppercase tracking-wide">
                                Melodi (not angka)
                            </div>
                            <div className="font-mono text-lg font-medium text-slate-800 dark:text-white">
                                {melody}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600/30">
                        <div className="text-cyan-600 dark:text-cyan-300 text-sm font-semibold mb-4 uppercase tracking-wide">
                            Chord Grid - {section.section_type}
                            {section.section_time_signature
                                ? ` (${section.section_time_signature})`
                                : ""}
                        </div>
                        <div
                            className={`grid gap-3 ${
                                bars.length === 1
                                    ? "grid-cols-1 justify-items-start"
                                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                            }`}
                        >
                            {bars.map((bar: string[], index: number) => {
                                const barMusicalSigns = musicalSigns[index];
                                const barTimeSignature =
                                    timeSignatureOverrides[index];

                                return (
                                    <div
                                        key={index}
                                        className="relative flex border border-slate-200 dark:border-slate-600/50 rounded-lg p-3 bg-white dark:bg-slate-700/30 min-h-[80px] items-center justify-center gap-2"
                                    >
                                        {/* Time signature display inside bar */}
                                        {barTimeSignature && (
                                            <div className="absolute top-5 -left-1 z-10">
                                                <div className="flex flex-col items-center text-xs text-muted-foreground font-medium">
                                                    <span>
                                                        {
                                                            barTimeSignature.split(
                                                                "/",
                                                            )[0]
                                                        }
                                                    </span>
                                                    <div className="w-3 h-px bg-muted-foreground"></div>
                                                    <span>
                                                        {
                                                            barTimeSignature.split(
                                                                "/",
                                                            )[1]
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Musical Signs above the bar */}
                                        {barMusicalSigns && (
                                            <div className="absolute -top-8 left-0 right-0 flex justify-center items-center gap-2 text-lg">
                                                {barMusicalSigns.segno && (
                                                    <span
                                                        className="text-orange-600 font-bold"
                                                        title="Segno"
                                                    >
                                                        𝄋
                                                    </span>
                                                )}
                                                {barMusicalSigns.coda && (
                                                    <span
                                                        className="text-purple-600 font-bold"
                                                        title="Coda"
                                                    >
                                                        ⊕
                                                    </span>
                                                )}
                                                {barMusicalSigns.dsAlCoda && (
                                                    <span
                                                        className="text-green-600 font-semibold text-sm"
                                                        title="D.S. al Coda"
                                                    >
                                                        D.S. al Coda
                                                    </span>
                                                )}
                                                {barMusicalSigns.firstEnding && (
                                                    <span
                                                        className="text-blue-600 font-bold border-t-2 border-l-2 border-blue-600 px-1 text-sm"
                                                        title="First Ending"
                                                    >
                                                        1.
                                                    </span>
                                                )}
                                                {barMusicalSigns.secondEnding && (
                                                    <span
                                                        className="text-blue-600 font-bold border-t-2 border-l-2 border-blue-600 px-1 text-sm"
                                                        title="Second Ending"
                                                    >
                                                        2.
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {Array.from(
                                            { length: beatsPerBar },
                                            (_, beatIndex) => {
                                                const chord =
                                                    bar[beatIndex] || "";
                                                return (
                                                    <div
                                                        key={beatIndex}
                                                        className="flex-1 text-center min-h-[40px] flex items-center justify-center"
                                                    >
                                                        {chord && (
                                                            <div className="font-mono text-lg font-bold bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-400/30 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded">
                                                                {simplifyChordsEnabled
                                                                    ? simplifyChord(
                                                                          chord,
                                                                      )
                                                                    : chord}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            return (
                <div className="text-red-500 dark:text-red-400 italic text-sm">
                    Error parsing chord grid data
                </div>
            );
        }
    };

    // const isChordLine = (line: string): boolean => {
    //     const trimmedLine = line.trim();
    //     if (!trimmedLine) return false;

    //     // NOTE: The original logic here was buggy. It incorrectly identified any lyric line
    //     // containing a '|' and a capital letter (like 'D' in 'Dari') as a chord line.
    //     // The new logic below is more robust.

    //     const normalizedLine = trimmedLine.replace(/\bBes\b/g, "Bb");

    //     const chordRegex =
    //         /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|b|#|\d)*)(\/[A-G][#b]?)?\b/g;

    //     // 1. Strip musical syntax like bars and dots to isolate potential words.
    //     const contentWithoutSyntax = normalizedLine.replace(/[|.]/g, "");
    //     const words = contentWithoutSyntax.split(/\s+/);
    //     const validWords = words.filter((word) => word.length > 0);

    //     // 2. If a line consists ONLY of syntax (e.g., "| . . . . |"), treat it as a chord line.
    //     if (validWords.length === 0) return true;

    //     const chordWordCount = (normalizedLine.match(chordRegex) || []).length;
    //     if (chordWordCount === 0) return false;

    //     // 3. A line is a chord line if a high percentage of its "words" are actual chords.
    //     return chordWordCount / validWords.length > 0.75;
    // };

    const isChordLine = (line: string): boolean => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("[")) {
            return false;
        }

        const specialWordsPattern = /^(N\.C\.|NC|Tacet|STOP)$/i;
        const numberChordPattern = /^\d(b|#)?$/i;
        const solfegeNotationPattern = /^[A-G](is|es|s)?$/i;

        const chordPattern = new RegExp(
            "^" +
                "[A-G]" +
                "(?:#|##|b|bb)?" +
                "(?:" +
                "ma(j)?|M|" +
                "min|m|-|" +
                "dim|o|" +
                "aug|\\+|" +
                "sus|" +
                "add|" +
                "Δ|" +
                "\\d+|" + // Tetap izinkan angka
                "b|#" +
                ")*" +
                "(?:\\(.*?\\))?" +
                "(?:\\/[A-G](?:#|b)?)?" +
                "$",
            "i",
        );

        const words = trimmedLine
            .split(/[\s-]+/)
            .filter((word) => word.length > 0);

        if (words.length === 0) {
            return false;
        }

        return words.every(
            (word) =>
                chordPattern.test(word) ||
                specialWordsPattern.test(word) ||
                numberChordPattern.test(word) ||
                solfegeNotationPattern.test(word),
        );
    };

    const formatContent = (section: any) => {
        interface ChordBar {
            id: string;
            chord: string;
            chordAfter?: string;
            chordEnd?: string;
            beats: number;
            restType?: "WR" | "HR" | "QR" | "ER";
            trailingRestType?: "WR" | "HR" | "QR" | "ER";
            ending?: {
                type: string;
                isStart: boolean;
                isEnd: boolean;
            };
            melody?: {
                notAngka?: string;
            };
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

        const ChordDisplay = ({
            chord: rawChord,
        }: {
            chord: string | undefined;
        }) => {
            if (!rawChord) {
                return <>&nbsp;</>;
            }
            const chord = simplifyChordsEnabled
                ? simplifyChord(rawChord)
                : rawChord;

            const renderChordPart = (part: string) => {
                // This regex better handles extensions for superscripting
                const match = part.match(/^([A-G])([#b]?)(.*)$/);
                if (match) {
                    const baseNote = match[1];
                    const accidental = match[2]; // 'b', '#', atau string kosong
                    const restOfChord = match[3];

                    // Menangani ekstensi numerik di dalam 'restOfChord'
                    const extMatch = restOfChord.match(/^([^0-9]*)(\d.*)$/);
                    if (extMatch) {
                        const quality = extMatch[1]; // misal: 'm', 'maj'
                        const extension = extMatch[2]; // misal: '7', '9'
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

                    // Jika tidak ada ekstensi numerik
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

            if (
                userRole === "bassist" &&
                chord.includes("/") &&
                chord !== "/"
            ) {
                const bassNote = chord.split("/").pop(); // Ambil nada setelah "/"
                return (
                    <span className="inline-block">
                        {renderChordPart(bassNote || "")}
                    </span>
                );
            }

            const restImages: Record<string, string> = {
                WR: wholeRestImg, // Whole Rest
                HR: halfRestImg, // Half Rest
                QR: quarterRestImg, // Quarter Rest
                ER: eighthRestImg, // Eighth Rest
            };

            // map ukuran per simbol
            const restSizes: Record<string, string> = {
                WR: "w-[1em] h-[1.5em]", // whole rest biasanya lebih “pendek”
                HR: "w-[1em] h-[1.7em]",
                QR: "w-[0.5em] h-[0.8em]",
                ER: "w-[0.5em] h-[0.5em]", // eighth rest cenderung lebih tinggi
            };

            const baseRestKey = chord.substring(0, 2);
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
                                    : "w-[0.5em] h-[0.5em]"
                            } ml-1 ${theme === "dark" ? "filter invert" : ""}`}
                        />
                        {isDotted && (
                            <span className="font-bold text-lg leading-none mb-1 text-black dark:text-cyan-300">
                                .
                            </span>
                        )}
                    </div>
                );
            }

            if (restImages[chord]) {
                return (
                    <img
                        src={restImages[chord]}
                        alt={chord}
                        className={`${
                            restSizes[chord] ?? "w-[1em] h-[1em]"
                        } ml-1 ${theme === "dark" ? "filter invert" : ""}`}
                    />
                );
            }

            if (chord === "/") {
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
            } else if (chord.includes("/")) {
                const [mainChord, bassNote] = chord.split("/");

                // **LOGIKA YANG DISEMPURNAKAN: Penyesuaian ukuran font lebih detail**
                let mainChordClass = "";
                // Atur kelas berdasarkan panjang chord utama
                if (mainChord.length > 7) {
                    // 7+ karakter (misal: AbmMaj7)
                    mainChordClass = "-translate-x-2 text-[55%]";
                } else if (mainChord.length >= 5) {
                    // 5-6 karakter (misal: Emaj7, Bbmaj7)
                    mainChordClass = "-translate-x-2 text-[65%]";
                } else if (mainChord.length > 1) {
                    // 3-4 karakter (misal: Amaj, Gadd)
                    mainChordClass = "-translate-x-2 text-[80%]";
                }

                let bassNoteClass = "";
                // Atur kelas berdasarkan panjang bass note (logika ini masih sama dan sudah cukup baik)
                if (bassNote.length > 2) {
                    bassNoteClass = "text-[70%]";
                } else if (bassNote.length > 1) {
                    bassNoteClass = "text-[80%]";
                }

                // Sisa dari JSX return tetap sama
                return (
                    <div // Ganti <span> menjadi <div>
                        className="relative inline-flex items-center justify-center w-20 h-28 sm:w-16 sm:h-16 leading-none"
                    >
                        {/* Terapkan class dinamis ke chord utama */}
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

                        {/* Terapkan class dinamis ke bass note */}
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
        const isMobile =
            typeof window !== "undefined" && window.innerWidth < 640;
        const barsPerLine = 4;
        //    const usePdfForGrid = song?.theme === "chord_grid";
        // const zk = `zoom:${song?.id ?? "song"}:${section?.id ?? section?.name ?? "section"}`;

        // Role-based rendering for vocalist (lyrics only)

        if (userRole === "vocalist") {
            const instrumentalSectionNames = [
                "intro",
                "outro",
                "interlude",
                "solo",
                "instrumental",
                "interlude 2",
                "interlude 3",
            ];
            const isInstrumental =
                section.name &&
                instrumentalSectionNames.includes(section.name.toLowerCase());
            const hasNoRealLyrics =
                !section.lyrics ||
                section.lyrics
                    .trim()
                    .split("\n")
                    .filter((line) => !isChordLine(line) && line.trim() !== "")
                    .length === 0;

            // Jika seksi ini instrumental (atau tidak punya lirik), tampilkan akornya
            if (
                song?.theme !== "chord_grid" &&
                (isInstrumental || hasNoRealLyrics) &&
                (section.chords || section.lyrics)
            ) {
                return (
                    <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                        <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                            ({section.name || section.section_type})
                        </h3>
                        {/* Bagian formattedChords telah dihapus agar chord tidak muncul */}
                    </div>
                );
            }

            const shouldDisplayAllSectionsLyrics =
                isOwner || viewingMode === "live"
                    ? liveState.showAllSections
                    : showAllSections;
            if (shouldDisplayAllSectionsLyrics) {
                if (userRole === "vocalist") {
                    const isChordGrid = song?.theme === "chord_grid";
                    let lyricsOnlyLines: string[];

                    if (isChordGrid) {
                        const content =
                            section.chords || "No Lyrics for this section";
                        lyricsOnlyLines = content.split("\n");
                    } else {
                        const content = section.lyrics || "No Lyrics Available";
                        lyricsOnlyLines = content
                            .split("\n")
                            .filter((line) => !isChordLine(line))
                            .map((line) => line.trim())
                            .join("\n")
                            .replace(/\n{3,}/g, "\n\n")
                            .split("\n");
                    }
                    // if (!content) {
                    //     return (
                    //         <div className="text-slate-400 dark:text-gray-400 italic text-sm">
                    //             {/* No lyrics available */}
                    //         </div>
                    //     );
                    // }

                    // Extract only lyrics (non-chord lines) for vocalist
                    // const lyricsOnlyLines = content
                    //     .split("\n")
                    //     // 1. Hapus baris yang berisi akor
                    //     .filter((line) => !isChordLine(line))
                    //     // 2. Hapus spasi ekstra di awal & akhir setiap baris
                    //     .map((line) => line.trim())
                    //     // 3. Gabungkan, hapus baris kosong berlebih, lalu pisahkan kembali
                    //     .join("\n")
                    //     .replace(/\n{3,}/g, "\n\n")
                    //     .split("\n");

                    const sectionTitle = `${
                        section.name || section.section_type
                    }${
                        section.section_time_signature
                            ? ` (${section.section_time_signature})`
                            : ""
                    }`;

                    return (
                        <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                            <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                                {sectionTitle}
                            </h3>
                            {lyricsOnlyLines.map((line, i) =>
                                line.trim() === "" ? (
                                    <div key={`space-${i}`} className="h-4" />
                                ) : (
                                    <p
                                        key={`lyric-${i}`}
                                        className="font-sans text-xl md:text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 leading-relaxed md:leading-loose whitespace-pre-wrap text-center"
                                    >
                                        {line}
                                    </p>
                                ),
                            )}
                        </div>
                    );
                }
            } else {
                let content = section.lyrics || "";

                // Extract only lyrics (non-chord lines) for vocalist
                const lyricsOnlyLines = content
                    .split("\n")
                    // 1. Hapus baris yang berisi akor
                    .filter((line) => !isChordLine(line))
                    // 2. Hapus spasi ekstra (indentasi) di awal & akhir setiap baris lirik
                    .map((line) => line.trim())
                    // 3. Gabungkan kembali jadi satu blok untuk menghapus baris kosong berlebih
                    .join("\n")
                    .replace(/\n{3,}/g, "\n\n") // 4. Ubah 3+ baris kosong menjadi satu saja
                    // 5. Pisahkan kembali menjadi array final untuk di-render
                    .split("\n");

                const sectionTitle = `${section.name || section.section_type}${
                    section.section_time_signature
                        ? ` (${section.section_time_signature})`
                        : ""
                }`;

                // Non-owner vocalist: teleprompter view with all sections sorted by arrangement position
                const isChordGrid = song?.theme === "chord_grid";
                if (!isOwner) {
                    if (isChordGrid) {
                        if (viewingMode !== "setlist") {
                            const sortedArrangements =
                                song.arrangements?.sort(
                                    (a, b) => a.position - b.position,
                                ) || [];

                            // Prepare sections data for teleprompter based on arrangement order
                            const allSections = sortedArrangements.map(
                                (arrangement) => {
                                    // Find the full section data from song.sections
                                    const fullSection = song.sections?.find(
                                        (s) => s.id === arrangement.section.id,
                                    );
                                    const sec =
                                        fullSection || arrangement.section;
                                    const content = fullSection?.chords;

                                    const lyricsOnlyLines = (content || "")
                                        .split("\n")
                                        .map((line) => line.trim())
                                        .join("\n")
                                        .replace(/\n{3,}/g, "\n\n")
                                        .split("\n");

                                    return {
                                        title: `${
                                            sec.name || sec.section_type
                                        }${
                                            sec.section_time_signature
                                                ? ` (${sec.section_time_signature})`
                                                : ""
                                        }`,
                                        lyrics: lyricsOnlyLines,
                                        isActive: sec.id === section.id,
                                    };
                                },
                            );

                            // Find current section index based on arrangement order
                            const currentSectionIndex = allSections.findIndex(
                                (sec) => sec.isActive,
                            );

                            return (
                                <TeleprompterLyrics
                                    sections={allSections}
                                    currentSectionIndex={
                                        currentSectionIndex >= 0
                                            ? currentSectionIndex
                                            : 0
                                    }
                                    onSectionChange={(index) => {
                                        if (song.sections?.[index]) {
                                            // Navigate to the selected section
                                            const targetSection =
                                                song.sections[index];
                                            if (isOwner && channel) {
                                                channel.send({
                                                    type: "broadcast",
                                                    event: "section_change",
                                                    payload: {
                                                        sectionId:
                                                            targetSection.id,
                                                        timestamp: Date.now(),
                                                    },
                                                });
                                            }
                                        }
                                    }}
                                />
                            );
                        } else {
                            let content =
                                section.chords || "No Lyrics Available";
                            // if (!content) {
                            //     return (
                            //         <div className="text-slate-400 dark:text-gray-400 italic text-sm">
                            //             {/* No lyrics available */}
                            //         </div>
                            //     );
                            // }

                            // Extract only lyrics (non-chord lines) for vocalist
                            const lyricsOnlyLines = content
                                .split("\n")
                                // 1. Hapus baris yang berisi akor
                                .filter((line) => !isChordLine(line))
                                // 2. Hapus spasi ekstra di awal & akhir setiap baris
                                .map((line) => line.trim())
                                // 3. Gabungkan, hapus baris kosong berlebih, lalu pisahkan kembali
                                .join("\n")
                                .replace(/\n{3,}/g, "\n\n")
                                .split("\n");

                            const sectionTitle = `${
                                section.name || section.section_type
                            }${
                                section.section_time_signature
                                    ? ` (${section.section_time_signature})`
                                    : ""
                            }`;

                            return (
                                <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                                    <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                                        {sectionTitle}
                                    </h3>
                                    {lyricsOnlyLines.map((line, i) =>
                                        line.trim() === "" ? (
                                            <div
                                                key={`space-${i}`}
                                                className="h-4"
                                            />
                                        ) : (
                                            <p
                                                key={`lyric-${i}`}
                                                className="font-sans text-xl md:text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 leading-relaxed md:leading-loose whitespace-pre-wrap text-center"
                                            >
                                                {line}
                                            </p>
                                        ),
                                    )}
                                </div>
                            );
                        }
                    } else {
                        const sortedArrangements =
                            song.arrangements?.sort(
                                (a, b) => a.position - b.position,
                            ) || [];

                        // Prepare sections data for teleprompter based on arrangement order
                        const allSections = sortedArrangements.map(
                            (arrangement) => {
                                // Find the full section data from song.sections
                                const fullSection = song.sections?.find(
                                    (s) => s.id === arrangement.section.id,
                                );
                                const sec = fullSection || arrangement.section;
                                const content = fullSection?.lyrics;

                                const lyricsOnlyLines = (content || "")
                                    .split("\n")
                                    // 1. Hapus baris yang berisi akor
                                    .filter((line) => !isChordLine(line))
                                    // 2. Hapus spasi ekstra (indentasi) di awal & akhir setiap baris lirik
                                    .map((line) => line.trim())
                                    // 3. Gabungkan kembali jadi satu blok untuk menghapus baris kosong berlebih
                                    .join("\n")
                                    .replace(/\n{3,}/g, "\n\n") // 4. Ubah 3+ baris kosong menjadi satu saja
                                    // 5. Pisahkan kembali menjadi array final untuk di-render
                                    .split("\n");

                                return {
                                    title: `${sec.name || sec.section_type}${
                                        sec.section_time_signature
                                            ? ` (${sec.section_time_signature})`
                                            : ""
                                    }`,
                                    lyrics: lyricsOnlyLines,
                                    isActive: sec.id === section.id,
                                };
                            },
                        );

                        // Find current section index based on arrangement order
                        const currentSectionIndex = allSections.findIndex(
                            (sec) => sec.isActive,
                        );

                        return (
                            <TeleprompterLyrics
                                sections={allSections}
                                currentSectionIndex={
                                    currentSectionIndex >= 0
                                        ? currentSectionIndex
                                        : 0
                                }
                                onSectionChange={(index) => {
                                    if (song.sections?.[index]) {
                                        // Navigate to the selected section
                                        const targetSection =
                                            song.sections[index];
                                        if (isOwner && channel) {
                                            channel.send({
                                                type: "broadcast",
                                                event: "section_change",
                                                payload: {
                                                    sectionId: targetSection.id,
                                                    timestamp: Date.now(),
                                                },
                                            });
                                        }
                                    }
                                }}
                            />
                        );
                    }
                }

                // Owner fallback (original rendering)
                return (
                    <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                        <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                            {sectionTitle}
                        </h3>
                        {lyricsOnlyLines.map((line, i) =>
                            line.trim() === "" ? (
                                <div key={`space-${i}`} className="h-4" />
                            ) : (
                                <p
                                    key={`lyric-${i}`}
                                    className="font-sans text-xl md:text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 leading-relaxed md:leading-loose whitespace-pre-wrap text-center"
                                >
                                    {line}
                                </p>
                            ),
                        )}
                    </div>
                );
            }
        }

        // Logika untuk tema chord_grid

        console.log(
            "All conditions met:",
            song?.theme === "chord_grid" &&
                section.lyrics &&
                section.lyrics.startsWith("[") &&
                section.lyrics.endsWith("]"),
        );

        if (
            song?.theme === "chord_grid" &&
            section.lyrics &&
            section.lyrics.startsWith("[") &&
            section.lyrics.endsWith("]")
        ) {
            // Special handling for vocalist view in chord grid
            if (userRole === ("vocalist" as any)) {
                // Check if there are vocalist lyrics in the chords field
                const vocalistLyrics = section.chords || "";

                // Debug logging

                if (vocalistLyrics.trim()) {
                    const sectionTitle = `${
                        section.name || section.section_type
                    }${
                        section.section_time_signature
                            ? ` (${section.section_time_signature})`
                            : ""
                    }`;

                    return (
                        <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                            <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                                {sectionTitle}
                            </h3>
                            {vocalistLyrics.split("\n").map((line, i) =>
                                line.trim() === "" ? (
                                    <div key={`space-${i}`} className="h-4" />
                                ) : (
                                    <p
                                        key={`lyric-${i}`}
                                        className="font-sans text-xl md:text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 leading-relaxed md:leading-loose whitespace-pre-wrap text-center"
                                    >
                                        {line}
                                    </p>
                                ),
                            )}
                        </div>
                    );
                } else {
                    // No vocalist lyrics available, show placeholder
                    const sectionTitle = `${
                        section.name || section.section_type
                    }${
                        section.section_time_signature
                            ? ` (${section.section_time_signature})`
                            : ""
                    }`;

                    return (
                        <div className="formatted-content mt-20 mx-auto max-w-3xl text-center">
                            <h3 className="text-base font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 mt-6">
                                {sectionTitle}
                            </h3>
                            <div className="text-slate-400 dark:text-gray-400 italic text-lg mt-8">
                                No lyrics available for this section
                            </div>
                            <div className="text-xs text-slate-500 dark:text-gray-500 mt-4">
                                💡 Add vocalist lyrics in the chord grid editor
                            </div>
                        </div>
                    );
                }
            }
            try {
                const chordData = JSON.parse(section.lyrics);
                let bars: ChordBar[] = chordData.bars || chordData;
                const nonEmptyBars = bars.filter(
                    (bar: ChordBar) => bar.chord && bar.chord.trim() !== "",
                );

                if (nonEmptyBars.length === 1) {
                    bars = nonEmptyBars;
                }
                const musicalSigns = chordData.musicalSigns || {};
                const combinedLines: JSX.Element[] = [];

                const getOrdinal = (nStr: string) => {
                    const n = parseInt(nStr, 10);
                    if (isNaN(n)) return "";
                    const s = ["th", "st", "nd", "rd"];
                    const v = n % 100;
                    return s[(v - 20) % 10] || s[v] || s[0];
                };

                const renderBarContent = (
                    bar: ChordBar,
                    lineHasMelody: boolean,
                ) => {
                    // 1. Tambahkan SR dan varian dotted rests agar sinkron dengan ArrangementDetail
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

                    const chordBeats = bar.chord ? bar.chord.split(" ").filter(Boolean) : [];

                    if (bar.restType) {
                        chordBeats.push(bar.restType);
                    }

                    if (bar.chordAfter) {
                        const afterParts = bar.chordAfter.split(" ").filter(Boolean);
                        chordBeats.push(...afterParts);
                    }

                    if (bar.trailingRestType) {
                        chordBeats.push(bar.trailingRestType);
                    }

                    if (bar.chordEnd) {
                        const endParts = bar.chordEnd.split(" ").filter(Boolean);
                        chordBeats.push(...endParts);
                    }

                    const melodyBeats = bar.melody?.notAngka ? bar.melody.notAngka.split(" ").filter(Boolean) : [];
                    const numBeats = Math.max(chordBeats.length, melodyBeats.length, 1);

                    let regularFontSize, slashFontSize, melodyFontSize;

                    // Hitung kompleksitas font sizing
                    const chordComplexities = chordBeats.map((c) => {
                        if (!c) return 0;
                        let x = c.length;
                        if (c.includes("/")) x += 2;
                        if (c.includes("add") || c.includes("sus") || c.includes("maj") || c.includes("dim")) x += 2;
                        return x;
                    });

                    const maxComplexity = Math.max(...chordComplexities, 0);
                    const avgComplexity = chordComplexities.reduce((s, c) => s + c, 0) / chordComplexities.length || 0;

                    const isExtremelyDense = numBeats >= 5 || (numBeats >= 4 && maxComplexity > 8);
                    const isHighComplexity = maxComplexity > 12 || (numBeats > 1 && avgComplexity > 8);
                    const isMediumComplexity = maxComplexity > 10 || (numBeats > 1 && avgComplexity > 6);

                    if (isExtremelyDense) {
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

                    if (isMobile) {
                        if (numBeats >= 5) {
                            regularFontSize = "text-xs";
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

                    return (
                        <div className="relative">
                            {bar.timeSignatureOverride && (
                                <div className="absolute top-5 -left-1 z-10">
                                    <div className={`flex flex-col items-center font-medium ${isMobile ? "text-base gap-1" : "text-xs"} text-muted-foreground`}>
                                        <span>{bar.timeSignatureOverride.split("/")[0]}</span>
                                        <div className={`${isMobile ? "w-4" : "w-3"} h-px bg-muted-foreground`}></div>
                                        <span>{bar.timeSignatureOverride.split("/")[1]}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col h-full justify-end">
                                <div className="grid flex-grow" style={{ gridTemplateColumns: `repeat(${numBeats}, 1fr)` }}>
                                    {Array.from({ length: numBeats }).map((_, i) => {
                                        const currentChord = chordBeats[i];
                                        const isSlashChord = currentChord?.includes("/");
                                        const chordFontSizeClass = isSlashChord ? slashFontSize : regularFontSize;

                                        return (
                                            <div
                                                key={`chord-beat-${i}`}
                                                className={`${chordFontSizeClass} font-bold text-black dark:text-cyan-300 flex items-baseline pl-2 pt-5 relative`}
                                                style={{ fontFamily: "MuseJazzText", minHeight: "2.5rem" }}
                                            >
                                                {/* 2. RENDER SIMBOL NOTASI (RHYTHM) DENGAN LOGIKA TIE DINAMIS */}
                                                {bar.notes && bar.notes.map((note, noteIndex) => {
                                                    const getGridColumnForNote = (note: any, noteIndex: number) => {
                                                        if (note.chord) {
                                                            const foundIndex = chordBeats.findIndex(c => c === note.chord);
                                                            if (foundIndex !== -1) {
                                                                return foundIndex + 1;
                                                            }
                                                        }
                                                        const explicitBeat = note.beat ? parseInt(note.beat) : noteIndex + 1;
                                                        let targetGridColumn = -1;
                                                        let chordCounter = 0;
                                                        for (let g = 0; g < chordBeats.length; g++) {
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

                                                    const targetBeat = getGridColumnForNote(note, noteIndex);
                                                    if (targetBeat !== i + 1) return null;

                                                    // MENGHITUNG PANJANG GARIS TIE SECARA DINAMIS
                                                    let nextChordBeat = -1;
                                                    for (let j = targetBeat; j < chordBeats.length; j++) {
                                                        const beatStr = chordBeats[j];
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

                                                <ChordDisplay chord={currentChord} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {lineHasMelody && (
                                    <div className="grid" style={{ gridTemplateColumns: `repeat(${numBeats}, 1fr)` }}>
                                        {Array.from({ length: numBeats }).map((_, i) => (
                                            <div
                                                key={`melody-beat-${i}`}
                                                className={`${melodyFontSize} text-slate-800 dark:text-white/90 whitespace-pre flex items-center justify-start h-8 pl-2 sm:pl-3`}
                                                style={{ fontFamily: "'Patrick Hand', cursive" }}
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
                                <span className="mr-[3px] text-[0.7em] font-bold">
                                    :
                                </span>
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
                                <span className="ml-[3px] text-[0.7em] font-bold">
                                    :
                                </span>
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

                    // const gridCols = bars.length === 1 ? "grid-cols-4" : "";

                    const barLineSymbols = new Array(
                        mutableLineBars.length + 1,
                    ).fill("|");

                    mutableLineBars.forEach((bar, index) => {
                        // Selalu periksa awalan di setiap bar
                        if (bar.chord.startsWith("|:")) {
                            barLineSymbols[index] = "|:"; // Ganti simbol untuk bar saat ini
                            bar.chord = bar.chord.substring(2).trim();
                        } else if (bar.chord.startsWith("||:")) {
                            // Tambahkan juga untuk kasus ||:
                            barLineSymbols[index] = "||:";
                            bar.chord = bar.chord.substring(3).trim();
                        } else if (bar.chord.startsWith("/:.")) {
                            barLineSymbols[index] = "|:";
                            bar.chord = bar.chord.substring(3).trim();
                        }

                        // Selalu periksa akhiran di setiap bar
                        if (bar.chord.endsWith(":||")) {
                            barLineSymbols[index + 1] = ":||"; // Ganti simbol untuk bar setelah ini
                            bar.chord = bar.chord.slice(0, -3).trim();
                        } else if (bar.chord.endsWith("://")) {
                            barLineSymbols[index + 1] = ":||";
                            bar.chord = bar.chord.slice(0, -3).trim();
                        }
                    });

                    const lineHasMelody = mutableLineBars.some(
                        (bar) =>
                            bar.melody?.notAngka &&
                            bar.melody.notAngka.trim() !== "",
                    );

                    const lineHasMusicalSigns = mutableLineBars.some(
                        (bar) => bar.musicalSigns,
                    );
                    const lineHasEndings = mutableLineBars.some(
                        (bar) => bar.ending,
                    );

                    // Time Signature Override Row
                    // const timeSignatureRow = (
                    //     <div
                    //         className="flex flex-row"
                    //         key={`time-signature-row-${i}`}
                    //     >
                    //         <div className="w-4"></div>
                    //         {mutableLineBars.map((bar) => {
                    //             const { timeSignatureOverride } = bar;
                    //             if (!timeSignatureOverride) {
                    //                 return (
                    //                     <div
                    //                         key={`placeholder-${bar.id}`}
                    //                         className="flex-1 h-2"
                    //                     ></div>
                    //                 );
                    //             }

                    //             return (
                    //                 <div
                    //                     key={`time-sig-${bar.id}`}
                    //                     className="flex-1 relative h-1"
                    //                 >
                    //                     <span
                    //                         className="absolute -left-4 top-2 text-purple-600 font-bold text-xs leading-none bg-purple-100 px-1 rounded"
                    //                         title={`Time Signature: ${timeSignatureOverride}`}
                    //                     >
                    //                         {timeSignatureOverride}
                    //                     </span>
                    //                 </div>
                    //             );
                    //         })}
                    //         <div className="w-4"></div>
                    //     </div>
                    // );

                    // Musical Signs Row (similar to endings)

                    const isPartialLines = lineBars.length < barsPerLine;

                    const musicalSignsRow = (
                        <div
                            className="flex flex-row"
                            key={`musical-signs-row-${i}`}
                        >
                            <div className="w-4"></div>
                            {mutableLineBars.map((bar, barIndex) => {
                                const { musicalSigns } = bar;
                                return (
                                    <div
                                        key={`musical-sign-${bar.id}`}
                                        className={`relative h-6 min-w-0 ${
                                            !isPartialLines
                                                ? "flex-1 basis-0"
                                                : "w-48 flex-none"
                                        }`}
                                    >
                                        {/* Segno */}
                                        {musicalSigns?.segno && (
                                            <img
                                                src={segno}
                                                alt="segno"
                                                className={`absolute ${
                                                    isMobile
                                                        ? "top-1 -left-3"
                                                        : "top-2 -left-4"
                                                } ${
                                                    theme === "dark"
                                                        ? "filter invert"
                                                        : ""
                                                }`}
                                            />
                                        )}

                                        {/* Coda */}
                                        {musicalSigns?.coda && (
                                            <img
                                                src={codaSign}
                                                alt="coda sign"
                                                className={`
                                        absolute
                                        ${isMobile ? "-top-1" : "top-2"}
                                        ${
                                            barIndex === 0
                                                ? "-left-3"
                                                : "right-0"
                                        }
                                        ${
                                            barIndex === 0
                                                ? isMobile
                                                    ? "w-6 h-6"
                                                    : "w-6 h-6"
                                                : "w-5 h-5"
                                        }
                                        ${
                                            theme === "dark"
                                                ? "filter invert"
                                                : ""
                                        }
                                        `}
                                            />
                                        )}

                                        {/* D.S. al Coda */}
                                        {musicalSigns?.dsAlCoda && (
                                            <span
                                                className={`absolute right-0 top-2 font-semibold ${
                                                    isMobile
                                                        ? "text-2xl"
                                                        : "text-sm"
                                                }`}
                                                style={{
                                                    fontFamily: "MuseJazzText",
                                                }}
                                            >
                                                D.S. al coda
                                            </span>
                                        )}

                                        {/* D.S. */}
                                        {musicalSigns?.ds && (
                                            <span
                                                className={`absolute right-0 top-2 font-semibold ${
                                                    isMobile
                                                        ? "text-2xl"
                                                        : "text-sm"
                                                }`}
                                                style={{
                                                    fontFamily: "MuseJazzText",
                                                }}
                                            >
                                                D.S.
                                            </span>
                                        )}

                                        {/* D.C. */}
                                        {musicalSigns?.dcAlCoda && (
                                            <span
                                                className={`absolute right-0 top-2 font-semibold ${
                                                    isMobile
                                                        ? "text-2xl"
                                                        : "text-sm"
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
                            {/* Tambahkan div kosong untuk sejajar dengan bar line kiri */}
                            <div className="w-4"></div>

                            {mutableLineBars.map((bar) => {
                                const { ending } = bar;
                                if (!ending) {
                                    return (
                                        <div
                                            key={`placeholder-${bar.id}`}
                                            className="flex-1 h-4"
                                        ></div>
                                    );
                                }

                                const label = ending.isStart
                                    ? `${ending.type}${getOrdinal(
                                          ending.type,
                                      )} ending`
                                    : null;

                                return (
                                    <div
                                        key={`ending-${bar.id}`}
                                        className="flex-1 relative h-4 text-slate-600 dark:text-slate-300"
                                    >
                                        {/* Garis atas */}
                                        <div className="absolute top-2 left-0 w-full border-t border-slate-500 dark:border-slate-400"></div>

                                        {/* Kait di awal */}
                                        {ending.isStart && (
                                            <div className="absolute top-2 left-0 h-2 border-l border-slate-500 dark:border-slate-400"></div>
                                        )}

                                        {/* Label Teks */}
                                        {label && (
                                            <span className="absolute top-2 left-2 text-sm font-semibold">
                                                {label}
                                            </span>
                                        )}

                                        {/* Kait di akhir */}
                                        {ending.isEnd && (
                                            <div className="absolute top-2 right-0 h-2 border-r border-slate-500 dark:border-slate-400"></div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Tambahkan div kosong untuk sejajar dengan bar line kanan */}
                            <div className="w-4"></div>
                        </div>
                    );

                    // GANTI SELURUH BLOK combinedLines.push DENGAN INI:
                    const isPartialLine = lineBars.length < barsPerLine;
                    const lineHasNotes = mutableLineBars.some(
                        (bar) => bar.notes && bar.notes.length > 0,
                    );
                    const lineMarginTop = lineHasNotes
                        ? "mt-10"
                        : i === 0
                        ? "mt-0"
                        : "mt-4";

                    combinedLines.push(
                        <div
                            key={`line-group-${i}`}
                            className={`flex flex-col ${lineMarginTop}`} // Gunakan spacing dinamis di sini
                        >
                            {/* Row untuk Musical Signs (Segno, Coda, dll) */}
                            <div
                                className={
                                    lineHasMusicalSigns
                                        ? ""
                                        : "h-0 overflow-hidden"
                                }
                            >
                                {musicalSignsRow}
                            </div>

                            {/* Row untuk Endings (1st ending, 2nd ending) */}
                            <div
                                className={
                                    lineHasEndings ? "" : "h-0 overflow-hidden"
                                }
                            >
                                {endingsRow}
                            </div>

                            {/* Baris Utama (Garis Bar + Chord + Simbol Note) */}
                            <div
                                className={`flex flex-row items-start min-w-0 ${
                                    isPartialLine ? "justify-start" : ""
                                }`}
                            >
                                {mutableLineBars.map((bar, index) => (
                                    <div
                                        key={bar.id || `bar-${i}-${index}`}
                                        className={`flex items-stretch min-w-0 ${
                                            !isPartialLine
                                                ? "flex-1 basis-0"
                                                : "w-48 flex-none"
                                        }`}
                                    >
                                        {/* Garis Bar Kiri */}
                                        <div className="flex flex-col text-3xl leading-tight">
                                            <span className="text-black-500 dark:text-black-300 font-thin text-6xl leading-none">
                                                {renderBarLineSymbol(
                                                    barLineSymbols[index],
                                                )}
                                            </span>
                                        </div>

                                        {/* Konten Bar (Chord & Note Symbol ada di sini) */}
                                        <div className="w-full min-w-0 overflow-visible">
                                            {renderBarContent(
                                                bar,
                                                lineHasMelody,
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Garis Bar Penutup (Paling Kanan) */}
                                <div className="flex flex-col text-3xl leading-tight">
                                    <span className="text-black-500 dark:text-black-300 font-thin text-6xl leading-none">
                                        {renderBarLineSymbol(
                                            barLineSymbols[
                                                mutableLineBars.length
                                            ],
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>,
                    );
                }

                const contentGrid = (
                    <div className="formatted-content p-0 m-0">
                        <h3 className="inline-block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-sm mb-1">
                            {section.name || section.section_type}
                            {section.section_time_signature &&
                                ` (${section.section_time_signature})`}
                        </h3>
                        <div className="mt-[-4px]">
                            {" "}
                            {/* Sedikit negative margin untuk benar-benar menempel */}
                            {combinedLines}
                        </div>
                    </div>
                );

                return (
                    <div className="relative">
                        <PdfLikeViewer>{contentGrid}</PdfLikeViewer>
                        {annotationsEnabled && (
                            <DrawingCanvas
                                setlistId={setlistId}
                                songId={songId}
                                sectionId={section.id}
                                isOwner={isOwner}
                                onAnnotationsChange={setAnnotations}
                                className="absolute inset-0 pointer-events-auto"
                                width={window.innerWidth}
                                height={window.innerHeight}
                            />
                        )}
                        {!annotationsEnabled && showAnnotations && (
                            <DrawingCanvas
                                setlistId={setlistId}
                                songId={songId}
                                sectionId={section.id}
                                isOwner={isOwner}
                                viewOnlyMode={true}
                                className="absolute inset-0 pointer-events-none"
                                width={window.innerWidth}
                                height={window.innerHeight}
                            />
                        )}
                    </div>
                );
            } catch (e) {
                console.error("Gagal parse JSON chord_grid", e);
                return <pre>{section.chords || section.lyrics}</pre>;
            }
        }

        let content = section.chords || section.lyrics;
        if (!content)
            return (
                <div className="text-slate-400 dark:text-gray-400 italic text-sm">
                    No content
                </div>
            );

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

        const sectionName = (
            section.name || section.section_type
        ).toLowerCase();
        const isInstrumental = isMusicalSection(sectionName);

        const lines = content.split("\n");
        const formattedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Baris kosong → beri jarak visual
            if (line.trim() === "") {
                formattedLines.push(<div key={`space-${i}`} className="h-2" />);
                continue;
            }

            // Jika instrumental, semua dianggap chord line
            const isChord = isInstrumental || i % 2 === 0; // ✅ Gantikan isChordLine(line)

            if (isChord) {
                if (userRole === "guitarist" || userRole === "keyboardist") {
                    formattedLines.push(
                        <div key={`chord-${i}`} className="chord-line mb-1">
                            <div
                                className="font-mono text-sm sm:text-base md:text-lg font-bold text-cyan-600 dark:text-cyan-300 leading-tight"
                                style={{ letterSpacing: "0.5px" }}
                            >
                                <ChordClickableText
                                    text={
                                        simplifyChordsEnabled
                                            ? simplifyChordLine(line)
                                            : line
                                    }
                                    userRole={userRole}
                                />
                            </div>
                        </div>,
                    );
                } else {
                    let displayLine = line;

                    if (userRole === "bassist") {
                        // Perbaikan Regex agar tidak rakus (greedy) dan menghapus padding spasi
                        // Kita tambahkan '-' dan karakter lain agar tidak ikut terhapus atau ter-pad
                        displayLine = line.replace(
                            /([A-G][#b]?[^\s\/]*)\/([A-G][#b]?)/g,
                            (match, p1, p2) => {
                                // Langsung kembalikan nada bass (p2) tanpa .padEnd
                                // Ini memastikan jika chord 'nyatu' (misal C#/F-G), hasilnya tetap 'F-G'
                                return p2;
                            },
                        );
                    }

                    formattedLines.push(
                        <div key={`chord-${i}`} className="chord-line mb-1">
                            <div
                                className="font-mono text-sm sm:text-base md:text-lg font-bold text-cyan-600 dark:text-cyan-300 leading-tight whitespace-pre overflow-x-auto"
                                style={{
                                    letterSpacing: "0.5px",
                                    scrollbarWidth: "none",
                                }}
                            >
                                {simplifyChordsEnabled
                                    ? simplifyChordLine(displayLine)
                                    : displayLine}{" "}
                                {/* Gunakan displayLine yang sudah diproses */}
                            </div>
                        </div>,
                    );
                }
            } else {
                // 🎤 Lyric line
                formattedLines.push(
                    <div key={`lyric-${i}`} className="lyric-line mb-3">
                        <pre
                            className="font-mono text-sm sm:text-base md:text-lg text-slate-700 dark:text-gray-200 leading-tight whitespace-pre overflow-x-auto"
                            style={{
                                letterSpacing: "0.3px",
                                margin: 0,
                                padding: 0,
                                scrollbarWidth: "none",
                            }}
                        >
                            {line}
                        </pre>
                    </div>,
                );
            }
        }

        return <div className="formatted-content px-3">{formattedLines}</div>;
    };
    const shareSession = () => {
        setShowShareModal(true);
    };

    // Setlist songs used across the view (safe default while data loads)
    const setlistSongs = setlist?.songs || [];

    const sortedArrangements =
        song?.arrangements?.sort((a, b) => a.position - b.position) || [];
    // Helper functions for viewing mode
    const handleIndependentSectionChange = (sectionId: string) => {
        if (
            (viewingMode === "browse" || viewingMode === "setlist") &&
            !isOwner
        ) {
            setIndependentSection(sectionId);
        }
    };

    const getEffectiveCurrentSection = () => {
        if (
            (viewingMode === "browse" || viewingMode === "setlist") &&
            !isOwner &&
            independentSection
        ) {
            return independentSection;
        }
        return liveState.currentSectionId;
    };

    const getEffectiveCurrentArrangement = () => {
        if (
            (viewingMode === "browse" || viewingMode === "setlist") &&
            !isOwner &&
            independentSection
        ) {
            const matchingArrangement = sortedArrangements.find(
                (arr) => arr.section.id === independentSection,
            );
            return matchingArrangement
                ? matchingArrangement.id
                : independentSection;
        }
        return liveState.currentArrangementId;
    };

    const effectiveCurrentSection = getEffectiveCurrentSection();
    const effectiveCurrentArrangement = getEffectiveCurrentArrangement();

    // Debug log to check if IDs match
    if (effectiveCurrentSection && song?.sections) {
        const found = song.sections.find(
            (s) => s.id === effectiveCurrentSection,
        );
        if (!found) {
            console.warn("Section ID mismatch:", {
                lookingFor: effectiveCurrentSection,
                availableSections: song.sections.map((s) => ({
                    id: s.id,
                    name: s.name,
                })),
            });
        }
    }

    const currentSectionData = song?.sections?.find(
        (s) => s.id === effectiveCurrentSection,
    );
    const currentArrangementData = song?.sections?.find(
        (s) => s.id === effectiveCurrentSection,
    );

    // Broadcast content to local guest clients when MD changes song/section
    // This works both in offline mode and when online (if local sync is active)
    const isLocalMD = localNetworkSync.isMusicalDirector();

    useEffect(() => {
        // Broadcast if we're acting as MD (either offline or local sync started via share modal)
        if (!isLocalMD || !song || !setlist) return;

        const sectionContent =
            currentSectionData?.chords || currentSectionData?.lyrics || "";
        const sortedArrangements =
            song?.arrangements?.sort((a, b) => a.position - b.position) || [];

        console.log("[LivePreview] Broadcasting to local guests:", {
            song: song.title,
            section: currentSectionData?.name,
        });

        broadcastToGuests({
            setlistId: setlistId || "",
            setlistName: setlist.name || "Live Session",
            currentSongIndex: currentSongIndex,
            currentSectionIndex: sortedArrangements.findIndex(
                (a) => a.section?.id === effectiveCurrentSection,
            ),
            transpose: 0,
            isPlaying: liveState.isPlaying,
            songTitle: song.title || "Unknown Song",
            songArtist: song.artist || "",
            songKey:
                (song as any).key ||
                (song as any).song_key ||
                song.current_key ||
                "C",
            songBpm: song.tempo || 120,
            sectionName:
                currentSectionData?.name ||
                currentSectionData?.section_type ||
                "Section",
            sectionContent: sectionContent,
            totalSongs: setlistSongs?.length || 1,
            totalSections: sortedArrangements.length || 1,
        });
    }, [
        isLocalMD,
        song?.id,
        effectiveCurrentSection,
        currentSongIndex,
        setlist?.name,
        broadcastToGuests,
        liveState.isPlaying,
    ]);

    if (loading) {
        return (
            <div className={theme}>
                <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                    <div className="container mx-auto px-4 pt-20 pb-8">
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (!song) {
        return (
            <div className={theme}>
                <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                    <div className="container mx-auto px-4 pt-20 pb-8">
                        <div className="text-center py-12 text-slate-900 dark:text-white">
                            <Music className="h-12 w-12 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">
                                Song Not Found
                            </h2>
                            <p className="mb-6 opacity-80">
                                The song you're looking for doesn't exist.
                            </p>
                            <Button
                                onClick={() => {
                                    const searchParams = new URLSearchParams(
                                        location.search,
                                    );
                                    const source = searchParams.get("source");
                                    if (source === "home") navigate("/");
                                    else if (source === "community-library")
                                        navigate("/community-library");
                                    else if (source === "community")
                                        navigate("/community");
                                    else if (source === "setlist")
                                        navigate("/library?tab=setlists");
                                    else navigate("/library");
                                }}
                                variant="outline"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const navigateToSong = (songIdParam: string) => {
        if (isSetlistMode && songId !== songIdParam) {
            if (isOwner && channel) {
                const newSongIndex =
                    setlist?.songs.findIndex((s) => s.id === songIdParam) || 0;
                channel.send({
                    type: "broadcast",
                    event: "song-change",
                    payload: {
                        songId: songIdParam,
                        songIndex: newSongIndex,
                        setlistId: setlistId,
                    },
                });
            }
            // Broadcast song change to all viewers if owner
            if (channel) {
                // channel.unsubscribe();
                // setChannel(null); // Reset state channel
            }

            // lastManualNavigation.current = Date.now();
            setTimeout(() => {
                navigate(`/setlist-performance/${setlistId}/${songIdParam}`);
            }, 150);
        }
    };

    const broadcastSetlistSync = () => {
        if (channel && isOwner && isSetlistMode) {
            channel.send({
                type: "broadcast",
                event: "setlist-sync",
                payload: {
                    activeSongId: activeSongIdRef.current,
                    currentSongIndex: currentSongIndex,
                    currentArrangementId: liveState.currentArrangementId,
                    isPlaying: liveState.isPlaying,
                    tempo: liveState.tempo,
                    showAllSections: liveStateRef.current.showAllSections,
                    setlistId: setlistId,
                },
            });
        }
    };

    const toggleSongComplete = (songIdParam: string) => {
        setCompletedSongs((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(songIdParam)) {
                newSet.delete(songIdParam);
            } else {
                newSet.add(songIdParam);
            }
            return newSet;
        });
    };

    const AllSectionsFullscreen = ({
        sections,
        songTitle,
        onClose,
        formatContent,
        userRole,
        isAutoScrolling, // Properti baru
        onToggleScroll, // Properti baru
        songTheme,
    }) => {
        if (!sections || sections.length === 0) return null;

        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col">
                {/* Header Fullscreen */}
                <div className="flex-shrink-0 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 z-10">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {songTitle}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-white/70">
                            All Sections
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onToggleScroll}
                            variant="outline"
                            className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        >
                            {isAutoScrolling ? (
                                <Pause className="h-4 w-4 mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            <span>{isAutoScrolling ? "Pause" : "Start"}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </div>

                {/* Konten Scrollable */}
                <div
                    id="fullscreen-scroll-container"
                    className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))]"
                >
                    <div className="space-y-8">
                        {sections.map((arrangement) => (
                            <div key={arrangement.id}>
                                {userRole !== "vocalist" &&
                                    songTheme !== "chord_grid" && (
                                        <h3 className="inline-block text-xs sm:text-xs font-semibold text-slate-900 dark:text-white capitalize bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-md mb-2">
                                            {arrangement.section.name ||
                                                arrangement.section
                                                    .section_type}
                                            {arrangement.section
                                                .section_time_signature
                                                ? ` (${arrangement.section.section_time_signature})`
                                                : ""}
                                        </h3>
                                    )}
                                {formatContent(arrangement.section)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const shouldDisplayAllSections =
        isOwner || viewingMode === "live"
            ? liveState.showAllSections // Jika owner ATAU viewer dalam mode 'live', ikuti state sinkron
            : showAllSections;
    return (
        <div className={theme}>
            <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white">
                <div className="min-h-screen flex flex-col">
                    {/* Header - same for both modes */}
                    {/* PERBAIKAN: Header dibuat responsif dengan menyembunyikan teks di mobile */}
                    <div className="flex items-center justify-between px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 z-20 sticky top-0 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    const searchParams = new URLSearchParams(
                                        location.search,
                                    );
                                    const source = searchParams.get("source");

                                    if (source === "home") {
                                        navigate("/");
                                    } else if (source === "community-library") {
                                        navigate("/community-library");
                                    } else if (source === "community") {
                                        navigate("/community");
                                    } else if (source === "setlist") {
                                        navigate("/library?tab=setlists");
                                    } else if (source === "library") {
                                        navigate("/library");
                                    } else {
                                        // Default: go to arrangement detail or library
                                        const activeSongId = songId || id;
                                        if (activeSongId) {
                                            navigate(
                                                `/arrangement/${activeSongId}`,
                                            );
                                        } else {
                                            navigate("/library");
                                        }
                                    }
                                }}
                                className="text-slate-800 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/20 bg-slate-100 dark:bg-white/10"
                            >
                                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Back</span>
                            </Button>
                            <div className="h-6 w-px bg-slate-300 dark:bg-white/20 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                {/* Tampilkan jumlah penonton hanya jika tidak ada avatar (atau sebagai fallback) */}
                                {viewers.length === 0 && (
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full">
                                        <Users className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            {liveState.viewerCount}
                                        </span>
                                    </div>
                                )}

                                {/* Komponen ViewersList yang baru, akan menampilkan avatar bertumpuk */}
                                <ViewersList viewers={visibleViewers} />

                                {remainingViewersCount > 0 && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-950 -ml-4 z-10">
                                        +{remainingViewersCount}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Annotation Toggle - Only show for owners */}
                            {isOwner && (
                                <>
                                    {/* <Button
                                        onClick={() => {
                                            setAnnotationsEnabled(!annotationsEnabled);
                                            // When exiting draw mode, keep annotations visible if they were showing
                                            if (annotationsEnabled && showAnnotations) {
                                                setShowAnnotations(true);
                                            }
                                        }}
                                        variant={annotationsEnabled ? "default" : "outline"}
                                        className={
                                            annotationsEnabled 
                                                ? "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                                                : "border-slate-200 dark:border-white/30 text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                                        }
                                    >
                                        <Edit className="h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            {annotationsEnabled ? "Exit Draw" : "Draw"}
                                        </span>
                                    </Button> */}
                                    {/* Show Annotations Toggle - Only show when not in draw mode */}
                                    {/* {!annotationsEnabled && (
                                        <Button
                                            onClick={() => setShowAnnotations(!showAnnotations)}
                                            variant={showAnnotations ? "default" : "outline"}
                                            className={
                                                showAnnotations 
                                                    ? "border-green-500 bg-green-500 text-white hover:bg-green-600"
                                                    : "border-slate-200 dark:border-white/30 text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                                            }
                                        >
                                            <Eye className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">
                                                {showAnnotations ? "Hide Notes" : "Show Notes"}
                                            </span>
                                        </Button>
                                    )} */}
                                </>
                            )}
                            {isOwner && (
                                <Button
                                    onClick={handleTranspose}
                                    variant="outline"
                                    className="border-slate-200 dark:border-white/30 text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                                    data-tour="transpose"
                                >
                                    <Music2 className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">
                                        Transpose
                                    </span>
                                </Button>
                            )}
                            <Button
                                onClick={() => {
                                    const newVal = !simplifyChordsEnabled;
                                    setSimplifyChordsEnabled(newVal);
                                    localStorage.setItem(
                                        "simplifyChords",
                                        String(newVal),
                                    );
                                }}
                                variant="outline"
                                className={`border-slate-200 dark:border-white/30 ${
                                    simplifyChordsEnabled
                                        ? "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700"
                                        : "text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                                }`}
                            >
                                <Music className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    {simplifyChordsEnabled
                                        ? "Simplified ✓"
                                        : "Simplify"}
                                </span>
                            </Button>
                            <Button
                                onClick={shareSession}
                                variant="outline"
                                className="border-slate-200 dark:border-white/30 text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                                data-tour="share-session"
                            >
                                <Share2 className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    Share Session
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                    setTheme(
                                        theme === "dark" ? "light" : "dark",
                                    )
                                }
                                className="border-slate-200 dark:border-white/30 text-slate-800 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
                            >
                                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        <div className="flex-1 flex flex-col order-2 lg:order-1">
                            {/* Song Content */}
                            <div className="overflow-y-auto p-3 sm:p-4 lg:p-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                                {/* Song Info */}
                                <div className="text-center mb-6 lg:mb-8">
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2">
                                        {song.title}
                                    </h1>
                                    {song.artist && (
                                        <p className="text-lg sm:text-xl text-slate-600 dark:text-white/70 mb-4">
                                            {song.artist}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                                        <Badge
                                            variant="outline"
                                            className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm"
                                        >
                                            Key: {song.current_key}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm"
                                        >
                                            {liveState.tempo} BPM
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm"
                                        >
                                            {song.time_signature}
                                        </Badge>
                                        {/* {song.capo && song.capo > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-slate-600 text-white bg-slate-800 text-xs sm:text-sm"
                                                        >
                                                            Capo {song.capo}
                                                        </Badge>
                                                    )} */}
                                    </div>
                                    {!isSetlistMode &&
                                        song.youtube_link &&
                                        (() => {
                                            const videoId = getYouTubeID(
                                                song.youtube_link!,
                                            );
                                            if (!videoId) return null;
                                            const isYouTubeOpen =
                                                openYouTubeId === song.id;

                                            return (
                                                <div className="mt-6">
                                                    <Collapsible
                                                        open={isYouTubeOpen}
                                                        onOpenChange={(
                                                            isOpen,
                                                        ) =>
                                                            setOpenYouTubeId(
                                                                isOpen
                                                                    ? song.id
                                                                    : null,
                                                            )
                                                        }
                                                    >
                                                        <CollapsibleTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-white/5"
                                                            >
                                                                <Youtube className="h-4 w-4 mr-2 text-red-500" />
                                                                {isYouTubeOpen
                                                                    ? "Sembunyikan Video"
                                                                    : "Tampilkan Video Referensi"}
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            {/* WRAPPER BARU: Menghilangkan paksa masalah kepotong */}
                                                            <div className="mt-4 p-1 bg-black rounded-lg shadow-lg max-w-xl mx-auto">
                                                                <div
                                                                    className="relative w-full overflow-hidden"
                                                                    style={{
                                                                        paddingTop:
                                                                            "56.25%",
                                                                    }}
                                                                >
                                                                    <YouTube
                                                                        videoId={
                                                                            videoId
                                                                        }
                                                                        opts={{
                                                                            height: "100%",
                                                                            width: "100%",
                                                                            playerVars:
                                                                                {
                                                                                    autoplay: 1,
                                                                                    modestbranding: 1,
                                                                                },
                                                                        }}
                                                                        className="absolute top-0 left-0 w-full h-full"
                                                                        iframeClassName="absolute top-0 left-0 w-full h-full"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </div>
                                            );
                                        })()}
                                </div>

                                {/* Viewing Mode Toggle - Only for non-owners in setlist mode (not in offline mode) */}
                                {!isOwner && !isOfflineMode && (
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600/30 rounded-lg p-4">
                                            <div className="text-sm font-medium text-slate-800 dark:text-white/90 mb-3 text-center">
                                                Choose your viewing mode
                                            </div>
                                            <ToggleGroup
                                                type="single"
                                                value={viewingMode}
                                                onValueChange={(value) => {
                                                    if (value) {
                                                        setViewingMode(
                                                            value as
                                                                | "live"
                                                                | "setlist",
                                                        );
                                                        if (value === "live") {
                                                            // Reset to live mode - clear independent section
                                                            setIndependentSection(
                                                                null,
                                                            );
                                                        }
                                                    }
                                                }}
                                                className="grid grid-cols-2 gap-2 w-full"
                                            >
                                                <ToggleGroupItem
                                                    value="live"
                                                    className="flex flex-col items-center gap-2 p-4 h-auto bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-800 dark:text-white data-[state=on]:bg-blue-500 dark:data-[state=on]:bg-blue-600 data-[state=on]:border-blue-500 data-[state=on]:text-white hover:bg-slate-100 dark:hover:bg-slate-600/50"
                                                >
                                                    <Waves className="h-5 w-5" />
                                                    <div className="text-center">
                                                        <div className="font-semibold text-sm">
                                                            Live Mode
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-white/70 mt-1">
                                                            Follow session owner
                                                        </div>
                                                    </div>
                                                </ToggleGroupItem>
                                                <ToggleGroupItem
                                                    value="setlist"
                                                    className="flex flex-col items-center gap-2 p-4 h-auto bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-800 dark:text-white data-[state=on]:bg-cyan-500 dark:data-[state=on]:bg-cyan-600 data-[state=on]:border-cyan-500 data-[state=on]:text-white hover:bg-slate-100 dark:hover:bg-slate-600/50"
                                                >
                                                    <ListMusic className="h-5 w-5" />
                                                    <div className="text-center">
                                                        <div className="font-semibold text-sm">
                                                            Setlist Mode
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-white/70 mt-1">
                                                            Browse independently
                                                        </div>
                                                    </div>
                                                </ToggleGroupItem>
                                            </ToggleGroup>
                                        </div>
                                    </div>
                                )}

                                {userRole === "drummer" && song && (
                                    <div className="p-4 bg-background/90 border-b border-slate-200 dark:border-white/10 flex justify-center items-center">
                                        {/* Tambahkan div pembungkus dengan lebar maksimal */}
                                        <div className="w-full max-w-sm">
                                            <MetronomeWidget
                                                tempo={liveState.tempo}
                                                timeSignature={
                                                    song.time_signature
                                                }
                                                isPlaying={liveState.isPlaying}
                                                onTempoChange={
                                                    isOwner
                                                        ? broadcastTempoChange
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Main Content */}
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                                    {/* Control Panel - For Owner or Offline Mode */}
                                    {(isOwner || isOfflineMode) &&
                                        userRole !== "vocalist" && (
                                            <div className="order-1 lg:col-span-1">
                                                <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600/30">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                                            <Settings className="h-4 w-4" />
                                                            Controls
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Gesture Control Toggle */}
                                                        <Collapsible>
                                                            <div
                                                                className="flex items-center justify-between"
                                                                data-tour="gesture-control"
                                                            >
                                                                <label className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                                                                    Gesture
                                                                    Control
                                                                </label>
                                                                <CollapsibleTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-9 p-0"
                                                                    >
                                                                        <ChevronsUpDown className="h-4 w-4" />
                                                                        <span className="sr-only">
                                                                            Toggle
                                                                            Gesture
                                                                            Control
                                                                        </span>
                                                                    </Button>
                                                                </CollapsibleTrigger>
                                                            </div>
                                                            <CollapsibleContent>
                                                                <div className="mt-1 space-y-2">
                                                                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/30">
                                                                        <div className="flex items-center gap-2">
                                                                            <Video className="h-4 w-4 text-slate-600 dark:text-white/70" />
                                                                            <span className="text-xs sm:text-sm text-slate-800 dark:text-white">
                                                                                {gestureMode
                                                                                    ? "ON"
                                                                                    : "OFF"}
                                                                            </span>
                                                                        </div>
                                                                        <Switch
                                                                            checked={
                                                                                gestureMode
                                                                            }
                                                                            onCheckedChange={
                                                                                setGestureMode
                                                                            }
                                                                            className="data-[state=checked]:bg-blue-600"
                                                                        />
                                                                    </div>
                                                                    {gestureMode && (
                                                                        <div>
                                                                            <GestureDetection
                                                                                onGestureDetected={
                                                                                    handleGestureDetected
                                                                                }
                                                                                isEnabled={
                                                                                    gestureMode
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>

                                                        {/* Tempo Control */}
                                                        <Collapsible>
                                                            <div
                                                                className="flex items-center justify-between"
                                                                data-tour="tempo"
                                                            >
                                                                <label className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                                                                    Tempo
                                                                </label>
                                                                <CollapsibleTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-9 p-0"
                                                                    >
                                                                        <ChevronsUpDown className="h-4 w-4" />
                                                                        <span className="sr-only">
                                                                            Toggle
                                                                            Tempo
                                                                        </span>
                                                                    </Button>
                                                                </CollapsibleTrigger>
                                                            </div>
                                                            <CollapsibleContent>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                                                                        onClick={() =>
                                                                            broadcastTempoChange(
                                                                                Math.max(
                                                                                    60,
                                                                                    liveState.tempo -
                                                                                        5,
                                                                                ),
                                                                            )
                                                                        }
                                                                    >
                                                                        -5
                                                                    </Button>
                                                                    <span className="text-center flex-1 font-mono text-slate-900 dark:text-white font-bold text-sm sm:text-base bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                                                                        {
                                                                            liveState.tempo
                                                                        }
                                                                    </span>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                                                                        onClick={() =>
                                                                            broadcastTempoChange(
                                                                                Math.min(
                                                                                    200,
                                                                                    liveState.tempo +
                                                                                        5,
                                                                                ),
                                                                            )
                                                                        }
                                                                    >
                                                                        +5
                                                                    </Button>
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>

                                                        {/* Metronome Widget - DITAMBAHKAN DI SINI */}
                                                        <div>
                                                            <Collapsible>
                                                                <div
                                                                    className="flex items-center justify-between"
                                                                    data-tour="metronome"
                                                                >
                                                                    <label className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                                                                        Metronome
                                                                    </label>
                                                                    <CollapsibleTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="w-9 p-0"
                                                                        >
                                                                            <ChevronsUpDown className="h-4 w-4" />
                                                                            <span className="sr-only">
                                                                                Toggle
                                                                                Metronome
                                                                            </span>
                                                                        </Button>
                                                                    </CollapsibleTrigger>
                                                                </div>
                                                                <CollapsibleContent>
                                                                    <div className="p-2 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/30 mt-1">
                                                                        <MetronomeWidget
                                                                            tempo={
                                                                                liveState.tempo
                                                                            }
                                                                            timeSignature={
                                                                                song.time_signature
                                                                            }
                                                                            isPlaying={
                                                                                liveState.isPlaying
                                                                            }
                                                                            onTempoChange={
                                                                                isOwner
                                                                                    ? broadcastTempoChange
                                                                                    : undefined
                                                                            }
                                                                        />
                                                                    </div>
                                                                </CollapsibleContent>
                                                            </Collapsible>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mb-2 block">
                                                                Auto Scroll
                                                            </label>

                                                            {/* Kontrol Kecepatan */}
                                                            <div className="flex items-center justify-between gap-2 mb-2 p-1 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/30">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-slate-700 dark:text-white"
                                                                    onClick={() =>
                                                                        setLiveState(
                                                                            (
                                                                                s,
                                                                            ) => ({
                                                                                ...s,
                                                                                scrollSpeedMultiplier:
                                                                                    Math.max(
                                                                                        0.1,
                                                                                        parseFloat(
                                                                                            (
                                                                                                s.scrollSpeedMultiplier -
                                                                                                0.1
                                                                                            ).toFixed(
                                                                                                1,
                                                                                            ),
                                                                                        ),
                                                                                    ),
                                                                            }),
                                                                        )
                                                                    }
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                                <span className="font-mono ...">
                                                                    {/* [FIX 6: BACA DARI liveState] */}
                                                                    {liveState.scrollSpeedMultiplier.toFixed(
                                                                        1,
                                                                    )}
                                                                    x
                                                                </span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-slate-700 dark:text-white"
                                                                    onClick={() =>
                                                                        setLiveState(
                                                                            (
                                                                                s,
                                                                            ) => ({
                                                                                ...s,
                                                                                scrollSpeedMultiplier:
                                                                                    Math.min(
                                                                                        3.0,
                                                                                        parseFloat(
                                                                                            (
                                                                                                s.scrollSpeedMultiplier +
                                                                                                0.1
                                                                                            ).toFixed(
                                                                                                1,
                                                                                            ),
                                                                                        ),
                                                                                    ),
                                                                            }),
                                                                        )
                                                                    }
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </div>

                                                            {/* Tombol Start/Pause */}
                                                            <Button
                                                                onClick={() =>
                                                                    setLiveState(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            isAutoScrolling:
                                                                                !prev.isAutoScrolling,
                                                                        }),
                                                                    )
                                                                }
                                                                variant="outline"
                                                                disabled={!song}
                                                                className="w-full flex items-center justify-center gap-2 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800"
                                                            >
                                                                {liveState.isAutoScrolling ? (
                                                                    <>
                                                                        <Pause className="h-4 w-4" />
                                                                        <span>
                                                                            Pause
                                                                            Scroll
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play className="h-4 w-4" />
                                                                        <span>
                                                                            Start
                                                                            Scroll
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>

                                                        {/* Section List */}
                                                        {(isOwner ||
                                                            userRole) && (
                                                            <div data-tour="sections">
                                                                <label className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mb-2 block">
                                                                    Sections
                                                                </label>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    // [MODIFIKASI] Ukuran font diubah menjadi text-xs di mobile dan text-sm di layar lebih besar
                                                                    className={`w-full mb-2 justify-center text-center min-h-[40px] transition-all text-xs sm:text-sm ${
                                                                        liveState.showAllSections
                                                                            ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                                                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
                                                                    }`}
                                                                    data-tour="all-sections"
                                                                    onClick={() => {
                                                                        const nextShowAllState =
                                                                            !liveState.showAllSections;
                                                                        if (
                                                                            isMobile
                                                                        ) {
                                                                            // Jika ingin modal fullscreen di mobile,
                                                                            // Anda bisa tetap membuka modal DAN menyiarkan perubahan
                                                                            setIsAllSectionsFullscreen(
                                                                                true,
                                                                            );
                                                                            broadcastShowAllSections(
                                                                                nextShowAllState,
                                                                            );
                                                                        } else {
                                                                            // PERBAIKAN UTAMA: Panggil fungsi broadcast
                                                                            broadcastShowAllSections(
                                                                                nextShowAllState,
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    All Sections
                                                                </Button>

                                                                {(() => {
                                                                    const INITIAL_VISIBLE_SECTIONS = 2; // Jumlah section yang tampil di awal
                                                                    const sectionsToShow =
                                                                        isMobile &&
                                                                        !isSectionsExpanded
                                                                            ? sortedArrangements.slice(
                                                                                  0,
                                                                                  INITIAL_VISIBLE_SECTIONS,
                                                                              )
                                                                            : sortedArrangements;

                                                                    return (
                                                                        <>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {sectionsToShow.map(
                                                                                    (
                                                                                        arrangement,
                                                                                    ) => (
                                                                                        <Button
                                                                                            key={
                                                                                                arrangement.id
                                                                                            }
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className={`w-full justify-center text-center min-h-[40px] transition-all text-sm ${
                                                                                                !liveState.showAllSections &&
                                                                                                liveState.currentArrangementId ===
                                                                                                    arrangement.id
                                                                                                    ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                                                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
                                                                                            }`}
                                                                                            onClick={() => {
                                                                                                broadcastSectionChange(
                                                                                                    arrangement.id,
                                                                                                    arrangement
                                                                                                        .section
                                                                                                        .id,
                                                                                                    liveState.isPlaying,
                                                                                                );
                                                                                            }}
                                                                                        >
                                                                                            <span className="capitalize font-medium leading-tight whitespace-normal text-center block">
                                                                                                {arrangement
                                                                                                    .section
                                                                                                    .name ||
                                                                                                    arrangement
                                                                                                        .section
                                                                                                        .section_type}
                                                                                                {arrangement.repeat_count >
                                                                                                    1 && (
                                                                                                    <div className="text-[10px] opacity-75">
                                                                                                        x
                                                                                                        {
                                                                                                            arrangement.repeat_count
                                                                                                        }
                                                                                                    </div>
                                                                                                )}
                                                                                            </span>
                                                                                        </Button>
                                                                                    ),
                                                                                )}
                                                                            </div>

                                                                            {/* Tombol Show More/Less */}
                                                                            {isMobile &&
                                                                                sortedArrangements.length >
                                                                                    INITIAL_VISIBLE_SECTIONS && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="w-full mt-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                        onClick={() =>
                                                                                            setIsSectionsExpanded(
                                                                                                !isSectionsExpanded,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {isSectionsExpanded
                                                                                            ? "Show Less"
                                                                                            : `Show ${
                                                                                                  sortedArrangements.length -
                                                                                                  INITIAL_VISIBLE_SECTIONS
                                                                                              } More`}
                                                                                    </Button>
                                                                                )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {/* Metronome Widget for Drummers */}
                                                        {/* {userRole === "drummer" && (
                                                            <div className="mt-4">
                                                                <MetronomeWidget
                                                                    tempo={
                                                                        liveState.tempo
                                                                    }
                                                                    timeSignature={
                                                                        song.time_signature
                                                                    } // <-- TAMBAHKAN BARIS INI
                                                                    isPlaying={
                                                                        liveState.isPlaying
                                                                    }
                                                                    onTempoChange={
                                                                        isOwner
                                                                            ? broadcastTempoChange
                                                                            : undefined
                                                                    }
                                                                />
                                                            </div>
                                                        )} */}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                    {/* Section Navigation Panel - For non-owners in setlist mode */}
                                    {/* Section Navigation Panel - For non-owners in setlist mode */}
                                    {!isOwner && viewingMode === "setlist" && (
                                        <div className="order-1 lg:col-span-1">
                                            <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600/30">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                                        <List className="h-4 w-4" />
                                                        Sections
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {" "}
                                                    {/* Tambahkan space-y-4 */}
                                                    {/* TOMBOL ALL SECTIONS UNTUK MOBILE - BARU */}
                                                    {/* {isMobile && ( */}
                                                    <div className="pb-2 border-b border-slate-200 dark:border-white/10">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`w-full justify-center text-center min-h-[44px] transition-all text-sm ${
                                                                showAllSections
                                                                    ? "bg-cyan-500 text-white border-cyan-500"
                                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600"
                                                            }`}
                                                            onClick={() => {
                                                                const nextState =
                                                                    !showAllSections;
                                                                setShowAllSections(
                                                                    nextState,
                                                                );
                                                                if (nextState)
                                                                    setIsAllSectionsFullscreen(
                                                                        true,
                                                                    );
                                                            }}
                                                        >
                                                            All Sections
                                                        </Button>
                                                    </div>
                                                    {/* )} */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {sortedArrangements.map(
                                                            (arrangement) => (
                                                                <Button
                                                                    key={
                                                                        arrangement.id
                                                                    }
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className={`w-full justify-center text-center min-h-[40px] transition-all text-sm ${
                                                                        !showAllSections && // Tambahkan cek agar highlight mati jika di mode All Sections
                                                                        effectiveCurrentSection ===
                                                                            arrangement
                                                                                .section
                                                                                .id
                                                                            ? "bg-cyan-500 dark:bg-cyan-600 text-white border-cyan-500"
                                                                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600"
                                                                    }`}
                                                                    onClick={() => {
                                                                        setShowAllSections(
                                                                            false,
                                                                        ); // Matikan mode All Sections jika user klik section spesifik
                                                                        handleIndependentSectionChange(
                                                                            arrangement
                                                                                .section
                                                                                .id,
                                                                        );
                                                                    }}
                                                                >
                                                                    <span className="capitalize font-medium leading-tight whitespace-normal block text-center">
                                                                        {arrangement
                                                                            .section
                                                                            .name ||
                                                                            arrangement
                                                                                .section
                                                                                .section_type}
                                                                    </span>
                                                                </Button>
                                                            ),
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                    {/* Song Content */}
                                    <div
                                        className={`order-2 ${
                                            isOwner ||
                                            isOfflineMode ||
                                            (isSetlistMode &&
                                                !isOwner &&
                                                viewingMode === "setlist")
                                                ? "lg:col-span-3"
                                                : "lg:col-span-4"
                                        }`}
                                    >
                                        <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600/30 min-h-[400px]">
                                            <CardContent className="p-3 sm:p-4 lg:p-6 overflow-hidden">
                                                <ChordZoom
                                                    storageKey={`live-preview-zoom:${song.id}`}
                                                >
                                                    {/* Content is now correctly placed inside ChordZoom */}

                                                    {shouldDisplayAllSections ? (
                                                        <div className="space-y-8">
                                                            {sortedArrangements.map(
                                                                (
                                                                    arrangement,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            arrangement.id
                                                                        }
                                                                    >
                                                                        {/* V-- Tambahkan kondisi ini --V */}
                                                                        {userRole !==
                                                                            "vocalist" &&
                                                                            song?.theme !==
                                                                                "chord_grid" && (
                                                                                <h3 className="inline-block text-sm sm:text-lg font-semibold text-slate-900 dark:text-white capitalize bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-md mb-5">
                                                                                    {arrangement
                                                                                        .section
                                                                                        .name ||
                                                                                        arrangement
                                                                                            .section
                                                                                            .section_type}
                                                                                    {arrangement
                                                                                        .section
                                                                                        .section_time_signature &&
                                                                                        ` (${arrangement.section.section_time_signature})`}
                                                                                </h3>
                                                                            )}
                                                                        {/* ^-- Jangan lupa tutup kurungnya --^ */}
                                                                        {formatContent(
                                                                            arrangement.section,
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : currentSectionData ? (
                                                        <div>
                                                            {/* --- BAGIAN ATAS: PREVIOUS DAN CURRENT --- */}
                                                            {(() => {
                                                                // --- 1. Cari index dan section-section terkait ---
                                                                const currentIndex =
                                                                    sortedArrangements.findIndex(
                                                                        (arr) =>
                                                                            arr.id ===
                                                                            effectiveCurrentArrangement,
                                                                    );
                                                                const prevSection =
                                                                    currentIndex >
                                                                    0
                                                                        ? sortedArrangements[
                                                                              currentIndex -
                                                                                  1
                                                                          ]
                                                                        : null;

                                                                // Helper untuk mengambil nama section + time signature
                                                                const getSectionName =
                                                                    (
                                                                        section: any,
                                                                    ) => {
                                                                        if (
                                                                            !section
                                                                        )
                                                                            return "";
                                                                        const name =
                                                                            section
                                                                                .section
                                                                                .name ||
                                                                            section
                                                                                .section
                                                                                .section_type;
                                                                        const timeSig =
                                                                            section
                                                                                .section
                                                                                .section_time_signature;
                                                                        return timeSig
                                                                            ? `${name} (${timeSig})`
                                                                            : name;
                                                                    };

                                                                const currentName =
                                                                    currentSectionData.name ||
                                                                    currentSectionData.section_type;
                                                                const currentTimeSig =
                                                                    currentSectionData.section_time_signature;
                                                                const currentSectionDisplayName =
                                                                    currentTimeSig
                                                                        ? `${currentName} (${currentTimeSig})`
                                                                        : currentName;

                                                                // --- 2. Render layout vertikal ---
                                                                return (
                                                                    <div className="mb-4 space-y-2 flex flex-col items-start">
                                                                        {" "}
                                                                        {/* tumpukan vertikal, rata kiri */}
                                                                        {/* === 1. PREVIOUS SECTION (ATAS) === */}
                                                                        {prevSection &&
                                                                            userRole !==
                                                                                "vocalist" &&
                                                                            song?.theme !==
                                                                                "chord_grid" && (
                                                                                <div className="text-left opacity-60">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-auto p-1 text-m text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                isOwner
                                                                                            )
                                                                                                changeSection(
                                                                                                    "previous",
                                                                                                );
                                                                                            else if (
                                                                                                viewingMode ===
                                                                                                "setlist"
                                                                                            )
                                                                                                changeIndependentSection(
                                                                                                    "previous",
                                                                                                );
                                                                                        }}
                                                                                        disabled={
                                                                                            !isOwner &&
                                                                                            viewingMode !==
                                                                                                "setlist"
                                                                                        }
                                                                                    >
                                                                                        <ArrowLeft className="h-3 w-3 mr-1 flex-shrink-0" />
                                                                                        <span className="truncate max-w-[100px] sm:max-w-[160px] capitalize">
                                                                                            {getSectionName(
                                                                                                prevSection,
                                                                                            )}
                                                                                        </span>
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        {/* === 2. CURRENT SECTION TITLE (TENGAH) === */}
                                                                        {userRole !==
                                                                            "vocalist" &&
                                                                            song?.theme !==
                                                                                "chord_grid" && (
                                                                                <div className="text-left">
                                                                                    {" "}
                                                                                    {/* Rata Kiri */}
                                                                                    <h3 className="inline-block text-xs sm:text-lg font-semibold text-slate-900 dark:text-white capitalize bg-slate-200 dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-2 rounded-md">
                                                                                        {
                                                                                            currentSectionDisplayName
                                                                                        }
                                                                                    </h3>
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* === KONTEN SECTION === */}
                                                            {formatContent(
                                                                currentSectionData,
                                                            )}

                                                            {/* --- BAGIAN BAWAH: NEXT --- */}
                                                            {(() => {
                                                                // --- 1. Cari index dan section-section terkait ---
                                                                const currentIndex =
                                                                    sortedArrangements.findIndex(
                                                                        (arr) =>
                                                                            arr.id ===
                                                                            effectiveCurrentArrangement,
                                                                    );
                                                                const nextSection =
                                                                    currentIndex <
                                                                    sortedArrangements.length -
                                                                        1
                                                                        ? sortedArrangements[
                                                                              currentIndex +
                                                                                  1
                                                                          ]
                                                                        : null;

                                                                // Helper untuk mengambil nama section + time signature
                                                                const getSectionName =
                                                                    (
                                                                        section: any,
                                                                    ) => {
                                                                        if (
                                                                            !section
                                                                        )
                                                                            return "";
                                                                        const name =
                                                                            section
                                                                                .section
                                                                                .name ||
                                                                            section
                                                                                .section
                                                                                .section_type;
                                                                        const timeSig =
                                                                            section
                                                                                .section
                                                                                .section_time_signature;
                                                                        return timeSig
                                                                            ? `${name} (${timeSig})`
                                                                            : name;
                                                                    };

                                                                return (
                                                                    <>
                                                                        {/* === 3. NEXT SECTION (BAWAH) === */}
                                                                        {nextSection &&
                                                                            userRole !==
                                                                                "vocalist" &&
                                                                            song?.theme !==
                                                                                "chord_grid" && (
                                                                                <div className="text-left mt-6 opacity-60">
                                                                                    {" "}
                                                                                    {/* Rata Kiri */}
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-auto p-1 text-m text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                isOwner
                                                                                            )
                                                                                                changeSection(
                                                                                                    "next",
                                                                                                );
                                                                                            else if (
                                                                                                viewingMode ===
                                                                                                "setlist"
                                                                                            )
                                                                                                changeIndependentSection(
                                                                                                    "next",
                                                                                                );
                                                                                        }}
                                                                                        disabled={
                                                                                            !isOwner &&
                                                                                            viewingMode !==
                                                                                                "setlist"
                                                                                        }
                                                                                    >
                                                                                        <span className="truncate max-w-[100px] sm:max-w-[160px] capitalize">
                                                                                            {getSectionName(
                                                                                                nextSection,
                                                                                            )}
                                                                                        </span>
                                                                                        <ArrowRight className="h-3 w-3 ml-1 flex-shrink-0" />
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 text-slate-500 dark:text-white/70">
                                                            <Music className="h-12 w-12 mx-auto mb-4" />
                                                            <p>
                                                                Select a section
                                                                from the
                                                                controls to
                                                                begin
                                                            </p>
                                                        </div>
                                                    )}
                                                </ChordZoom>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                            {(() => {
                                // Logika untuk menemukan seksi sebelum dan sesudahnya
                                const currentIndex =
                                    sortedArrangements.findIndex(
                                        (arr) =>
                                            arr.id ===
                                            effectiveCurrentArrangement,
                                    );
                                const prevSection =
                                    currentIndex > 0
                                        ? sortedArrangements[currentIndex - 1]
                                        : null;
                                const nextSection =
                                    currentIndex < sortedArrangements.length - 1
                                        ? sortedArrangements[currentIndex + 1]
                                        : null;

                                // Tampilkan tombol hanya di mobile dan untuk owner atau offline mode
                                if (isMobile && (isOwner || isOfflineMode)) {
                                    return (
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            {/* Tombol Previous */}
                                            <div className="text-left">
                                                {prevSection ? (
                                                    <Button
                                                        onClick={() =>
                                                            changeSection(
                                                                "previous",
                                                            )
                                                        }
                                                        variant="outline"
                                                        className="w-full justify-start text-xs h-auto py-2 whitespace-normal leading-tight"
                                                    >
                                                        <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                                                        <div>
                                                            <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                                                Prev
                                                            </div>
                                                            <div className="capitalize font-semibold">
                                                                {prevSection
                                                                    .section
                                                                    .name ||
                                                                    prevSection
                                                                        .section
                                                                        .section_type}
                                                            </div>
                                                        </div>
                                                    </Button>
                                                ) : (
                                                    // Placeholder agar layout tidak rusak
                                                    <div></div>
                                                )}
                                            </div>

                                            {/* Tombol Next */}
                                            <div className="text-right">
                                                {nextSection ? (
                                                    <Button
                                                        onClick={() =>
                                                            changeSection(
                                                                "next",
                                                            )
                                                        }
                                                        variant="outline"
                                                        className="w-full justify-end text-xs h-auto py-2 whitespace-normal leading-tight"
                                                    >
                                                        <div className="text-right">
                                                            <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                                                Next
                                                            </div>
                                                            <div className="capitalize font-semibold">
                                                                {nextSection
                                                                    .section
                                                                    .name ||
                                                                    nextSection
                                                                        .section
                                                                        .section_type}
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                                                    </Button>
                                                ) : (
                                                    // Placeholder
                                                    <div></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Setlist Sidebar - only show in setlist mode */}
                        {isSetlistMode && (
                            // Kode baru
                            <div className="w-full lg:w-80 bg-slate-100 dark:bg-slate-900/95 border-l-0 lg:border-l border-t lg:border-t-0 border-slate-200 dark:border-white/10 p-4 overflow-y-auto order-1 lg:order-2">
                                {/* Header with Performance Info */}
                                <div className="mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            {setlist?.name ||
                                                "Live Performance"}
                                        </h3>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-white/70 mb-3">
                                        {setlist?.date} • {setlistSongs.length}{" "}
                                        {setlistSongs.length === 0
                                            ? "songs (loading...)"
                                            : "songs"}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mb-2">
                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${
                                                        setlistSongs.length > 0
                                                            ? (completedSongs.size /
                                                                  setlistSongs.length) *
                                                              100
                                                            : 0
                                                    }%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-white/70">
                                        {completedSongs.size} of{" "}
                                        {setlistSongs.length} completed
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {setlistSongs.length > 0 ? (
                                        setlistSongs.map(
                                            (setlistSong, index) => {
                                                // Variabel helper untuk logika YouTube
                                                const videoId =
                                                    setlistSong.youtube_link
                                                        ? getYouTubeID(
                                                              setlistSong.youtube_link,
                                                          )
                                                        : null;
                                                const isYouTubeOpen =
                                                    openYouTubeId ===
                                                    setlistSong.id;

                                                return (
                                                    // Pembungkus utama untuk setiap item lagu + video
                                                    <div key={setlistSong.id}>
                                                        {/* Area yang bisa diklik untuk navigasi lagu */}
                                                        <div
                                                            className={`p-3 rounded-lg border transition-all group ${
                                                                songId ===
                                                                setlistSong.id
                                                                    ? "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50"
                                                                    : completedSongs.has(
                                                                          setlistSong.id,
                                                                      )
                                                                    ? "bg-green-100 dark:bg-green-500/10 border-green-300 dark:border-green-400/30"
                                                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                                            } ${
                                                                !isOwner &&
                                                                viewingMode ===
                                                                    "live"
                                                                    ? "cursor-not-allowed opacity-50"
                                                                    : "cursor-pointer"
                                                            }`}
                                                            onClick={() => {
                                                                if (
                                                                    !isOwner &&
                                                                    viewingMode ===
                                                                        "live"
                                                                ) {
                                                                    toast({
                                                                        title: "Access Restricted",
                                                                        description:
                                                                            "You can only click in setlist mode",
                                                                        variant:
                                                                            "default",
                                                                    });
                                                                    return;
                                                                }
                                                                navigateToSong(
                                                                    setlistSong.id,
                                                                );
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {/* Nomor Urut Lagu */}
                                                                <div
                                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                                        songId ===
                                                                        setlistSong.id
                                                                            ? "bg-blue-500 text-white"
                                                                            : completedSongs.has(
                                                                                  setlistSong.id,
                                                                              )
                                                                            ? "bg-green-500 text-white"
                                                                            : "bg-slate-200 dark:bg-white/20 text-slate-600 dark:text-white/70 group-hover:bg-slate-300 dark:group-hover:bg-white/30 group-hover:text-slate-700 dark:group-hover:text-white"
                                                                    }`}
                                                                >
                                                                    {completedSongs.has(
                                                                        setlistSong.id,
                                                                    ) ? (
                                                                        <Check className="h-3 w-3" />
                                                                    ) : (
                                                                        index +
                                                                        1
                                                                    )}
                                                                </div>

                                                                {/* Judul dan Info Lagu */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-sm text-slate-800 dark:text-white truncate">
                                                                        {
                                                                            setlistSong.title
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-white/60 flex items-center gap-2">
                                                                        <span>
                                                                            {
                                                                                setlistSong.current_key
                                                                            }
                                                                        </span>
                                                                        {setlistSong.tempo && (
                                                                            <>
                                                                                <span>
                                                                                    •
                                                                                </span>
                                                                                <span>
                                                                                    {
                                                                                        setlistSong.tempo
                                                                                    }{" "}
                                                                                    BPM
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Area Tombol Kanan */}
                                                                <div className="flex items-center gap-1 ml-auto">
                                                                    {/* Tombol YouTube BARU */}
                                                                    {videoId && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                if (
                                                                                    !isOwner &&
                                                                                    viewingMode ===
                                                                                        "live"
                                                                                ) {
                                                                                    toast(
                                                                                        {
                                                                                            title: "Navigasi dinonaktifkan",
                                                                                            description:
                                                                                                "Anda sedang dalam Mode Live. Ganti ke Mode Setlist untuk berpindah lagu secara mandiri.",
                                                                                        },
                                                                                    );
                                                                                    return;
                                                                                }
                                                                                navigateToSong(
                                                                                    setlistSong.id,
                                                                                );
                                                                                setOpenYouTubeId(
                                                                                    isYouTubeOpen
                                                                                        ? null
                                                                                        : setlistSong.id,
                                                                                );
                                                                            }}
                                                                            className="w-8 h-8 p-0 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                                                                        >
                                                                            {isYouTubeOpen ? (
                                                                                <X className="h-4 w-4" />
                                                                            ) : (
                                                                                <Youtube className="h-4 w-4" />
                                                                            )}
                                                                        </Button>
                                                                    )}

                                                                    {/* Indikator Lagu Aktif */}
                                                                    {songId ===
                                                                        setlistSong.id && (
                                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                                                    )}

                                                                    {/* Tombol Selesai (Check) */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            toggleSongComplete(
                                                                                setlistSong.id,
                                                                            );
                                                                        }}
                                                                        className={`w-6 h-6 p-0 ${
                                                                            completedSongs.has(
                                                                                setlistSong.id,
                                                                            )
                                                                                ? "text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300"
                                                                                : "text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70"
                                                                        }`}
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Area Player YouTube BARU (Hanya Muncul Jika Diklik) */}
                                                        {isYouTubeOpen &&
                                                            videoId && (
                                                                <div className="mt-2 p-2 bg-black rounded-lg transition-all shadow-inner">
                                                                    <div className="relative w-full aspect-video">
                                                                        <YouTube
                                                                            videoId={
                                                                                videoId
                                                                            }
                                                                            opts={{
                                                                                height: "100%",
                                                                                width: "100%",
                                                                                playerVars:
                                                                                    {
                                                                                        autoplay: 1,
                                                                                        modestbranding: 1,
                                                                                        rel: 0,
                                                                                    },
                                                                            }}
                                                                            className="absolute top-0 left-0 w-full h-full rounded-md overflow-hidden"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            },
                                        )
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 dark:text-white/60">
                                            <Music className="h-8 w-8 mx-auto mb-2" />
                                            {!isOwner &&
                                            viewingMode === "live" ? (
                                                <>
                                                    <p className="text-sm">
                                                        No songs available in
                                                        this setlist
                                                    </p>
                                                    <p className="text-xs mt-1">
                                                        {loading
                                                            ? "Loading songs..."
                                                            : "Check your access permissions"}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm">
                                                        Select Setlist Mode to
                                                        view songs
                                                    </p>
                                                    <p className="text-xs mt-1">
                                                        Switch to Setlist Mode
                                                        above to browse the
                                                        setlist independently
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {isAllSectionsFullscreen && (
                    <AllSectionsFullscreen
                        sections={sortedArrangements}
                        songTitle={song.title}
                        onClose={() => setIsAllSectionsFullscreen(false)}
                        formatContent={formatContent}
                        userRole={userRole}
                        isAutoScrolling={liveState.isAutoScrolling}
                        onToggleScroll={() => {
                            setLiveState((prev) => ({
                                ...prev,
                                isAutoScrolling: !prev.isAutoScrolling,
                            }));
                        }}
                        songTheme={song.theme}
                    />
                )}

                {/* Role Selection Modal */}
                <RoleSelectionModal
                    isOpen={showRoleModal}
                    onRoleSelect={handleRoleSelect}
                    onClose={() => setShowRoleModal(false)}
                />

                {/* Share Session Modal - Show IP address in offline mode, QR code in online mode */}
                {isOfflineMode ? (
                    <Dialog
                        open={showShareModal}
                        onOpenChange={setShowShareModal}
                    >
                        <DialogContent className="w-[90vw] max-w-xs sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-center">
                                    Share Offline Session
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex justify-center gap-6 py-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                                {/* WhatsApp */}
                                <a
                                    href={
                                        getShareLinks(song?.title || "")
                                            .whatsapp
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                                        <svg
                                            className="h-5 w-5 fill-current"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.845-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.82-.981z" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-medium opacity-70">
                                        WA
                                    </span>
                                </a>
                                {/* Facebook */}
                                <a
                                    href={
                                        getShareLinks(song?.title || "")
                                            .facebook
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                                        <svg
                                            className="h-5 w-5 fill-current"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-medium opacity-70">
                                        FB
                                    </span>
                                </a>
                                {/* Instagram */}
                                <button
                                    onClick={() => {
                                        copyToClipboard(
                                            getShareLinks(song?.title || "")
                                                .copy,
                                        );
                                        window.open(
                                            "https://www.instagram.com/",
                                            "_blank",
                                        );
                                    }}
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center text-white transition-transform group-active:scale-90 shadow-sm">
                                        <svg
                                            className="h-5 w-5 fill-current"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-medium opacity-70">
                                        IG
                                    </span>
                                </button>
                                {/* Copy */}
                                <button
                                    onClick={() =>
                                        copyToClipboard(
                                            getShareLinks(song?.title || "")
                                                .copy,
                                        )
                                    }
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-transform group-active:scale-90 shadow-sm">
                                        <Share2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-[10px] font-medium opacity-70">
                                        Link
                                    </span>
                                </button>
                            </div>
                            <MDServerInfo
                                isActive={true}
                                setlistId={setlistId || ""}
                                connectedDevices={liveState.viewerCount}
                            />
                        </DialogContent>
                    </Dialog>
                ) : (
                    <ShareSessionModal
                        open={showShareModal}
                        onOpenChange={setShowShareModal}
                        shareUrl={window.location.href}
                        setlistId={effectiveSetlistId}
                        songTitle={
                            isSetlistMode && setlist
                                ? setlist.name
                                : song?.title
                        }
                    />
                )}

                {/* Transpose Modal */}
                <TransposeModal
                    isOpen={showTransposeModal}
                    onClose={() => setShowTransposeModal(false)}
                    currentKey={song?.current_key || "C"}
                    onTranspose={handleTransposeApply}
                />

                {/* Feature Tour */}
                {/* <FeatureTour userRole={userRole} /> */}
            </div>
        </div>
    );
};
export default LivePreview;
