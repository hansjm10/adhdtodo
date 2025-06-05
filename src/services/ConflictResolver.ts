// ABOUTME: Conflict resolution system for handling data conflicts during sync
// Provides strategies for resolving conflicts between local and remote data

import type { Task } from '../types/task.types';
import { TaskStatus } from '../types/task.types';
import type { User, Partnership, Notification } from '../types';

// Type for field resolvers that preserves type safety
type FieldResolver<T, K extends keyof T> = (localValue: T[K], remoteValue: T[K]) => T[K];

// Type-safe field resolvers mapping
type FieldResolvers<T> = {
  [K in keyof T]?: FieldResolver<T, K>;
};

export interface ConflictResolution<T = unknown> {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (local: T, remote: T) => T;
  fieldResolvers?: FieldResolvers<T>;
}

export interface ConflictInfo<T = unknown> {
  entity: string;
  entityId: string;
  localData: T;
  remoteData: T;
  conflictFields: string[];
  timestamp: Date;
}

export interface ResolvedConflict<T = unknown> {
  resolvedData: T;
  strategy: string;
  fieldResolutions: Record<string, 'local' | 'remote' | 'merged'>;
}

// Type for the storage map that preserves type information
type ResolutionMap = Map<string, ConflictResolution<unknown>>;

class ConflictResolver {
  private defaultResolutions: ResolutionMap = new Map();

  /**
   * Register default resolution strategy for an entity type
   */
  registerDefaultResolution<T>(entityType: string, resolution: ConflictResolution<T>): void {
    this.defaultResolutions.set(entityType, resolution as ConflictResolution<unknown>);
  }

  /**
   * Resolve conflict between local and remote data
   */
  resolveConflict<T>(
    conflict: ConflictInfo<T>,
    customResolution?: ConflictResolution<T>,
  ): Promise<ResolvedConflict<T>> {
    const resolution =
      customResolution ??
      (this.defaultResolutions.get(conflict.entity) as ConflictResolution<T> | undefined);

    if (!resolution) {
      // Default to server-wins strategy if no resolution defined
      return Promise.resolve({
        resolvedData: conflict.remoteData,
        strategy: 'server-wins',
        fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'remote'),
      });
    }

    switch (resolution.strategy) {
      case 'client-wins':
        return Promise.resolve({
          resolvedData: conflict.localData,
          strategy: 'client-wins',
          fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'local'),
        });

