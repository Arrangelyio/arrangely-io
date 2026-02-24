import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

// Platform-specific utilities
export const isMobileApp = () => {
  return Capacitor.isNativePlatform() && (
    Capacitor.getPlatform() === 'ios' || 
    Capacitor.getPlatform() === 'android'
  );
};

export const isDesktopApp = () => {
  return Capacitor.isNativePlatform() && (
    Capacitor.getPlatform() === 'electron'
  );
};

export const isWebApp = () => {
  return Capacitor.getPlatform() === 'web';
};

// App info utilities
export const getAppInfo = async () => {
  if (Capacitor.isNativePlatform()) {
    const { App } = await import('@capacitor/app');
    return await App.getInfo();
  }
  return null;
};