import { Link } from "react-router-dom";
import { MapPin, Music, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  CreatorTierBadge,
  getTierFromCreatorType,
  getTierRingClass,
} from "@/components/ui/CreatorTierBadge";
import type { CreatorDirectoryItem } from "@/hooks/useCreatorDirectory";

interface CreatorCardProps {
  creator: CreatorDirectoryItem;
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const tier = getTierFromCreatorType(creator.creator_type);
  const ringClass = getTierRingClass(tier);

  const truncatedBio = creator.bio
    ? creator.bio.length > 80
      ? creator.bio.substring(0, 80) + "..."
      : creator.bio
    : null;

  const location = [creator.city, creator.country].filter(Boolean).join(", ");

  const displayedInstruments = creator.instruments?.slice(0, 3) || [];
  const remainingCount = (creator.instruments?.length || 0) - 3;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Avatar with tier ring */}
          <div className={cn("rounded-full", ringClass)}>
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={creator.avatar_url || undefined}
                alt={creator.display_name}
                className="object-cover"
              />
              <AvatarFallback className="text-xl bg-muted">
                {creator.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Tier Badge */}
          {tier && (
            <CreatorTierBadge
              tier={tier}
              size="sm"
              showLabel
              showIcon
              showTooltip
            />
          )}

          {/* Name */}
          <h3 className="font-semibold text-foreground line-clamp-1">
            {creator.display_name}
          </h3>

          {/* Bio */}
          {truncatedBio && (
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {truncatedBio}
            </p>
          )}

          {/* Instruments */}
          {displayedInstruments.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {displayedInstruments.map((instrument) => (
                <span
                  key={instrument}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground"
                >
                  {instrument}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
                  +{remainingCount}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Music className="h-3 w-3" />
              <span>{creator.song_count} songs</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{creator.follower_count}</span>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}

          {/* View Profile Button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          >
            <Link to={`/creator/${creator.creator_slug}`}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatorCard;
