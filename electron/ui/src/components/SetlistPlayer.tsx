import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Download, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import DAWPlayer from "./DAWPlayer";
import SetlistSongCarousel from "./SetlistSongCarousel";
import { useSetlistPreloader } from "../hooks/useSetlistPreloader";
import { supabase } from "../lib/supabase";
import { cn } from "@/lib/utils";

interface SetlistSong {
    id: string;
    position: number;
    sequencer: any;
}

interface Setlist {
    id: string;
    name: string;
    date: string;
    theme?: string;
    songs: SetlistSong[];
}

interface SetlistPlayerProps {
    setlist: Setlist;
    onBack: () => void;
    offlineMode?: boolean;
}

export default function SetlistPlayer({ setlist, onBack, offlineMode = false }: SetlistPlayerProps) {
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const channelRef = useRef<any>(null);
    const [isPlayerLoading, setIsPlayerLoading] = useState(true);
    const [playerProgress, setPlayerProgress] = useState(0);
    const { 
        songStatuses, 
        isPreloading, 
        isComplete, 
        overallProgress, 
        preloadAll 
    } = useSetlistPreloader(setlist.songs);

    // Sort songs to show loaded ones first, maintaining original order within groups
    const sortedSongsWithStatus = setlist.songs.map((song, originalIndex) => {
        const status = songStatuses.find(s => s.songId === song.sequencer?.song_id);
        return { ...song, originalIndex, loadStatus: status };
    }).sort((a, b) => {
        // Loaded songs first
        const aLoaded = a.loadStatus?.status === 'loaded' ? 0 : 1;
        const bLoaded = b.loadStatus?.status === 'loaded' ? 0 : 1;
        if (aLoaded !== bLoaded) return aLoaded - bLoaded;
        // Then by original position
        return a.originalIndex - b.originalIndex;
    });

    // Setup realtime channel for setlist broadcast
    useEffect(() => {
        const channelId = `setlist-performance-${setlist.id}`;
        
        
        channelRef.current = supabase.channel(channelId);
        channelRef.current.subscribe((status) => {
            
        });

        return () => {
            if (channelRef.current) {
                
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [setlist.id]);

    // Start preloading when component mounts
    useEffect(() => {
        // Start preloading after a short delay to allow UI to render
        const timer = setTimeout(() => {
            preloadAll();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const currentSong = setlist.songs[currentSongIndex];

    // Broadcast song change
    const broadcastSongChange = useCallback((newSongId: string, newIndex: number) => {
        
        channelRef.current?.send({
            type: "broadcast",
            event: "song-change",
            payload: {
                songId: newSongId,
                currentSongIndex: newIndex,
                timestamp: Date.now(),
            },
        }).then(() => {
            
        }).catch((err: any) => {
            console.error(`[SetlistPlayer] song-change broadcast failed:`, err);
        });
    }, []);

    const handleSelectSong = useCallback((index: number) => {
        const newSong = setlist.songs[index];
        const status = songStatuses.find(s => s.songId === newSong?.sequencer?.song_id);
        // If song already cached/loaded, skip loading overlay
        const alreadyLoaded = status?.status === 'loaded' || (status?.progress ?? 0) >= 99;
        setIsPlayerLoading(!alreadyLoaded);
        setPlayerProgress(alreadyLoaded ? 100 : status?.progress ?? 0);
        setCurrentSongIndex(index);
        // Broadcast song ID from sequencer.song_id (for LivePreview compatibility)
        const songIdToBroadcast = newSong?.sequencer?.song_id || newSong?.id;
        if (songIdToBroadcast) {
            broadcastSongChange(songIdToBroadcast, index);
        }
    }, [setlist.songs, songStatuses, broadcastSongChange]);

    const handlePrevSong = useCallback(() => {
        if (currentSongIndex > 0) {
            const newIndex = currentSongIndex - 1;
            const newSong = setlist.songs[newIndex];
            const status = songStatuses.find(s => s.songId === newSong?.sequencer?.song_id);
            const alreadyLoaded = status?.status === 'loaded' || (status?.progress ?? 0) >= 99;
            setIsPlayerLoading(!alreadyLoaded);
            setPlayerProgress(alreadyLoaded ? 100 : status?.progress ?? 0);
            setCurrentSongIndex(newIndex);
            const songIdToBroadcast = newSong?.sequencer?.song_id || newSong?.id;
            
            if (songIdToBroadcast) {
                broadcastSongChange(songIdToBroadcast, newIndex);
            }
        }
    }, [currentSongIndex, setlist.songs, songStatuses, broadcastSongChange]);

    const handleNextSong = useCallback(() => {
        if (currentSongIndex < setlist.songs.length - 1) {
            const newIndex = currentSongIndex + 1;
            const newSong = setlist.songs[newIndex];
            const status = songStatuses.find(s => s.songId === newSong?.sequencer?.song_id);
            const alreadyLoaded = status?.status === 'loaded' || (status?.progress ?? 0) >= 99;
            setIsPlayerLoading(!alreadyLoaded);
            setPlayerProgress(alreadyLoaded ? 100 : status?.progress ?? 0);
            setCurrentSongIndex(newIndex);
            const songIdToBroadcast = newSong?.sequencer?.song_id || newSong?.id;
            
            if (songIdToBroadcast) {
                broadcastSongChange(songIdToBroadcast, newIndex);
            }
        }
    }, [currentSongIndex, setlist.songs.length, setlist.songs, songStatuses, broadcastSongChange]);

    // This key forces DAWPlayer to remount when song changes
    const playerKey = `${setlist.id}-${currentSong?.sequencer?.id}`;

    const handlePlayerLoadingChange = useCallback((loading: boolean, progress: number) => {
        setIsPlayerLoading(loading);
        setPlayerProgress(progress);
    }, []);

    // Keep overlay state in sync with preload status of current song
    useEffect(() => {
        const current = setlist.songs[currentSongIndex];
        if (!current) return;
        const status = songStatuses.find(s => s.songId === current.sequencer?.song_id);
        if (status) {
            const loaded = status.status === 'loaded' || (status.progress ?? 0) >= 99;
            if (loaded) {
                setIsPlayerLoading(false);
                setPlayerProgress(100);
            } else {
                setPlayerProgress(status.progress ?? playerProgress);
                // keep overlay only if DAW still reports loading
            }
        }
    }, [songStatuses, currentSongIndex, setlist.songs, playerProgress]);


    // Get status icon for preload progress
    const getStatusIcon = () => {
        if (isComplete) {
            return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        }
        if (isPreloading) {
            return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
        }
        return <Download className="w-4 h-4 text-muted-foreground" />;
    };

    const getStatusText = () => {
        const loadedCount = songStatuses.filter(s => s.status === 'loaded').length;
        if (isComplete) {
            return `All ${loadedCount} songs ready`;
        }
        if (isPreloading) {
            return `Loading ${loadedCount}/${songStatuses.length} songs...`;
        }
        return `${loadedCount}/${songStatuses.length} songs cached`;
    };

    const currentStatus = songStatuses.find(s => s.songId === currentSong?.sequencer?.song_id);
    const currentLoaded = currentStatus && (currentStatus.status === 'loaded' || (currentStatus.progress ?? 0) >= 99);
    const showOverlay = isPlayerLoading || (isPreloading && !isComplete) || !currentLoaded;
    const overlayProgress = Math.max(playerProgress, isPreloading ? overallProgress : 0, currentStatus?.progress ?? 0);
    const clampedOverlayProgress = Math.min(100, Math.max(0, overlayProgress));

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            {showOverlay && currentSong && (
                <div className="absolute inset-0 z-50 bg-background/82 flex items-center justify-center px-6">
                    <div className="w-full max-w-md bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,22%)]/80 rounded-2xl p-6 shadow-2xl animate-item-enter">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-primary/15 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Loading tracks</p>
                                <p className="text-base font-semibold text-foreground mt-1">
                                    {/* {currentSong.sequencer?.songs?.title || currentSong.sequencer?.title || 'Preparing song'} */}
                                </p>
                            </div>
                            <div className="w-full">
                                <div className="w-full bg-[hsl(0,0%,18%)] rounded-full h-2 overflow-hidden border border-[hsl(0,0%,24%)]">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${Math.round(clampedOverlayProgress)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                {Math.round(clampedOverlayProgress)}% cached locally
                                </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground/80">
                                {isPreloading && !isComplete
                                    ? 'Loading all setlist songs...'
                                    : 'Please wait, we’re securing your multitracks from local cache.'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Compact Setlist Header with Song Carousel */}
            <div className="flex-shrink-0 border-b border-border bg-secondary/50">
            {/* Compact top bar */}
            <div className="flex items-center justify-between px-2 py-1">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="text-xs">Back to Setlists</span>
                    </button>
                    <h2 className="font-semibold text-sm">{setlist.name}</h2>
                    <div className="flex items-center gap-2">
                        {/* Compact Preload Status */}
                        <div 
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
                                isComplete 
                                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                    : isPreloading
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            {getStatusIcon()}
                            <span>{getStatusText()}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {currentSongIndex + 1}/{setlist.songs.length}
                        </span>
                    </div>
                </div>

                {/* Compact Song Carousel */}
                <SetlistSongCarousel
                    songs={setlist.songs}
                    currentIndex={currentSongIndex}
                    onSelectSong={handleSelectSong}
                    onPrevSong={handlePrevSong}
                    onNextSong={handleNextSong}
                    songStatuses={songStatuses}
                    onAddSong={() => {
                        // TODO: Implement add song dialog
                        
                    }}
                />
            </div>

            {/* DAW Player for current song - Scrollable main content */}
            <div className="flex-1 overflow-hidden">
                {currentSong ? (
                    <DAWPlayer
                        key={playerKey}
                        sequencer={currentSong.sequencer}
                        onBack={onBack}
                        setlistId={setlist.id}
                        offlineMode={offlineMode}
                        onLoadingChange={handlePlayerLoadingChange}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        No songs in this setlist
                    </div>
                )}
            </div>
        </div>
    );
}
