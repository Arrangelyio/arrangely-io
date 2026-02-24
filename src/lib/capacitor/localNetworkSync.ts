import { Capacitor } from '@capacitor/core';

export interface SyncState {
  setlistId: string;
  currentSongIndex: number;
  currentSongId?: string;
  currentSectionIndex: number;
  currentBar: number;
  transpose: number;
  isPlaying: boolean;
  timestamp: number;
  // Extended fields for guest sync (content sharing)
  setlistName?: string;
  songTitle?: string;
  songArtist?: string;
  songKey?: string;
  songBpm?: number;
  sectionName?: string;
  sectionContent?: string;
  totalSongs?: number;
  totalSections?: number;
}

export interface SyncMessage {
  type: 'state_update' | 'song_change' | 'section_change' | 'bar_update' | 'transpose_change' | 'play' | 'pause' | 'stop' | 'sync_request' | 'sync_response' | 'client_connected' | 'client_disconnected';
  payload: Partial<SyncState>;
  senderId: string;
  timestamp: number;
}

type MessageHandler = (message: SyncMessage) => void;
type ConnectionHandler = (connected: boolean, clientCount: number) => void;

const DEFAULT_PORT = 8765;

// Universal channel name for guest sync (doesn't require setlist ID)
const GUEST_SYNC_CHANNEL = 'chordflow-local-guest-sync';

// Bluetooth LE service/characteristic used for offline sync
// UUIDs are fixed so guests can discover without IP
const BLE_SERVICE_UUID = 'd3adbeef-7c6f-4f3b-9c5f-1234567890ab';
const BLE_CHARACTERISTIC_UUID = 'c0de0001-7c6f-4f3b-9c5f-1234567890ab';

class LocalNetworkSync {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private currentState: SyncState | null = null;
  private deviceId: string;
  private isMD: boolean = false;
  private serverPort: number = DEFAULT_PORT;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectedClients: number = 0;
  private isConnected: boolean = false;
  private serverIP: string | null = null;
  private ble: any | null = null;
  private bleDeviceId: string | null = null;
  private bleIsMD: boolean = false;
  private bleGattServer: any | null = null;
  private bleAdvertising: boolean = false;
  
