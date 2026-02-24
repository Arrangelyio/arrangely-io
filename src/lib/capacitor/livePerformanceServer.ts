import { Capacitor } from '@capacitor/core';

export interface LivePerformanceState {
  setlistId: string;
  currentSongIndex: number;
  currentSectionIndex: number;
  currentBar: number;
  transpose: number;
  isPlaying: boolean;
  timestamp: number;
}

export interface LivePerformanceMessage {
  type: 'state_update' | 'song_change' | 'section_change' | 'bar_update' | 'transpose_change' | 'play' | 'pause' | 'stop' | 'sync_request' | 'sync_response';
  payload: Partial<LivePerformanceState>;
  senderId: string;
  timestamp: number;
}

type MessageHandler = (message: LivePerformanceMessage) => void;

class LivePerformanceServer {
  private ws: WebSocket | null = null;
  private clients: Set<WebSocket> = new Set();
  private messageHandlers: Set<MessageHandler> = new Set();
  private currentState: LivePerformanceState | null = null;
  private deviceId: string;
  private isMD: boolean = false;
  private serverPort: number = 8765;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    const stored = localStorage.getItem('live_performance_device_id');
    if (stored) return stored;
    
    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('live_performance_device_id', newId);
    return newId;
  }

  // MD (Music Director) starts the server
  async startAsServer(initialState: LivePerformanceState): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      
      // Fallback to BroadcastChannel for web
      return this.startBroadcastChannelMode(initialState);
    }

    try {
      this.isMD = true;
      this.currentState = initialState;
      
      // For native, we use a different approach with local network discovery
      // Since Capacitor doesn't have built-in WebSocket server, we'll use BroadcastChannel
      // for local same-device communication and document this limitation
      return this.startBroadcastChannelMode(initialState);
    } catch (error) {
      console.error('Failed to start server:', error);
      return false;
    }
  }

  // BroadcastChannel mode for same-device communication
  private broadcastChannel: BroadcastChannel | null = null;

  private startBroadcastChannelMode(initialState: LivePerformanceState): boolean {
    try {
      const channelName = `live-performance-${initialState.setlistId}`;
      this.broadcastChannel = new BroadcastChannel(channelName);
      this.isMD = true;
      this.currentState = initialState;

      this.broadcastChannel.onmessage = (event) => {
        const message = event.data as LivePerformanceMessage;
        
        // MD responds to sync requests
        if (message.type === 'sync_request' && this.isMD && this.currentState) {
          this.broadcast({
            type: 'sync_response',
            payload: this.currentState,
            senderId: this.deviceId,
            timestamp: Date.now()
          });
        }

        // Notify handlers
        this.messageHandlers.forEach(handler => handler(message));
      };

      
      return true;
    } catch (error) {
      console.error('Failed to start BroadcastChannel:', error);
      return false;
    }
  }

  // Client connects to MD
  async connectToServer(setlistId: string): Promise<boolean> {
    try {
      const channelName = `live-performance-${setlistId}`;
      this.broadcastChannel = new BroadcastChannel(channelName);
      this.isMD = false;

      this.broadcastChannel.onmessage = (event) => {
        const message = event.data as LivePerformanceMessage;
        
        // Update local state on sync response
        if (message.type === 'sync_response') {
          this.currentState = message.payload as LivePerformanceState;
        }

        // Notify handlers
        this.messageHandlers.forEach(handler => handler(message));
      };

      // Request sync from MD
      this.broadcast({
        type: 'sync_request',
        payload: {},
        senderId: this.deviceId,
        timestamp: Date.now()
      });

      
      return true;
    } catch (error) {
      console.error('Failed to connect to server:', error);
      return false;
    }
  }

  // Broadcast message to all connected devices
  broadcast(message: LivePerformanceMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
  }

  // MD updates state and broadcasts
  updateState(updates: Partial<LivePerformanceState>): void {
    // In offline mode, allow updates even if isMD wasn't formally set
    // This handles cases where the state might not be perfectly synchronized
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
    
    this.broadcast({
      type: messageType,
      payload: this.currentState,
      senderId: this.deviceId,
      timestamp: Date.now()
    });
  }

  private getMessageType(updates: Partial<LivePerformanceState>): LivePerformanceMessage['type'] {
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

  // Get current state
  getState(): LivePerformanceState | null {
    return this.currentState;
  }

  // Check if this device is MD
  isMusicalDirector(): boolean {
    return this.isMD;
  }

  // Get device ID
  getDeviceId(): string {
    return this.deviceId;
  }

  // Disconnect and cleanup
  disconnect(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.currentState = null;
    this.isMD = false;
    this.messageHandlers.clear();
  }

  // Specific actions for MD
  changeSong(songIndex: number): void {
    this.updateState({ 
      currentSongIndex: songIndex, 
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
}

export const livePerformanceServer = new LivePerformanceServer();
