import { Capacitor } from '@capacitor/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OfflineSetlistsView } from '@/components/capacitor/OfflineSetlistsView';
import { OfflineSongsView } from '@/components/capacitor/OfflineSongsView';
import { ListMusic, Music } from 'lucide-react';

const OfflineDownloads = () => {
  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Offline Downloads</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Offline downloads are available on the mobile app (Capacitor) only.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-sanctuary pb-10 px-1 pt-24">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Offline Downloads</h1>
          <p className="text-sm text-muted-foreground">Manage setlists and songs available offline</p>
        </div>

        <Tabs defaultValue="setlists" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="setlists" className="text-base">
              <ListMusic className="h-4 w-4 mr-2" />
              Setlists
            </TabsTrigger>
            <TabsTrigger value="songs" className="text-base">
              <Music className="h-4 w-4 mr-2" />
              Songs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setlists">
            <OfflineSetlistsView />
          </TabsContent>

          <TabsContent value="songs">
            <OfflineSongsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OfflineDownloads;
