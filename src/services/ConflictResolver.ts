// ABOUTME: Conflict resolution system for handling data conflicts during sync
// Provides strategies for resolving conflicts between local and remote data

export interface ConflictResolution<T = unknown> {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (local: T, remote: T) => T;
  fieldResolvers?: Record<string, (localValue: any, remoteValue: any) => any>;
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

class ConflictResolver {
  private defaultResolutions: Map<string, ConflictResolution<any>> = new Map();

  /**
   * Register default resolution strategy for an entity type
   */
  registerDefaultResolution<T>(entityType: string, resolution: ConflictResolution<T>): void {
    this.defaultResolutions.set(entityType, resolution as ConflictResolution<any>);
  }

  /**
   * Resolve conflict between local and remote data
   */
  async resolveConflict<T extends Record<string, unknown>>(
    conflict: ConflictInfo<T>,
    customResolution?: ConflictResolution<T>,
  ): Promise<ResolvedConflict<T>> {
    const resolution =
      customResolution ||
      (this.defaultResolutions.get(conflict.entity) as ConflictResolution<T> | undefined);

    if (!resolution) {
      // Default to server-wins strategy if no resolution defined
      return {
        resolvedData: conflict.remoteData,
        strategy: 'server-wins',
        fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'remote'),
      };
    }

    switch (resolution.strategy) {
      case 'client-wins':
        return {
          resolvedData: conflict.localData,
          strategy: 'client-wins',
          fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'local'),
        };

      case 'server-wins':
        return {
          resolvedData: conflict.remoteData,
          strategy: 'server-wins',
          fieldResolutions: this.createFieldResolutions(conflict.conflictFields, 'remote'),
        };

      case 'merge':
        return this.mergeData(conflict, resolution) as ResolvedConflict<T>;

      case 'manual':
        if (resolution.resolver) {
          const resolvedData = resolution.resolver(conflict.localData, conflict.remoteData) as T;
          return {
            resolvedData,
            strategy: 'manual',
            fieldResolutions: this.analyzeFieldResolutions(
              conflict.localData,
              conflict.remoteData,
              resolvedData,
              conflict.conflictFields,
            ),
          };
        } else {
          throw new Error('Manual resolution strategy requires a resolver function');
        }

      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts<T extends Record<string, unknown>>(
    local: T,
    remote: T,
    entityType: string,
    entityId: string,
    ignoredFields: string[] = ['updatedAt', 'lastSyncedAt'],
  ): ConflictInfo<T> | null {
    const conflictFields: string[] = [];

    // Compare all fields except ignored ones
    for (const key in local) {
      if (ignoredFields.includes(key)) continue;

      if (local[key] !== remote[key]) {
        // Deep comparison for objects and arrays
        if (typeof local[key] === 'object' && typeof remote[key] === 'object') {
          if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
            conflictFields.push(key);
          }
        } else {
          conflictFields.push(key);
        }
      }
    }

    // Check for fields that exist in remote but not in local
    for (const key in remote) {
      if (ignoredFields.includes(key)) continue;

      if (!(key in local)) {
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
  private mergeData<T extends Record<string, unknown>>(
    conflict: ConflictInfo<T>,
    resolution: ConflictResolution<T>,
  ): ResolvedConflict<T> {
    const merged = { ...conflict.remoteData } as T; // Start with remote as base
    const fieldResolutions: Record<string, 'local' | 'remote' | 'merged'> = {};

    for (const field of conflict.conflictFields) {
      if (resolution.fieldResolvers && resolution.fieldResolvers[field]) {
        // Use custom field resolver
        (merged as any)[field] = resolution.fieldResolvers[field](
          (conflict.localData as any)[field],
          (conflict.remoteData as any)[field],
        );
        fieldResolutions[field] = 'merged';
      } else {
        // Use intelligent merge logic
        const mergeResult = this.intelligentFieldMerge(
          (conflict.localData as any)[field],
          (conflict.remoteData as any)[field],
          field,
        );
        (merged as any)[field] = mergeResult.value;
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
      const merged = [...new Set([...localValue, ...remoteValue])];
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
  private analyzeFieldResolutions<T extends Record<string, unknown>>(
    local: T,
    remote: T,
    resolved: T,
    conflictFields: string[],
  ): Record<string, 'local' | 'remote' | 'merged'> {
    const resolutions: Record<string, 'local' | 'remote' | 'merged'> = {};

    for (const field of conflictFields) {
      if (JSON.stringify(resolved[field]) === JSON.stringify(local[field])) {
        resolutions[field] = 'local';
      } else if (JSON.stringify(resolved[field]) === JSON.stringify(remote[field])) {
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
    this.registerDefaultResolution<Record<string, any>>('task', {
      strategy: 'merge',
      fieldResolvers: {
        // Title: prefer local (user input)
        title: (local: string, remote: string) => local || remote,

        // Description: prefer non-empty, then local
        description: (local: string, remote: string) => {
          if (!local?.trim() && remote?.trim()) return remote;
          return local;
        },

        // Status: prefer more advanced status
        status: (local: string, remote: string) => {
          const statusOrder = ['pending', 'in_progress', 'completed'];
          const localIndex = statusOrder.indexOf(local);
          const remoteIndex = statusOrder.indexOf(remote);
          return localIndex > remoteIndex ? local : remote;
        },

        // Time spent: sum them up
        timeSpent: (local: number, remote: number) => (local || 0) + (remote || 0),

        // XP earned: use higher value
        xpEarned: (local: number, remote: number) => Math.max(local || 0, remote || 0),
      },
    });
  }

  /**
   * Register user-specific conflict resolution
   */
  setupUserResolution(): void {
    this.registerDefaultResolution<Record<string, any>>('user', {
      strategy: 'merge',
      fieldResolvers: {
        // Stats: merge by taking higher values
        currentStreak: (local: number, remote: number) => Math.max(local || 0, remote || 0),
        longestStreak: (local: number, remote: number) => Math.max(local || 0, remote || 0),
        totalXP: (local: number, remote: number) => Math.max(local || 0, remote || 0),

        // Preferences: prefer local (user settings)
        notificationPreferences: (local: unknown, remote: unknown) => local || remote,
        theme: (local: string, remote: string) => local || remote,

        // Name/email: prefer local
        name: (local: string, remote: string) => local || remote,
        email: (local: string, remote: string) => local || remote,
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
    this.registerDefaultResolution<Record<string, any>>('partnership', {
      strategy: 'server-wins',
    });

    // Notification resolution: prefer server (authoritative)
    this.registerDefaultResolution<Record<string, any>>('notification', {
      strategy: 'server-wins',
    });
  }
}

export default new ConflictResolver();
