import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Radio, Users, Smartphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { localNetworkSync } from '@/lib/capacitor/localNetworkSync';

interface MDServerInfoProps {
  isActive: boolean;
  setlistId: string;
  connectedDevices?: number;
  className?: string;
}

export const MDServerInfo = ({ 
  isActive, 
  setlistId, 
  connectedDevices: externalConnectedDevices,
  className 
}: MDServerInfoProps) => {
  const [connectedClients, setConnectedClients] = useState(externalConnectedDevices || 0);

  // Listen for connection changes from localNetworkSync
  useEffect(() => {
    const unsubscribe = localNetworkSync.onConnectionChange((connected, clientCount) => {
      setConnectedClients(clientCount);
    });
    
    return () => unsubscribe();
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <Card className={cn('bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Bluetooth className="h-4 w-4 text-primary" />
          </div>
          <span>MD Bluetooth Broadcast</span>
          <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">
            <Radio className="h-3 w-3 mr-1 animate-pulse" />
            Advertising
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Connected Devices</p>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{connectedClients}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Mode</p>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Bluetooth LE</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-background/50 space-y-2">
          <h4 className="text-xs font-medium flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            How to Connect Other Devices
          </h4>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Open the app on each device and go to <strong className="text-foreground">Offline Join</strong></li>
            <li>Tap <strong className="text-foreground">Connect via Bluetooth</strong> and choose this MD (name: <strong>ChordFlow MD</strong>)</li>
            <li>Stay near the MD device while pairing</li>
            <li>Once connected, sections and tempo sync automatically</li>
          </ol>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
          <Bluetooth className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-500/90">
            Bluetooth broadcast active. Band members can pair directly without Wi‑Fi/IP.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
