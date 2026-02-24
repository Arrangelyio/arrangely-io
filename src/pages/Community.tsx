import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Sparkles, ChevronLeft, ChevronRight, Music, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MusicAnimatedBackground } from "@/components/backgrounds/MusicAnimatedBackground";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useCommunityCreators,
  useCommunitySongs,
  useCommunityTrendingSongs,
  useCommunityFollowingSongs,
} from "@/hooks/useCommunityCreators";

const Community = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useUserRole();
  
  // Pagination & sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "liked">("recent");
  const songsPerPage = 12;

  // Data hooks
  const { data: creators = [], isLoading: creatorsLoading } = useCommunityCreators();
  const { data: songsData, isLoading: songsLoading } = useCommunitySongs({
    page: currentPage,
    pageSize: songsPerPage,
    sortBy,
  });
  const { data: trendingSongs = [], isLoading: trendingLoading } = useCommunityTrendingSongs(10);
  const { data: followingSongs = [], isLoading: followingLoading } = useCommunityFollowingSongs(
    user?.id || null,
    10
  );

  // Scroll refs for carousels
  const creatorsScrollRef = useRef<HTMLDivElement>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const followingScrollRef = useRef<HTMLDivElement>(null);

  // Arrow visibility states
  const [showCreatorsLeftArrow, setShowCreatorsLeftArrow] = useState(false);
  const [showCreatorsRightArrow, setShowCreatorsRightArrow] = useState(false);
  const [showTrendingLeftArrow, setShowTrendingLeftArrow] = useState(false);
  const [showTrendingRightArrow, setShowTrendingRightArrow] = useState(false);
  const [showFollowingLeftArrow, setShowFollowingLeftArrow] = useState(false);
  const [showFollowingRightArrow, setShowFollowingRightArrow] = useState(false);

  const totalPages = Math.ceil((songsData?.total || 0) / songsPerPage);

  const checkArrowVisibility = (
    ref: React.RefObject<HTMLDivElement>,
    setLeft: (v: boolean) => void,
    setRight: (v: boolean) => void
  ) => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setLeft(scrollLeft > 0);
      setRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth / 2;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const creatorsEl = creatorsScrollRef.current;
    const trendingEl = trendingScrollRef.current;
    const followingEl = followingScrollRef.current;

    const handleCreatorsScroll = () =>
      checkArrowVisibility(creatorsScrollRef, setShowCreatorsLeftArrow, setShowCreatorsRightArrow);
    const handleTrendingScroll = () =>
      checkArrowVisibility(trendingScrollRef, setShowTrendingLeftArrow, setShowTrendingRightArrow);
    const handleFollowingScroll = () =>
      checkArrowVisibility(followingScrollRef, setShowFollowingLeftArrow, setShowFollowingRightArrow);

    creatorsEl?.addEventListener("scroll", handleCreatorsScroll);
    trendingEl?.addEventListener("scroll", handleTrendingScroll);
    followingEl?.addEventListener("scroll", handleFollowingScroll);

    // Initial check
    setTimeout(() => {
      handleCreatorsScroll();
      handleTrendingScroll();
      handleFollowingScroll();
    }, 300);

    return () => {
      creatorsEl?.removeEventListener("scroll", handleCreatorsScroll);
      trendingEl?.removeEventListener("scroll", handleTrendingScroll);
      followingEl?.removeEventListener("scroll", handleFollowingScroll);
    };
  }, [creators, trendingSongs, followingSongs]);

  const handleSongClick = (song: any) => {
    navigate(`/arrangement/${song.id}/${song.slug}?source=community`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Song card component for grid
  const SongCard = ({ song }: { song: any }) => (
    <Card
      className="group cursor-pointer overflow-hidden border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
      onClick={() => handleSongClick(song)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden">
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
          {typeof song.views_count === "number" && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
              <Eye className="h-3 w-3" />
              {song.views_count.toLocaleString()}
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-purple-400 transition-colors">
            {song.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{song.artist}</p>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 border border-purple-500/30">
              <AvatarImage src={song.arranger_avatar} />
              <AvatarFallback className="text-[10px] bg-purple-900/50 text-purple-300">
                {song.arranger?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{song.arranger}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Carousel song card (smaller)
  const CarouselSongCard = ({ song }: { song: any }) => (
    <div
      className="flex-shrink-0 w-40 sm:w-48 cursor-pointer group"
      onClick={() => handleSongClick(song)}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
        {song.youtube_thumbnail ? (
          <img
            src={song.youtube_thumbnail}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
            <Music className="h-8 w-8 text-purple-400/50" />
          </div>
        )}
      </div>
      <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-purple-400 transition-colors">
        {song.title}
      </h4>
      <p className="text-xs text-muted-foreground line-clamp-1">{song.artist}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <MusicAnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-foreground">Pro Community Arrangements</h1>
          </div>
          <p className="text-muted-foreground">
            Discover arrangements from our Creator Community members
          </p>
        </div>

        {/* Creators Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Meet Our Community Creators
              </h2>
              <p className="text-sm text-muted-foreground">
                Featured pro creators and contributors
              </p>
            </div>
          </div>

          {creatorsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No community creators yet
            </div>
          ) : (
            <div className="relative group/carousel">
              {showCreatorsLeftArrow && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                  onClick={() => scrollCarousel(creatorsScrollRef, "left")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              {showCreatorsRightArrow && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                  onClick={() => scrollCarousel(creatorsScrollRef, "right")}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}

              <div
                ref={creatorsScrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {creators.map((creator) => (
                  <Link
                    key={creator.user_id}
                    to={`/creator/${creator.creator_slug}`}
                    className="flex-shrink-0 text-center group/card"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="relative">
                      <Avatar className="h-16 w-16 sm:h-20 sm:w-20 mx-auto ring-2 ring-purple-500/50 group-hover/card:ring-purple-400 transition-all">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-900/50 text-purple-300 text-lg">
                          {creator.display_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground group-hover/card:text-purple-400 transition-colors truncate max-w-[80px] sm:max-w-[100px] mx-auto">
                      {creator.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{creator.song_count} songs</p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs h-7 px-3">
                      View Profile
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Trending Songs Section */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Popular Songs
          </h2>

          {trendingLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : trendingSongs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trending songs yet
            </div>
          ) : (
            <div className="relative group/carousel">
              {showTrendingLeftArrow && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                  onClick={() => scrollCarousel(trendingScrollRef, "left")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              {showTrendingRightArrow && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                  onClick={() => scrollCarousel(trendingScrollRef, "right")}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}

              <div
                ref={trendingScrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {trendingSongs.map((song) => (
                  <div key={song.id} style={{ scrollSnapAlign: "start" }}>
                    <CarouselSongCard song={song} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Following Songs Section (only if user logged in and has following songs) */}
        {user && followingSongs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-green-500" />
              Latest From Creators You Follow
            </h2>

            {followingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="relative group/carousel">
                {showFollowingLeftArrow && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                    onClick={() => scrollCarousel(followingScrollRef, "left")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                {showFollowingRightArrow && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hidden sm:flex"
                    onClick={() => scrollCarousel(followingScrollRef, "right")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}

                <div
                  ref={followingScrollRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {followingSongs.map((song) => (
                    <div key={song.id} style={{ scrollSnapAlign: "start" }}>
                      <CarouselSongCard song={song} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* All Songs Section with Pagination */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-400" />
              All Community Songs
              {songsData?.total ? (
                <span className="text-sm text-muted-foreground font-normal">
                  ({songsData.total})
                </span>
              ) : null}
            </h2>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Latest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="liked">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {songsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : !songsData?.songs || songsData.songs.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-purple-400/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Community Songs Yet
              </h3>
              <p className="text-muted-foreground">
                Be the first to publish arrangements as a Community member!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {songsData.songs.map((song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Community;
