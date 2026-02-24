import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export interface AppInfo {
  name: string;
  id: string;
  build: string;
  version: string;
}

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const initCapacitor = async () => {
      const native = Capacitor.isNativePlatform();
      const currentPlatform = Capacitor.getPlatform();
      
      setIsNative(native);
      setPlatform(currentPlatform);

      if (native) {
        // Get app info
        try {
          const info = await App.getInfo();
          setAppInfo(info);
        } catch (error) {
          console.error('Error getting app info:', error);
        }

        // Configure status bar
        try {
          await StatusBar.setStyle({ style: Style.Default });
        } catch (error) {
          console.error('Error setting status bar:', error);
        }

        // Hide splash screen
        try {
          await SplashScreen.hide();
        } catch (error) {
          console.error('Error hiding splash screen:', error);
        }

        // Listen for keyboard events
        const keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', () => {
          setIsKeyboardOpen(true);
        });

        const keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardOpen(false);
        });

        // Listen for app state changes
        const appStateChangeListener = await App.addListener('appStateChange', (state) => {
          
        });

        // Cleanup listeners
        return () => {
          keyboardWillShowListener.remove();
          keyboardWillHideListener.remove();
          appStateChangeListener.remove();
        };
      }
    };

    initCapacitor();
  }, []);

  const exitApp = async () => {
    if (isNative) {
      try {
        await App.exitApp();
      } catch (error) {
        console.error('Error exiting app:', error);
      }
    }
  };

  const minimizeApp = async () => {
    if (isNative) {
      try {
        await App.minimizeApp();
      } catch (error) {
        console.error('Error minimizing app:', error);
      }
    }
  };

  return {
    isNative,
    platform,
    appInfo,
    isKeyboardOpen,
    exitApp,
    minimizeApp,
    isMobile: platform === 'ios' || platform === 'android',
    isWeb: platform === 'web',
  };
};