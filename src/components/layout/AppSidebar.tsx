import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Music,
  GraduationCap,
  Calendar,
  Tags,
  Users,
  Settings,
  Library,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Receipt,
  LogOut,
  FileMusic,
  Grid3X3,
  ListMusic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import { CreateSetlistDialog } from "@/components/setlist/CreateSetlistDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MusicAnimatedBackground } from "@/components/backgrounds/MusicAnimatedBackground";

interface LibraryItem {
  id: string;
  title: string;
  type: "song" | "playlist" | "artist";
  thumbnail?: string;
  subtitle?: string;
}

const mainNavItems = [
  { key: "nav.home", path: "/", icon: Home },
  {
    key: "nav.communityLibrary",
    path: "/community-library",
    icon: Users,
    featured: true,
  },
];

// Filter pricing on iOS Capacitor (Apple App Store compliance)
const getLibraryNavItems = () => {
  const items = [
    { key: "nav.library", path: "/library", icon: Library, requireAuth: true },
    { key: "nav.lessons", path: "/arrangely-music-lab", icon: GraduationCap },
    { key: "nav.events", path: "/events", icon: Calendar },
    { key: "nav.pricing", path: "/pricing", icon: Tags },
  ];
  
  return isCapacitorIOS() 
    ? items.filter(item => item.path !== "/pricing")
    : items;
};

const creatorNavItems = [
  { key: "nav.creatorDashboard", path: "/creator-dashboard", icon: Settings },
];

