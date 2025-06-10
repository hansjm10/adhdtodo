// ABOUTME: Context for managing collaborative task editing state and operations
// Provides real-time collaboration features with cursor tracking and conflict resolution

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type {
  TaskEditSession,
  EditOperation,
  CollaboratorCursor,
} from '../services/CollaborativeEditingService';
import CollaborativeEditingService from '../services/CollaborativeEditingService';
import { useUser } from './UserContext';
import SecureLogger from '../services/SecureLogger';

interface CollaborativeEditingState {
  activeSessions: Map<string, TaskEditSession>;
  currentTaskId: string | null;
  currentSession: TaskEditSession | null;
  collaborators: CollaboratorCursor[];
  operations: EditOperation[];
  isConnected: boolean;
  lastSyncTime: Date | null;
}

type CollaborativeEditingAction =
  | { type: 'START_SESSION'; payload: { taskId: string; session: TaskEditSession } }
  | { type: 'STOP_SESSION'; payload: { taskId: string } }
  | { type: 'SET_CURRENT_TASK'; payload: { taskId: string | null } }
  | {
      type: 'UPDATE_COLLABORATORS';
      payload: { taskId: string; collaborators: CollaboratorCursor[] };
    }
  | { type: 'ADD_OPERATION'; payload: { operation: EditOperation } }
  | { type: 'UPDATE_CONNECTION'; payload: { isConnected: boolean } }
  | { type: 'SYNC_COMPLETE'; payload: { timestamp: Date } };

const initialState: CollaborativeEditingState = {
  activeSessions: new Map(),
  currentTaskId: null,
  currentSession: null,
  collaborators: [],
  operations: [],
  isConnected: false,
  lastSyncTime: null,
};

function collaborativeEditingReducer(
  state: CollaborativeEditingState,
  action: CollaborativeEditingAction,
): CollaborativeEditingState {
  switch (action.type) {
    case 'START_SESSION': {
      const newSessions = new Map(state.activeSessions);
      newSessions.set(action.payload.taskId, action.payload.session);
      return {
        ...state,
        activeSessions: newSessions,
        currentSession:
          action.payload.taskId === state.currentTaskId
            ? action.payload.session
            : state.currentSession,
      };
    }

    case 'STOP_SESSION': {
      const updatedSessions = new Map(state.activeSessions);
      updatedSessions.delete(action.payload.taskId);
      return {
        ...state,
        activeSessions: updatedSessions,
        currentSession: action.payload.taskId === state.currentTaskId ? null : state.currentSession,
      };
    }

    case 'SET_CURRENT_TASK': {
      const currentSession = action.payload.taskId
        ? (state.activeSessions.get(action.payload.taskId) ?? null)
        : null;
      return {
        ...state,
        currentTaskId: action.payload.taskId,
        currentSession,
        collaborators: currentSession ? Array.from(currentSession.editors.values()) : [],
        operations: currentSession ? currentSession.operations : [],
      };
    }

    case 'UPDATE_COLLABORATORS':
      if (action.payload.taskId === state.currentTaskId) {
        return {
          ...state,
          collaborators: action.payload.collaborators,
        };
      }
      return state;

    case 'ADD_OPERATION':
      return {
        ...state,
        operations: [...state.operations, action.payload.operation],
      };

    case 'UPDATE_CONNECTION':
      return {
        ...state,
        isConnected: action.payload.isConnected,
      };

    case 'SYNC_COMPLETE':
      return {
        ...state,
        lastSyncTime: action.payload.timestamp,
      };

    default:
      return state;
  }
}

interface CollaborativeEditingContextType {
  state: CollaborativeEditingState;
  startEditing: (taskId: string) => Promise<void>;
  stopEditing: (taskId: string) => Promise<void>;
  applyOperation: (operation: EditOperation) => Promise<boolean>;
  updateCursor: (field: string, position: number) => Promise<void>;
  toggleTaskLock: (lock: boolean) => Promise<boolean>;
  createTextOperation: (
    field: string,
    operation: 'insert' | 'delete' | 'replace',
    content: string,
    position: number,
    length?: number,
  ) => EditOperation | null;
  createFieldOperation: (field: string, content: unknown) => EditOperation | null;
  getCurrentCollaborators: () => CollaboratorCursor[];
  isTaskLocked: () => boolean;
  getLockOwner: () => string | undefined;
}

const CollaborativeEditingContext = createContext<CollaborativeEditingContextType | undefined>(
  undefined,
);

export const useCollaborativeEditing = (): CollaborativeEditingContextType => {
  const context = useContext(CollaborativeEditingContext);
  if (!context) {
    throw new Error('useCollaborativeEditing must be used within a CollaborativeEditingProvider');
  }
  return context;
};

interface CollaborativeEditingProviderProps {
  children: ReactNode;
}

