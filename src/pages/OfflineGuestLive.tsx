import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, WifiOff, Wifi, Music, ChevronUp, ChevronDown, Users, Loader2, Bluetooth } from 'lucide-react';
import { localNetworkSync, SyncMessage } from '@/lib/capacitor/localNetworkSync';
import { ChordClickableText } from '@/components/setlist/ChordClickableText';
import { useToast } from '@/hooks/use-toast';

interface GuestSyncState {
  setlistId: string;
  setlistName: string;
  currentSongIndex: number;
  currentSectionIndex: number;
  currentBar: number;
  transpose: number;
  isPlaying: boolean;
  songTitle: string;
  songArtist: string;
  songKey: string;
  songBpm: number;
  sectionName: string;
  sectionContent: string;
  totalSongs: number;
  totalSections: number;
}

const OfflineGuestLive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [syncState, setSyncState] = useState<GuestSyncState | null>(null);
  const [localTranspose, setLocalTranspose] = useState(0);
  const [waitingForData, setWaitingForData] = useState(true);
  const [btConnecting, setBtConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected via localNetworkSync
    const connected = localNetworkSync.getIsConnected();
    setIsConnected(connected);

    // Subscribe to messages from MD
    const unsubscribeMessage = localNetworkSync.onMessage((message: SyncMessage) => {
      
      
      // Handle full state sync from MD
      if (message.type === 'sync_response' || message.type === 'state_update' || 
          message.type === 'song_change' || message.type === 'section_change') {
        const payload = message.payload as any;
        
        // If MD sends guest sync data
        if (payload.songTitle || payload.setlistName) {
          setSyncState({
            setlistId: payload.setlistId || '',
            setlistName: payload.setlistName || 'Live Session',
            currentSongIndex: payload.currentSongIndex || 0,
            currentSectionIndex: payload.currentSectionIndex || 0,
            currentBar: payload.currentBar || 0,
            transpose: payload.transpose || 0,
            isPlaying: payload.isPlaying || false,
            songTitle: payload.songTitle || 'Waiting for song...',
            songArtist: payload.songArtist || '',
            songKey: payload.songKey || 'C',
            songBpm: payload.songBpm || 120,
            sectionName: payload.sectionName || '',
            sectionContent: payload.sectionContent || '',
            totalSongs: payload.totalSongs || 1,
            totalSections: payload.totalSections || 1,
          });
          setWaitingForData(false);
        }
      }
      
      // Handle transpose changes
      if (message.type === 'transpose_change') {
        const payload = message.payload as any;
        if (typeof payload.transpose === 'number') {
          setSyncState(prev => prev ? { ...prev, transpose: payload.transpose } : null);
        }
      }
      
      // Handle play/pause
      if (message.type === 'play' || message.type === 'pause') {
        const payload = message.payload as any;
        setSyncState(prev => prev ? { ...prev, isPlaying: payload.isPlaying } : null);
      }
    });

    // Subscribe to connection changes
    const unsubscribeConnection = localNetworkSync.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setWaitingForData(true);
      }
    });

    // Request sync from MD
    if (connected) {
      localNetworkSync.broadcastMessage({
        type: 'sync_request',
        payload: {},
        senderId: localNetworkSync.getDeviceId(),
        timestamp: Date.now()
      });
    }

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
    };
  }, []);

  const handleDisconnect = () => {
    localNetworkSync.disconnect();
    navigate('/');
  };

  const handleBluetoothConnect = async () => {
    setBtConnecting(true);
    try {
      const ok = await localNetworkSync.connectToMDBluetooth('pending');
      if (ok) {
        toast({
          title: 'Bluetooth connected',
          description: 'Waiting for session data...',
        });
        setWaitingForData(true);
      } else {
        toast({
          title: 'Failed to connect',
          description: 'Ensure MD is advertising Bluetooth.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[OfflineGuestLive] Bluetooth connect error', error);
      toast({
        title: 'Bluetooth required',
        description: 'Please enable Bluetooth on this device and try again.',
        variant: 'destructive',
      });
    } finally {
      setBtConnecting(false);
    }
  };

  const handleLocalTranspose = (delta: number) => {
    setLocalTranspose(prev => prev + delta);
  };

  // Apply transpose to content
  const transposeContent = (content: string, amount: number): string => {
    if (!content || amount === 0) return content;
    // Simple chord transposition - in production, use the full transpose utility
    return content;
  };

  const effectiveTranspose = (syncState?.transpose || 0) + localTranspose;

  // Not connected state
  // if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-700">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
              <Bluetooth className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Bluetooth Connect</h2>
              <p className="text-slate-400 text-sm">
                Pair with the Music Director nearby to start receiving the session.
              </p>
            </div>
            {/* <div className="space-y-3">
              <Button
                variant="secondary"
                onClick={handleBluetoothConnect}
                className="w-full"
                disabled={btConnecting}
              >
                <Bluetooth className="h-4 w-4 mr-2" />
                {btConnecting ? 'Connecting…' : 'Connect via Bluetooth'}
              </Button>
              <Button onClick={() => navigate('/offline-join')} variant="ghost" className="w-full text-slate-400">
                Other options
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    );
  // }

  // Waiting for data from MD
  if (waitingForData || !syncState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-700">
          <CardContent className="pt-6 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <Wifi className="h-16 w-16 text-green-400 animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connected to MD</h2>
            <p className="text-slate-400 mb-4">
              Waiting for session data from Music Director...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </div>
            <Button variant="outline" onClick={handleDisconnect} className="mt-6">
              Disconnect
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <div>
              <h1 className="font-semibold text-white">
                {syncState.songTitle}
              </h1>
              <p className="text-sm text-slate-400">
                {syncState.songArtist || 'Unknown Artist'} • Key: {syncState.songKey} • {syncState.songBpm} BPM
              </p>
            </div>
          </div>

          {/* Connection Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-400 border-green-500/30">
              <Wifi className="h-3 w-3" />
              Synced
            </Badge>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              Guest
            </Badge>
          </div>
        </div>
      </div>

      {/* Setlist Progress */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {syncState.setlistName}
          </span>
          <span className="text-slate-500">
            Song {syncState.currentSongIndex + 1} of {syncState.totalSongs}
          </span>
        </div>
      </div>

      {/* Local Transpose Control */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Transpose:</span>
            <span className="font-mono text-white">
              {effectiveTranspose > 0 ? `+${effectiveTranspose}` : effectiveTranspose}
            </span>
            {localTranspose !== 0 && (
              <span className="text-xs text-slate-500">
                (MD: {syncState.transpose > 0 ? `+${syncState.transpose}` : syncState.transpose}, You: {localTranspose > 0 ? `+${localTranspose}` : localTranspose})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => handleLocalTranspose(-1)}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleLocalTranspose(1)}>
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Current Section Header */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {syncState.sectionName || 'Section'}
            </Badge>
            <span className="ml-2 text-sm text-slate-400">
              Section {syncState.currentSectionIndex + 1} of {syncState.totalSections}
            </span>
          </div>
          {syncState.isPlaying && (
            <Badge variant="destructive" className="animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-auto p-4">
        <Card className="bg-slate-900 border-slate-700 h-full">
          <CardContent className="p-6">
            {syncState.sectionContent ? (
              <div className="space-y-2">
                {syncState.sectionContent.split('\n').map((line, idx) => {
                  // Simple chord line detection
                  const isChordLine = /^[A-G][#b]?m?(?:maj|min|dim|aug|sus|add)?[0-9]?/.test(line.trim());
                  
                  if (isChordLine || line.includes('|')) {
                    return (
                      <div key={idx} className="font-mono text-lg font-semibold text-cyan-400">
                        <ChordClickableText text={line} userRole="guitarist" />
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="text-lg text-slate-200">
                      {line || <span>&nbsp;</span>}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Music className="h-12 w-12 mx-auto mb-4" />
                <p>Waiting for content from Music Director...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-500">
        Following {syncState.setlistName} • Changes sync automatically from Music Director
      </div>
    </div>
  );
};

export default OfflineGuestLive;
