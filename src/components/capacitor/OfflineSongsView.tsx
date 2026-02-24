import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OfflineIndicator } from '@/components/capacitor/OfflineIndicator';
import { offlineDatabase, OfflineSong } from '@/lib/capacitor/offlineDatabase';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { cn } from '@/lib/utils';
import { Music, Search, Loader2, CloudOff } from 'lucide-react';

interface OfflineSongsViewProps {
  className?: string;
}

export const OfflineSongsView = ({ className }: OfflineSongsViewProps) => {
  const navigate = useNavigate();
  const { isOnline } = useOfflineDetection();
  const [songs, setSongs] = useState<OfflineSong[]>([]);
  const [filtered, setFiltered] = useState<OfflineSong[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await offlineDatabase.initialize();
        const all = await offlineDatabase.getAllSongs();
        setSongs(all);
        setFiltered(all);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(songs);
      return;
    }
    setFiltered(
      songs.filter((s) => {
        return (
          s.title.toLowerCase().includes(q) ||
          (s.artist || '').toLowerCase().includes(q)
        );
      })
    );
  }, [search, songs]);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading offline songs...</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CloudOff className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Offline Songs</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Connected - Showing cached songs' : 'No internet - Only offline content available'}
            </p>
          </div>
        </div>
        <OfflineIndicator />
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search offline songs"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Offline Songs</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Download a setlist while online to cache its songs for offline use.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/offline-downloads')}>View Offline Downloads</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Downloaded Songs ({filtered.length})</p>
          {filtered.map((song) => (
            <Card key={song.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist || 'Unknown artist'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {song.key && <Badge variant="secondary">Key: {song.key}</Badge>}
                      {song.bpm && <Badge variant="secondary">{song.bpm} BPM</Badge>}
                      {song.time_signature && <Badge variant="secondary">{song.time_signature}</Badge>}
                      <Badge variant="outline">Available Offline</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
