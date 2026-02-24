import { useCallback, useEffect, useRef } from 'react';
import { localNetworkSync, SyncMessage } from '@/lib/capacitor/localNetworkSync';

interface BroadcastContent {
  setlistId: string;
  setlistName: string;
  currentSongIndex: number;
  currentSectionIndex: number;
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

/**
 * Hook to broadcast content to guest clients when MD changes song/section
 * This allows guests without local data to receive content from the MD
 * Works in both offline mode and online mode (when local sync is started via share modal)
 */
export const useGuestBroadcast = (enabled: boolean = true) => {
  const lastBroadcastRef = useRef<string>('');

  // Listen for sync requests from guests and respond with current state
  useEffect(() => {
    // Only listen if local sync is active as MD
    if (!localNetworkSync.isMusicalDirector()) return;

    const unsubscribe = localNetworkSync.onMessage((message: SyncMessage) => {
      // When a guest requests sync, send them the current state
      if (message.type === 'sync_request') {
        const currentState = localNetworkSync.getState();
        if (currentState) {
          
          // Re-broadcast current state to the new client
          localNetworkSync.broadcastMessage({
            type: 'sync_response',
            payload: currentState,
            senderId: localNetworkSync.getDeviceId(),
            timestamp: Date.now()
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Broadcast content to all connected guests
  const broadcastToGuests = useCallback((content: BroadcastContent) => {
    // Only broadcast if we are acting as MD in local sync
    if (!localNetworkSync.isMusicalDirector()) return;
    
    // Create a unique key to prevent duplicate broadcasts
    const contentKey = `${content.currentSongIndex}-${content.currentSectionIndex}-${content.sectionContent?.substring(0, 50)}`;
    if (contentKey === lastBroadcastRef.current) return;
    lastBroadcastRef.current = contentKey;

    console.log('[useGuestBroadcast] Broadcasting to guests:', {
      song: content.songTitle,
      section: content.sectionName
    });

    localNetworkSync.broadcastGuestContent(content);
  }, []);

  return { broadcastToGuests };
};