interface SetlistItem {
  id: string;
  name: string;
  song_count: number;
  first_song_id: string | null;
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, role, canAccessRoute } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [recentItems, setRecentItems] = useState<LibraryItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    display_name?: string;
    avatar_url?: string;
  } | null>(null);
  const [recentSetlists, setRecentSetlists] = useState<SetlistItem[]>([]);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [showCreateSetlistDialog, setShowCreateSetlistDialog] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .single();
      setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Fetch recent library items
  // useEffect(() => {
  //   const fetchRecentItems = async () => {
  //     if (!user) {
  //       setRecentItems([]);
  //       return;
  //     }

  //     setLoadingRecent(true);
  //     try {
  //       const { data, error } = await supabase
  //         .from("user_library_actions")
  //         .select(
  //           "song_id, songs(id, title, artist, youtube_link, youtube_thumbnail)",
  //         )
  //         .eq("user_id", user.id)
  //         .eq("action_type", "add_to_library")
  //         .order("created_at", { ascending: false })
  //         .limit(10);

  //       if (error) throw error;

  //       const items: LibraryItem[] = (data || [])
  //         .filter((item: any) => item.songs)
  //         .map((item: any) => ({
  //           id: item.songs.id,
  //           title: item.songs.title,
  //           type: "song" as const,
  //           thumbnail:
  //             item.songs.youtube_thumbnail ||
  //             extractYouTubeThumbnail(item.songs.youtube_link),
  //           subtitle: item.songs.artist,
  //         }));

  //       setRecentItems(items);
  //     } catch (error) {
  //       console.error("Error fetching recent items:", error);
  //     } finally {
  //       setLoadingRecent(false);
  //     }
  //   };

  //   fetchRecentItems();
  // }, [user]);

  // Fetch recent setlists
  useEffect(() => {
    const fetchRecentSetlists = async () => {
      if (!user) {
        setRecentSetlists([]);
        return;
      }

      setLoadingSetlists(true);
      try {
        const { data, error } = await supabase
          .from("setlists")
          .select("id, name, song_ids")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        const items: SetlistItem[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          song_count: item.song_ids?.length || 0,
          first_song_id: item.song_ids?.[0] || null,
        }));

        setRecentSetlists(items);
      } catch (error) {
        console.error("Error fetching setlists:", error);
      } finally {
        setLoadingSetlists(false);
      }
    };

    fetchRecentSetlists();
  }, [user]);

  const extractYouTubeThumbnail = (url: string | null) => {
    if (!url) return undefined;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/,
    );
    return match
      ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
      : undefined;
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isCreator = role === "creator" || role === "admin";

  const handleLogout = () => {
    supabase.auth.signOut().then(() => {
      window.location.href = "/auth";
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen transition-all duration-300 sticky top-0 z-40 overflow-hidden",
        collapsed ? "w-[72px]" : "w-[280px]",
      )}
    >
      {/* Animated Music Background */}
      <MusicAnimatedBackground variant="minimal" />

      {/* Content */}
      <div className="relative flex flex-col h-full border-r border-border/50 backdrop-blur-sm">
        {/* Logo */}
        <div
          className={cn(
            "p-4 flex flex-col gap-4",
            !collapsed && "flex-row items-center justify-between",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"
                whileHover={{ scale: 1.05 }}
              >
                <img
                  src="/Final-Logo-Arrangely-Logogram.png"
                  alt="Arrangely"
                  className="w-6 h-6 object-contain"
                />
              </motion.div>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold text-foreground"
                >
                  Arrangely
                </motion.span>
              )}
            </Link>

            {/* Tombol Tutup (Hanya muncul saat Terbuka) */}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:bg-primary/10"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Tombol Buka (Hanya muncul di Tengah saat sidebar Mengecil) */}
          {collapsed && (
            <div className="flex justify-center border-b border-border/50 pb-4">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-sm hover:scale-110 transition-transform"
                onClick={() => setCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4 text-primary" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="p-2 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ x: collapsed ? 0 : 4 }}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center rounded-xl transition-all duration-200 relative",
                        // Logika perataan tengah saat collapsed
                        collapsed
                          ? "justify-center h-12 w-12 mx-auto"
                          : "gap-3 px-3 py-2.5",
                        active
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="font-medium">{t(item.key)}</span>
                      )}
                    </Link>
                  </motion.div>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{t(item.key)}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Your Library Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Library className="h-5 w-5" />
                <span className="font-semibold text-sm">Your Library</span>
              </div>
            )}
            {collapsed && (
              <Library className="h-5 w-5 text-muted-foreground mx-auto" />
            )}
            {/* {!collapsed && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/editor")}>
                    <FileMusic className="h-4 w-4 mr-2" />
                    New Arrangement
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/chord-grid-generator")}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Chord Grid
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )} */}
          </div>

          {/* Library Navigation */}
          <nav className="px-2 space-y-1">
            {getLibraryNavItems().map((item) => {
              if (item.requireAuth && !user) return null;
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <motion.div
                  key={item.path}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                    title={collapsed ? t(item.key) : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t(item.key)}</span>}
                  </Link>
                </motion.div>
              );
            })}

            {/* Creator Dashboard */}
            {isCreator &&
              creatorNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      )}
                      title={collapsed ? t(item.key) : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.key)}</span>}
                    </Link>
                  </motion.div>
                );
              })}
          </nav>

          {/* Setlist Section */}
          {user && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                {!collapsed && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ListMusic className="h-4 w-4" />
                    <span className="font-semibold text-xs uppercase tracking-wide">
                      Setlist
                    </span>
                  </div>
                )}
                {collapsed && (
                  <ListMusic className="h-4 w-4 text-muted-foreground mx-auto" />
                )}
                {!collapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-primary hover:bg-primary/10"
                    onClick={() => setShowCreateSetlistDialog(true)}
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                )}
              </div>
              {!collapsed && (
                <div className="space-y-1">
                  {loadingSetlists ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1.5"
                      >
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 flex-1" />
                      </div>
                    ))
                  ) : recentSetlists.length > 0 ? (
                    recentSetlists.map((setlist) => {
                      // Determine source based on current location
                      const source = location.pathname === "/" || location.pathname === "/home" 
                        ? "home" 
                        : location.pathname.startsWith("/community-library") 
                          ? "community-library" 
                          : location.pathname.startsWith("/community") 
                            ? "community" 
                            : location.pathname.startsWith("/setlist") 
                              ? "setlist" 
                              : "library";
                      
                      return (
                        <motion.div key={setlist.id} whileHover={{ x: 2 }}>
                          <Link
                            to={
                              setlist.first_song_id
                                ? `/setlist-performance/${setlist.id}/${setlist.first_song_id}?source=${source}`
                                : `/setlist-performance/${setlist.id}?source=${source}`
                            }
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                          <ListMusic className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate flex-1">
                            {setlist.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {setlist.song_count}
                          </span>
                        </Link>
                      </motion.div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground/60 px-2 py-1">
                      No setlists yet
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Items / Library Content */}
          {user && !collapsed && (
            <ScrollArea className="flex-1 px-2 mt-2">
              <div className="space-y-1 pb-4">
                {loadingRecent ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : recentItems.length > 0 ? (
                  recentItems.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{
                        x: 2,
                        backgroundColor: "hsl(var(--muted) / 0.5)",
                      }}
                      className="rounded-lg"
                    >
                      <Link
                        to={`/arrangement/${item.id}`}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors group"
                      >
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0 shadow-sm">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <Music className="h-4 w-4 text-primary/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subtitle || "Song"}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center">
                    {/* <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Add songs to your library
                    </p> */}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Collapsed state with icons only */}
          {user && collapsed && (
            <div className="flex-1 px-2 space-y-1">
              {recentItems.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/arrangement/${item.id}`}
                  title={item.title}
                  className="flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-muted overflow-hidden shadow-sm">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Music className="h-3 w-3 text-primary/50" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Separator className="opacity-50" />

        {/* User Profile Section at bottom */}
      </div>

      {/* Create Setlist Dialog */}
      <CreateSetlistDialog
        open={showCreateSetlistDialog}
        onOpenChange={setShowCreateSetlistDialog}
      />
    </aside>
  );
}

export default AppSidebar;
