/**
 * Download Status Panel
 * Shows overall download progress for all tracks
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Check, Cloud, RotateCcw, HardDrive, Wifi, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TrackDownloadIndicator from './TrackDownloadIndicator';
import type { TrackDownloadStatus } from '../lib/StreamingMultiTrackPlayer';

export type PlaybackMode = 'stream' | 'download';

interface DownloadStatusPanelProps {
  trackStatuses: TrackDownloadStatus[];
  trackNames?: string[];
  className?: string;
  playbackMode?: PlaybackMode;
  onPlaybackModeChange?: (mode: PlaybackMode) => void;
  onRetryTrack?: (trackIndex: number) => void;
  onRetryAllFailed?: () => void;
  onStopDownload?: () => void;
  isDownloading?: boolean;
  compact?: boolean;
}

export default function DownloadStatusPanel({
  trackStatuses,
  trackNames = [],
  className,
  playbackMode = 'stream',
  onPlaybackModeChange,
  onRetryTrack,
  onRetryAllFailed,
  onStopDownload,
  isDownloading = false,
  compact = false,
}: DownloadStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const cachedCount = trackStatuses.filter(s => s.status === 'cached').length;
  const downloadingCount = trackStatuses.filter(s => s.status === 'downloading').length;
  const errorCount = trackStatuses.filter(s => s.status === 'error').length;
  const streamingCount = trackStatuses.filter(s => s.status === 'streaming').length;
  const totalTracks = trackStatuses.length;

  const overallProgress = totalTracks > 0
    ? Math.round((cachedCount / totalTracks) * 100)
    : 0;

  const isAllCached = cachedCount === totalTracks;
  const hasErrors = errorCount > 0;

  // Calculate download progress for currently downloading tracks
  const downloadProgress = trackStatuses
    .filter(s => s.status === 'downloading')
    .reduce((sum, s) => sum + s.progress, 0) / Math.max(downloadingCount, 1);

  // Compact mode - just show mode selector inline
  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={playbackMode === 'stream' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-6 px-2 text-xs',
                    playbackMode === 'stream' && 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                  )}
                  onClick={() => onPlaybackModeChange?.('stream')}
                  disabled={isAllCached}
                >
                  <Wifi className="w-3 h-3 mr-1" />
                  Stream
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs max-w-48">
                  {isAllCached 
                    ? 'All tracks cached - streaming not needed' 
                    : 'Stream from cloud while playing'}
                </p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={playbackMode === 'download' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-6 px-2 text-xs',
                    playbackMode === 'download' && 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
                  )}
                  onClick={() => onPlaybackModeChange?.('download')}
                  disabled={isAllCached}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs max-w-48">
                  {isAllCached 
                    ? 'All tracks already downloaded' 
                    : 'Download tracks for offline use'}
                </p>
              </TooltipContent>
            </Tooltip>

            {isAllCached && (
              <div className="flex items-center gap-1 px-2 py-1 text-green-500 text-xs">
                <HardDrive className="w-3 h-3" />
                <span>Ready</span>
              </div>
            )}
          </div>

          {!isAllCached && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{cachedCount}/{totalTracks} cached</span>
              {hasErrors && <span className="text-red-500">{errorCount} failed</span>}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn('rounded-lg border bg-card', className)}>
        {/* Mode Selector - Stream vs Download */}
        <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Mode</span>
          <TooltipProvider>
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={playbackMode === 'stream' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-6 px-2 text-xs',
                      playbackMode === 'stream' && 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                    )}
                    onClick={() => onPlaybackModeChange?.('stream')}
                    disabled={isAllCached}
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Stream
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-48">
                    {isAllCached 
                      ? 'All tracks cached - streaming not needed' 
                      : 'Stream from cloud while playing. Downloads are paused to save bandwidth.'}
                  </p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={playbackMode === 'download' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-6 px-2 text-xs',
                      playbackMode === 'download' && 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
                    )}
                    onClick={() => onPlaybackModeChange?.('download')}
                    disabled={isAllCached}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-48">
                    {isAllCached 
                      ? 'All tracks already downloaded' 
                      : 'Download tracks for offline use. Play after download completes.'}
                  </p>
                </TooltipContent>
              </Tooltip>

              {isAllCached && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 text-green-500 text-xs">
                      <HardDrive className="w-3 h-3" />
                      <span>Ready</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">All tracks cached locally - ready for offline playback</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>

        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-3 py-2 h-auto"
          >
            <div className="flex items-center gap-3">
              {isAllCached ? (
                <div className="p-1.5 rounded bg-green-500/20">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              ) : downloadingCount > 0 ? (
                <div className="p-1.5 rounded bg-blue-500/20">
                  <Download className="w-4 h-4 text-blue-500 animate-pulse" />
                </div>
              ) : streamingCount > 0 ? (
                <div className="p-1.5 rounded bg-yellow-500/20">
                  <Cloud className="w-4 h-4 text-yellow-500" />
                </div>
              ) : null}

              <div className="text-left">
                <p className="text-sm font-medium">
                  {isAllCached
                    ? 'All tracks cached locally'
                    : downloadingCount > 0
                    ? `Downloading ${downloadingCount} track${downloadingCount > 1 ? 's' : ''}...`
                    : streamingCount > 0
                    ? `Streaming ${streamingCount} track${streamingCount > 1 ? 's' : ''}`
                    : 'Preparing tracks...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cachedCount}/{totalTracks} cached
                  {hasErrors && ` • ${errorCount} failed`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDownloading && onStopDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopDownload();
                  }}
                  className="h-6 px-2 text-xs text-red-500 hover:bg-red-500/10"
                >
                  <StopCircle className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}
              {!isAllCached && (
                <div className="w-24">
                  <Progress value={overallProgress} className="h-1.5" />
                </div>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* Retry All Failed Button */}
            {hasErrors && onRetryAllFailed && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetryAllFailed}
                className="w-full mb-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Retry All Failed ({errorCount})
              </Button>
            )}
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {trackStatuses.map((status, index) => (
                <TrackDownloadIndicator
                  key={index}
                  status={status.status}
                  progress={status.progress}
                  trackName={trackNames[index] || `Track ${index + 1}`}
                  isBuffering={status.isBuffering}
                  onRetry={status.status === 'error' && onRetryTrack ? () => onRetryTrack(index) : undefined}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
