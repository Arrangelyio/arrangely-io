import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bluetooth, Radio, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { localNetworkSync } from '@/lib/capacitor/localNetworkSync';
import { Capacitor } from '@capacitor/core';

interface OfflineConnectionBannerProps {
  isOnline: boolean;
  className?: string;
}

export const OfflineConnectionBanner = ({ isOnline, className }: OfflineConnectionBannerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isBtConnecting, setIsBtConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected' | 'waiting'>('idle');
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  // Only show on native platforms when offline
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const connectAndNavigate = async (connectFn: () => Promise<boolean>) => {
    setIsBtConnecting(true);
    try {
      const success = await connectFn();
      if (success) {
        setStatus('waiting');
        const state = localNetworkSync.getState();
        if (state?.setlistId) {
          toast({
            title: 'Connected!',
            description: 'Bluetooth connection established.',
          });
          setStatus('connected');
          if (state.currentSongId) {
            const url = `/offline-live/${state.setlistId}/${state.currentSongId}`;
            setTargetUrl(url);
            // navigate(url);
          } else {
            const url = `/offline-live/${state.setlistId}`;
            setTargetUrl(url);
            // navigate(url);
          }
          return;
        }

        // wait for a setlistId from MD
        const unsubscribe = localNetworkSync.onMessage((message) => {
          if (message.payload?.setlistId) {
            unsubscribe();
            setStatus('connected');

            const songId = message.payload.currentSongId;
            const url = songId
              ? `/offline-live/${message.payload.setlistId}/${songId}`
              : `/offline-live/${message.payload.setlistId}`;

            setTargetUrl(url);
            // navigate(url);
          }
        });

        toast({
          title: 'Connected',
          description: 'Waiting for session info...',
        });

        setTimeout(() => {
          unsubscribe();
          const currentState = localNetworkSync.getState();
          if (!currentState?.setlistId) {
              setStatus('idle');
            toast({
              title: 'Timeout',
              description: 'Could not receive session info. Pleases try again near the MD device.',
              variant: 'destructive'
            });
          }
        }, 15000);
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Could not connect. Ensure MD is advertising via Bluetooth nearby.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      toast({
        title: 'Bluetooth required',
        description: 'Please turn on Bluetooth and try again.',
        variant: 'destructive'
      });
      toast({
        title: 'Connection Error',
        description: 'Failed to connect over Bluetooth.',
        variant: 'destructive'
      });
    } finally {
      setIsBtConnecting(false);
    }
  };

  const goToOfflineSongs = () => {
    navigate('/offline-downloads');
  };

  // return (
  //   <>
  //     <Card className={`bg-amber-500/10 border-amber-500/30 ${className}`}>
  //       <CardContent className="p-4">
  //         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
  //           <div className="flex items-center gap-3 flex-1">
  //             <div className="p-2 rounded-full bg-amber-500/20">
  //               <Bluetooth className="h-5 w-5 text-amber-500" />
  //             </div>
  //             <div className="flex-1">
  //               <h4 className="text-sm font-medium text-amber-500">Offline Mode</h4>
  //               {targetUrl && (
  //                 <div className="mt-1 text-[11px] text-muted-foreground break-all">
  //                   <span className="font-medium">Navigate to:</span> {targetUrl}
  //                 </div>
  //               )}
  //               <p className="text-xs text-muted-foreground">
  //                 Connect to the Music Director nearby via Bluetooth (no Wi‑Fi/IP needed)
  //               </p>
  //               {status !== 'idle' && (
  //                 <div className="flex items-center gap-2 text-[11px] text-amber-600 mt-1">
  //                   {status === 'waiting' && <Loader2 className="h-3 w-3 animate-spin" />}
  //                   {status === 'waiting' ? 'Connected. Waiting for session info...' : 'Connected.'}
  //                 </div>
  //               )}
  //             </div>
  //           </div>
  //           {/* <div className="flex gap-4 w-full sm:w-auto">
  //             <Button 
  //               size="sm"
  //               onClick={() => connectAndNavigate(() => localNetworkSync.connectToMDBluetooth('pending'))}
  //               disabled={isBtConnecting}
  //               className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-amber-950"
  //             >
  //               <Radio className="h-4 w-2 mr-2" />
  //               {isBtConnecting ? 'Connecting...' : 'Connect via Bluetooth'}
  //             </Button>
  //           </div> */}
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </>
  // );
};
