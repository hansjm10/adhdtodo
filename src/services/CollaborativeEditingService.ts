// ABOUTME: Real-time collaborative task editing service with conflict resolution
// Enables multiple users to edit tasks simultaneously with operational transform

import type { RealtimeChannel } from '@supabase/supabase-js';
import { BaseService } from './BaseService';
import { supabase } from './SupabaseService';
import type { Task } from '../types/task.types';
import ConflictResolver from './ConflictResolver';
import OfflineQueueManager from './OfflineQueueManager';
import type { Result } from '../types/common.types';

export interface EditOperation {
  id: string;
  taskId: string;
  userId: string;
  timestamp: Date;
  type: 'text' | 'field' | 'status' | 'priority' | 'assignment';
  field: string;
  operation: 'insert' | 'delete' | 'replace' | 'move';
  position?: number;
  length?: number;
  content: unknown;
  metadata?: {
    selectionStart?: number;
    selectionEnd?: number;
    deviceType?: string;
  };
}

export interface CollaboratorCursor {
  userId: string;
  userName: string;
  color: string;
  position: number;
  field: string;
  lastSeen: Date;
}

export interface TaskEditSession {
  taskId: string;
  editors: Map<string, CollaboratorCursor>;
  operations: EditOperation[];
  lastSyncTime: Date;
  isLocked: boolean;
  lockOwner?: string;
}

class CollaborativeEditingService extends BaseService {
  private editSessions = new Map<string, TaskEditSession>();
  private channels = new Map<string, RealtimeChannel>();
  private currentUserId: string | null = null;
  private cursorColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

  constructor() {
    super('CollaborativeEditing');
  }

  /**
   * Start collaborative editing session for a task
   */
  async startEditSession(taskId: string, userId: string): Promise<Result<TaskEditSession>> {
    return this.wrapAsync(
      'startEditSession',
      async () => {
        this.currentUserId = userId;

        // Check if session already exists
        let session = this.editSessions.get(taskId);
        if (!session) {
          session = {
            taskId,
            editors: new Map(),
            operations: [],
            lastSyncTime: new Date(),
            isLocked: false,
          };
          this.editSessions.set(taskId, session);
        }

        // Add current user as editor
        const cursor: CollaboratorCursor = {
          userId,
          userName: await this.getUserName(userId),
          color: this.getColorForUser(userId),
          position: 0,
          field: 'title',
          lastSeen: new Date(),
        };
        session.editors.set(userId, cursor);

        // Set up real-time channel
        this.setupRealtimeChannel(taskId);

        // Broadcast join event
        await this.broadcastEvent(taskId, 'user_joined', { userId, cursor });

        return session;
      },
      { taskId, userId },
    );
  }

  /**
   * Stop collaborative editing session for a user
   */
  async stopEditSession(taskId: string, userId: string): Promise<Result<void>> {
    return this.wrapAsync(
      'stopEditSession',
      async () => {
        const session = this.editSessions.get(taskId);
        if (!session) return;

        // Remove user from editors
        session.editors.delete(userId);

        // Broadcast leave event
        await this.broadcastEvent(taskId, 'user_left', { userId });

        // Clean up session if no editors left
        if (session.editors.size === 0) {
          const channel = this.channels.get(taskId);
          if (channel) {
            await channel.unsubscribe();
            this.channels.delete(taskId);
          }
          this.editSessions.delete(taskId);
        }
      },
      { taskId, userId },
    );
  }

