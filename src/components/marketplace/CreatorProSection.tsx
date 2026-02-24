import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatorProCard } from "./CreatorProCard";
import { Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorProSectionProps {
    currentUserId?: string;
    onAddToLibrary?: (songId: string) => void;
    libraryIds?: string[];
    className?: string;
    limit?: number;
}

export function CreatorProSection({
    currentUserId,
    onAddToLibrary,
    libraryIds = [],
    className,
    limit = 12,
}: CreatorProSectionProps) {
    const { data: songs, isLoading } = useQuery({
        queryKey: ["creator-pro-songs", limit],
        queryFn: async () => {
            // Get songs from creator_pro users with active publications
            const { data, error } = await supabase
                .from("creator_pro_publications")
                .select(
                    `
          id,
          song_id,
          published_at,
          songs!inner (
            id,
            title,
            artist,
            youtube_thumbnail,
            views_count,
            user_id,
            profiles!inner (
              user_id,
              display_name,
              avatar_url,
              creator_slug,
              creator_type
            )
          )
        `,
                )
                .eq("status", "active")
                .eq("is_production", true)
                .eq("songs.profiles.creator_type", "creator_pro")
                .order("published_at", { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching creator community songs:", error);
                return [];
            }

            // Get scores for these creators
            const creatorIds = [
                ...new Set(
                    data?.map((d) => (d.songs as any)?.user_id).filter(Boolean),
                ),
            ];

            const { data: scores } = await supabase
                .from("creator_pro_scores")
                .select("user_id, total_score, status")
                .in("user_id", creatorIds);

            const scoreMap = new Map<
                string,
                { total_score: number | null; status: string | null }
            >(
                scores?.map((s) => [
                    s.user_id,
                    {
                        total_score: s.total_score
                            ? Number(s.total_score)
                            : null,
                        status: s.status,
                    },
                ]) || [],
            );

            return (
                data?.map((pub) => {
                    const song = pub.songs as any;
                    const profile = song?.profiles;
                    const scoreData = scoreMap.get(song?.user_id) as
                        | { total_score: number | null; status: string | null }
                        | undefined;

                    return {
                        song: {
                            id: song?.id,
                            title: song?.title,
                            artist: song?.artist,
                            youtube_thumbnail: song?.youtube_thumbnail,
                            views_count: song?.views_count,
                        },
                        creator: {
                            id: profile?.user_id,
                            display_name: profile?.display_name,
                            avatar_url: profile?.avatar_url,
                            slug: profile?.creator_slug,
                            score: scoreData?.total_score
                                ? Number(scoreData.total_score)
                                : undefined,
                            score_status: scoreData?.status as any,
                        },
                    };
                }) || []
            );
        },
        staleTime: 60000,
    });

    if (isLoading) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center py-12",
                    className,
                )}
            >
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
        );
    }

    // if (!songs || songs.length === 0) {
    //   return (
    //     <div className={cn("text-center py-12", className)}>
    //       <Crown className="h-12 w-12 text-purple-400/40 mx-auto mb-4" />
    //       <h3 className="text-lg font-medium text-foreground mb-2">No Creator Community Content Yet</h3>
    //       <p className="text-muted-foreground">
    //         Be the first to publish arrangements as a Creator Community member!
    //       </p>
    //     </div>
    //   );
    // }

    return (
        <div className={cn("space-y-6", className)}>
            {/* <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-400" />
                <h2 className="text-xl font-semibold">
                    Creator Community Arrangements
                </h2>
                <span className="text-sm text-muted-foreground">
                    ({songs.length})
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {songs.map((item) => (
                    <CreatorProCard
                        key={item.song.id}
                        song={item.song}
                        creator={item.creator}
                        currentUserId={currentUserId}
                        onAddToLibrary={onAddToLibrary}
                        isInLibrary={libraryIds.includes(item.song.id)}
                    />
                ))}
            </div> */}
        </div>
    );
}

export default CreatorProSection;
