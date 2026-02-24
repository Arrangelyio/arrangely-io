import { useRef } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    CreatorTierBadge,
    getTierFromCreatorType,
} from "@/components/ui/CreatorTierBadge";

interface TrustedArranger {
    user_id: string;
    name: string;
    avatar: string | null;
    arrangements: number;
    isTrusted: boolean;
    creator_slug?: string;
    creator_type?: string;
    library_adds?: number;
}

interface StoryCircleRowProps {
    arrangers: TrustedArranger[];
    onArrangerClick: (arranger: TrustedArranger) => void;
    loading?: boolean;
    title?: string;
    seeAllLink?: string;
}

function StoryCircleSkeleton() {
    return (
        <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-full" />
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton className="h-2 w-10" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                </div>
            ))}
        </div>
    );
}

export function StoryCircleRow({
    arrangers,
    onArrangerClick,
    loading = false,
    title = "Meet Our Verified Arrangers",
    seeAllLink,
}: StoryCircleRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="pt-1 md:pt-0 pb-3 pl-4 pr-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">
                        {title}
                    </h3>
                </div>
                <StoryCircleSkeleton />
            </div>
        );
    }

    if (arrangers.length === 0) return null;

    const handleViewProfile = (arranger: TrustedArranger) => {
        if (arranger.creator_slug) {
            navigate(`/creator/${arranger.creator_slug}`);
        } else if (arranger.user_id === "arrangely_creator_group") {
            navigate("/community-library?tab=curated");
        }
    };

    return (
        <div className="pt-5 md:pt-0 md:-mt-4 pb-3 pl-5 md:pl-5 pr-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-foreground">
                    {title}
                </h3>
                {seeAllLink && (
                    <Link
                        to={seeAllLink}
                        className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                        See All
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>

            {/* Story Circles - Horizontal Scroll with fade edge */}
            <div className="relative">
                <div
                    ref={scrollRef}
                    className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide"
                    style={{
                        scrollSnapType: "x mandatory",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    {arrangers.map((arranger) => {
                        const tier = getTierFromCreatorType(
                            arranger.creator_type,
                        );
                        const isArrangelyTier = tier === "arrangely";
                        const isVerifiedTier = tier === "verified";
                        const isArrangelyGroup =
                            arranger.name === "Arrangely Creator" ||
                            arranger.user_id === "arrangely_creator_group" ||
                            arranger.creator_type === "creator_arrangely";

                        return (
                            <div
                                key={arranger.user_id}
                                className="flex flex-col items-center gap-1 flex-shrink-0"
                                style={{ scrollSnapAlign: "start" }}
                            >
                                {/* Avatar with Tier-based Ring */}
                                <div className="relative">
                                    <div
                                        className={cn(
                                            "rounded-full p-[2px] transition-transform duration-200 hover:scale-105",
                                            isArrangelyTier
                                                ? "bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 animate-shimmer bg-[length:200%_100%]"
                                                : isVerifiedTier
                                                ? "border-2 border-blue-500"
                                                : "border-2 border-muted",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-full",
                                                isArrangelyTier
                                                    ? "bg-background p-[1.5px]"
                                                    : "",
                                            )}
                                        >
                                            <Avatar className="w-14 h-14 md:w-16 md:h-16">
                                                <AvatarImage
                                                    src={
                                                        isArrangelyGroup
                                                            ? "/LOGO_BACK.png"
                                                            : arranger.avatar ||
                                                              ""
                                                    }
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                                                    {isArrangelyGroup
                                                        ? ""
                                                        : arranger.name
                                                              .charAt(0)
                                                              .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>

                                    {/* Verified Badge */}
                                    {isVerifiedTier && (
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                                            <ShieldCheck className="h-2.5 w-2.5 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Name with optional tier badge */}
                                <div className="flex flex-col items-center gap-0">
                                    <span className="text-[11px] font-medium text-foreground w-16 md:w-20 text-center truncate">
                                        {arranger.name}
                                    </span>
                                    {tier && tier !== "community" && (
                                        <CreatorTierBadge
                                            tier={tier}
                                            size="xs"
                                            showIcon={false}
                                            showTooltip={false}
                                        />
                                    )}
                                </div>

                                {/* Song Count */}
                                <span className="text-[10px] text-muted-foreground">
                                    {arranger.arrangements} songs
                                </span>

                                {/* View Profile Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] rounded-md"
                                    onClick={() => handleViewProfile(arranger)}
                                >
                                    View Profile
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Right fade edge to indicate scrollability */}
                <div
                    className="absolute right-0 top-0 bottom-2 w-12 pointer-events-none bg-gradient-to-l from-background via-background/80 to-transparent"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}

export default StoryCircleRow;
