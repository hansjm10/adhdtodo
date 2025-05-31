// ABOUTME: TaskContext provides centralized task state management with caching
// Single source of truth for tasks, eliminating duplicate fetches across screens

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import TaskStorageService from '../services/TaskStorageService';

const TaskContext = createContext();

// Cache to persist tasks between component unmounts
let taskCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export for testing purposes only
export const _resetCache = () => {
  taskCache = null;
  cacheTimestamp = null;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState(taskCache || []);
  const [loading, setLoading] = useState(!taskCache);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Load tasks from storage
  const loadTasks = useCallback(async (forceRefresh = false) => {
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

      const loadedTasks = await TaskStorageService.getAllTasks();

      if (isMountedRef.current) {
        setTasks(loadedTasks);
        taskCache = loadedTasks;
        cacheTimestamp = Date.now();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
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
    (userId) => {
      return tasks.filter((task) => task.userId === userId);
    },
    [tasks],
  );

  // Filter tasks by category
  const getTasksByCategory = useCallback(
    (category) => {
      return tasks.filter((task) => task.category === category);
    },
    [tasks],
  );

  // Get pending (incomplete) tasks
  const getPendingTasks = useCallback(() => {
    return tasks.filter((task) => !task.isComplete);
  }, [tasks]);

  // Get tasks assigned by a specific user
  const getTasksAssignedByUser = useCallback(
    (userId) => {
      return tasks.filter((task) => task.assignedBy === userId);
    },
    [tasks],
  );

  // Add a new task
  const addTask = useCallback(
    async (taskData) => {
      try {
        setError(null);

        // Generate ID if not provided
        const newTask = {
          id: taskData.id || Date.now().toString(),
          ...taskData,
          createdAt: taskData.createdAt || new Date().toISOString(),
          isComplete: taskData.isComplete || false,
        };

        await TaskStorageService.saveTask(newTask);

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError(err.message);
        console.error('Error adding task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Update an existing task
  const updateTask = useCallback(
    async (taskId, updates) => {
      try {
        setError(null);

        const taskToUpdate = tasks.find((task) => task.id === taskId);
        if (!taskToUpdate) {
          throw new Error('Task not found');
        }

        const updatedTask = { ...taskToUpdate, ...updates };
        await TaskStorageService.updateTask(updatedTask);

        const updatedTasks = tasks.map((task) => (task.id === taskId ? updatedTask : task));
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError(err.message);
        console.error('Error updating task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Delete a task
  const deleteTask = useCallback(
    async (taskId) => {
      try {
        setError(null);

        await TaskStorageService.deleteTask(taskId);

        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        setTasks(updatedTasks);
        taskCache = updatedTasks;
        cacheTimestamp = Date.now();
      } catch (err) {
        setError(err.message);
        console.error('Error deleting task:', err);
        throw err;
      }
    },
    [tasks],
  );

  // Refresh tasks from storage
  const refreshTasks = useCallback(async () => {
    await loadTasks(true);
  }, [loadTasks]);

  // Clear cache (useful for logout)
  const clearCache = useCallback(() => {
    taskCache = null;
    cacheTimestamp = null;
    setTasks([]);
  }, []);

  const value = {
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

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
