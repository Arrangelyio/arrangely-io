import React, { useEffect, useState } from 'react';
import { Play, Pause, Radio, Users, Loader2, SkipBack, SkipForward, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLivePerformance } from '@/hooks/useLivePerformance';
import { useSetlistDownload } from '@/hooks/useSetlistDownload';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { OfflineIndicator, DownloadStatusBadge } from './OfflineIndicator';
import { MDServerInfo } from './MDServerInfo';
import { cn } from '@/lib/utils';

interface OfflineLivePreviewProps {
  setlistId: string;
  className?: string;
}

export const OfflineLivePreview: React.FC<OfflineLivePreviewProps> = ({
  setlistId,
  className
}) => {
  const { isOnline } = useOfflineDetection();
  const { isSetlistDownloaded, getOfflineSetlistData } = useSetlistDownload();
  const {
    state,
    isConnected,
    isMD,
    startAsMD,
    joinAsClient,
    disconnect,
    changeSong,
    changeSection,
    setTranspose,
    setPlaying
  } = useLivePerformance(setlistId);

  const [setlistData, setSetlistData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'md' | 'client'>('select');
  const [connectedDevices, setConnectedDevices] = useState(0);

  const isDownloaded = isSetlistDownloaded(setlistId);

  useEffect(() => {
    const loadData = async () => {
      if (isDownloaded) {
        const data = await getOfflineSetlistData(setlistId);
        setSetlistData(data);
      }
      setIsLoading(false);
    };
    loadData();
  }, [setlistId, isDownloaded, getOfflineSetlistData]);

  const handleStartAsMD = async () => {
    const success = await startAsMD(0);
    if (success) {
      setMode('md');
    }
  };

  const handleJoinAsClient = async () => {
    const success = await joinAsClient();
    if (success) {
      setMode('client');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setMode('select');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isDownloaded) {
    return (
      <Card className={cn('border-amber-500/50', className)}>
        <CardContent className="p-6 text-center">
          <DownloadStatusBadge isDownloaded={false} className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            This setlist must be downloaded before entering Live Mode.
          </p>
          {!isOnline && (
            <p className="text-sm text-amber-500 mt-2">
              Connect to the internet to download this setlist.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Mode selection screen
  if (mode === 'select') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Live Performance Mode</CardTitle>
            <OfflineIndicator showLabel={false} />
          </div>
          <p className="text-sm text-muted-foreground">
            {setlistData?.setlist?.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleStartAsMD} 
            className="w-full" 
            size="lg"
          >
            <Radio className="h-5 w-5 mr-2" />
            Start as Music Director (MD)
          </Button>
          <Button 
            onClick={handleJoinAsClient} 
            variant="outline" 
            className="w-full" 
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Join as Team Member
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            MD controls the song flow. Team members follow along.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentSong = setlistData?.songs?.[state?.currentSongIndex || 0];
  const currentSection = currentSong?.sections?.[state?.currentSectionIndex || 0];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isMD ? 'default' : 'secondary'}>
                {isMD ? 'Music Director' : 'Team Member'}
              </Badge>
              {isConnected && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  Connected
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Exit
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* MD Server Info - Shows IP and connection details */}
      {isMD && (
        <MDServerInfo
          isActive={true}
          setlistId={setlistId}
          connectedDevices={connectedDevices}
        />
      )}

      {/* Current Song Display */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Song {(state?.currentSongIndex || 0) + 1} of {setlistData?.songs?.length || 0}
              </p>
              <h2 className="text-xl font-bold">{currentSong?.title || 'No Song'}</h2>
              <p className="text-sm text-muted-foreground">{currentSong?.artist}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline">{currentSong?.key || 'C'}</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {currentSong?.bpm || 120} BPM
              </p>
            </div>
          </div>

          {/* Current Section */}
          <div 
            className="p-4 rounded-lg text-center"
            style={{ backgroundColor: currentSection?.color || 'hsl(var(--muted))' }}
          >
            <p className="text-xs opacity-70">Current Section</p>
            <h3 className="text-2xl font-bold">{currentSection?.name || 'N/A'}</h3>
            {state?.currentBar !== undefined && (
              <p className="text-sm mt-1">Bar {state.currentBar + 1}</p>
            )}
          </div>

          {/* Transpose Control */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Transpose</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => isMD && setTranspose((state?.transpose ?? 0) - 1)}
                disabled={!isMD}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-mono font-bold">
                {state?.transpose ?? 0}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => isMD && setTranspose((state?.transpose ?? 0) + 1)}
                disabled={!isMD}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      {currentSong?.sections && currentSong.sections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sections</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {currentSong.sections.map((section: any, index: number) => (
                <Button
                  key={section.id}
                  variant={state?.currentSectionIndex === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => isMD && changeSection(index)}
                  disabled={!isMD}
                  style={{
                    backgroundColor: state?.currentSectionIndex === index ? section.color : undefined
                  }}
                >
                  {section.name || `Section ${index + 1}`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Song List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Setlist ({setlistData?.songs?.length || 0} songs)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[180px]">
            <div className="p-2 space-y-1">
              {setlistData?.songs?.map((song: any, idx: number) => (
                <Button
                  key={song.id}
                  variant={(state?.currentSongIndex ?? 0) === idx ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-auto py-2',
                    (state?.currentSongIndex ?? 0) === idx && 'bg-primary/10'
                  )}
                  onClick={() => isMD && changeSong(idx)}
                  disabled={!isMD}
                >
                  <span className="text-xs text-muted-foreground w-5 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{song.key || 'C'}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Transport Controls (MD only) */}
      {isMD && (
        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeSong(Math.max(0, (state?.currentSongIndex || 0) - 1))}
            disabled={(state?.currentSongIndex || 0) === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={() => setPlaying(!state?.isPlaying)}
          >
            {state?.isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeSong((state?.currentSongIndex || 0) + 1)}
            disabled={(state?.currentSongIndex || 0) >= (setlistData?.songs?.length || 1) - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
