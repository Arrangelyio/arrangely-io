/**
 * Track Download Indicator
 * Shows download/cache status for each track
 */

import { Download, Check, AlertCircle, Loader2, Cloud, RotateCcw, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface TrackDownloadIndicatorProps {
  status: 'pending' | 'downloading' | 'cached' | 'error' | 'streaming';
  progress: number;
  trackName?: string;
  compact?: boolean;
  isBuffering?: boolean;
  onRetry?: () => void;
}

export default function TrackDownloadIndicator({
  status,
  progress,
  trackName,
  compact = false,
  isBuffering = false,
  onRetry,
}: TrackDownloadIndicatorProps) {
  const getStatusInfo = () => {
    // Buffering takes priority for streaming tracks
    if (isBuffering) {
      return {
        icon: Pause,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/20',
        label: 'Buffering...',
        animate: true,
      };
    }

    switch (status) {
      case 'cached':
        return {
          icon: Check,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          label: 'Cached locally',
          animate: false,
        };
      case 'downloading':
        return {
          icon: Download,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          label: `Downloading ${progress}%`,
          animate: true,
        };
      case 'streaming':
        return {
          icon: Cloud,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          label: 'Streaming from cloud',
          animate: false,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/20',
          label: 'Download failed',
          animate: false,
        };
      default:
        return {
          icon: Loader2,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Pending',
          animate: true,
        };
    }
  };

  const { icon: Icon, color, bgColor, label, animate } = getStatusInfo();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('p-1 rounded', bgColor, isBuffering && 'animate-pulse')}>
              <Icon
                className={cn(
                  'w-3 h-3',
                  color,
                  animate && (status === 'pending' ? 'animate-spin' : 'animate-pulse')
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {trackName && <span className="font-medium">{trackName}: </span>}
              {label}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', isBuffering && 'animate-pulse')}>
      <div className={cn('p-1.5 rounded', bgColor)}>
        <Icon
          className={cn(
            'w-4 h-4',
            color,
            animate && (status === 'pending' ? 'animate-spin' : 'animate-pulse')
          )}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        {trackName && (
          <p className="text-xs font-medium truncate">{trackName}</p>
        )}
        
        {status === 'downloading' ? (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        ) : (
          <p className={cn('text-xs', color)}>{label}</p>
        )}
      </div>

      {status === 'error' && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs hover:bg-red-500/20"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}
