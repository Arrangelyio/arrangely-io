import { useState, useEffect, useCallback } from "react";
import { Search, Play, Download, Loader2, HardDrive, FolderOpen, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import SongDownloadButton from "./SongDownloadButton";
import { audioDownloadService } from "../lib/audioDownloadService";
import { Progress } from "@/components/ui/progress";

interface SongLibraryProps {
    onSelectSequencer: (sequencer: any) => void;
    offlineMode?: boolean;
    initialSequencers?: any[];
}

interface CacheInfo {
    songCount: number;
    trackCount: number;
    totalSize: number;
    cachePath: string;
}

export default function SongLibrary({ onSelectSequencer, offlineMode = false, initialSequencers = [] }: SongLibraryProps) {
    const [sequencers, setSequencers] = useState<any[]>(initialSequencers || []);
    const [loading, setLoading] = useState(!offlineMode);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0, currentSong: '' });
    const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
    const [isRefreshingCache, setIsRefreshingCache] = useState(false);

    useEffect(() => {
        if (offlineMode) {
            setLoading(false);
            loadCacheInfo();
            return;
        }
        loadSequencers();
        const timer = setTimeout(() => {
            loadCacheInfo();
        }, 500);
        return () => clearTimeout(timer);
    }, [offlineMode]);

    const loadCacheInfo = useCallback(async () => {
        setIsRefreshingCache(true);
        try {
            const info = await audioDownloadService.getCacheInfo();
            setCacheInfo(info);
        } catch (error) {
            console.error('[SongLibrary] Error loading cache info:', error);
        } finally {
            setIsRefreshingCache(false);
        }
    }, []);

    const loadSequencers = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("sequencer_enrollments")
                .select(`
                    sequencer_file_id,
                    sequencer_files (
                        *,
                        songs (
                            title,
                            artist,
                            is_public,
                            user_id
                        )
                    )
                `)
                .eq("user_id", user.id)
                .eq("is_production", true)
                .order("enrolled_at", { ascending: false });

            if (error) throw error;

            const sequencerFiles = data
                ?.map((enrollment) => enrollment.sequencer_files)
                .filter((file) => file !== null) || [];

            setSequencers(sequencerFiles);
        } catch (error) {
            console.error("Error loading sequencers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        if (isDownloadingAll) return;
        
        setIsDownloadingAll(true);
        setDownloadAllProgress({ current: 0, total: sequencers.length, currentSong: '' });

        try {
            for (let i = 0; i < sequencers.length; i++) {
                const seq = sequencers[i];
                const songTitle = seq.songs?.title || seq.title;
                
                setDownloadAllProgress({ 
                    current: i, 
                    total: sequencers.length, 
                    currentSong: songTitle 
                });

                const isCached = await audioDownloadService.isSongFullyCached(seq);
                if (isCached) continue;

                await audioDownloadService.downloadSong(seq);
            }

            setDownloadAllProgress({ 
                current: sequencers.length, 
                total: sequencers.length, 
                currentSong: 'Complete!' 
            });
            
            setTimeout(() => loadCacheInfo(), 1000);
        } catch (error) {
            console.error('Error downloading all songs:', error);
        } finally {
            setIsDownloadingAll(false);
        }
    };

    const filteredSequencers = sequencers.filter(
        (seq) =>
            seq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            seq.songs?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            seq.songs?.artist?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-5 bg-[hsl(0,0%,14%)] animate-page-enter">
            <div className="mb-5">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-semibold text-[hsl(0,0%,85%)]">Song Library</h1>
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloadingAll || sequencers.length === 0}
                        className="
                            flex items-center gap-2 px-3 py-1.5 
                            bg-[hsl(0,0%,22%)] text-[hsl(0,0%,75%)] 
                            rounded-md text-sm font-medium
                            border border-[hsl(0,0%,28%)]
                            hover:bg-[hsl(0,0%,28%)] hover:text-[hsl(0,0%,90%)]
                            disabled:opacity-40 disabled:cursor-not-allowed 
                            btn-interactive
                        "
                    >
                        {isDownloadingAll ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{downloadAllProgress.current + 1}/{downloadAllProgress.total}</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download All</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Cache Info */}
                {cacheInfo && cacheInfo.cachePath && (
                    <div className="mb-4 p-2.5 bg-[hsl(0,0%,18%)] rounded-md border border-[hsl(0,0%,22%)] animate-item-enter">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                                <HardDrive className="w-3.5 h-3.5 text-[hsl(0,0%,45%)]" />
                                <span className="text-[hsl(0,0%,55%)]">
                                    {cacheInfo.songCount} songs, {cacheInfo.trackCount} tracks
                                    {cacheInfo.totalSize > 0 && ` (${(cacheInfo.totalSize / 1024 / 1024).toFixed(1)} MB)`}
                                </span>
                            </div>
                            <button
                                onClick={loadCacheInfo}
                                disabled={isRefreshingCache}
                                className="p-1 rounded hover:bg-[hsl(0,0%,25%)] transition-colors disabled:opacity-50 btn-interactive"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-[hsl(0,0%,45%)] ${isRefreshingCache ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {/* <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[hsl(0,0%,40%)]">
                            <FolderOpen className="w-3 h-3" />
                            <span className="truncate">{cacheInfo.cachePath}</span>
                        </div> */}
                    </div>
                )}

                {isDownloadingAll && (
                    <div className="mb-4 p-2.5 bg-[hsl(0,0%,18%)] rounded-md border border-[hsl(0,0%,22%)] animate-item-enter">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-[hsl(0,0%,55%)] truncate max-w-[200px]">
                                {downloadAllProgress.currentSong}
                            </span>
                            <span className="text-xs font-medium text-[hsl(0,0%,70%)]">
                                {downloadAllProgress.current}/{downloadAllProgress.total}
                            </span>
                        </div>
                        <Progress 
                            value={(downloadAllProgress.current / downloadAllProgress.total) * 100} 
                            className="h-1.5" 
                        />
                    </div>
                )}

                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,40%)]" />
                    <input
                        type="text"
                        placeholder="Search songs, artists..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="
                            w-full pl-8 pr-3 py-2 
                            bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,25%)] 
                            rounded-md text-sm text-[hsl(0,0%,80%)]
                            placeholder:text-[hsl(0,0%,40%)]
                            focus:outline-none focus:border-[hsl(145,65%,42%)]
                            transition-all duration-150
                        "
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-[hsl(0,0%,50%)] text-sm">Loading...</div>
                </div>
            ) : (
                <div className="flex-1 overflow-auto scroll-smooth">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredSequencers.map((seq, index) => (
                            <div
                                key={seq.id}
                                className={`
                                    bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,22%)] 
                                    rounded-lg p-3 cursor-pointer group
                                    card-interactive
                                    hover:border-[hsl(0,0%,32%)] hover:bg-[hsl(0,0%,20%)]
                                    animate-item-enter stagger-${Math.min(index + 1, 8)}
                                `}
                                onClick={() => onSelectSequencer(seq)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-medium text-sm text-[hsl(0,0%,85%)] truncate transition-colors duration-150 group-hover:text-white">
                                            {seq.songs?.title || seq.title}
                                        </h3>
                                        <p className="text-xs text-[hsl(0,0%,50%)] truncate transition-colors duration-150 group-hover:text-[hsl(0,0%,60%)]">
                                            {seq.songs?.artist || "Unknown Artist"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <SongDownloadButton sequencer={seq} size="sm" />
                                        <button className="
                                            w-8 h-8 flex items-center justify-center 
                                            bg-[hsl(145,65%,42%)] rounded-full 
                                            opacity-0 group-hover:opacity-100 
                                            transition-all duration-200
                                            hover:bg-[hsl(145,65%,48%)] hover:scale-110
                                            active:scale-95
                                        ">
                                            <Play className="w-4 h-4 text-white ml-0.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-[hsl(0,0%,45%)]">
                                    <span>{seq.tempo} BPM</span>
                                    <span>{seq.time_signature}</span>
                                    <span>{seq.tracks?.length || 0} tracks</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredSequencers.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-[hsl(0,0%,45%)] text-sm">
                            No sequencer files found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}