  // BroadcastChannel fallback for same-browser/device
  private broadcastChannel: BroadcastChannel | null = null;
  private useBroadcastFallback: boolean = false;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    const stored = localStorage.getItem('local_sync_device_id');
    if (stored) return stored;
    
    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('local_sync_device_id', newId);
    return newId;
  }

  // Get the current server port
  getServerPort(): number {
    return this.serverPort;
  }

  // Get connected client count
  getConnectedClients(): number {
    return this.connectedClients;
  }

  // Check if connected
  getIsConnected(): boolean {
    return this.isConnected;
  }

  // Check if this device is MD
  isMusicalDirector(): boolean {
    return this.isMD;
  }

  // Get device ID
  getDeviceId(): string {
    return this.deviceId;
  }

  // Get current state
  getState(): SyncState | null {
    return this.currentState;
  }

  // MD starts the server/broadcast
  async startAsMD(initialState: SyncState, port: number = DEFAULT_PORT): Promise<boolean> {
    this.serverPort = port;
    this.isMD = true;
    this.currentState = initialState;
    
    // For web environment, use BroadcastChannel as fallback
    // For native Capacitor, WebSocket server would be started here
    if (Capacitor.isNativePlatform()) {
      // Native platform - would use Capacitor WebSocket server plugin
      // For now, fall back to BroadcastChannel which works across tabs on same device
      
    }
    
    // Use BroadcastChannel for local sync (works across browser tabs)
    return this.startBroadcastMode(initialState);
  }

  /**
   * Start MD over Bluetooth LE (no IP/Wi‑Fi needed).
   * Uses a fixed service/characteristic so guests can discover.
   */
  async startAsMDBluetooth(initialState: SyncState): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[LocalNetworkSync] Bluetooth mode requires native platform; falling back to broadcast');
      return this.startAsMD(initialState);
    }

    try {
      const ble = await this.ensureBle();

      // Initialize BLE stack
      await ble.initialize();

      // Create GATT server and characteristic for JSON messages
      this.bleGattServer = await ble.createGattServer();
      await ble.addService({
        service: BLE_SERVICE_UUID,
        characteristics: [
          {
            uuid: BLE_CHARACTERISTIC_UUID,
            properties: {
              read: true,
              write: true,
              notify: true,
            },
            permissions: {
              read: true,
              write: true,
            },
          },
        ],
      });

      // Start advertising so guests can find the MD
      await ble.startAdvertising({
        name: 'ChordFlow MD',
        services: [BLE_SERVICE_UUID],
        connectable: true,
        includeDeviceName: true,
      });

      this.isMD = true;
      this.bleIsMD = true;
      this.currentState = initialState;
      this.isConnected = true;
      this.bleAdvertising = true;
      this.useBroadcastFallback = false;

      // Immediately broadcast current state so first guest gets it without waiting
      if (this.currentState) {
        this.broadcastMessage({
          type: 'sync_response',
          payload: this.currentState,
          senderId: this.deviceId,
          timestamp: Date.now(),
        });
      }

      // Handle writes from guests (e.g., sync_request)
      ble.onWriteRequest(async (event: any) => {
        try {
          const message = this.decodeBlePayload(event?.value);
          if (!message) return;

          if (message.type === 'sync_request' && this.currentState) {
            this.connectedClients++;
            this.notifyConnectionHandlers(true, this.connectedClients);
            this.sendBleMessage({
              type: 'sync_response',
              payload: this.currentState,
              senderId: this.deviceId,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error('[LocalNetworkSync] Failed to handle BLE write', error);
        }
      });

      
      return true;
    } catch (error) {
      console.error('[LocalNetworkSync] Failed to start BLE MD mode, falling back to broadcast', error);
      return this.startAsMD(initialState);
    }
  }

  /**
   * Guest connects to MD via Bluetooth LE (no IP needed)
   */
  async connectToMDBluetooth(setlistId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[LocalNetworkSync] Bluetooth mode requires native platform; using BroadcastChannel');
      return this.connectBroadcastMode(setlistId);
    }

    try {
      const ble = await this.ensureBle();
      await ble.initialize();

      // Request/scan for device that advertises our service
      const device = await ble.requestDevice({
        services: [BLE_SERVICE_UUID],
        namePrefix: 'ChordFlow',
      });

      if (!device?.deviceId) {
        console.warn('[LocalNetworkSync] No BLE device selected');
        return false;
      }

      this.bleDeviceId = device.deviceId;
      await ble.connect({ deviceId: device.deviceId });

      // Subscribe to notifications for state updates
      await ble.startNotifications({
        deviceId: device.deviceId,
        service: BLE_SERVICE_UUID,
        characteristic: BLE_CHARACTERISTIC_UUID,
      }, (event: any) => {
        const message = this.decodeBlePayload(event?.value);
        if (!message) return;

        if (message.type === 'sync_response' || message.type === 'state_update' || message.type === 'song_change' || message.type === 'section_change') {
          this.currentState = message.payload as SyncState;
          this.isConnected = true;
          this.notifyConnectionHandlers(true, this.connectedClients);
        }
        this.messageHandlers.forEach((handler) => handler(message));
      });

      // Send sync request to MD via write (guest role)
      await this.sendBleRequest(device.deviceId, {
        type: 'sync_request',
        payload: { setlistId },
        senderId: this.deviceId,
        timestamp: Date.now(),
      });

      // Also send a second request after 1s to reduce "could not receive session info" timeouts
      setTimeout(() => {
        this.sendBleRequest(device.deviceId, {
          type: 'sync_request',
          payload: { setlistId },
          senderId: this.deviceId,
          timestamp: Date.now(),
        }).catch((err) => console.warn('Secondary sync_request failed', err));
      }, 1000);

      this.isConnected = true;
      this.useBroadcastFallback = false;
      this.notifyConnectionHandlers(true, 0);
      
      return true;
    } catch (error) {
      console.error('[LocalNetworkSync] Failed BLE connection, falling back to BroadcastChannel', error);
      return this.connectBroadcastMode(setlistId);
    }
  }

  private startBroadcastMode(initialState: SyncState): boolean {
    try {
      this.useBroadcastFallback = true;
      // Use universal channel name so guests can connect without knowing setlist ID
      this.broadcastChannel = new BroadcastChannel(GUEST_SYNC_CHANNEL);
      this.currentState = initialState;
      this.isConnected = true;

      this.broadcastChannel.onmessage = (event) => {
        const message = event.data as SyncMessage;
        
        // MD responds to sync requests by sending full current state with content
        if (message.type === 'sync_request' && this.isMD && this.currentState) {
          this.connectedClients++;
          this.notifyConnectionHandlers(true, this.connectedClients);
          
          
          
          this.broadcastMessage({
            type: 'sync_response',
            payload: this.currentState,
            senderId: this.deviceId,
            timestamp: Date.now()
          });
        }
        
        if (message.type === 'client_disconnected' && this.isMD) {
          this.connectedClients = Math.max(0, this.connectedClients - 1);
          this.notifyConnectionHandlers(true, this.connectedClients);
        }

        // Notify all handlers
        this.messageHandlers.forEach(handler => handler(message));
      };

      
      return true;
    } catch (error) {
      console.error('Failed to start broadcast mode:', error);
      return false;
    }
  }

  // Client connects to MD's server
  async connectToMD(ipAddress: string, setlistId: string, port: number = DEFAULT_PORT): Promise<boolean> {
    this.isMD = false;
    this.serverIP = ipAddress;
    this.serverPort = port;

    // Try WebSocket connection first
    const wsConnected = await this.connectWebSocket(ipAddress, port, setlistId);
    
    if (wsConnected) {
      return true;
    }

    // Fall back to BroadcastChannel for same-device sync
    
    return this.connectBroadcastMode(setlistId);
  }

  private async connectWebSocket(ipAddress: string, port: number, setlistId: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${ipAddress}:${port}`;
        
        
        this.ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            resolve(false);
          }
        }, 5000); // 5 second timeout

        this.ws.onopen = () => {
          clearTimeout(timeout);
          
          this.isConnected = true;
          this.useBroadcastFallback = false;
          
          // Request current state from MD
          this.sendWebSocketMessage({
            type: 'sync_request',
            payload: { setlistId },
            senderId: this.deviceId,
            timestamp: Date.now()
          });
          
          this.notifyConnectionHandlers(true, 0);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SyncMessage = JSON.parse(event.data);
            
            if (message.type === 'sync_response') {
              this.currentState = message.payload as SyncState;
            }
            
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          
          this.isConnected = false;
          this.notifyConnectionHandlers(false, 0);
          this.attemptReconnect(setlistId);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        resolve(false);
      }
    });
  }

  private connectBroadcastMode(setlistId: string): boolean {
    try {
      this.useBroadcastFallback = true;
      // Use universal channel name to connect to any MD session
      this.broadcastChannel = new BroadcastChannel(GUEST_SYNC_CHANNEL);
      this.isConnected = true;

      this.broadcastChannel.onmessage = (event) => {
        const message = event.data as SyncMessage;
        
        // Update local state on sync response or state updates
        if (message.type === 'sync_response' || message.type === 'state_update' || 
            message.type === 'song_change' || message.type === 'section_change') {
          
          this.currentState = message.payload as SyncState;

          // If guest just got a sync_response, notify connection handlers as connected
          if (message.type === 'sync_response') {
            this.isConnected = true;
            this.notifyConnectionHandlers(true, this.connectedClients);
          }
        }

        // Notify handlers
        this.messageHandlers.forEach(handler => handler(message));
      };

      // Request sync from MD
      this.broadcastMessage({
        type: 'sync_request',
        payload: { setlistId },
        senderId: this.deviceId,
        timestamp: Date.now()
      });

      
      this.notifyConnectionHandlers(true, 0);
      return true;
    } catch (error) {
      console.error('Failed to connect via BroadcastChannel:', error);
      return false;
    }
  }

  private attemptReconnect(setlistId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      
      return;
    }

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectAttempts++;
      
      
      if (this.serverIP) {
        const connected = await this.connectWebSocket(this.serverIP, this.serverPort, setlistId);
        if (!connected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect(setlistId);
        }
      }
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }

  // Send message via WebSocket
  private sendWebSocketMessage(message: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Send message via BLE notify (only when acting as MD)
  private async sendBleMessage(message: SyncMessage): Promise<void> {
    if (!this.bleIsMD || !this.bleGattServer) return;

    try {
      const ble = await this.ensureBle();
      const value = this.encodeBlePayload(message);
      await ble.notify({
        service: BLE_SERVICE_UUID,
        characteristic: BLE_CHARACTERISTIC_UUID,
        value,
      });
    } catch (error) {
      console.error('[LocalNetworkSync] Failed to send BLE message', error);
    }
  }

  // Guest send a request via BLE write (used for sync_request)
  private async sendBleRequest(deviceId: string, message: SyncMessage): Promise<void> {
    try {
      const ble = await this.ensureBle();
      const value = this.encodeBlePayload(message);
      await ble.write({
        deviceId,
        service: BLE_SERVICE_UUID,
        characteristic: BLE_CHARACTERISTIC_UUID,
        value,
      });
    } catch (error) {
      console.error('[LocalNetworkSync] Failed to send BLE request', error);
    }
  }

  // Broadcast message to all connected clients
  broadcastMessage(message: SyncMessage): void {
    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWebSocketMessage(message);
    }
    
    // Also broadcast via BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }

    // Also notify via BLE (MD only)
    if (this.bleIsMD) {
      this.sendBleMessage(message);
    }
  }

  // MD updates state and broadcasts to all clients
  updateState(updates: Partial<SyncState>): void {
    if (!this.currentState) {
      console.warn('No current state to update - initializing default state');
      this.currentState = {
        setlistId: '',
        currentSongIndex: 0,
        currentSectionIndex: 0,
        currentBar: 0,
        transpose: 0,
        isPlaying: false,
        timestamp: Date.now()
      };
    }

    this.currentState = {
      ...this.currentState,
      ...updates,
      timestamp: Date.now()
    };

    const messageType = this.getMessageType(updates);
    
    this.broadcastMessage({
      type: messageType,
      payload: this.currentState,
      senderId: this.deviceId,
      timestamp: Date.now()
    });
  }

  private getMessageType(updates: Partial<SyncState>): SyncMessage['type'] {
    if ('currentSongIndex' in updates) return 'song_change';
    if ('currentSectionIndex' in updates) return 'section_change';
    if ('currentBar' in updates) return 'bar_update';
    if ('transpose' in updates) return 'transpose_change';
    if ('isPlaying' in updates && updates.isPlaying) return 'play';
    if ('isPlaying' in updates && !updates.isPlaying) return 'pause';
    return 'state_update';
  }

  // Subscribe to state updates
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  // Subscribe to connection status changes
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  private notifyConnectionHandlers(connected: boolean, clientCount: number): void {
    this.connectionHandlers.forEach(handler => handler(connected, clientCount));
  }

  // Specific actions for MD
  changeSong(songIndex: number): void {
    this.updateState({ 
      currentSongIndex: songIndex, 
      currentSongId: undefined,
      currentSectionIndex: 0, 
      currentBar: 0 
    });
  }

  changeSection(sectionIndex: number): void {
    this.updateState({ 
      currentSectionIndex: sectionIndex, 
      currentBar: 0 
    });
  }

  updateBar(bar: number): void {
    this.updateState({ currentBar: bar });
  }

  setTranspose(transpose: number): void {
    this.updateState({ transpose });
  }

  setPlaying(isPlaying: boolean): void {
    this.updateState({ isPlaying });
  }

  // Broadcast full content to guests (song info, section content, etc.)
  broadcastGuestContent(content: {
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
  }): void {
    // Update current state with content
    this.currentState = {
      ...this.currentState,
      ...content,
      currentBar: 0,
      timestamp: Date.now()
    };

    // Broadcast to all connected guests
    this.broadcastMessage({
      type: 'state_update',
      payload: this.currentState,
      senderId: this.deviceId,
      timestamp: Date.now()
    });
  }

  // Disconnect and cleanup
  disconnect(): void {
    // Notify MD that client is disconnecting
    if (!this.isMD && this.isConnected) {
      this.broadcastMessage({
        type: 'client_disconnected',
        payload: {},
        senderId: this.deviceId,
        timestamp: Date.now()
      });
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.ble) {
      try {
        if (this.bleAdvertising) {
          this.ble.stopAdvertising().catch(() => {});
        }
        if (this.bleDeviceId) {
          this.ble.disconnect({ deviceId: this.bleDeviceId }).catch(() => {});
        }
        if (this.bleGattServer) {
          this.ble.closeGattServer().catch(() => {});
        }
      } catch (error) {
        console.warn('[LocalNetworkSync] BLE cleanup warning', error);
      }
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.currentState = null;
    this.isMD = false;
    this.isConnected = false;
    this.connectedClients = 0;
    this.reconnectAttempts = 0;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }

  // Lazy load BLE plugin to avoid bundling on web
  // BLE functionality disabled - package not installed
  private async ensureBle(): Promise<any> {
    if (this.ble) return this.ble;
    
    // BLE plugin removed - return null to skip BLE functionality
    console.warn('[LocalNetworkSync] BLE plugin not available');
    return null;
  }

  // Encode SyncMessage into base64 string for BLE payload
  private encodeBlePayload(message: SyncMessage): string {
    const json = JSON.stringify(message);
    return btoa(unescape(encodeURIComponent(json)));
  }

  private decodeBlePayload(payload?: string): SyncMessage | null {
    if (!payload) return null;
    try {
      const json = decodeURIComponent(escape(atob(payload)));
      return JSON.parse(json);
    } catch (error) {
      console.error('[LocalNetworkSync] Failed to decode BLE payload', error);
      return null;
    }
  }
}

// Singleton instance
export const localNetworkSync = new LocalNetworkSync();