  /**
   * Apply an edit operation to a task
   */
  async applyOperation(operation: EditOperation): Promise<Result<boolean>> {
    return this.wrapAsync(
      'applyOperation',
      async () => {
        const session = this.editSessions.get(operation.taskId);
        if (!session) {
          this.logError('applyOperation', new Error('No edit session found'), {
            taskId: operation.taskId,
          });
          return false;
        }

        // Check if task is locked by another user
        if (session.isLocked && session.lockOwner !== operation.userId) {
          this.logError('applyOperation', new Error('Task is locked by another user'), {
            taskId: operation.taskId,
            lockOwner: session.lockOwner,
            userId: operation.userId,
          });
          return false;
        }

        // Add operation to session
        session.operations.push(operation);

        // Transform operation if there are conflicts
        const transformedOperation = await CollaborativeEditingService.transformOperation(
          operation,
          session,
        );

        // Apply to database
        const success = await this.applyToDatabase(transformedOperation);
        if (!success) {
          // Queue operation for offline retry
          await OfflineQueueManager.addOperation('collaborative_edit', operation, {
            priority: 'high',
            maxRetries: 5,
            userId: operation.userId,
          });
          return false;
        }

        // Broadcast to other collaborators
        await this.broadcastEvent(operation.taskId, 'operation_applied', {
          operation: transformedOperation,
          userId: operation.userId,
        });

        return true;
      },
      { taskId: operation.taskId, userId: operation.userId },
    );
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(
    taskId: string,
    userId: string,
    field: string,
    position: number,
  ): Promise<Result<void>> {
    return this.wrapAsync(
      'updateCursor',
      async () => {
        const session = this.editSessions.get(taskId);
        if (!session) return;

        const cursor = session.editors.get(userId);
        if (cursor) {
          cursor.field = field;
          cursor.position = position;
          cursor.lastSeen = new Date();

          // Broadcast cursor update
          await this.broadcastEvent(taskId, 'cursor_updated', {
            userId,
            cursor: { field, position, lastSeen: cursor.lastSeen },
          });
        }
      },
      { taskId, userId, field, position },
    );
  }

  /**
   * Lock/unlock a task for exclusive editing
   */
  async toggleTaskLock(taskId: string, userId: string, lock: boolean): Promise<Result<boolean>> {
    return this.wrapAsync(
      'toggleTaskLock',
      async () => {
        const session = this.editSessions.get(taskId);
        if (!session) return false;

        if (lock) {
          if (session.isLocked && session.lockOwner !== userId) {
            return false; // Already locked by someone else
          }
          session.isLocked = true;
          session.lockOwner = userId;
        } else {
          if (session.lockOwner !== userId) {
            return false; // Can't unlock someone else's lock
          }
          session.isLocked = false;
          session.lockOwner = undefined;
        }

        // Broadcast lock status change
        await this.broadcastEvent(taskId, 'lock_changed', {
          isLocked: session.isLocked,
          lockOwner: session.lockOwner,
          userId,
        });

        return true;
      },
      { taskId, userId, lock },
    );
  }

  /**
   * Get all active collaborators for a task
   */
  getCollaborators(taskId: string): CollaboratorCursor[] {
    const session = this.editSessions.get(taskId);
    if (!session) return [];

    return Array.from(session.editors.values()).filter(
      (cursor) => Date.now() - cursor.lastSeen.getTime() < 300000, // Active within 5 minutes
    );
  }

  /**
   * Get edit history for a task
   */
  getEditHistory(taskId: string, limit: number = 50): EditOperation[] {
    const session = this.editSessions.get(taskId);
    if (!session) return [];

    return session.operations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Set up real-time channel for collaborative editing
   */
  private setupRealtimeChannel(taskId: string): void {
    if (this.channels.has(taskId)) return;

    const channel = supabase
      .channel(`task_edit:${taskId}`)
      .on('broadcast', { event: 'user_joined' }, ({ payload }) => {
        this.handleUserJoined(taskId, payload as { userId: string; cursor: CollaboratorCursor });
      })
      .on('broadcast', { event: 'user_left' }, ({ payload }) => {
        this.handleUserLeft(taskId, payload as { userId: string });
      })
      .on('broadcast', { event: 'operation_applied' }, ({ payload }) => {
        this.handleOperationReceived(
          taskId,
          payload as { operation: EditOperation; userId: string },
        );
      })
      .on('broadcast', { event: 'cursor_updated' }, ({ payload }) => {
        this.handleCursorUpdate(
          taskId,
          payload as {
            userId: string;
            cursor: { field: string; position: number; lastSeen: string };
          },
        );
      })
      .on('broadcast', { event: 'lock_changed' }, ({ payload }) => {
        this.handleLockChanged(taskId, payload as { isLocked: boolean; lockOwner?: string });
      })
      .subscribe();

    this.channels.set(taskId, channel);
  }

  /**
   * Broadcast event to all collaborators
   */
  private async broadcastEvent(
    taskId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.channels.get(taskId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Transform operation to resolve conflicts with concurrent edits
   */
  private static transformOperation(
    operation: EditOperation,
    session: TaskEditSession,
  ): Promise<EditOperation> {
    return Promise.resolve().then(() => {
      // Find concurrent operations that might conflict
      const concurrentOps = session.operations.filter(
        (op) =>
          op.id !== operation.id &&
          op.field === operation.field &&
          Math.abs(op.timestamp.getTime() - operation.timestamp.getTime()) < 5000, // Within 5 seconds
      );

      if (concurrentOps.length === 0) {
        return operation; // No conflicts
      }

      // Apply operational transform based on operation type
      let transformedOp = { ...operation };

      for (const concurrentOp of concurrentOps) {
        transformedOp = CollaborativeEditingService.transformAgainstOperation(
          transformedOp,
          concurrentOp,
        );
      }

      return transformedOp;
    });
  }

  /**
   * Transform one operation against another (operational transform)
   */
  private static transformAgainstOperation(op1: EditOperation, op2: EditOperation): EditOperation {
    // Simple operational transform logic
    // In a production system, this would be much more sophisticated

    if (op1.type === 'text' && op2.type === 'text' && op1.field === op2.field) {
      if (op1.operation === 'insert' && op2.operation === 'insert') {
        // Both inserting text
        if (op1.position! >= op2.position!) {
          // Adjust position if op2 inserted before op1
          return {
            ...op1,
            position: op1.position! + ((op2.content as string)?.length || 0),
          };
        }
      } else if (op1.operation === 'delete' && op2.operation === 'insert') {
        // op1 deleting, op2 inserting
        if (op1.position! > op2.position!) {
          return {
            ...op1,
            position: op1.position! + ((op2.content as string)?.length || 0),
          };
        }
      }
    }

    return op1;
  }

  /**
   * Apply operation to database
   */
  private async applyToDatabase(operation: EditOperation): Promise<boolean> {
    const updateData: Record<string, unknown> = {};

    try {
      switch (operation.type) {
        case 'text': {
          // For text operations, we need to get the current value and apply the change
          const { data: currentTask } = await supabase
            .from('tasks')
            .select(operation.field)
            .eq('id', operation.taskId)
            .single();

          if (!currentTask) return false;

          const fieldValue = currentTask[operation.field as keyof typeof currentTask];
          let currentValue = typeof fieldValue === 'string' ? fieldValue : '';

          if (operation.operation === 'insert') {
            currentValue =
              currentValue.slice(0, operation.position) +
              operation.content +
              currentValue.slice(operation.position);
          } else if (operation.operation === 'delete') {
            currentValue =
              currentValue.slice(0, operation.position) +
              currentValue.slice(operation.position! + operation.length!);
          } else if (operation.operation === 'replace') {
            currentValue =
              currentValue.slice(0, operation.position) +
              operation.content +
              currentValue.slice(operation.position! + operation.length!);
          }

          updateData[operation.field] = currentValue;
          break;
        }

        case 'field':
          updateData[operation.field] = operation.content;
          break;

        case 'status':
          updateData.status = operation.content;
          if (operation.content === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }
          break;

        case 'priority':
          updateData.priority = operation.content;
          break;

        case 'assignment':
          if (operation.field === 'assignedTo') {
            updateData.assigned_to = operation.content;
          } else if (operation.field === 'assignedBy') {
            updateData.assigned_by = operation.content;
          }
          break;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', operation.taskId);

      return !error;
    } catch (error) {
      this.logError('applyToDatabase', error, {
        taskId: operation.taskId,
        operationType: operation.type,
        field: operation.field,
        operation: operation.operation,
        userId: operation.userId,
        updateDataKeys: Object.keys(updateData),
      });
      return false;
    }
  }

  /**
   * Handle user joined event
   */
  private handleUserJoined(
    taskId: string,
    payload: { userId: string; cursor: CollaboratorCursor },
  ): void {
    const session = this.editSessions.get(taskId);
    if (!session) return;

    const { userId, cursor } = payload;
    if (userId !== this.currentUserId) {
      session.editors.set(userId, {
        ...cursor,
        lastSeen: new Date(cursor.lastSeen),
      });
    }
  }

  /**
   * Handle user left event
   */
  private handleUserLeft(taskId: string, payload: { userId: string }): void {
    const session = this.editSessions.get(taskId);
    if (!session) return;

    const { userId } = payload;
    session.editors.delete(userId);
  }

  /**
   * Handle operation received from other users
   */
  private handleOperationReceived(
    taskId: string,
    payload: { operation: EditOperation; userId: string },
  ): void {
    const session = this.editSessions.get(taskId);
    if (!session) return;

    const { operation, userId } = payload;
    if (userId !== this.currentUserId) {
      session.operations.push({
        ...operation,
        timestamp: new Date(operation.timestamp),
      });
    }
  }

  /**
   * Handle cursor update from other users
   */
  private handleCursorUpdate(
    taskId: string,
    payload: { userId: string; cursor: { field: string; position: number; lastSeen: string } },
  ): void {
    const session = this.editSessions.get(taskId);
    if (!session) return;

    const { userId, cursor } = payload;
    if (userId !== this.currentUserId) {
      const existingCursor = session.editors.get(userId);
      if (existingCursor) {
        existingCursor.field = cursor.field;
        existingCursor.position = cursor.position;
        existingCursor.lastSeen = new Date(cursor.lastSeen);
      }
    }
  }

  /**
   * Handle lock status change
   */
  private handleLockChanged(
    taskId: string,
    payload: { isLocked: boolean; lockOwner?: string },
  ): void {
    const session = this.editSessions.get(taskId);
    if (!session) return;

    const { isLocked, lockOwner } = payload;
    session.isLocked = isLocked;
    session.lockOwner = lockOwner;
  }

  /**
   * Get user name for display
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const { data } = await supabase.from('users').select('name').eq('id', userId).single();
      return (data?.name ?? 'Unknown User') as string;
    } catch {
      return 'Unknown User';
    }
  }

  /**
   * Get consistent color for a user
   */
  private getColorForUser(userId: string): string {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.cursorColors[hash % this.cursorColors.length];
  }

  /**
   * Create edit operation
   */
  createOperation(
    taskId: string,
    userId: string,
    type: EditOperation['type'],
    field: string,
    operation: EditOperation['operation'],
    content: unknown,
    position?: number,
    length?: number,
  ): EditOperation {
    return {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      taskId,
      userId,
      timestamp: new Date(),
      type,
      field,
      operation,
      position,
      length,
      content,
    };
  }

  /**
   * Resolve conflicts when multiple users edit the same field
   */
  async resolveConflict(taskId: string, field: string): Promise<Result<unknown>> {
    return this.wrapAsync(
      'resolveConflict',
      async () => {
        // Get current database value
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single<Record<string, unknown>>();

        if (!currentTask) return null;

        // Use ConflictResolver for complex conflicts
        const conflictInfo = {
          entity: 'task',
          entityId: taskId,
          localData: currentTask as unknown as Task, // Use full task as local data
          remoteData: currentTask as unknown as Task, // Use full task as remote data
          conflictFields: [field],
          timestamp: new Date(),
        };

        const resolution = await ConflictResolver.resolveConflict<Task>(conflictInfo);
        return resolution.resolvedData[field as keyof Task];
      },
      { taskId, field },
    );
  }
}

export default new CollaborativeEditingService();
