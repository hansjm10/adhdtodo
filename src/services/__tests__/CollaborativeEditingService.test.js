// ABOUTME: Tests for CollaborativeEditingService real-time collaboration features
// Verifies operational transforms, conflict resolution, and real-time sync

import CollaborativeEditingService from '../CollaborativeEditingService';
import { supabase } from '../SupabaseService';
import ConflictResolver from '../ConflictResolver';
import OfflineQueueManager from '../OfflineQueueManager';

// Mock dependencies
jest.mock('../SupabaseService', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(() => {
      const builder = {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        eq: jest.fn(),
        is: jest.fn(),
        order: jest.fn(),
        limit: jest.fn(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Make all methods return the builder to enable chaining
      builder.select.mockReturnValue(builder);
      builder.insert.mockReturnValue(builder);
      builder.update.mockReturnValue(builder);
      builder.delete.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.is.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.limit.mockReturnValue(builder);

      builder.then = (resolve) => resolve({ data: [], error: null });
      return builder;
    }),
  },
}));

// Helper to create mock query builder for specific tests
const _createMockQueryBuilder = (data = null, error = null) => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
  builder.then = (resolve) => resolve({ data: Array.isArray(data) ? data : [data], error });
  return builder;
};

jest.mock('../ConflictResolver');
jest.mock('../OfflineQueueManager');

