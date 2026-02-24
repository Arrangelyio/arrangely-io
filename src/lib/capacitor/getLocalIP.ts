import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Gets the local IP address of the device.
 * Tries multiple methods:
 * 1. WebRTC for web browsers
 * 2. Network plugin info for native platforms
 * 3. Fallback detection methods
 */
export async function getLocalIP(): Promise<string | null> {
  // Method 1: Try WebRTC (works in most browsers)
  const webrtcIP = await getIPViaWebRTC();
  if (webrtcIP) {
    return webrtcIP;
  }

  // Method 2: For native platforms, try to get network info
  if (Capacitor.isNativePlatform()) {
    const networkIP = await getIPViaNativeNetwork();
    if (networkIP) {
      return networkIP;
    }
  }

  // Method 3: Try fetching from a local API that might expose the IP
  const apiIP = await getIPViaLocalAPI();
  if (apiIP) {
    return apiIP;
  }

  return null;
}

async function getIPViaWebRTC(): Promise<string | null> {
  if (typeof RTCPeerConnection === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    try {
      // Use public STUN servers to help discover the local IP
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });
      
      const candidates: string[] = [];
      let resolved = false;

      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (resolved) return;

        if (!event.candidate) {
          // ICE gathering complete
          if (candidates.length > 0) {
            // Prefer local IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const localIP = candidates.find(ip => 
              ip.startsWith('192.168.') || 
              ip.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
            );
            resolved = true;
            pc.close();
            resolve(localIP || candidates[0]);
          } else {
            resolved = true;
            pc.close();
            resolve(null);
          }
          return;
        }

        const candidate = event.candidate.candidate;
        // Match IPv4 addresses
        const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
        
        if (ipMatch) {
          const ip = ipMatch[0];
          // Skip invalid IPs
          if (!ip.startsWith('0.') && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
            // Check if it's a local network IP
            if (
              ip.startsWith('192.168.') || 
              ip.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
            ) {
              // Found a local IP - resolve immediately
              resolved = true;
              pc.close();
              resolve(ip);
              return;
            }
            candidates.push(ip);
          }
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {
          resolved = true;
          pc.close();
          resolve(null);
        });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pc.close();
          resolve(candidates.length > 0 ? candidates[0] : null);
        }
      }, 5000);
    } catch (error) {
      console.error('WebRTC IP detection failed:', error);
      resolve(null);
    }
  });
}

async function getIPViaNativeNetwork(): Promise<string | null> {
  try {
    const status = await Network.getStatus();
    
    // If connected to WiFi, the device has a local IP
    // Unfortunately, Capacitor Network plugin doesn't directly expose the IP
    // But we can verify we're on WiFi which is required for local sync
    if (status.connected && status.connectionType === 'wifi') {
      
      // The IP would need to be obtained via native plugin or displayed as instructions
      // For now, return null to try other methods
    }
    
    return null;
  } catch (error) {
    console.error('Native network IP detection failed:', error);
    return null;
  }
}

async function getIPViaLocalAPI(): Promise<string | null> {
  // This could call a local endpoint if running a server
  // For now, return null as this is a fallback
  return null;
}

/**
 * Check if the device is connected to WiFi
 */
export async function isOnWiFi(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // On web, assume WiFi/network is available
    return navigator.onLine;
  }

  try {
    const status = await Network.getStatus();
    return status.connected && status.connectionType === 'wifi';
  } catch {
    return navigator.onLine;
  }
}
