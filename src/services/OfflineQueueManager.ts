// ABOUTME: Offline queue manager for reliable operation synchronization
// Queues operations when offline and syncs them when connection is restored

import { BaseService } from './BaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';

interface NetInfoState {
  isConnected: boolean | null;
}

// Mock NetInfo for now - would need to install @react-native-community/netinfo
const NetInfo = {
  addEventListener: (callback: (state: NetInfoState) => void) => {
    // Mock implementation - always return online
    setTimeout(() => {
      callback({ isConnected: true });
    }, 100);
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
  data: unknown;
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
  data?: unknown;
}

interface QueueProcessor {
  [key: string]: (operation: OfflineOperation) => Promise<unknown>;
}

class OfflineQueueManager extends BaseService {
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
    super('OfflineQueue');
    this.initializeNetworkListener();
    void this.loadPersistedQueue();
  }

  /**
   * Initialize network state monitoring
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        // Came back online, process queue
        this.logger.info('Connection restored, processing offline queue', {
          code: 'OFFLINE_QUEUE_001',
        });
        void this.processQueue();
      } else if (wasOnline && !this.isOnline) {
        this.logger.info('Connection lost, switching to offline mode', {
          code: 'OFFLINE_QUEUE_002',
        });
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
        this.queue = (JSON.parse(queueData) as Array<Record<string, unknown>>).map((op) => ({
          ...op,
          timestamp: new Date(op.timestamp as string),
        })) as OfflineOperation[];
      }

      if (deadLetterData) {
        this.deadLetterQueue = (JSON.parse(deadLetterData) as Array<Record<string, unknown>>).map(
          (op) => ({
            ...op,
            timestamp: new Date(op.timestamp as string),
          }),
        ) as OfflineOperation[];
      }

      // Sort queue by priority and timestamp
      this.sortQueue();

      this.logger.info(`Loaded ${this.queue.length} operations from offline queue`, {
        code: 'OFFLINE_QUEUE_003',
        context: JSON.stringify({ count: this.queue.length }),
      });
    } catch (error) {
      this.logError('loadPersistedQueue', error, {
        queueSize: this.queue.length,
        deadLetterQueueSize: this.deadLetterQueue.length,
        storageKey: this.STORAGE_KEY,
        deadLetterKey: this.DEAD_LETTER_KEY,
      });
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
      this.logError('persistQueue', error, {
        queueSize: this.queue.length,
        deadLetterQueueSize: this.deadLetterQueue.length,
        storageKey: this.STORAGE_KEY,
        deadLetterKey: this.DEAD_LETTER_KEY,
        isProcessing: this.isProcessing,
        isOnline: this.isOnline,
      });
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
    processor: (operation: OfflineOperation) => Promise<unknown>,
  ): void {
    this.processors[operationType] = processor;
  }

  /**
   * Add operation to queue
   */
  async addOperation(
    type: string,
    data: unknown,
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
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 'medium',
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

    this.logger.info(`Added ${type} operation to offline queue (${this.queue.length} total)`, {
      code: 'OFFLINE_QUEUE_004',
      context: JSON.stringify({ type, queueLength: this.queue.length }),
    });

    // Try to process immediately if online
    if (this.isOnline && !this.isProcessing) {
      void this.processQueue();
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
    let failed = 0;
    let skipped = 0;

    this.logger.info(`Processing offline queue (${this.queue.length} operations)`, {
      code: 'OFFLINE_QUEUE_005',
      context: JSON.stringify({ queueLength: this.queue.length }),
    });

    try {
      while (this.queue.length > 0 && processed < this.BATCH_SIZE) {
        const operation = this.queue[0];

        // Check dependencies
        if (!this.areDependenciesSatisfied(operation)) {
          // Move to end of queue and continue
          this.queue.push(this.queue.shift()!);
          skipped++;
          continue;
        }

        const result = await this.executeOperation(operation);
        results.push(result);

        if (result.success) {
          // Remove successful operation
          this.queue.shift();
          this.logger.info(`Successfully processed ${operation.type} operation`, {
            code: 'OFFLINE_QUEUE_006',
            context: JSON.stringify({ type: operation.type }),
          });
        } else {
          // Handle failure
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Move to dead letter queue
            const failedOp = this.queue.shift()!;
            this.deadLetterQueue.push(failedOp);
            failed++;
            this.logger.info(`Moved ${operation.type} operation to dead letter queue`, {
              code: 'OFFLINE_QUEUE_007',
              context: JSON.stringify({ type: operation.type }),
            });
          } else {
            // Keep for retry (move to end for exponential backoff effect)
            this.queue.push(this.queue.shift()!);
            this.logger.info(
              `Retrying ${operation.type} operation (attempt ${operation.retryCount})`,
              {
                code: 'OFFLINE_QUEUE_008',
                context: JSON.stringify({ type: operation.type, attempt: operation.retryCount }),
              },
            );
          }
        }

        processed++;
      }

      await this.persistQueue();

      if (this.queue.length > 0) {
        this.logger.info(`${this.queue.length} operations remaining in queue`, {
          code: 'OFFLINE_QUEUE_009',
          context: JSON.stringify({ remaining: this.queue.length }),
        });
      } else {
        this.logger.info('Offline queue processing complete', {
          code: 'OFFLINE_QUEUE_010',
        });
      }
    } catch (error) {
      this.logError('processQueue', error, {
        queueSize: this.queue.length,
        processedCount: processed,
        failedCount: failed,
        skippedCount: skipped,
        isOnline: this.isOnline,
        batchSize: this.BATCH_SIZE,
        deadLetterQueueSize: this.deadLetterQueue.length,
      });
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
        this.logger.info(`Removed stale low priority operation: ${op.type}`, {
          code: 'OFFLINE_QUEUE_011',
          context: JSON.stringify({ type: op.type }),
        });
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

    this.logger.info(`Retrying ${this.deadLetterQueue.length} dead letter operations`, {
      code: 'OFFLINE_QUEUE_012',
      context: JSON.stringify({ count: this.deadLetterQueue.length }),
    });

    // Reset retry count and move back to main queue
    const retriedOps = this.deadLetterQueue.splice(0).map((op) => ({
      ...op,
      retryCount: 0,
    }));

    this.queue.push(...retriedOps);
    this.sortQueue();
    await this.persistQueue();

    if (this.isOnline) {
      void this.processQueue();
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  async clearQueues(): Promise<void> {
    this.queue = [];
    this.deadLetterQueue = [];
    await this.persistQueue();
    this.logger.info('Cleared all offline queues', {
      code: 'OFFLINE_QUEUE_013',
    });
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