export const CollaborativeEditingProvider: React.FC<CollaborativeEditingProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(collaborativeEditingReducer, initialState);
  const { user } = useUser();
  const logger = SecureLogger;

  // Monitor collaborators for current session
  useEffect(() => {
    if (!state.currentTaskId) return undefined;

    const interval = setInterval(() => {
      const collaborators = CollaborativeEditingService.getCollaborators(state.currentTaskId!);
      dispatch({
        type: 'UPDATE_COLLABORATORS',
        payload: { taskId: state.currentTaskId!, collaborators },
      });
    }, 2000); // Update every 2 seconds

    return () => {
      clearInterval(interval);
    };
  }, [state.currentTaskId]);

  const startEditing = async (taskId: string): Promise<void> => {
    if (!user) return;

    const sessionResult = await CollaborativeEditingService.startEditSession(taskId, user.id);
    if (sessionResult.success && sessionResult.data) {
      dispatch({ type: 'START_SESSION', payload: { taskId, session: sessionResult.data } });
      dispatch({ type: 'SET_CURRENT_TASK', payload: { taskId } });
      dispatch({ type: 'UPDATE_CONNECTION', payload: { isConnected: true } });
    } else {
      logger.error(`Failed to start editing session for task ${taskId}`, {
        code: 'COLLAB_START_FAILED',
        context: sessionResult.error?.message ?? 'Unknown error',
      });
      dispatch({ type: 'UPDATE_CONNECTION', payload: { isConnected: false } });
    }
  };

  const stopEditing = async (taskId: string): Promise<void> => {
    if (!user) return;

    const result = await CollaborativeEditingService.stopEditSession(taskId, user.id);
    if (result.success) {
      dispatch({ type: 'STOP_SESSION', payload: { taskId } });

      if (state.currentTaskId === taskId) {
        dispatch({ type: 'SET_CURRENT_TASK', payload: { taskId: null } });
      }
    } else {
      logger.error(`Failed to stop editing session for task ${taskId}`, {
        code: 'COLLAB_STOP_FAILED',
        context: result.error?.message ?? 'Unknown error',
      });
    }
  };

  const applyOperation = async (operation: EditOperation): Promise<boolean> => {
    const result = await CollaborativeEditingService.applyOperation(operation);
    const success = result.success && result.data === true;
    if (success) {
      dispatch({ type: 'ADD_OPERATION', payload: { operation } });
      dispatch({ type: 'SYNC_COMPLETE', payload: { timestamp: new Date() } });
    } else {
      logger.error(`Failed to apply operation on task ${operation.taskId}`, {
        code: 'COLLAB_OPERATION_FAILED',
        context: `Field: ${operation.field}, Type: ${operation.type}`,
      });
    }
    return success;
  };

  const updateCursor = async (field: string, position: number): Promise<void> => {
    if (!user || !state.currentTaskId) return;

    const result = await CollaborativeEditingService.updateCursor(
      state.currentTaskId,
      user.id,
      field,
      position,
    );
    if (!result.success) {
      logger.warn(`Failed to update cursor for task ${state.currentTaskId}`, {
        code: 'COLLAB_CURSOR_UPDATE_FAILED',
        context: `Field: ${field}, Position: ${position}`,
      });
    }
  };

  const toggleTaskLock = async (lock: boolean): Promise<boolean> => {
    if (!user || !state.currentTaskId) return false;

    const result = await CollaborativeEditingService.toggleTaskLock(
      state.currentTaskId,
      user.id,
      lock,
    );
    if (!result.success) {
      logger.error(`Failed to toggle task lock for task ${state.currentTaskId}`, {
        code: 'COLLAB_LOCK_FAILED',
        context: `Lock action: ${lock ? 'acquire' : 'release'}`,
      });
    }
    return result.success && result.data === true;
  };

  const createTextOperation = (
    field: string,
    operation: 'insert' | 'delete' | 'replace',
    content: string,
    position: number,
    length?: number,
  ): EditOperation | null => {
    if (!user || !state.currentTaskId) return null;

    return CollaborativeEditingService.createOperation(
      state.currentTaskId,
      user.id,
      'text',
      field,
      operation,
      content,
      position,
      length,
    );
  };

  const createFieldOperation = (field: string, content: unknown): EditOperation | null => {
    if (!user || !state.currentTaskId) return null;

    return CollaborativeEditingService.createOperation(
      state.currentTaskId,
      user.id,
      'field',
      field,
      'replace',
      content,
    );
  };

  const getCurrentCollaborators = (): CollaboratorCursor[] => {
    return state.collaborators.filter((cursor) => cursor.userId !== user?.id);
  };

  const isTaskLocked = (): boolean => {
    return state.currentSession?.isLocked ?? false;
  };

  const getLockOwner = (): string | undefined => {
    return state.currentSession?.lockOwner;
  };

  const contextValue: CollaborativeEditingContextType = React.useMemo(
    () => ({
      state,
      startEditing,
      stopEditing,
      applyOperation,
      updateCursor,
      toggleTaskLock,
      createTextOperation,
      createFieldOperation,
      getCurrentCollaborators,
      isTaskLocked,
      getLockOwner,
    }),
    [
      state,
      startEditing,
      stopEditing,
      applyOperation,
      updateCursor,
      toggleTaskLock,
      createTextOperation,
      createFieldOperation,
      getCurrentCollaborators,
      isTaskLocked,
      getLockOwner,
    ],
  );

  return (
    <CollaborativeEditingContext.Provider value={contextValue}>
      {children}
    </CollaborativeEditingContext.Provider>
  );
};
