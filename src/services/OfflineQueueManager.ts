// ABOUTME: Offline queue manager for reliable operation synchronization
// Queues operations when offline and syncs them when connection is restored

import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo for now - would need to install @react-native-community/netinfo
const NetInfo = {
  addEventListener: (callback: (state: any) => void) => {
    // Mock implementation - always return online
    setTimeout(() => callback({ isConnected: true }), 100);
    return () => {}; // unsubscribe function
  },
};

// Simple UUID implementation to avoid additional dependency
const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface OfflineOperation {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
  userId: string;
  dependsOn?: string[]; // IDs of operations this depends on
}

export interface OfflineOperationResult {
  success: boolean;
  operation: OfflineOperation;
  error?: Error;
  data?: any;
}

interface QueueProcessor {
  [key: string]: (operation: OfflineOperation) => Promise<any>;
}

class OfflineQueueManager {
  private queue: OfflineOperation[] = [];
  private isProcessing = false;
  private isOnline = true;
  private deadLetterQueue: OfflineOperation[] = [];

  private readonly STORAGE_KEY = 'offline_operation_queue';
  private readonly DEAD_LETTER_KEY = 'dead_letter_queue';
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly BATCH_SIZE = 10;

  private processors: QueueProcessor = {};

  constructor() {
    this.initializeNetworkListener();
    this.loadPersistedQueue();
  }

  /**
   * Initialize network state monitoring
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected || false;

      if (!wasOnline && this.isOnline) {
        // Came back online, process queue
        console.info('📡 Connection restored, processing offline queue');
        this.processQueue();
      } else if (wasOnline && !this.isOnline) {
        console.info('📡 Connection lost, switching to offline mode');
      }
    });
  }

  /**
   * Load persisted queue from storage
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const [queueData, deadLetterData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.DEAD_LETTER_KEY),
      ]);

      if (queueData) {
        this.queue = JSON.parse(queueData).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
      }

      if (deadLetterData) {
        this.deadLetterQueue = JSON.parse(deadLetterData).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
      }

      // Sort queue by priority and timestamp
      this.sortQueue();

      console.info(`📦 Loaded ${this.queue.length} operations from offline queue`);
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue)),
        AsyncStorage.setItem(this.DEAD_LETTER_KEY, JSON.stringify(this.deadLetterQueue)),
      ]);
    } catch (error) {
      console.error('Error persisting offline queue:', error);
    }
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Register a processor for a specific operation type
   */
  registerProcessor(
    operationType: string,
    processor: (operation: OfflineOperation) => Promise<any>,
  ): void {
    this.processors[operationType] = processor;
  }

