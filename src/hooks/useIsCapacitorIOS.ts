import { Capacitor } from '@capacitor/core';

/**
 * Utility hook to detect if the app is running on Capacitor iOS.
 * Used primarily to hide pricing/subscription features for Apple App Store compliance.
 */
export const useIsCapacitorIOS = () => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isCapacitorIOS = isNative && platform === 'ios';
  
  return {
    isCapacitorIOS,
    isNative,
    platform,
  };
};

/**
 * Non-hook version for use outside of React components.
 * Checks if running on Capacitor iOS platform.
 */
export const isCapacitorIOS = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};
