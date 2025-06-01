// ABOUTME: TaskContext provides centralized task state management with caching
// Single source of truth for tasks, eliminating duplicate fetches across screens

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import TaskStorageService from '../services/TaskStorageService';
import { Task } from '../types/task.types';

// Define the shape of the task data used in the context
// This extends Task but uses the legacy field names for backward compatibility
interface LegacyTask extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// Convert LegacyTask to Task for storage service
const legacyToTask = (legacy: LegacyTask): Task => {
  return {
    ...legacy,
    completed: legacy.isComplete,
    createdAt: new Date(legacy.createdAt),
    updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(legacy.createdAt),
    completedAt: legacy.completedAt ? new Date(legacy.completedAt) : null,
  };
};

// Define the context value interface
interface TaskContextValue {
  tasks: LegacyTask[];
  loading: boolean;
  error: string | null;
  getTasksByUser: (userId: string) => LegacyTask[];
  getTasksByCategory: (category: string) => LegacyTask[];
  getPendingTasks: () => LegacyTask[];
  getTasksAssignedByUser: (userId: string) => LegacyTask[];
  addTask: (taskData: Partial<LegacyTask>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<LegacyTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  clearCache: () => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Cache to persist tasks between component unmounts
let taskCache: LegacyTask[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export for testing purposes only
export const _resetCache = () => {
  taskCache = null;
  cacheTimestamp = null;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<LegacyTask[]>(taskCache || []);
  const [loading, setLoading] = useState<boolean>(!taskCache);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Load tasks from storage
  const loadTasks = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    try {
      // Use cache if available and not expired
      if (
        !forceRefresh &&
        taskCache &&
        cacheTimestamp &&
        Date.now() - cacheTimestamp < CACHE_DURATION
      ) {
        setTasks(taskCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const loadedTasks = (await TaskStorageService.getAllTasks()) as unknown as LegacyTask[];

      if (isMountedRef.current) {
        setTasks(loadedTasks);
        taskCache = loadedTasks;
        cacheTimestamp = Date.now();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError((err as Error).message);
        console.error('Error loading tasks:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTasks]);

  // Filter tasks by user
  const getTasksByUser = useCallback(
    (userId: string): LegacyTask[] => {
      return tasks.filter((task) => task.userId === userId);
    },
    [tasks],
  );

  // Filter tasks by category
  const getTasksByCategory = useCallback(
    (category: string): LegacyTask[] => {
      return tasks.filter((task) => task.category === category);
    },
    [tasks],
  );

  // Get pending (incomplete) tasks
  const getPendingTasks = useCallback((): LegacyTask[] => {
    return tasks.filter((task) => !task.isComplete);
  }, [tasks]);

  // Get tasks assigned by a specific user
  const getTasksAssignedByUser = useCallback(
    (userId: string): LegacyTask[] => {
      return tasks.filter((task) => task.assignedBy === userId);
    },
    [tasks],
  );

  // Add a new task
  const addTask = useCallback(
    async (taskData: Partial<LegacyTask>): Promise<void> => {
      try {
        setError(null);

        // Generate ID if not provided
        const newTask: LegacyTask = {
          id: taskData.id || Date.now().toString(),
          ...taskData,
          createdAt: taskData.createdAt || new Date().toISOString(),
          isComplete: taskData.isComplete || false,
        } as LegacyTask;

        await TaskStorageService.saveTask(legacyToTask(newTask));

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError((err as Error).message);
        console.error('Error adding task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Update an existing task
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<LegacyTask>): Promise<void> => {
      try {
        setError(null);

        const taskToUpdate = tasks.find((task) => task.id === taskId);
        if (!taskToUpdate) {
          throw new Error('Task not found');
        }

        const updatedTask = { ...taskToUpdate, ...updates };
        await TaskStorageService.updateTask(legacyToTask(updatedTask));

        const updatedTasks = tasks.map((task) => (task.id === taskId ? updatedTask : task));
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError((err as Error).message);
        console.error('Error updating task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Delete a task
  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        setError(null);

        await TaskStorageService.deleteTask(taskId);

        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError((err as Error).message);
        console.error('Error deleting task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Refresh tasks from storage
  const refreshTasks = useCallback(async (): Promise<void> => {
    await loadTasks(true);
  }, [loadTasks]);

  // Clear cache (useful for logout)
  const clearCache = useCallback((): void => {
    taskCache = null;
    cacheTimestamp = null;
    setTasks([]);
  }, []);

  const value: TaskContextValue = {
    tasks,
    loading,
    error,
    getTasksByUser,
    getTasksByCategory,
    getPendingTasks,
    getTasksAssignedByUser,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks,
    clearCache,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
