// ABOUTME: Connection monitoring service for network state management
// Provides connection status, error handling, and automatic retry mechanisms

import { BaseService } from './BaseService';
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './SupabaseService';
import type { Result } from '../types/common.types';

interface NetInfoState {
  isConnected: boolean | null;
  type: string;
  isInternetReachable: boolean | null;
  details?: {
    strength?: number;
    ssid?: string;
    frequency?: number;
    ipAddress?: string;
  };
}

// Note: NetInfo would need to be installed: npm install @react-native-community/netinfo
// For now, we'll create a mock implementation
const NetInfo = {
  addEventListener: (callback: (state: NetInfoState) => void) => {
    // Mock implementation - always return online
    setTimeout(() => {
      callback({ isConnected: true, type: 'wifi', isInternetReachable: true });
    }, 100);
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
  metadata?: Record<string, unknown>;
}

type ConnectionCallback = (event: ConnectionEvent) => void;

class ConnectionMonitor extends BaseService {
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

  constructor() {
    super('ConnectionMonitor');
  }

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

    this.logger.info('Connection monitoring stopped', {
      code: 'CONNECTION_MONITOR_001',
      context: JSON.stringify({
        reason: 'Service stopped by user request',
        wasMonitoring: this.isMonitoring,
        hadActiveCallbacks: this.callbacks.size > 0,
        hadHealthCheck: this.healthCheckInterval !== null,
      }),
    });
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
    return this.currentState?.isConnected ?? false;
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
  async testConnection(): Promise<
    Result<{
      success: boolean;
      latency?: number;
      error?: Error;
    }>
  > {
    return this.wrapAsync('testConnection', async () => {
      const startTime = Date.now();

      // Test Supabase connection
      const { error } = await supabase.from('users').select('id').limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        // Enhance error with connection test context
        const enhancedError = new Error(`Supabase connection test failed: ${error.message}`);
        // Store original error details in context for logging
        (enhancedError as Error & { originalError?: unknown }).originalError = error;
        throw enhancedError;
      }

      this.onConnectionSuccess();

      return {
        success: true,
        latency,
      };
    });
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

    let lastError: Error = new Error('Operation failed');
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.onConnectionSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;

        // Log each retry attempt with context
        this.logError('executeWithRetry', error, {
          attempt,
          maxRetries,
          isLastAttempt: attempt === maxRetries,
          delay,
          backoffMultiplier,
          failureCount: this.failureCount,
          isCircuitOpen: this.isCircuitOpen,
          connectionState: this.currentState,
        });

        this.onConnectionFailure(lastError);

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });
        delay *= backoffMultiplier;
      }
    }

    throw lastError;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const previousState = this.currentState;

    this.currentState = {
      isConnected: state.isConnected ?? false,
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
      this.logger.info('Initial connection state detected', {
        code: 'CONNECTION_MONITOR_005',
        context: JSON.stringify({
          isConnected: this.currentState.isConnected,
          connectionType: this.currentState.connectionType,
          isInternetReachable: this.currentState.isInternetReachable,
        }),
      });
      this.emitEvent({
        type: this.currentState.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date(),
        connectionState: this.currentState,
      });
    } else if (previousState.isConnected !== this.currentState.isConnected) {
      // Connection state changed
      if (this.currentState.isConnected) {
        // Reconnected
        this.logger.info('Connection restored', {
          code: 'CONNECTION_MONITOR_006',
          context: JSON.stringify({
            previousConnectionType: previousState.connectionType,
            currentConnectionType: this.currentState.connectionType,
            wasInternetReachable: previousState.isInternetReachable,
            isInternetReachable: this.currentState.isInternetReachable,
            connectionDetails: this.currentState.details,
          }),
        });
        this.onConnectionRestored();
        this.emitEvent({
          type: 'restored',
          timestamp: new Date(),
          connectionState: this.currentState,
        });
      } else {
        // Disconnected
        this.logger.info('Connection lost', {
          code: 'CONNECTION_MONITOR_007',
          context: JSON.stringify({
            previousConnectionType: previousState.connectionType,
            hadInternetAccess: previousState.isInternetReachable,
            failureCount: this.failureCount,
            isCircuitOpen: this.isCircuitOpen,
          }),
        });
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

    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected()) {
        void this.testConnection()
          .then((result) => {
            if (
              result.success &&
              result.data?.latency &&
              result.data.latency > this.SLOW_CONNECTION_THRESHOLD
            ) {
              this.emitEvent({
                type: 'slow',
                timestamp: new Date(),
                connectionState: this.currentState!,
                metadata: { latency: result.data.latency },
              });
            }
          })
          .catch((error) => {
            this.logError('healthCheck', error, {
              isConnected: this.isConnected(),
              currentState: this.currentState,
              interval: this.HEALTH_CHECK_INTERVAL,
              slowThreshold: this.SLOW_CONNECTION_THRESHOLD,
              monitoringActive: this.isMonitoring,
            });
          });
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
      this.logger.info('Circuit breaker closed - connection restored', {
        code: 'CONNECTION_MONITOR_002',
        context: JSON.stringify({
          previousFailureCount: this.failureCount,
          timeSinceLastFailure: this.lastFailureTime
            ? Date.now() - new Date(this.lastFailureTime).getTime()
            : null,
          circuitWasOpenFor: 'auto-recovery',
        }),
      });
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
      this.logger.info('Circuit breaker opened due to repeated failures', {
        code: 'CONNECTION_MONITOR_003',
        context: JSON.stringify({
          failureCount: this.failureCount,
          threshold: this.FAILURE_THRESHOLD,
          lastError: error.message,
          timeSinceFirstFailure: this.lastFailureTime
            ? Date.now() - this.lastFailureTime.getTime()
            : 0,
          connectionState: this.currentState,
        }),
      });

      // Set timeout to try again later
      setTimeout(() => {
        this.isCircuitOpen = false;
        this.logger.info('Circuit breaker timeout - attempting to close', {
          code: 'CONNECTION_MONITOR_004',
          context: JSON.stringify({
            timeoutDuration: this.CIRCUIT_TIMEOUT,
            failureCountBeforeReset: this.failureCount,
            isConnected: this.isConnected(),
            connectionType: this.currentState?.connectionType,
          }),
        });
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
    this.callbacks.forEach((callback, index) => {
      try {
        callback(event);
      } catch (error) {
        this.logError('emitEvent', error, {
          event: {
            type: event.type,
            timestamp: event.timestamp.toISOString(),
            metadata: event.metadata,
          },
          connection: {
            isConnected: event.connectionState.isConnected,
            type: event.connectionState.connectionType,
            isInternetReachable: event.connectionState.isInternetReachable,
            details: event.connectionState.details,
          },
          subscriber: {
            totalCount: this.callbacks.size,
            failedIndex: index,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
          monitorState: {
            isMonitoring: this.isMonitoring,
            isCircuitOpen: this.isCircuitOpen,
            failureCount: this.failureCount,
          },
        });
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
