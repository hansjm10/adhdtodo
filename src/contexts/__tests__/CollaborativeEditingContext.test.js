// ABOUTME: Tests for CollaborativeEditingContext real-time state management
// Verifies context state updates and collaborative editing operations

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  CollaborativeEditingProvider,
  useCollaborativeEditing,
} from '../CollaborativeEditingContext';
import CollaborativeEditingService from '../../services/CollaborativeEditingService';
import { useAuth } from '../AuthContext';

// Mock dependencies
jest.mock('../../services/CollaborativeEditingService');
jest.mock('../AuthContext');
jest.mock('../UserContext', () => ({
  ...jest.requireActual('../UserContext'),
  useUser: jest.fn(),
}));

// Import after mocking
const { useUser } = require('../UserContext');

// Mock the service methods
const mockStartEditSession = jest.fn();
const mockStopEditSession = jest.fn();
const mockApplyOperation = jest.fn();
const mockUpdateCursor = jest.fn();
const mockToggleTaskLock = jest.fn();
const mockCreateOperation = jest.fn();
const mockGetCollaborators = jest.fn();

CollaborativeEditingService.startEditSession = mockStartEditSession;
CollaborativeEditingService.stopEditSession = mockStopEditSession;
CollaborativeEditingService.applyOperation = mockApplyOperation;
CollaborativeEditingService.updateCursor = mockUpdateCursor;
CollaborativeEditingService.toggleTaskLock = mockToggleTaskLock;
CollaborativeEditingService.createOperation = mockCreateOperation;
CollaborativeEditingService.getCollaborators = mockGetCollaborators;

