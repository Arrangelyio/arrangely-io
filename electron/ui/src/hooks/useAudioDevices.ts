import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export function useAudioDevices() {
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [maxOutputChannels, setMaxOutputChannels] = useState<number>(2); // Default stereo

  useEffect(() => {
    loadDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    // Load saved preference
    const saved = localStorage.getItem('audioOutputDevice');
    if (saved) {
      setSelectedDeviceId(saved);
    }
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  // Detect channel count when selected device changes
  useEffect(() => {
    detectChannelCount(selectedDeviceId);
  }, [selectedDeviceId]);

  const loadDevices = async () => {
    try {
      // Request microphone permission to get device labels
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        console.warn('Microphone permission denied, device labels may be limited:', permissionError);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`
        }));
      
      setOutputDevices(outputs);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio devices:', error);
      setIsLoading(false);
    }
  };

  const detectChannelCount = useCallback(async (deviceId: string) => {
    try {
      // Create a temporary AudioContext to probe the device
      const audioContext = new AudioContext();
      
      // Try to set the sink ID if available (Chrome/Edge)
      const audioElement = new Audio();
      
      if ('setSinkId' in audioElement && deviceId !== 'default') {
        try {
          await (audioElement as any).setSinkId(deviceId);
        } catch (e) {
          console.warn('Could not set sink ID:', e);
        }
      }
      
      // Get the destination's max channel count
      // This reflects the audio hardware's output channel capability
      const maxChannels = audioContext.destination.maxChannelCount;
      
      
      
      // Store the actual hardware channel count (capped at 32)
      // This is used to generate Ableton-style output options (Main + Ext pairs)
      setMaxOutputChannels(Math.min(maxChannels, 32));
      
      audioContext.close();
    } catch (error) {
      console.error('Error detecting channel count:', error);
      // Fall back to stereo
      setMaxOutputChannels(2);
    }
  }, []);

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem('audioOutputDevice', deviceId);
  };

  return {
    outputDevices,
    selectedDeviceId,
    selectDevice,
    isLoading,
    maxOutputChannels
  };
}
