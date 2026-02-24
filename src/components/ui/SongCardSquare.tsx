import { useState } from "react";
import { Check, Plus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";
import { CreatorTierBadge, getTierFromCreatorType, getTierRingClass } from "@/components/ui/CreatorTierBadge";

interface SongCardSquareProps {
  song: {
    id: string;
    title: string;
    artist: string;
    youtube_link?: string | null;
    youtube_thumbnail?: string | null;
  };
  creator?: {
    display_name?: string;
    avatar_url?: string | null;
    creator_type?: string;
  } | null;
  showCreatorBadge?: boolean;
  isInLibrary?: boolean;
  onClick?: () => void;
  onAddToLibrary?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const getThumbnail = (song: SongCardSquareProps["song"]): string | null => {
  if (song.youtube_thumbnail) return song.youtube_thumbnail;
  if (song.youtube_link) {
    const videoId = extractYouTubeVideoId(song.youtube_link);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  }
  return null;
};

const getGradientFallback = (title: string): string => {
  const colors = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-purple-500",
    "from-rose-500 to-orange-500",
  ];
  const safeTitle = title?.trim();

  if (!safeTitle) {
    return "from-gray-400 to-gray-600"; // fallback aman
  }

  const index = safeTitle.charCodeAt(0) % colors.length;
  return colors[index];
};

export function SongCardSquare({
  song,
  creator,
  showCreatorBadge = false,
  isInLibrary = false,
  onClick,
  onAddToLibrary,
  size = "md",
  className,
}: SongCardSquareProps) {
  const [imageError, setImageError] = useState(false);
  const thumbnail = getThumbnail(song);
  const tier = getTierFromCreatorType(creator?.creator_type);

  const sizeClasses = {
    sm: "min-w-[140px] max-w-[140px]",
    md: "min-w-[160px] max-w-[160px]",
    lg: "min-w-[180px] max-w-[180px]",
  };

  // Only show badges for Arrangely and Verified tiers (not Community)
  const showBadge = showCreatorBadge && tier && tier !== "community";

  return (
    <div
      className={cn(
        "flex-shrink-0 cursor-pointer group",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Square Thumbnail with tier-based ring */}
      <div className={cn(
        "relative rounded-lg overflow-hidden mb-2",
        tier === "arrangely" && "ring-2 ring-amber-500/50",
        tier === "verified" && "ring-2 ring-blue-500/50"
      )}>
        <AspectRatio ratio={1}>
          {thumbnail && !imageError ? (
            <img
              src={thumbnail}
              alt={song.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br flex items-center justify-center",
                getGradientFallback(song.title)
              )}
            >
              <Play className="h-8 w-8 text-white/80" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Creator Tier Badge - Only Arrangely and Verified */}
          {showBadge && tier && (
            <div className="absolute top-2 left-2">
              <CreatorTierBadge 
                tier={tier} 
                size="xs" 
                showLabel={true}
                showTooltip={false}
              />
            </div>
          )}

          {/* In Library Badge */}
          {isInLibrary && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          )}

          {/* Add to Library Button */}
          {!isInLibrary && onAddToLibrary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToLibrary();
              }}
              className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </AspectRatio>
      </div>

      {/* Song Info */}
      <div className="space-y-0.5">
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
          {song.title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {song.artist}
        </p>
      </div>
    </div>
  );
}

export default SongCardSquare;
