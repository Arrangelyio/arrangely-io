import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export interface NetworkState {
  isOnline: boolean;
  connectionType: string;
}

export const useOfflineDetection = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown'
  });

  useEffect(() => {
    const checkNetwork = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          setNetworkState({
            isOnline: status.connected,
            connectionType: status.connectionType
          });
        } catch (error) {
          console.error('Error checking network status:', error);
        }
      } else {
        setNetworkState({
          isOnline: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : 'none'
        });
      }
    };

    checkNetwork();

    // Listen for network changes
    let networkListener: any;

    if (Capacitor.isNativePlatform()) {
      Network.addListener('networkStatusChange', (status) => {
        setNetworkState({
          isOnline: status.connected,
          connectionType: status.connectionType
        });
      }).then(listener => {
        networkListener = listener;
      });
    } else {
      const handleOnline = () => setNetworkState({ isOnline: true, connectionType: 'wifi' });
      const handleOffline = () => setNetworkState({ isOnline: false, connectionType: 'none' });
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, []);

  return networkState;
};
