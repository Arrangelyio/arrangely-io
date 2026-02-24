import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListMusic, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreatorSetlistsTabProps {
  creatorId: string;
  creatorType: string | null;
}

export const CreatorSetlistsTab = ({ creatorId, creatorType }: CreatorSetlistsTabProps) => {
  const navigate = useNavigate();

 const { data: setlists, isLoading } = useQuery({
  queryKey: ["creator-setlists", creatorId],
  queryFn: async () => {
    // Only fetch for creators with specific roles
    if (
      creatorType !== "creator_professional" &&
      creatorType !== "creator_arrangely"
    ) {
      return [];
    }

    // Ambil semua setlists milik creator
    const { data: setlistsData, error: setlistsError } = await supabase
      .from("setlists")
      .select("*")
      .eq("user_id", creatorId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (setlistsError) throw setlistsError;
    if (!setlistsData?.length) return [];

    // Ambil semua unique song_ids dari semua setlist
    const allSongIds = [
      ...new Set(setlistsData.flatMap((setlist) => setlist.song_ids || [])),
    ];

    if (allSongIds.length === 0) return [];

    // Ambil status is_public semua lagu
    const { data: songsData, error: songsError } = await supabase
      .from("songs")
      .select("id, is_public")
      .in("id", allSongIds);

    if (songsError) throw songsError;

    // Buat map cepat: id → is_public
    const songMap = Object.fromEntries(
      songsData.map((song) => [song.id, song.is_public])
    );

    // Filter hanya setlist yang semua song_ids-nya public
    const filteredSetlists = setlistsData.filter((setlist) => {
      const songIds = setlist.song_ids || [];
      if (songIds.length === 0) return false;
      return songIds.every((id) => songMap[id] === true);
    });

    return filteredSetlists;
  },
});


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!setlists || setlists.length === 0) {
    return (
      <div className="text-center py-12">
        <ListMusic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No setlists available</h3>
        <p className="text-sm text-muted-foreground">
          This creator hasn't published any setlists yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {setlists.map((setlist) => (
        <Card
          key={setlist.id}
          className="group hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => navigate(`/setlist/${setlist.slug || setlist.id}`)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <ListMusic className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold line-clamp-2">{setlist.name}</h3>
                {setlist.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {setlist.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music className="h-3 w-3" />
              <span>
                {setlist.setlist_songs?.length || 0} songs
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
