import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, ArrowRight, Loader2, CloudOff, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { localNetworkSync } from '@/lib/capacitor/localNetworkSync';

const OfflineJoin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ipAddress, setIpAddress] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!ipAddress.trim() && !sessionCode.trim()) {
      toast({
        title: 'Connection Info Required',
        description: 'Please enter the IP address or session code from the Music Director.',
        variant: 'destructive'
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Extract setlist ID from session code if provided
      let setlistId = sessionCode.trim();
      if (sessionCode.startsWith('live-')) {
        setlistId = sessionCode.replace('live-', '');
      }

      // Parse IP address and port
      let ip = ipAddress.trim();
      let port = 8765; // Default port
      
      if (ip.includes(':')) {
        const parts = ip.split(':');
        ip = parts[0];
        port = parseInt(parts[1], 10) || 8765;
      }

      let success = false;

      // If IP address is provided, try WebSocket connection first
      if (ip) {
        // If no session code provided, use a placeholder - the MD will send the real setlist ID
        const targetSetlistId = setlistId || 'pending';
        success = await localNetworkSync.connectToMD(ip, targetSetlistId, port);
        
        if (success) {
          // Wait briefly for sync response to get actual setlist ID
          await new Promise(resolve => setTimeout(resolve, 500));
          const state = localNetworkSync.getState();
          if (state?.setlistId) {
            setlistId = state.setlistId;
          }
        }
      } else if (setlistId) {
        // Session code only - use BroadcastChannel (same device/browser)
        success = await localNetworkSync.connectToMD('localhost', setlistId, port);
      }
      
      if (success && setlistId && setlistId !== 'pending') {
        toast({
          title: 'Connected!',
          description: 'Successfully connected to the live session.',
        });
        // Navigate to the guest live view (no auth/session required)
        navigate('/offline-guest');
      } else if (success) {
        toast({
          title: 'Connected',
          description: 'Joined session as guest. Waiting for content from Music Director...',
        });
        // Navigate to guest live view - will receive content from MD
        navigate('/offline-guest');
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Could not connect to the session. Please verify the IP address and ensure devices are on the same network.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Error',
        description: 'An error occurred while connecting. Make sure you are on the same WiFi network.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-white">Join Live Session</CardTitle>
          <CardDescription className="text-slate-400">
            Connect to the Music Director's device to sync with the band
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* IP Address Input - Primary method */}
          <div className="space-y-2">
            <Label htmlFor="ip" className="text-slate-300 flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              MD's IP Address
            </Label>
            <div className="relative">
              <Input
                id="ip"
                placeholder="192.168.1.5:8765"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 font-mono text-lg text-center"
              />
            </div>
            <p className="text-xs text-slate-500">
              Enter the IP address shown on the Music Director's screen (e.g., 192.168.1.5:8765)
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Or use session code</span>
            </div>
          </div>

          {/* Session Code Input - Fallback for same device */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-slate-300">Session Code (same browser only)</Label>
            <Input
              id="code"
              placeholder="live-abc123"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">
              For connecting from another tab on the same device
            </p>
          </div>

          <Button 
            onClick={handleConnect} 
            className="w-full" 
            size="lg"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect to Session
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {/* Instructions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <CloudOff className="h-4 w-4" />
                Offline Local Network Sync
              </h4>
              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                <li><strong className="text-slate-300">Same WiFi</strong> - All devices must be on the same network</li>
                <li><strong className="text-slate-300">Get IP</strong> - Ask the MD for their IP address (shown on their screen)</li>
                <li><strong className="text-slate-300">Enter & Connect</strong> - Type the IP above and tap Connect</li>
                <li><strong className="text-slate-300">Auto Sync</strong> - Section and song changes will sync in real-time!</li>
              </ol>
              <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400">
                  <strong>No internet required!</strong> Works completely offline as long as all devices are on the same local network.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineJoin;
