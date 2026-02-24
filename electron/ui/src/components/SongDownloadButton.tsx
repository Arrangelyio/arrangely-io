import { useState, useEffect } from 'react';
import { Download, CheckCircle2, Loader2, X, HardDrive } from 'lucide-react';
import { audioDownloadService, DownloadProgress, TrackDownloadStatus } from '../lib/audioDownloadService';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SongDownloadButtonProps {
  sequencer: any;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function SongDownloadButton({ 
  sequencer, 
  size = 'md',
  showLabel = false 
}: SongDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [trackStatuses, setTrackStatuses] = useState<TrackDownloadStatus[]>([]);

  useEffect(() => {
    checkCacheStatus();
  }, [sequencer.song_id]); // Use song_id for consistency with cache key

  const checkCacheStatus = async () => {
    setIsChecking(true);
    try {
      
      const statuses = await audioDownloadService.checkSongCacheStatus(sequencer);
      
      setTrackStatuses(statuses);
      setIsCached(statuses.every(s => s.cached));
    } catch (error) {
      console.error('Error checking cache status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDownloading) {
      audioDownloadService.cancelDownload(sequencer.song_id);
      setIsDownloading(false);
      setProgress(null);
      return;
    }

    setIsDownloading(true);
    try {
      await audioDownloadService.downloadSong(sequencer, (p) => {
        setProgress(p);
        if (p.status === 'complete') {
          setIsCached(true);
          setIsDownloading(false);
        }
      });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
      checkCacheStatus();
    }
  };

  const cachedCount = trackStatuses.filter(s => s.cached).length;
  const totalCount = trackStatuses.length;
  const overallProgress = progress 
    ? ((progress.downloadedTracks + progress.currentTrackProgress / 100) / progress.totalTracks) * 100
    : (cachedCount / totalCount) * 100;

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  if (isChecking) {
    return (
      <div className={`${buttonSize} flex items-center justify-center`}>
        <Loader2 className={`${iconSize} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDownload}
            className={`${buttonSize} flex items-center justify-center rounded-full transition-all ${
              isCached 
                ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                : isDownloading
                  ? 'bg-primary/20 text-primary hover:bg-destructive/20 hover:text-destructive'
                  : 'bg-secondary hover:bg-primary/20 hover:text-primary text-muted-foreground'
            }`}
          >
            {isCached ? (
              <CheckCircle2 className={iconSize} />
            ) : isDownloading ? (
              <div className="relative">
                <Loader2 className={`${iconSize} animate-spin`} />
                {showLabel && <X className="w-3 h-3 absolute -top-1 -right-1" />}
              </div>
            ) : (
              <Download className={iconSize} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {isCached ? (
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-500" />
              <span>All {totalCount} tracks cached locally</span>
            </div>
          ) : isDownloading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span>Downloading track {(progress?.currentTrackIndex ?? 0) + 1}/{totalCount}</span>
                <span className="text-muted-foreground">{Math.floor(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">Click to cancel</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p>Download for offline use</p>
              <p className="text-xs text-muted-foreground">
                {cachedCount > 0 
                  ? `${cachedCount}/${totalCount} tracks cached`
                  : `${totalCount} tracks to download`
                }
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
