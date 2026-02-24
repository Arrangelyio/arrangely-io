import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className,
  showLabel = true 
}) => {
  const { isOnline, connectionType } = useOfflineDetection();

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        isOnline 
          ? 'bg-green-500/10 text-green-500' 
          : 'bg-amber-500/10 text-amber-500',
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          {showLabel && <span>Online</span>}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          {showLabel && <span>Offline Mode</span>}
        </>
      )}
    </div>
  );
};

interface DownloadStatusBadgeProps {
  isDownloaded: boolean;
  className?: string;
}

export const DownloadStatusBadge: React.FC<DownloadStatusBadgeProps> = ({
  isDownloaded,
  className
}) => {
  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
        isDownloaded 
          ? 'bg-primary/10 text-primary' 
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {isDownloaded ? (
        <>
          <Cloud className="h-3 w-3" />
          <span>Available Offline</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3 w-3" />
          <span>Download Required</span>
        </>
      )}
    </div>
  );
};
