import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Music, CheckCircle2, Loader2, AlertCircle, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SongLoadStatus } from "../hooks/useSetlistPreloader";

interface SetlistSong {
    id: string;
    position: number;
    sequencer: any;
}

interface SetlistSongCarouselProps {
    songs: SetlistSong[];
    currentIndex: number;
    onSelectSong: (index: number) => void;
    onPrevSong: () => void;
    onNextSong: () => void;
    songStatuses?: SongLoadStatus[];
    onAddSong?: () => void;
}

export default function SetlistSongCarousel({
    songs,
    currentIndex,
    onSelectSong,
    onPrevSong,
    onNextSong,
    songStatuses = [],
    onAddSong,
}: SetlistSongCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to keep current song centered
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const selectedCard = container.children[currentIndex] as HTMLElement;
            if (selectedCard) {
                const containerWidth = container.offsetWidth;
                const cardLeft = selectedCard.offsetLeft;
                const cardWidth = selectedCard.offsetWidth;
                const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
                container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
            }
        }
    }, [currentIndex]);

    const getSongKey = (song: SetlistSong) => {
        const seq = song.sequencer;
        return seq?.current_key || seq?.songs?.current_key || "—";
    };

    const getSongTitle = (song: SetlistSong) => {
        const seq = song.sequencer;
        return seq?.songs?.title || seq?.title || "Unknown";
    };

    const getYouTubeThumbnail = (song: SetlistSong) => {
        const seq = song.sequencer;
        const youtubeLink = seq?.songs?.youtube_link || seq?.youtube_link;
        if (youtubeLink) {
            const match = youtubeLink.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) {
                return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
            }
        }
        return null;
    };

    const getSongLoadStatus = (song: SetlistSong) => {
        const songId = song.sequencer?.song_id;
        return songStatuses.find(s => s.songId === songId);
    };

    const getStatusIndicator = (status: SongLoadStatus | undefined) => {
        if (!status) return null;
        
        switch (status.status) {
            case 'loaded':
                return (
                    <div className="absolute top-0.5 right-0.5 bg-green-500 rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                );
            case 'loading':
                return (
                    <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5 shadow-sm">
                        <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                    </div>
                );
            case 'error':
                return (
                    <div className="absolute top-0.5 right-0.5 bg-destructive rounded-full p-0.5 shadow-sm">
                        <AlertCircle className="w-2.5 h-2.5 text-white" />
                    </div>
                );
            case 'pending':
                return (
                    <div className="absolute top-0.5 right-0.5 bg-muted-foreground/50 rounded-full p-0.5 shadow-sm">
                        <Download className="w-2.5 h-2.5 text-white" />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative flex items-center gap-1 px-1 py-0.5">
            {/* Previous button */}
            <button
                onClick={onPrevSong}
                disabled={currentIndex === 0}
                className="flex-shrink-0 p-1 rounded bg-background/50 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Songs carousel */}
            <div
                ref={scrollContainerRef}
                className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}
            >
                {songs.map((song, index) => {
                    const isActive = index === currentIndex;
                    const thumbnail = getYouTubeThumbnail(song);
                    const loadStatus = getSongLoadStatus(song);

                    return (
                        <div
                            key={song.id}
                            onClick={() => onSelectSong(index)}
                            className={cn(
                                "flex-shrink-0 cursor-pointer transition-all duration-200",
                                isActive ? "scale-100" : "scale-95 opacity-70 hover:opacity-100"
                            )}
                            style={{ scrollSnapAlign: 'center' }}
                        >
                            {/* Compact Song Card */}
                            <div className={cn(
                                "relative w-16 rounded overflow-hidden border transition-colors",
                                isActive ? "border-primary" : "border-transparent",
                                loadStatus?.status === 'loaded' && !isActive && "border-green-500/30"
                            )}>
                                {/* Thumbnail */}
                                <div className="aspect-video bg-secondary relative">
                                    {thumbnail ? (
                                        <img
                                            src={thumbnail}
                                            alt={getSongTitle(song)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                    
                                    {/* Load Status Indicator */}
                                    {getStatusIndicator(loadStatus)}
                                    
                                    {/* Loading Progress Bar */}
                                    {loadStatus?.status === 'loading' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
                                            <div 
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${loadStatus.progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Compact Song Info */}
                            <div className="mt-0.5 text-center">
                                <p className={cn(
                                    "text-[9px] truncate max-w-16 leading-tight",
                                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>
                                    {isActive && "▶ "}
                                    {getSongTitle(song)}
                                </p>
                                <p className="text-[8px] text-muted-foreground leading-tight">
                                    ({getSongKey(song)})
                                </p>
                            </div>
                        </div>
                    );
                })}

                {/* Add Song Button */}
                {onAddSong && (
                    <div
                        onClick={onAddSong}
                        className="flex-shrink-0 cursor-pointer transition-all duration-200 hover:opacity-100 opacity-60"
                    >
                        <div className="w-16 aspect-video rounded bg-secondary/50 border border-dashed border-muted-foreground/30 hover:border-primary/50 flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="mt-0.5 text-[9px] text-muted-foreground text-center">Add</p>
                    </div>
                )}
            </div>

            {/* Next button */}
            <button
                onClick={onNextSong}
                disabled={currentIndex === songs.length - 1}
                className="flex-shrink-0 p-1 rounded bg-background/50 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