      case 'server-wins':
        return Promise.resolve({
          resolvedData: conflict.remoteData,
          strategy: 'server-wins',
          fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'remote'),
        });

      case 'merge':
        return Promise.resolve(this.mergeData(conflict, resolution));

      case 'manual':
        if (resolution.resolver) {
          const resolvedData = resolution.resolver(conflict.localData, conflict.remoteData);
          return Promise.resolve({
            resolvedData,
            strategy: 'manual',
            fieldResolutions: this.analyzeFieldResolutions(
              conflict.localData,
              conflict.remoteData,
              resolvedData,
              conflict.conflictFields,
            ),
          });
        }
        throw new Error('Manual resolution strategy requires a resolver function');

      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts<T>(
    local: T,
    remote: T,
    entityType: string,
    entityId: string,
    ignoredFields: string[] = ['updatedAt', 'lastSyncedAt'],
  ): ConflictInfo<T> | null {
    const conflictFields: string[] = [];

    // Compare all fields except ignored ones
    const localObj = local as unknown as Record<string, unknown>;
    const remoteObj = remote as unknown as Record<string, unknown>;

    for (const key in localObj) {
      if (ignoredFields.includes(key)) continue;

      if (localObj[key] !== remoteObj[key]) {
        // Deep comparison for objects and arrays
        if (typeof localObj[key] === 'object' && typeof remoteObj[key] === 'object') {
          if (JSON.stringify(localObj[key]) !== JSON.stringify(remoteObj[key])) {
            conflictFields.push(key);
          }
        } else {
          conflictFields.push(key);
        }
      }
    }

    // Check for fields that exist in remote but not in local
    for (const key in remoteObj) {
      if (ignoredFields.includes(key)) continue;

      if (!(key in localObj)) {
        conflictFields.push(key);
      }
    }

    if (conflictFields.length === 0) {
      return null; // No conflicts
    }

    return {
      entity: entityType,
      entityId,
      localData: local,
      remoteData: remote,
      conflictFields,
      timestamp: new Date(),
    };
  }

  /**
   * Smart merge data with field-level resolution
   */
  private mergeData<T>(
    conflict: ConflictInfo<T>,
    resolution: ConflictResolution<T>,
  ): ResolvedConflict<T> {
    const merged = { ...conflict.remoteData }; // Start with remote as base
    const fieldResolutions: Record<string, 'local' | 'remote' | 'merged'> = {};

    for (const field of conflict.conflictFields) {
      const fieldKey = field as keyof T;

      if (resolution.fieldResolvers && fieldKey in resolution.fieldResolvers) {
        // Use custom field resolver with proper typing
        const resolver = resolution.fieldResolvers[fieldKey];
        if (resolver) {
          merged[fieldKey] = resolver(conflict.localData[fieldKey], conflict.remoteData[fieldKey]);
          fieldResolutions[field] = 'merged';
        }
      } else {
        // Use intelligent merge logic
        const mergeResult = this.intelligentFieldMerge(
          conflict.localData[fieldKey],
          conflict.remoteData[fieldKey],
          field,
        );
        merged[fieldKey] = mergeResult.value as T[keyof T];
        fieldResolutions[field] = mergeResult.source;
      }
    }

    return {
      resolvedData: merged,
      strategy: 'merge',
      fieldResolutions,
    };
  }

  /**
   * Intelligent field-level merge logic
   */
  private intelligentFieldMerge(
    localValue: unknown,
    remoteValue: unknown,
    fieldName: string,
  ): { value: unknown; source: 'local' | 'remote' | 'merged' } {
    // Handle null/undefined values
    if (localValue == null && remoteValue != null) {
      return { value: remoteValue, source: 'remote' };
    }
    if (remoteValue == null && localValue != null) {
      return { value: localValue, source: 'local' };
    }

    // Handle arrays (merge unique values)
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      const merged = [...new Set([...(localValue as unknown[]), ...(remoteValue as unknown[])])];
      return { value: merged, source: 'merged' };
    }

    // Handle numbers (use higher value for counters, prefer local for user input)
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      if (
        fieldName.includes('count') ||
        fieldName.includes('total') ||
        fieldName.includes('streak')
      ) {
        return { value: Math.max(localValue, remoteValue), source: 'merged' };
      }
      // For other numbers, prefer local (user input)
      return { value: localValue, source: 'local' };
    }

    // Handle strings (prefer non-empty, then local)
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      if (localValue.trim() === '' && remoteValue.trim() !== '') {
        return { value: remoteValue, source: 'remote' };
      }
      return { value: localValue, source: 'local' };
    }

    // Handle objects (deep merge)
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      const merged = { ...remoteValue, ...localValue };
      return { value: merged, source: 'merged' };
    }

    // Default: prefer local value (user input)
    return { value: localValue, source: 'local' };
  }

  /**
   * Create field resolutions map
   */
  private createFieldResolutions(
    fields: string[],
    source: 'local' | 'remote',
  ): Record<string, 'local' | 'remote' | 'merged'> {
    const resolutions: Record<string, 'local' | 'remote' | 'merged'> = {};
    for (const field of fields) {
      resolutions[field] = source;
    }
    return resolutions;
  }

  /**
   * Analyze how fields were resolved in manual resolution
   */
  private analyzeFieldResolutions<T>(
    local: T,
    remote: T,
    resolved: T,
    conflictFields: string[],
  ): Record<string, 'local' | 'remote' | 'merged'> {
    const resolutions: Record<string, 'local' | 'remote' | 'merged'> = {};

    const localObj = local as unknown as Record<string, unknown>;
    const remoteObj = remote as unknown as Record<string, unknown>;
    const resolvedObj = resolved as unknown as Record<string, unknown>;

    for (const field of conflictFields) {
      if (JSON.stringify(resolvedObj[field]) === JSON.stringify(localObj[field])) {
        resolutions[field] = 'local';
      } else if (JSON.stringify(resolvedObj[field]) === JSON.stringify(remoteObj[field])) {
        resolutions[field] = 'remote';
      } else {
        resolutions[field] = 'merged';
      }
    }

    return resolutions;
  }

  /**
   * Register task-specific conflict resolution
   */
  setupTaskResolution(): void {
    this.registerDefaultResolution<Task>('task', {
      strategy: 'merge',
      fieldResolvers: {
        // Title: prefer local (user input)
        title: (local, remote) => local || remote,

        // Description: prefer non-empty, then local
        description: (local, remote) => {
          if (!local?.trim() && remote?.trim()) return remote;
          return local;
        },

        // Status: prefer more advanced status
        status: (local, remote) => {
          const statusOrder: TaskStatus[] = [
            TaskStatus.PENDING,
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED,
          ];
          const localIndex = statusOrder.indexOf(local);
          const remoteIndex = statusOrder.indexOf(remote);
          return localIndex > remoteIndex ? local : remote;
        },

        // Time spent: sum them up
        timeSpent: (local, remote) => (local || 0) + (remote || 0),

        // XP earned: use higher value
        xpEarned: (local, remote) => Math.max(local || 0, remote || 0),
      },
    });
  }

  /**
   * Register user-specific conflict resolution
   */
  setupUserResolution(): void {
    this.registerDefaultResolution<User>('user', {
      strategy: 'merge',
      fieldResolvers: {
        // Stats: merge by taking higher values
        stats: (localStats, remoteStats) => ({
          tasksAssigned: Math.max(localStats?.tasksAssigned || 0, remoteStats?.tasksAssigned || 0),
          tasksCompleted: Math.max(
            localStats?.tasksCompleted || 0,
            remoteStats?.tasksCompleted || 0,
          ),
          currentStreak: Math.max(localStats?.currentStreak || 0, remoteStats?.currentStreak || 0),
          longestStreak: Math.max(localStats?.longestStreak || 0, remoteStats?.longestStreak || 0),
          totalXP: Math.max(localStats?.totalXP || 0, remoteStats?.totalXP || 0),
        }),

        // Preferences: prefer local (user settings)
        notificationPreferences: (local, remote) => local ?? remote,
        theme: (local, remote) => local ?? remote,

        // Name/email: prefer local
        name: (local, remote) => local ?? remote,
        email: (local, remote) => local ?? remote,
      },
    });
  }

  /**
   * Setup default resolutions for common entities
   */
  setupDefaultResolutions(): void {
    this.setupTaskResolution();
    this.setupUserResolution();

    // Partnership resolution: prefer server (administrative data)
    this.registerDefaultResolution<Partnership>('partnership', {
      strategy: 'server-wins',
    });

    // Notification resolution: prefer server (authoritative)
    this.registerDefaultResolution<Notification>('notification', {
      strategy: 'server-wins',
    });
  }
}

export default new ConflictResolver();
