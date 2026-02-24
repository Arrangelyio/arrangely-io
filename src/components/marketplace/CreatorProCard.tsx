import { useState } from "react";
import { Link } from "react-router-dom";
import { Music, Eye, Plus, Star, Flag, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatorProBadge } from "@/components/ui/creator-pro-badge";
import { CreatorProScoreBadge } from "@/components/ui/creator-pro-score-badge";
import { StarRating } from "@/components/ui/star-rating";
import { ReportSongModal } from "@/components/creator-pro/ReportSongModal";
import { useSongRating } from "@/hooks/useSongRating";
import { cn } from "@/lib/utils";

interface CreatorProCardProps {
  song: {
    id: string;
    title: string;
    artist: string;
    youtube_thumbnail?: string;
    views_count?: number;
  };
  creator: {
    id: string;
    display_name: string;
    avatar_url?: string;
    slug?: string;
    score?: number;
    score_status?: 'active' | 'warning' | 'blocked' | 'suspended';
  };
  currentUserId?: string;
  onAddToLibrary?: (songId: string) => void;
  isInLibrary?: boolean;
  className?: string;
}

export function CreatorProCard({
  song,
  creator,
  currentUserId,
  onAddToLibrary,
  isInLibrary = false,
  className
}: CreatorProCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const { stats, rateSong, isRating } = useSongRating(song.id, currentUserId);

  const handleRating = (rating: number) => {
    if (!currentUserId) return;
    rateSong({ rating });
  };

  return (
    <>
      <Card className={cn(
        "group overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-purple-500/10",
        "border-purple-500/20 hover:border-purple-500/40",
        "bg-gradient-to-br from-background to-purple-950/10",
        className
      )}>
        <CardContent className="p-0">
          {/* Thumbnail */}
          <Link to={`/arrangement/${song.id}`} className="block relative aspect-video overflow-hidden">
            {song.youtube_thumbnail ? (
              <img 
                src={song.youtube_thumbnail} 
                alt={song.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                <Music className="h-12 w-12 text-purple-400/50" />
              </div>
            )}
            
            {/* Pro Badge Overlay */}
            <div className="absolute top-2 left-2">
              <CreatorProBadge size="sm" showLabel />
            </div>

            {/* Views */}
            {typeof song.views_count === 'number' && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
                <Eye className="h-3 w-3" />
                {song.views_count.toLocaleString()}
              </div>
            )}
          </Link>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title & Artist */}
            <div>
              <Link 
                to={`/arrangement/${song.id}`}
                className="font-semibold text-foreground hover:text-purple-400 transition-colors line-clamp-1"
              >
                {song.title}
              </Link>
              <p className="text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
            </div>

            {/* Creator Info */}
            <div className="flex items-center justify-between">
              <Link 
                to={creator.slug ? `/creator/${creator.slug}` : '#'}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-6 w-6 border border-purple-500/30">
                  <AvatarImage src={creator.avatar_url} />
                  <AvatarFallback className="text-xs bg-purple-900/50 text-purple-300">
                    {creator.display_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                  {creator.display_name || 'Creator'}
                </span>
              </Link>

              {typeof creator.score === 'number' && (
                <CreatorProScoreBadge 
                  score={creator.score} 
                  status={creator.score_status}
                  size="sm" 
                />
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <StarRating 
                  value={stats.userRating || 0}
                  onChange={currentUserId ? handleRating : undefined}
                  readonly={!currentUserId || isRating}
                  size="sm"
                />
                {stats.totalRatings > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({stats.averageRating.toFixed(1)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {currentUserId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowReportModal(true)}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
                
                {onAddToLibrary && !isInLibrary && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-purple-400"
                    onClick={() => onAddToLibrary(song.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentUserId && (
        <ReportSongModal
          songId={song.id}
          songTitle={song.title}
          userId={currentUserId}
          open={showReportModal}
          onOpenChange={setShowReportModal}
        />
      )}
    </>
  );
}

export default CreatorProCard;
