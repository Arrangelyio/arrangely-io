import React, { useState } from 'react';
import { Download, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSetlistDownload } from '@/hooks/useSetlistDownload';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { cn } from '@/lib/utils';

interface SetlistDownloadButtonProps {
  setlistId: string;
  userId: string;
  setlistName?: string;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const SetlistDownloadButton: React.FC<SetlistDownloadButtonProps> = ({
  setlistId,
  userId,
  setlistName,
  size = 'default',
  showLabel = true,
  className
}) => {
  const { 
    downloadSetlist, 
    deleteOfflineSetlist, 
    isSetlistDownloaded, 
    downloadProgress 
  } = useSetlistDownload();
  const { isOnline } = useOfflineDetection();
  const [isDeleting, setIsDeleting] = useState(false);

  const isDownloaded = isSetlistDownloaded(setlistId);
  const progress = downloadProgress[setlistId];
  const isDownloading = progress && progress.stage !== 'complete' && progress.stage !== 'error';

  const handleDownload = async () => {
    if (!isOnline) return;
    await downloadSetlist(setlistId, userId);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteOfflineSetlist(setlistId);
    setIsDeleting(false);
  };

  if (isDownloading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{progress.message}</span>
        </div>
        <Progress value={progress.progress} className="h-2" />
      </div>
    );
  }

  if (progress?.stage === 'error') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">{progress.message}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownload}
          disabled={!isOnline}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isDownloaded) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="ghost"
          size={size}
          className="text-primary"
          disabled
        >
          <CheckCircle2 className="h-4 w-4" />
          {showLabel && <span className="ml-2">Downloaded</span>}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleDownload}
      disabled={!isOnline}
      className={className}
    >
      <Download className="h-4 w-4" />
      {showLabel && <span className="ml-2">Download for Offline</span>}
    </Button>
  );
};
