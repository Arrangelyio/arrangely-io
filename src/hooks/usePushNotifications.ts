import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { toast } = useToast();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    initializePushNotifications();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && deviceToken && deviceId) {
        setTimeout(() => {
          saveDeviceToken(deviceToken, deviceId);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setDeviceToken(null);
        setIsRegistered(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [deviceToken, deviceId]);

  const initializePushNotifications = async () => {
    try {
      console.log('[Push] Starting initialization on platform:', Capacitor.getPlatform());
      
      // Get device ID first
      const deviceInfo = await Device.getId();
      const currentDeviceId = deviceInfo.identifier;
      setDeviceId(currentDeviceId);
      console.log('[Push] Device ID:', currentDeviceId);

      // Request permission
      console.log('[Push] Requesting permissions...');
      const permStatus = await FirebaseMessaging.requestPermissions();
      console.log('[Push] Permission status:', JSON.stringify(permStatus));

      if (permStatus.receive === 'granted') {
        // On iOS, APNs token may not be ready immediately after permission grant.
        // We need to wait a bit before requesting FCM token.
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
          console.log('[Push] iOS detected, waiting for APNs token...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Get FCM token with retry for iOS
        console.log('[Push] Getting FCM token...');
        let token: string | undefined;
        const maxRetries = platform === 'ios' ? 5 : 1;
        for (let i = 0; i < maxRetries; i++) {
          try {
            const result = await FirebaseMessaging.getToken();
            token = result.token;
            break;
          } catch (tokenError: any) {
            console.warn(`[Push] Token attempt ${i + 1}/${maxRetries} failed:`, tokenError?.message);
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              throw tokenError;
            }
          }
        }
        console.log('[Push] FCM Token received:', token);

        setDeviceToken(token);
        setIsRegistered(true);

        // Save token to database
        await saveDeviceToken(token, currentDeviceId);

        // Listen for token refresh
        await FirebaseMessaging.addListener('tokenReceived', async (event) => {
          console.log('[Push] FCM Token refreshed:', event.token);
          setDeviceToken(event.token);
          await saveDeviceToken(event.token, currentDeviceId);
        });

        // Listen for push notifications received (foreground)
        await FirebaseMessaging.addListener('notificationReceived', (notification) => {
          toast({
            title: notification.notification?.title || 'New Notification',
            description: notification.notification?.body || '',
          });
        });

        // Listen for notification tap
        await FirebaseMessaging.addListener('notificationActionPerformed', (notification) => {
          // Handle notification tap/action here
        });
      } else {
        console.log('[Push] Permission denied:', JSON.stringify(permStatus));
      }
    } catch (error: any) {
      console.error('[Push] Error initializing:', error?.message || error);
      console.error('[Push] Error stack:', error?.stack);
      // Only show toast if it's a real failure, not just web platform
      if (Capacitor.isNativePlatform()) {
        // toast({
        //   title: 'Notification Error',
        //   description: `Failed to register: ${error?.message || 'Unknown error'}`,
        //   variant: 'destructive',
        // });
      }
    }
  };

  const saveDeviceToken = async (token: string, devId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user logged in, skipping token save');
        return;
      }

      console.log('Saving FCM token for user:', user.id, 'device:', devId, 'platform:', Capacitor.getPlatform());

      const { error } = await supabase
        .from('push_notification_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          device_id: devId,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id',
        });

      if (error) {
        console.error('Error saving device token:', error);
      } else {
        console.log('FCM token saved successfully');
      }
    } catch (error) {
      console.error('Error saving device token:', error);
    }
  };

  const unregister = async () => {
    try {
      await FirebaseMessaging.removeAllListeners();
      setIsRegistered(false);
      setDeviceToken(null);

      if (deviceToken && deviceId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_notification_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('device_id', deviceId);
        }
      }
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  return {
    isRegistered,
    deviceToken,
    deviceId,
    unregister,
  };
};