// Mock SecureLogger to avoid console spam in tests
jest.mock('../SecureLogger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('CollaborativeEditingService', () => {
  const mockTaskId = 'task-123';
  const mockUserId = 'user-456';
  const mockUserId2 = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the service state
    CollaborativeEditingService.editSessions = new Map();
    CollaborativeEditingService.channels = new Map();
    CollaborativeEditingService.currentUserId = null;
  });

  describe('startEditSession', () => {
    it('should create a new edit session for a task', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      const session = await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);

      expect(session).toBeDefined();
      expect(session.taskId).toBe(mockTaskId);
      expect(session.editors.has(mockUserId)).toBe(true);
      expect(session.isLocked).toBe(false);
      expect(supabase.channel).toHaveBeenCalledWith(`task_edit:${mockTaskId}`);
    });

    it('should reuse existing session if already exists', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      // Create first session
      const session1 = await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);

      // Create second session for same task
      const session2 = await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId2);

      expect(session1.taskId).toBe(session2.taskId);
      expect(session2.editors.size).toBe(2);
      expect(session2.editors.has(mockUserId)).toBe(true);
      expect(session2.editors.has(mockUserId2)).toBe(true);
    });

    it('should set up real-time channel correctly', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'user_joined' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'user_left' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'operation_applied' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'cursor_updated' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'lock_changed' },
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  describe('stopEditSession', () => {
    it('should remove user from session', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
        unsubscribe: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      // Start session
      const session = await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId2);

      expect(session.editors.size).toBe(2);

      // Stop session for one user
      await CollaborativeEditingService.stopEditSession(mockTaskId, mockUserId);

      expect(session.editors.size).toBe(1);
      expect(session.editors.has(mockUserId)).toBe(false);
      expect(session.editors.has(mockUserId2)).toBe(true);
    });

    it('should clean up session when no editors left', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
        unsubscribe: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      // Start and stop session
      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
      await CollaborativeEditingService.stopEditSession(mockTaskId, mockUserId);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(CollaborativeEditingService.editSessions.has(mockTaskId)).toBe(false);
      expect(CollaborativeEditingService.channels.has(mockTaskId)).toBe(false);
    });
  });

  describe('applyOperation', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
    });

    it('should apply text operation successfully', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { title: 'Original Title' },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      };

      supabase.from.mockReturnValue(mockQuery);
      mockQuery.update.mockResolvedValue({ error: null });

      const operation = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        ' Updated',
        8,
      );

      const success = await CollaborativeEditingService.applyOperation(operation);

      expect(success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockQuery.update).toHaveBeenCalledWith({ title: 'Original Updated Title' });
    });

    it('should handle field operation', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      supabase.from.mockReturnValue(mockQuery);
      mockQuery.update.mockResolvedValue({ error: null });

      const operation = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'field',
        'priority',
        'replace',
        'high',
      );

      const success = await CollaborativeEditingService.applyOperation(operation);

      expect(success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith({ priority: 'high' });
    });

    it('should reject operation when task is locked by another user', async () => {
      // Lock the task for another user
      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      session.isLocked = true;
      session.lockOwner = 'other-user';

      const operation = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        ' Test',
        0,
      );

      const success = await CollaborativeEditingService.applyOperation(operation);

      expect(success).toBe(false);
    });

    it('should queue operation for offline retry on database failure', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { title: 'Original' },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      };

      supabase.from.mockReturnValue(mockQuery);
      mockQuery.update.mockResolvedValue({ error: new Error('Database error') });

      const operation = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        ' Test',
        0,
      );

      const success = await CollaborativeEditingService.applyOperation(operation);

      expect(success).toBe(false);
      expect(OfflineQueueManager.addOperation).toHaveBeenCalledWith(
        'collaborative_edit',
        operation,
        { priority: 'high', maxRetries: 5 },
      );
    });
  });

  describe('updateCursor', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
    });

    it('should update cursor position and broadcast', async () => {
      const mockChannel = CollaborativeEditingService.channels.get(mockTaskId);

      await CollaborativeEditingService.updateCursor(mockTaskId, mockUserId, 'title', 10);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      const cursor = session.editors.get(mockUserId);

      expect(cursor.field).toBe('title');
      expect(cursor.position).toBe(10);
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'cursor_updated',
        payload: expect.objectContaining({
          userId: mockUserId,
          cursor: {
            field: 'title',
            position: 10,
            lastSeen: expect.any(Date),
          },
        }),
      });
    });
  });

  describe('toggleTaskLock', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
    });

    it('should lock task successfully', async () => {
      const success = await CollaborativeEditingService.toggleTaskLock(
        mockTaskId,
        mockUserId,
        true,
      );

      expect(success).toBe(true);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      expect(session.isLocked).toBe(true);
      expect(session.lockOwner).toBe(mockUserId);
    });

    it('should unlock task successfully', async () => {
      // First lock the task
      await CollaborativeEditingService.toggleTaskLock(mockTaskId, mockUserId, true);

      // Then unlock it
      const success = await CollaborativeEditingService.toggleTaskLock(
        mockTaskId,
        mockUserId,
        false,
      );

      expect(success).toBe(true);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      expect(session.isLocked).toBe(false);
      expect(session.lockOwner).toBeUndefined();
    });

    it('should prevent locking when already locked by another user', async () => {
      // Lock by first user
      await CollaborativeEditingService.toggleTaskLock(mockTaskId, mockUserId, true);

      // Try to lock by second user
      const success = await CollaborativeEditingService.toggleTaskLock(
        mockTaskId,
        mockUserId2,
        true,
      );

      expect(success).toBe(false);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      expect(session.lockOwner).toBe(mockUserId); // Should still be first user
    });

    it('should prevent unlocking by non-owner', async () => {
      // Lock by first user
      await CollaborativeEditingService.toggleTaskLock(mockTaskId, mockUserId, true);

      // Try to unlock by second user
      const success = await CollaborativeEditingService.toggleTaskLock(
        mockTaskId,
        mockUserId2,
        false,
      );

      expect(success).toBe(false);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      expect(session.isLocked).toBe(true);
      expect(session.lockOwner).toBe(mockUserId);
    });
  });

  describe('transformOperation', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
    });

    it('should transform insert operation against another insert', () => {
      const session = CollaborativeEditingService.editSessions.get(mockTaskId);

      // Add a concurrent operation
      const concurrentOp = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId2,
        'text',
        'title',
        'insert',
        'Hello ',
        0,
      );
      concurrentOp.timestamp = new Date(Date.now() - 1000); // 1 second ago
      session.operations.push(concurrentOp);

      const newOp = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        'World',
        3,
      );

      const transformedOp = CollaborativeEditingService.transformOperation(newOp, session);

      // Position should be adjusted by the length of the concurrent insert
      expect(transformedOp.position).toBe(3 + 'Hello '.length);
    });

    it('should not transform operations on different fields', () => {
      const session = CollaborativeEditingService.editSessions.get(mockTaskId);

      // Add a concurrent operation on different field
      const concurrentOp = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId2,
        'text',
        'description',
        'insert',
        'Hello ',
        0,
      );
      session.operations.push(concurrentOp);

      const newOp = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        'World',
        3,
      );

      const transformedOp = CollaborativeEditingService.transformOperation(newOp, session);

      // Position should not be changed
      expect(transformedOp.position).toBe(3);
    });
  });

  describe('getCollaborators', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);
    });

    it('should return active collaborators within time limit', async () => {
      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);
      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId2);

      const collaborators = CollaborativeEditingService.getCollaborators(mockTaskId);

      expect(collaborators).toHaveLength(2);
      expect(collaborators.map((c) => c.userId)).toContain(mockUserId);
      expect(collaborators.map((c) => c.userId)).toContain(mockUserId2);
    });

    it('should filter out inactive collaborators', async () => {
      await CollaborativeEditingService.startEditSession(mockTaskId, mockUserId);

      const session = CollaborativeEditingService.editSessions.get(mockTaskId);
      const cursor = session.editors.get(mockUserId);

      // Set last seen to 10 minutes ago (beyond 5 minute threshold)
      cursor.lastSeen = new Date(Date.now() - 10 * 60 * 1000);

      const collaborators = CollaborativeEditingService.getCollaborators(mockTaskId);

      expect(collaborators).toHaveLength(0);
    });
  });

  describe('createOperation', () => {
    it('should create operation with correct structure', () => {
      const operation = CollaborativeEditingService.createOperation(
        mockTaskId,
        mockUserId,
        'text',
        'title',
        'insert',
        'Hello',
        0,
        5,
      );

      expect(operation).toMatchObject({
        taskId: mockTaskId,
        userId: mockUserId,
        type: 'text',
        field: 'title',
        operation: 'insert',
        content: 'Hello',
        position: 0,
        length: 5,
      });
      expect(operation.id).toBeDefined();
      expect(operation.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflicts using ConflictResolver', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { title: 'Database Value' },
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const mockResolution = { resolvedValue: 'Resolved Value' };
      ConflictResolver.resolveConflict.mockResolvedValue(mockResolution);

      const result = await CollaborativeEditingService.resolveConflict(mockTaskId, 'title');

      expect(result).toBe('Resolved Value');
      expect(ConflictResolver.resolveConflict).toHaveBeenCalledWith({
        entityId: mockTaskId,
        entityType: 'task',
        field: 'title',
        localValue: null,
        remoteValue: 'Database Value',
        lastSyncTime: expect.any(Date),
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await CollaborativeEditingService.resolveConflict(mockTaskId, 'title');

      expect(result).toBeNull();
    });
  });
});
