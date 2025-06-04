// ABOUTME: Connection monitoring service for network state management
// Provides connection status, error handling, and automatic retry mechanisms

// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './SupabaseService';

// Note: NetInfo would need to be installed: npm install @react-native-community/netinfo
// For now, we'll create a mock implementation
const NetInfo = {
  addEventListener: (callback: (state: any) => void) => {
    // Mock implementation - always return online
    setTimeout(() => callback({ isConnected: true, type: 'wifi', isInternetReachable: true }), 100);
    return () => {}; // unsubscribe function
  },
};

export interface ConnectionState {
  isConnected: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
  details: {
    strength?: number;
    ssid?: string;
    frequency?: number;
    ipAddress?: string;
  };
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'error' | 'slow' | 'restored';
  timestamp: Date;
  connectionState: ConnectionState;
  metadata?: any;
}

type ConnectionCallback = (event: ConnectionEvent) => void;

class ConnectionMonitor {
  private currentState: ConnectionState | null = null;
  private callbacks: Set<ConnectionCallback> = new Set();
  private isMonitoring = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private isCircuitOpen = false;

  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_TIMEOUT = 30000; // 30 seconds
  private readonly SLOW_CONNECTION_THRESHOLD = 5000; // 5 seconds

  // Health check state
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Start monitoring connection state
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Subscribe to network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));

    // Start health checks
    this.startHealthChecks();
  }

  /**
   * Stop monitoring connection state
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    this.stopHealthChecks();

    console.info('📡 Connection monitoring stopped');
  }

  /**
   * Subscribe to connection events
   */
  subscribe(callback: ConnectionCallback): () => void {
    this.callbacks.add(callback);

    // Send current state immediately
    if (this.currentState) {
      callback({
        type: this.currentState.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date(),
        connectionState: this.currentState,
      });
    }

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current connection state
   */
  getCurrentState(): ConnectionState | null {
    return this.currentState;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.currentState?.isConnected || false;
  }

  /**
   * Check if connection is available (not in circuit breaker state)
   */
  isConnectionAvailable(): boolean {
    return this.isConnected() && !this.isCircuitOpen;
  }

  /**
   * Manual connection test
   */
  async testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: Error;
  }> {
    const startTime = Date.now();

    try {
      // Test Supabase connection
      const { error } = await supabase.from('users').select('id').limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        throw error;
      }

      this.onConnectionSuccess();

      return {
        success: true,
        latency,
      };
    } catch (error) {
      this.onConnectionFailure(error as Error);

      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Execute operation with automatic retry and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      backoffMultiplier?: number;
      initialDelay?: number;
    } = {},
  ): Promise<T> {
    const { maxRetries = 3, backoffMultiplier = 2, initialDelay = 1000 } = options;

    // Check circuit breaker
    if (this.isCircuitOpen) {
      throw new Error('Circuit breaker is open - connection unavailable');
    }

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.onConnectionSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        this.onConnectionFailure(lastError);

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }

    throw lastError!;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: any): void {
    const previousState = this.currentState;

    this.currentState = {
      isConnected: state.isConnected || false,
      connectionType: state.type,
      isInternetReachable: state.isInternetReachable,
      details: {
        strength: state.details?.strength,
        ssid: state.details?.ssid,
        frequency: state.details?.frequency,
        ipAddress: state.details?.ipAddress,
      },
    };

    // Detect connection changes
    if (!previousState) {
      // Initial state
      this.emitEvent({
        type: this.currentState.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date(),
        connectionState: this.currentState,
      });
    } else if (previousState.isConnected !== this.currentState.isConnected) {
      // Connection state changed
      if (this.currentState.isConnected) {
        // Reconnected
        this.onConnectionRestored();
        this.emitEvent({
          type: 'restored',
          timestamp: new Date(),
          connectionState: this.currentState,
        });
      } else {
        // Disconnected
        this.emitEvent({
          type: 'disconnected',
          timestamp: new Date(),
          connectionState: this.currentState,
        });
      }
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.isConnected()) {
        const result = await this.testConnection();

        if (result.success && result.latency && result.latency > this.SLOW_CONNECTION_THRESHOLD) {
          this.emitEvent({
            type: 'slow',
            timestamp: new Date(),
            connectionState: this.currentState!,
            metadata: { latency: result.latency },
          });
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Handle connection success
   */
  private onConnectionSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;

    if (this.isCircuitOpen) {
      this.isCircuitOpen = false;
      console.info('🔓 Circuit breaker closed - connection restored');
    }
  }

  /**
   * Handle connection failure
   */
  private onConnectionFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.isCircuitOpen = true;
      console.info('🔒 Circuit breaker opened due to repeated failures');

      // Set timeout to try again later
      setTimeout(() => {
        this.isCircuitOpen = false;
        console.info('⏰ Circuit breaker timeout - attempting to close');
      }, this.CIRCUIT_TIMEOUT);
    }

    this.emitEvent({
      type: 'error',
      timestamp: new Date(),
      connectionState: this.currentState!,
      metadata: { error: error.message, failureCount: this.failureCount },
    });
  }

  /**
   * Handle connection restoration
   */
  private onConnectionRestored(): void {
    // Reset circuit breaker state
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.isCircuitOpen = false;
  }

  /**
   * Emit event to all subscribers
   */
  private emitEvent(event: ConnectionEvent): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in connection event callback:', error);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStatistics(): {
    failureCount: number;
    lastFailureTime: Date | null;
    isCircuitOpen: boolean;
    currentState: ConnectionState | null;
  } {
    return {
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isCircuitOpen: this.isCircuitOpen,
      currentState: this.currentState,
    };
  }
}

export default new ConnectionMonitor();
