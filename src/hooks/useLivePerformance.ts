import { useState, useEffect, useCallback } from 'react';
import { livePerformanceServer, LivePerformanceState, LivePerformanceMessage } from '@/lib/capacitor/livePerformanceServer';

export const useLivePerformance = (setlistId: string) => {
  const [state, setState] = useState<LivePerformanceState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMD, setIsMD] = useState(false);
  const [lastMessage, setLastMessage] = useState<LivePerformanceMessage | null>(null);

  const startAsMD = useCallback(async (initialSongIndex: number = 0) => {
    const initialState: LivePerformanceState = {
      setlistId,
      currentSongIndex: initialSongIndex,
      currentSectionIndex: 0,
      currentBar: 0,
      transpose: 0,
      isPlaying: false,
      timestamp: Date.now()
    };

    const success = await livePerformanceServer.startAsServer(initialState);
    if (success) {
      setIsMD(true);
      setIsConnected(true);
      setState(initialState);
    }
    return success;
  }, [setlistId]);

  const joinAsClient = useCallback(async () => {
    const success = await livePerformanceServer.connectToServer(setlistId);
    if (success) {
      setIsMD(false);
      setIsConnected(true);
    }
    return success;
  }, [setlistId]);

  useEffect(() => {
    const unsubscribe = livePerformanceServer.onMessage((message) => {
      setLastMessage(message);
      
      if (message.type === 'sync_response' || message.type === 'state_update' ||
          message.type === 'song_change' || message.type === 'section_change' ||
          message.type === 'bar_update' || message.type === 'transpose_change' ||
          message.type === 'play' || message.type === 'pause') {
        setState(message.payload as LivePerformanceState);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const disconnect = useCallback(() => {
    livePerformanceServer.disconnect();
    setIsConnected(false);
    setIsMD(false);
    setState(null);
  }, []);

  // MD-only actions
  const changeSong = useCallback((songIndex: number) => {
    if (!isMD) return;
    livePerformanceServer.changeSong(songIndex);
    setState(livePerformanceServer.getState());
  }, [isMD]);

  const changeSection = useCallback((sectionIndex: number) => {
    if (!isMD) return;
    livePerformanceServer.changeSection(sectionIndex);
    setState(livePerformanceServer.getState());
  }, [isMD]);

  const updateBar = useCallback((bar: number) => {
    if (!isMD) return;
    livePerformanceServer.updateBar(bar);
    setState(livePerformanceServer.getState());
  }, [isMD]);

  const setTranspose = useCallback((transpose: number) => {
    if (!isMD) return;
    livePerformanceServer.setTranspose(transpose);
    setState(livePerformanceServer.getState());
  }, [isMD]);

  const setPlaying = useCallback((playing: boolean) => {
    if (!isMD) return;
    livePerformanceServer.setPlaying(playing);
    setState(livePerformanceServer.getState());
  }, [isMD]);

  return {
    state,
    isConnected,
    isMD,
    lastMessage,
    startAsMD,
    joinAsClient,
    disconnect,
    // MD actions
    changeSong,
    changeSection,
    updateBar,
    setTranspose,
    setPlaying
  };
};