describe('CollaborativeEditingContext', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockTaskId = 'task-456';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    useAuth.mockReturnValue({ user: mockUser });
    useUser.mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const Wrapper = ({ children }) => (
    <CollaborativeEditingProvider>{children}</CollaborativeEditingProvider>
  );

  const wrapper = Wrapper;

  describe('startEditing', () => {
    it('should start editing session and update state', async () => {
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map([
          ['user-123', { userId: 'user-123', userName: 'Test User', color: '#FF6B6B' }],
        ]),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };

      mockStartEditSession.mockResolvedValue({
        success: true,
        data: mockSession,
      });
      mockGetCollaborators.mockReturnValue([]);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      expect(mockStartEditSession).toHaveBeenCalledWith(mockTaskId, mockUser.id);
      expect(result.current.state.currentTaskId).toBe(mockTaskId);
      expect(result.current.state.currentSession).toBe(mockSession);
      expect(result.current.state.isConnected).toBe(true);
    });

    it('should handle start editing failure', async () => {
      mockStartEditSession.mockResolvedValue({
        success: false,
        error: { message: 'Connection failed', code: 'COLLAB_START_FAILED' },
      });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      expect(result.current.state.isConnected).toBe(false);
    });

    it('should not start editing without user', async () => {
      useAuth.mockReturnValue({ user: null });
      useUser.mockReturnValue({ user: null });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      expect(mockStartEditSession).not.toHaveBeenCalled();
    });
  });

  describe('stopEditing', () => {
    it('should stop editing session and update state', async () => {
      mockStopEditSession.mockResolvedValue({ success: true, data: undefined });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // First start editing
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      // Then stop editing
      await act(async () => {
        await result.current.stopEditing(mockTaskId);
      });

      expect(mockStopEditSession).toHaveBeenCalledWith(mockTaskId, mockUser.id);
      expect(result.current.state.currentTaskId).toBeNull();
      expect(result.current.state.currentSession).toBeNull();
    });

    it('should not stop editing without user', async () => {
      useAuth.mockReturnValue({ user: null });
      useUser.mockReturnValue({ user: null });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      await act(async () => {
        await result.current.stopEditing(mockTaskId);
      });

      expect(mockStopEditSession).not.toHaveBeenCalled();
    });
  });

  describe('applyOperation', () => {
    it('should apply operation and update state', async () => {
      const mockOperation = {
        id: 'op-123',
        taskId: mockTaskId,
        userId: mockUser.id,
        type: 'text',
        field: 'title',
        operation: 'insert',
        content: 'Hello',
        timestamp: new Date(),
      };

      mockApplyOperation.mockResolvedValue({ success: true, data: true });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      let success;
      await act(async () => {
        success = await result.current.applyOperation(mockOperation);
      });

      expect(success).toBe(true);
      expect(mockApplyOperation).toHaveBeenCalledWith(mockOperation);
      expect(result.current.state.operations).toContain(mockOperation);
      expect(result.current.state.lastSyncTime).toBeDefined();
    });

    it('should handle operation failure', async () => {
      const mockOperation = {
        id: 'op-123',
        taskId: mockTaskId,
        userId: mockUser.id,
        type: 'text',
        field: 'title',
        operation: 'insert',
        content: 'Hello',
        timestamp: new Date(),
      };

      mockApplyOperation.mockResolvedValue({
        success: false,
        error: { message: 'Operation failed', code: 'COLLAB_APPLY_FAILED' },
      });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      let success;
      await act(async () => {
        success = await result.current.applyOperation(mockOperation);
      });

      expect(success).toBe(false);
      expect(result.current.state.operations).not.toContain(mockOperation);
    });
  });

  describe('updateCursor', () => {
    it('should update cursor position', async () => {
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);
      mockUpdateCursor.mockResolvedValue({ success: true, data: undefined });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      await act(async () => {
        await result.current.updateCursor('title', 10);
      });

      expect(mockUpdateCursor).toHaveBeenCalledWith(mockTaskId, mockUser.id, 'title', 10);
    });

    it('should not update cursor without current task', async () => {
      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      await act(async () => {
        await result.current.updateCursor('title', 10);
      });

      expect(mockUpdateCursor).not.toHaveBeenCalled();
    });
  });

  describe('toggleTaskLock', () => {
    it('should toggle task lock', async () => {
      mockToggleTaskLock.mockResolvedValue({ success: true, data: true });

      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task properly
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      let success;
      await act(async () => {
        success = await result.current.toggleTaskLock(true);
      });

      expect(success).toBe(true);
      expect(mockToggleTaskLock).toHaveBeenCalledWith(mockTaskId, mockUser.id, true);
    });

    it('should return false without current task', async () => {
      // Ensure mockToggleTaskLock is cleared
      mockToggleTaskLock.mockClear();

      // Create a fresh provider to ensure clean state
      const TestWrapper = ({ children }) => (
        <CollaborativeEditingProvider>{children}</CollaborativeEditingProvider>
      );

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: TestWrapper });

      // Verify initial state is clean
      expect(result.current.state.currentTaskId).toBeNull();

      let success;
      await act(async () => {
        success = await result.current.toggleTaskLock(true);
      });

      expect(success).toBe(false);
      expect(mockToggleTaskLock).not.toHaveBeenCalled();
    });
  });

  describe('createTextOperation', () => {
    it('should create text operation', async () => {
      const mockOperation = {
        id: 'op-123',
        taskId: mockTaskId,
        userId: mockUser.id,
        type: 'text',
        field: 'title',
        operation: 'insert',
        content: 'Hello',
        position: 0,
        timestamp: new Date(),
      };

      mockCreateOperation.mockReturnValue(mockOperation);

      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task properly
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      const operation = result.current.createTextOperation('title', 'insert', 'Hello', 0);

      expect(operation).toBe(mockOperation);
      expect(mockCreateOperation).toHaveBeenCalledWith(
        mockTaskId,
        mockUser.id,
        'text',
        'title',
        'insert',
        'Hello',
        0,
        undefined,
      );
    });

    it('should return null without current task', () => {
      // Ensure mockCreateOperation is cleared
      mockCreateOperation.mockClear();

      // Create a fresh provider to ensure clean state
      const TestWrapper = ({ children }) => (
        <CollaborativeEditingProvider>{children}</CollaborativeEditingProvider>
      );

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: TestWrapper });

      // Verify initial state
      expect(result.current.state.currentTaskId).toBeNull();

      const operation = result.current.createTextOperation('title', 'insert', 'Hello', 0);

      expect(operation).toBeNull();
      expect(mockCreateOperation).not.toHaveBeenCalled();
    });

    it('should return null without user', () => {
      useAuth.mockReturnValue({ user: null });
      useUser.mockReturnValue({ user: null });

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      const operation = result.current.createTextOperation('title', 'insert', 'Hello', 0);

      expect(operation).toBeNull();
    });
  });

  describe('createFieldOperation', () => {
    it('should create field operation', async () => {
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      const mockOperation = {
        id: 'op-123',
        taskId: mockTaskId,
        userId: mockUser.id,
        type: 'field',
        field: 'priority',
        operation: 'replace',
        content: 'high',
        timestamp: new Date(),
      };

      mockCreateOperation.mockReturnValue(mockOperation);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      const operation = result.current.createFieldOperation('priority', 'high');

      expect(operation).toBe(mockOperation);
      expect(mockCreateOperation).toHaveBeenCalledWith(
        mockTaskId,
        mockUser.id,
        'field',
        'priority',
        'replace',
        'high',
      );
    });
  });

  describe('getCurrentCollaborators', () => {
    it('should return collaborators excluding current user', async () => {
      jest.useFakeTimers();

      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });

      const mockCollaborators = [
        { userId: 'user-123', userName: 'Test User', color: '#FF6B6B' },
        { userId: 'user-456', userName: 'Other User', color: '#4ECDC4' },
      ];
      mockGetCollaborators.mockReturnValue(mockCollaborators);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      // Wait for collaborator update interval to trigger
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      const collaborators = result.current.getCurrentCollaborators();

      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].userId).toBe('user-456');

      jest.useRealTimers();
    });

    it('should return empty array when no collaborators', () => {
      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: Wrapper });

      const collaborators = result.current.getCurrentCollaborators();

      expect(collaborators).toHaveLength(0);
    });
  });

  describe('isTaskLocked', () => {
    it('should return lock status from current session', async () => {
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: true,
        lockOwner: 'user-456',
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing which will set the session
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      expect(result.current.isTaskLocked()).toBe(true);
    });

    it('should return false when no session', () => {
      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: Wrapper });

      expect(result.current.isTaskLocked()).toBe(false);
    });
  });

  describe('getLockOwner', () => {
    it('should return lock owner from current session', async () => {
      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: true,
        lockOwner: 'user-456',
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });
      mockGetCollaborators.mockReturnValue([]);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing which will set the session
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      expect(result.current.getLockOwner()).toBe('user-456');
    });

    it('should return undefined when no session', () => {
      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: Wrapper });

      expect(result.current.getLockOwner()).toBeUndefined();
    });
  });

  // Note: We don't test internal state management directly as it's an implementation detail.
  // State changes are tested through the public API methods above.

  describe('collaborator monitoring', () => {
    it('should update collaborators periodically', async () => {
      jest.useFakeTimers();

      const mockSession = {
        taskId: mockTaskId,
        editors: new Map(),
        operations: [],
        lastSyncTime: new Date(),
        isLocked: false,
      };
      mockStartEditSession.mockResolvedValue({ success: true, data: mockSession });

      const mockCollaborators = [{ userId: 'user-456', userName: 'Other User', color: '#4ECDC4' }];
      mockGetCollaborators.mockReturnValue(mockCollaborators);

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper });

      // Start editing to set current task properly
      await act(async () => {
        await result.current.startEditing(mockTaskId);
      });

      // Fast-forward time to trigger the interval
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockGetCollaborators).toHaveBeenCalledWith(mockTaskId);

      jest.useRealTimers();
    });

    it('should not monitor when no current task', () => {
      jest.useFakeTimers();
      // Clear all mocks to ensure clean test
      mockGetCollaborators.mockClear();

      // Create a fresh provider to ensure clean state
      const TestWrapper = ({ children }) => (
        <CollaborativeEditingProvider>{children}</CollaborativeEditingProvider>
      );

      const { result } = renderHook(() => useCollaborativeEditing(), { wrapper: TestWrapper });

      // Verify initial state is clean
      expect(result.current.state.currentTaskId).toBeNull();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockGetCollaborators).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