  /**
   * Add operation to queue
   */
  async addOperation(
    type: string,
    data: any,
    options: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
      userId: string;
      dependsOn?: string[];
    },
  ): Promise<string> {
    const operation: OfflineOperation = {
      id: uuid(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      priority: options.priority || 'medium',
      userId: options.userId,
      dependsOn: options.dependsOn,
    };

    // Check queue size limit
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest low priority operations
      this.cleanupQueue();
    }

    this.queue.push(operation);
    this.sortQueue();
    await this.persistQueue();

    console.info(`🔄 Added ${type} operation to offline queue (${this.queue.length} total)`);

    // Try to process immediately if online
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return operation.id;
  }

  /**
   * Process the entire queue
   */
  async processQueue(): Promise<OfflineOperationResult[]> {
    if (this.isProcessing || !this.isOnline) {
      return [];
    }

    this.isProcessing = true;
    const results: OfflineOperationResult[] = [];
    let processed = 0;

    console.info(`🚀 Processing offline queue (${this.queue.length} operations)`);

    try {
      while (this.queue.length > 0 && processed < this.BATCH_SIZE) {
        const operation = this.queue[0];

        // Check dependencies
        if (!this.areDependenciesSatisfied(operation)) {
          // Move to end of queue and continue
          this.queue.push(this.queue.shift()!);
          continue;
        }

        const result = await this.executeOperation(operation);
        results.push(result);

        if (result.success) {
          // Remove successful operation
          this.queue.shift();
          console.info(`✅ Successfully processed ${operation.type} operation`);
        } else {
          // Handle failure
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Move to dead letter queue
            const failedOp = this.queue.shift()!;
            this.deadLetterQueue.push(failedOp);
            console.info(`💀 Moved ${operation.type} operation to dead letter queue`);
          } else {
            // Keep for retry (move to end for exponential backoff effect)
            this.queue.push(this.queue.shift()!);
            console.info(
              `🔄 Retrying ${operation.type} operation (attempt ${operation.retryCount})`,
            );
          }
        }

        processed++;
      }

      await this.persistQueue();

      if (this.queue.length > 0) {
        console.info(`⏳ ${this.queue.length} operations remaining in queue`);
      } else {
        console.info('🎉 Offline queue processing complete');
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: OfflineOperation): Promise<OfflineOperationResult> {
    try {
      const processor = this.processors[operation.type];

      if (!processor) {
        throw new Error(`No processor registered for operation type: ${operation.type}`);
      }

      const data = await processor(operation);

      return {
        success: true,
        operation,
        data,
      };
    } catch (error) {
      return {
        success: false,
        operation,
        error: error as Error,
      };
    }
  }

  /**
   * Check if operation dependencies are satisfied
   */
  private areDependenciesSatisfied(operation: OfflineOperation): boolean {
    if (!operation.dependsOn || operation.dependsOn.length === 0) {
      return true;
    }

    // Check if all dependencies have been processed (not in queue)
    const queueIds = new Set(this.queue.map((op) => op.id));
    return operation.dependsOn.every((depId) => !queueIds.has(depId));
  }

  /**
   * Clean up queue by removing old low priority operations
   */
  private cleanupQueue(): void {
    // Remove old low priority operations
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    this.queue = this.queue.filter((op) => {
      if (op.priority === 'low' && op.timestamp.getTime() < cutoff) {
        console.info(`🗑️ Removed stale low priority operation: ${op.type}`);
        return false;
      }
      return true;
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    deadLetterLength: number;
    isProcessing: boolean;
    isOnline: boolean;
    queueByPriority: { high: number; medium: number; low: number };
  } {
    const queueByPriority = this.queue.reduce(
      (acc, op) => {
        acc[op.priority]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );

    return {
      queueLength: this.queue.length,
      deadLetterLength: this.deadLetterQueue.length,
      isProcessing: this.isProcessing,
      isOnline: this.isOnline,
      queueByPriority,
    };
  }

  /**
   * Retry operations in dead letter queue
   */
  async retryDeadLetterOperations(): Promise<void> {
    if (this.deadLetterQueue.length === 0) {
      return;
    }

    console.info(`🔄 Retrying ${this.deadLetterQueue.length} dead letter operations`);

    // Reset retry count and move back to main queue
    const retriedOps = this.deadLetterQueue.splice(0).map((op) => ({
      ...op,
      retryCount: 0,
    }));

    this.queue.push(...retriedOps);
    this.sortQueue();
    await this.persistQueue();

    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  async clearQueues(): Promise<void> {
    this.queue = [];
    this.deadLetterQueue = [];
    await this.persistQueue();
    console.info('🗑️ Cleared all offline queues');
  }

  /**
   * Remove specific operation from queue
   */
  async removeOperation(operationId: string): Promise<boolean> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((op) => op.id !== operationId);

    if (this.queue.length < initialLength) {
      await this.persistQueue();
      return true;
    }

    return false;
  }

  /**
   * Force process queue (useful for testing)
   */
  async forceProcessQueue(): Promise<OfflineOperationResult[]> {
    const wasProcessing = this.isProcessing;
    this.isProcessing = false;

    const results = await this.processQueue();

    if (wasProcessing) {
      this.isProcessing = true;
    }

    return results;
  }
}

export default new OfflineQueueManager();
