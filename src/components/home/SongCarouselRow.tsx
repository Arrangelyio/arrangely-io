import { useRef } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { SongCardSquare } from "@/components/ui/SongCardSquare";
import { Skeleton } from "@/components/ui/skeleton";

interface Song {
  id: string;
  title: string;
  artist: string;
  youtube_link?: string | null;
  youtube_thumbnail?: string | null;
  user_id?: string;
}

interface Creator {
  display_name?: string;
  avatar_url?: string | null;
  creator_type?: string;
}

interface SongCarouselRowProps {
  title: string;
  songs: Song[];
  creators?: Map<string, Creator>;
  icon?: LucideIcon;
  iconColor?: string;
  seeAllLink?: string;
  loading?: boolean;
  showCreatorBadge?: boolean;
  songsInLibrary?: Set<string>;
  onSongClick?: (song: Song) => void;
  onAddToLibrary?: (song: Song) => void;
  emptyMessage?: string;
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[160px]">
          <Skeleton className="w-full aspect-square rounded-lg mb-2" />
          <Skeleton className="h-4 w-3/4 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SongCarouselRow({
  title,
  songs,
  creators,
  icon: Icon,
  iconColor = "text-primary",
  seeAllLink,
  loading = false,
  showCreatorBadge = true,
  songsInLibrary = new Set(),
  onSongClick,
  onAddToLibrary,
  emptyMessage = "No songs available",
}: SongCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const uniqueSongs = Array.from(
    new Map(
      songs
        .filter((song) => song.id) // buang yang id kosong
        .map((song) => [song.id, song])
    ).values()
  );

  if (loading) {
    return (
      <div className="py-4 pl-4 pr-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        <CarouselSkeleton />
      </div>
    );
  }

  if (songs.length === 0) {
    return null; // Don't render empty sections
  }

  return (
    <div className="py-4 pl-4 pr-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Horizontal Scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {uniqueSongs.map((song, index) => {
          const creator = song.user_id ? creators?.get(song.user_id) : undefined;
          console.log("[SongCarouselRow item]", index, song);

          return (
            <div key={song.id} style={{ scrollSnapAlign: "start" }}>
              <SongCardSquare
                song={song}
                creator={creator}
                showCreatorBadge={showCreatorBadge}
                isInLibrary={songsInLibrary.has(song.id)}
                onClick={() => onSongClick?.(song)}
                onAddToLibrary={
                  onAddToLibrary ? () => onAddToLibrary(song) : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SongCarouselRow;
