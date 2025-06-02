// ABOUTME: TaskContext provides centralized task state management with caching
// Single source of truth for tasks, eliminating duplicate fetches across screens

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import TaskStorageService from '../services/TaskStorageService';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';

// Data migration helper to convert legacy data format if found
const migrateTaskData = (taskData: unknown): Task => {
  // Type guard to ensure taskData is an object
  if (!taskData || typeof taskData !== 'object') {
    throw new Error('Invalid task data');
  }

  const data = taskData as Record<string, unknown>;

  // If the task already has the correct format, return as-is
  if (data.completed !== undefined && data.createdAt instanceof Date) {
    return data as unknown as Task;
  }

  // Convert from legacy format
  return {
    ...data,
    // Convert isComplete to completed if needed
    completed: data.completed !== undefined ? data.completed : data.isComplete || false,
    // Convert string dates to Date objects
    createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt as string),
    updatedAt: data.updatedAt
      ? data.updatedAt instanceof Date
        ? data.updatedAt
        : new Date(data.updatedAt as string)
      : data.createdAt instanceof Date
        ? data.createdAt
        : new Date(data.createdAt as string),
    completedAt: data.completedAt
      ? data.completedAt instanceof Date
        ? data.completedAt
        : new Date(data.completedAt as string)
      : null,
    dueDate: data.dueDate
      ? data.dueDate instanceof Date
        ? data.dueDate
        : new Date(data.dueDate as string)
      : null,
    preferredStartTime: data.preferredStartTime
      ? data.preferredStartTime instanceof Date
        ? data.preferredStartTime
        : new Date(data.preferredStartTime as string)
      : null,
    startedAt: data.startedAt
      ? data.startedAt instanceof Date
        ? data.startedAt
        : new Date(data.startedAt as string)
      : null,
  } as Task;
};

// Define the context value interface
interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  getTasksByUser: (userId: string) => Task[];
  getTasksByCategory: (category: string) => Task[];
  getPendingTasks: () => Task[];
  getTasksAssignedByUser: (userId: string) => Task[];
  addTask: (taskData: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  clearCache: () => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Cache duration constant
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [taskCache, setTaskCache] = useState<Task[] | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Load tasks from storage
  const loadTasks = useCallback(
    async (forceRefresh: boolean = false): Promise<void> => {
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

        const rawTasks = await TaskStorageService.getAllTasks();
        // Migrate any legacy format tasks
        const loadedTasks = rawTasks.map((task) => migrateTaskData(task));

        if (isMountedRef.current) {
          setTasks(loadedTasks);
          setTaskCache(loadedTasks);
          setCacheTimestamp(Date.now());
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
    },
    [taskCache, cacheTimestamp],
  );

  // Load tasks on mount
  useEffect(() => {
    loadTasks();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTasks]);

  // Filter tasks by user
  const getTasksByUser = useCallback(
    (userId: string): Task[] => {
      return tasks.filter((task) => task.userId === userId);
    },
    [tasks],
  );

  // Filter tasks by category
  const getTasksByCategory = useCallback(
    (category: string): Task[] => {
      return tasks.filter((task) => task.category === category);
    },
    [tasks],
  );

  // Get pending (incomplete) tasks
  const getPendingTasks = useCallback((): Task[] => {
    return tasks.filter((task) => !task.completed);
  }, [tasks]);

  // Get tasks assigned by a specific user
  const getTasksAssignedByUser = useCallback(
    (userId: string): Task[] => {
      return tasks.filter((task) => task.assignedBy === userId);
    },
    [tasks],
  );

  // Add a new task
  const addTask = useCallback(
    async (taskData: Partial<Task>): Promise<void> => {
      try {
        setError(null);

        // Generate ID if not provided
        const now = new Date();
        const newTask: Task = {
          id: taskData.id || Date.now().toString(),
          title: taskData.title || '',
          description: taskData.description || '',
          category: taskData.category || null,
          status: taskData.status || TaskStatus.PENDING,
          priority: taskData.priority || TaskPriority.MEDIUM,
          timeEstimate: taskData.timeEstimate || null,
          timeSpent: taskData.timeSpent || 0,
          completed: taskData.completed || false,
          completedAt: taskData.completedAt || null,
          createdAt: taskData.createdAt || now,
          updatedAt: taskData.updatedAt || now,
          xpEarned: taskData.xpEarned || 0,
          streakContribution: taskData.streakContribution || false,
          assignedBy: taskData.assignedBy || null,
          assignedTo: taskData.assignedTo || null,
          dueDate: taskData.dueDate || null,
          preferredStartTime: taskData.preferredStartTime || null,
          startedAt: taskData.startedAt || null,
          partnerNotified: taskData.partnerNotified || {
            onStart: false,
            onComplete: false,
            onOverdue: false,
          },
          encouragementReceived: taskData.encouragementReceived || [],
          userId: taskData.userId || null,
        };

        await TaskStorageService.saveTask(newTask);

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        setTaskCache(updatedTasks);
        setCacheTimestamp(Date.now());
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
    async (taskId: string, updates: Partial<Task>): Promise<void> => {
      try {
        setError(null);

        const taskToUpdate = tasks.find((task) => task.id === taskId);
        if (!taskToUpdate) {
          throw new Error('Task not found');
        }

        const updatedTask = {
          ...taskToUpdate,
          ...updates,
          updatedAt: new Date(),
        };
        await TaskStorageService.updateTask(updatedTask);

        const updatedTasks = tasks.map((task) => (task.id === taskId ? updatedTask : task));
        setTasks(updatedTasks);
        setTaskCache(updatedTasks);
        setCacheTimestamp(Date.now());
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
        setTaskCache(updatedTasks);
        setCacheTimestamp(Date.now());
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
    setTaskCache(null);
    setCacheTimestamp(null);
    setTasks([]);
  }, []);

  const value = useMemo<TaskContextValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
