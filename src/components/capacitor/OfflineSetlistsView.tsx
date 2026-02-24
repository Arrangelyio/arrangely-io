import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSetlistDownload } from '@/hooks/useSetlistDownload';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { OfflineIndicator } from './OfflineIndicator';
import { 
  ListMusic, 
  Music, 
  Calendar, 
  Download,
  CloudOff,
  Loader2,
  ChevronRight,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfflineSetlist } from '@/lib/capacitor/offlineDatabase';

interface OfflineSetlistsViewProps {
  userId?: string;
  className?: string;
  onSelectSetlist?: (setlistId: string) => void;
}

export const OfflineSetlistsView = ({ userId, className, onSelectSetlist }: OfflineSetlistsViewProps) => {
  const navigate = useNavigate();
  const { downloadedSetlists, isLoading, refreshDownloadedSetlists } = useSetlistDownload();
  const { isOnline } = useOfflineDetection();

  useEffect(() => {
    refreshDownloadedSetlists();
  }, [refreshDownloadedSetlists]);

  const handleSelectSetlist = (setlist: OfflineSetlist) => {
    if (onSelectSetlist) {
      onSelectSetlist(setlist.id);
    } else {
      // Navigate to offline live preview route with first song
      const songPositions = JSON.parse(setlist.songs_json || '[]');
      const firstSongId = songPositions[0]?.song_id;
      navigate(`/offline-live/${setlist.id}${firstSongId ? `/${firstSongId}` : ''}`);
    }
  };

  const parseSongsCount = (setlist: OfflineSetlist): number => {
    try {
      const songs = JSON.parse(setlist.songs_json);
      return Array.isArray(songs) ? songs.length : 0;
    } catch {
      return 0;
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading offline setlists...</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with offline indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CloudOff className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Offline Mode</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline 
                ? 'Connected - Showing downloaded setlists' 
                : 'No internet - Only offline content available'}
            </p>
          </div>
        </div>
        <OfflineIndicator />
      </div>

      {/* Empty state */}
      {downloadedSetlists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Offline Setlists</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Download setlists while online to access them during live performances without internet.
            </p>
            {isOnline && (
              <Button onClick={() => navigate('/library')} variant="outline">
                <ListMusic className="h-4 w-4 mr-2" />
                Browse Setlists
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Setlist list */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Downloaded Setlists ({downloadedSetlists.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={refreshDownloadedSetlists}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {downloadedSetlists.map((setlist) => (
            <Card 
              key={setlist.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSelectSetlist(setlist)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <ListMusic className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{setlist.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(setlist.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Music className="h-3 w-3" />
                          {parseSongsCount(setlist)} songs
                        </div>
                      </div>
                      {setlist.theme && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {setlist.theme}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-500 border-green-500/30 shrink-0">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <WifiOff className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-400 text-sm">Live Performance Mode</h4>
              <p className="text-xs text-blue-400/80 mt-1">
                Downloaded setlists work completely offline. Perfect for live worship 
                where internet may be unavailable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
