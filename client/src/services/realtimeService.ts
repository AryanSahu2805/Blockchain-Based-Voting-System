import { toast } from 'react-hot-toast';

export interface RealtimeUpdate {
  type: 'vote' | 'election' | 'user' | 'system';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export interface RealtimeSubscription {
  id: string;
  unsubscribe: () => void;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (data: RealtimeUpdate) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5000/ws';
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.fallbackToPolling();
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      toast.success('Real-time connection established');
    };

    this.ws.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data);
        this.handleUpdate(update);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.handleDisconnection();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    };
  }

  private handleUpdate(update: RealtimeUpdate) {
    // Notify all subscribers
    this.subscriptions.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in subscription callback:', error);
      }
    });

    // Show toast notifications for important updates
    this.showUpdateNotification(update);
  }

  private showUpdateNotification(update: RealtimeUpdate) {
    switch (update.type) {
      case 'vote':
        if (update.action === 'create') {
          toast.success(`New vote cast in ${update.data.electionTitle || 'election'}`);
        }
        break;
      case 'election':
        if (update.action === 'create') {
          toast.success(`New election created: ${update.data.title}`);
        } else if (update.action === 'update') {
          toast.success(`Election updated: ${update.data.title}`);
        }
        break;
      case 'system':
        if (update.action === 'update') {
          toast.success(update.data.message || 'System update');
        }
        break;
    }
  }

  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
    }
  }

  private fallbackToPolling() {
    console.log('Falling back to polling for real-time updates');
    // Implement polling fallback if needed
  }

  // Subscribe to real-time updates
  subscribe(callback: (data: RealtimeUpdate) => void): RealtimeSubscription {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscriptions.set(id, callback);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      }
    };
  }

  // Subscribe to specific election updates
  subscribeToElection(electionId: string, callback: (data: RealtimeUpdate) => void): RealtimeSubscription {
    const id = `election_${electionId}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCallback = (update: RealtimeUpdate) => {
      if (update.type === 'election' && update.data.id === electionId) {
        callback(update);
      }
    };

    this.subscriptions.set(id, wrappedCallback);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      }
    };
  }

  // Subscribe to vote updates for a specific election
  subscribeToVotes(electionId: string, callback: (data: RealtimeUpdate) => void): RealtimeSubscription {
    const id = `votes_${electionId}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCallback = (update: RealtimeUpdate) => {
      if (update.type === 'vote' && update.data.electionId === electionId) {
        callback(update);
      }
    };

    this.subscriptions.set(id, wrappedCallback);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      }
    };
  }

  // Subscribe to user updates
  subscribeToUser(walletAddress: string, callback: (data: RealtimeUpdate) => void): RealtimeSubscription {
    const id = `user_${walletAddress}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCallback = (update: RealtimeUpdate) => {
      if (update.type === 'user' && update.data.walletAddress === walletAddress) {
        callback(update);
      }
    };

    this.subscriptions.set(id, wrappedCallback);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      }
    };
  }

  // Subscribe to system updates
  subscribeToSystem(callback: (data: RealtimeUpdate) => void): RealtimeSubscription {
    const id = `system_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCallback = (update: RealtimeUpdate) => {
      if (update.type === 'system') {
        callback(update);
      }
    };

    this.subscriptions.set(id, wrappedCallback);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      }
    };
  }

  // Send message to WebSocket (if connected)
  send(message: any): boolean {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Manually reconnect
  reconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.initializeWebSocket();
  }

  // Cleanup
  destroy(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.subscriptions.clear();
  }
}

export default new RealtimeService();
