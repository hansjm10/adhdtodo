// ABOUTME: TaskContext provides centralized task state management with real-time updates
// Integrates with Supabase-based TaskStorageService for live synchronization

import type {
  ReactNode} from 'react';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import TaskStorageService from '../services/TaskStorageService';
import type { Task} from '../types/task.types';
import { TaskStatus, TaskPriority } from '../types/task.types';
import { supabase } from '../services/SupabaseService';

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

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current user from auth session
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Get current user on mount and auth changes
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    checkUser();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Load tasks from storage
  const loadTasks = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const loadedTasks = await TaskStorageService.getAllTasks();

      if (isMountedRef.current) {
        setTasks(loadedTasks);
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

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    // Load initial tasks
    loadTasks();

    // Subscribe to real-time updates
    const unsubscribe = TaskStorageService.subscribeToTaskUpdates(
      currentUser.id,
      (task: Task, eventType: string) => {
        if (!isMountedRef.current) return;

        setTasks((prevTasks) => {
          switch (eventType) {
            case 'INSERT':
              // Add new task if it doesn't exist
              if (!prevTasks.find((t) => t.id === task.id)) {
                return [...prevTasks, task];
              }
              return prevTasks;

            case 'UPDATE':
              // Update existing task
              return prevTasks.map((t) => (t.id === task.id ? task : t));

            case 'DELETE':
              // Remove deleted task
              return prevTasks.filter((t) => t.id !== task.id);

            default:
              return prevTasks;
          }
        });
      },
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.id, loadTasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

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

  // Get pending tasks
  const getPendingTasks = useCallback((): Task[] => {
    return tasks.filter((task) => task.status === TaskStatus.PENDING);
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

        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: taskData.title || '',
          description: taskData.description || '',
          category: taskData.category || null,
          status: taskData.status || TaskStatus.PENDING,
          priority: taskData.priority || TaskPriority.MEDIUM,
          timeEstimate: taskData.timeEstimate || null,
          timeSpent: taskData.timeSpent || 0,
          completed: taskData.completed || false,
          completedAt: taskData.completedAt || null,
          createdAt: taskData.createdAt || new Date(),
          updatedAt: taskData.updatedAt || new Date(),
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
          userId: taskData.userId || currentUser?.id || null,
        };

        await TaskStorageService.saveTask(newTask);
        // Real-time subscription will handle adding to state
      } catch (err) {
        setError((err as Error).message);
        console.error('Error adding task:', err);
        throw err;
      }
    },
    [currentUser?.id],
  );

  // Update a task
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<void> => {
      try {
        setError(null);

        const existingTask = tasks.find((task) => task.id === taskId);
        if (!existingTask) {
          throw new Error('Task not found');
        }

        const updatedTask: Task = {
          ...existingTask,
          ...updates,
          updatedAt: new Date(),
        };

        await TaskStorageService.updateTask(updatedTask);
        // Real-time subscription will handle updating state
      } catch (err) {
        setError((err as Error).message);
        console.error('Error updating task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Delete a task
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      setError(null);

      await TaskStorageService.deleteTask(taskId);
      // Real-time subscription will handle removing from state
    } catch (err) {
      setError((err as Error).message);
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  // Refresh tasks from storage
  const refreshTasks = useCallback(async (): Promise<void> => {
    await loadTasks();
  }, [loadTasks]);

  // Clear cache (useful for logout)
  const clearCache = useCallback((): void => {
    setTasks([]);
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
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
