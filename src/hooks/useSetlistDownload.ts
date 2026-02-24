import { useState, useEffect, useCallback } from 'react';
import { setlistDownloadService, SetlistDownloadProgress } from '@/lib/capacitor/setlistDownloadService';
import { OfflineSetlist } from '@/lib/capacitor/offlineDatabase';

export const useSetlistDownload = () => {
  const [downloadedSetlists, setDownloadedSetlists] = useState<OfflineSetlist[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, SetlistDownloadProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadDownloadedSetlists = useCallback(async () => {
    setIsLoading(true);
    try {
      const setlists = await setlistDownloadService.getDownloadedSetlists();
      setDownloadedSetlists(setlists);
    } catch (error) {
      console.error('Error loading downloaded setlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloadedSetlists();
  }, [loadDownloadedSetlists]);

  const downloadSetlist = useCallback(async (setlistId: string, userId: string): Promise<boolean> => {
    const success = await setlistDownloadService.downloadSetlist(
      setlistId,
      userId,
      (progress) => {
        setDownloadProgress(prev => ({
          ...prev,
          [setlistId]: progress
        }));
      }
    );

    if (success) {
      await loadDownloadedSetlists();
    }

    // Clear progress after a delay
    setTimeout(() => {
      setDownloadProgress(prev => {
        const { [setlistId]: _, ...rest } = prev;
        return rest;
      });
    }, 2000);

    return success;
  }, [loadDownloadedSetlists]);

  const deleteOfflineSetlist = useCallback(async (setlistId: string): Promise<boolean> => {
    const success = await setlistDownloadService.deleteOfflineSetlist(setlistId);
    if (success) {
      await loadDownloadedSetlists();
    }
    return success;
  }, [loadDownloadedSetlists]);

  const isSetlistDownloaded = useCallback((setlistId: string): boolean => {
    return downloadedSetlists.some(s => s.id === setlistId);
  }, [downloadedSetlists]);

  const getOfflineSetlistData = useCallback(async (setlistId: string) => {
    return await setlistDownloadService.getOfflineSetlistData(setlistId);
  }, []);

  return {
    downloadedSetlists,
    downloadProgress,
    isLoading,
    downloadSetlist,
    deleteOfflineSetlist,
    isSetlistDownloaded,
    getOfflineSetlistData,
    refreshDownloadedSetlists: loadDownloadedSetlists
  };
};
