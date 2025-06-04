// ABOUTME: Simplified TaskStorageService that directly uses Supabase for all task storage
// No local storage fallback, no migration logic - pure Supabase implementation

import { supabase } from './SupabaseService';
import SecureLogger from './SecureLogger';
import { Task, TaskStatus, TaskPriority, PartnerNotificationStatus } from '../types/task.types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface TaskStorageOptions {
  page?: number;
  pageSize?: number;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  totalXP: number;
}

interface ITaskStorageService {
  getAllTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<boolean>;
  updateTask(updatedTask: Task): Promise<boolean>;
  deleteTask(taskId: string): Promise<boolean>;
  clearAllTasks(): Promise<boolean>;
  getTasksByCategory(categoryId: string, options?: TaskStorageOptions): Promise<Task[]>;
  getCompletedTasks(): Promise<Task[]>;
  getPendingTasks(): Promise<Task[]>;
  getTaskStats(): Promise<TaskStats>;
  getTasksForUser(userId: string): Promise<Task[]>;
  getTasksAssignedByUser(userId: string): Promise<Task[]>;
  getAssignedTasks(userId: string): Promise<Task[]>;
  getPartnerTasks(userId: string): Promise<Task[]>;
  getOverdueTasks(userId: string): Promise<Task[]>;
  getUpcomingTasks(userId: string, hoursAhead?: number): Promise<Task[]>;
  subscribeToTaskUpdates(
    userId: string,
    callback: (task: Task, eventType: string) => void,
  ): () => void;
}

// Database task type mapping
interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string;
  status?: string;
  due_date?: string | null;
  time_estimate?: number | null;
  time_spent?: number;
  started_at?: string | null;
  completed_at?: string | null;
  assigned_by?: string | null;
  assigned_to?: string | null;
  reminder_1?: string | null;
  reminder_2?: string | null;
  reminder_custom?: string | null;
  xp_earned?: number;
  streak_contribution?: boolean;
  created_at?: string;
  updated_at?: string;
}

class TaskStorageService implements ITaskStorageService {
  private taskCache = new Map<string, Task[]>();
  private cacheTimestamp = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subscriptions = new Map<string, RealtimeChannel>();

  private transformDbTaskToTask(dbTask: DbTask): Task {
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description || '',
      category: dbTask.category || null,
      status: (dbTask.status as TaskStatus) || TaskStatus.PENDING,
      priority: (dbTask.priority as TaskPriority) || TaskPriority.MEDIUM,
      timeEstimate: dbTask.time_estimate || null,
      timeSpent: dbTask.time_spent || 0,
      completed: dbTask.status === TaskStatus.COMPLETED,
      completedAt: dbTask.completed_at ? new Date(dbTask.completed_at) : null,
      createdAt: new Date(dbTask.created_at || Date.now()),
      updatedAt: new Date(dbTask.updated_at || Date.now()),
      xpEarned: dbTask.xp_earned || 0,
      streakContribution: dbTask.streak_contribution || false,
      assignedBy: dbTask.assigned_by || null,
      assignedTo: dbTask.assigned_to || null,
      dueDate: dbTask.due_date ? new Date(dbTask.due_date) : null,
      preferredStartTime: null, // Not stored in DB yet
      startedAt: dbTask.started_at ? new Date(dbTask.started_at) : null,
      partnerNotified: {
        onStart: false,
        onComplete: false,
        onOverdue: false,
      } as PartnerNotificationStatus,
      encouragementReceived: [], // Will need to be loaded from a separate table or JSONB column
      userId: dbTask.user_id,
    };
  }

  private transformTaskToDb(task: Task): Partial<DbTask> {
    return {
      title: task.title,
      description: task.description || null,
      category: task.category || null,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate ? task.dueDate.toISOString() : null,
      time_estimate: task.timeEstimate || null,
      time_spent: task.timeSpent || 0,
      started_at: task.startedAt ? task.startedAt.toISOString() : null,
      completed_at: task.completedAt ? task.completedAt.toISOString() : null,
      assigned_by: task.assignedBy || null,
      assigned_to: task.assignedTo || null,
      xp_earned: task.xpEarned || 0,
      streak_contribution: task.streakContribution || false,
      user_id: task.userId || '',
    };
  }

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamp.get(cacheKey);
    return timestamp ? Date.now() - timestamp < this.CACHE_DURATION : false;
  }

  private updateCache(cacheKey: string, tasks: Task[]): void {
    this.taskCache.set(cacheKey, tasks);
    this.cacheTimestamp.set(cacheKey, Date.now());
  }

  private invalidateCache(userId?: string): void {
    if (userId) {
      // Invalidate all caches for this user
      for (const [key] of this.taskCache) {
        if (key.includes(userId)) {
          this.taskCache.delete(key);
          this.cacheTimestamp.delete(key);
        }
      }
    } else {
      // Invalidate all caches
      this.taskCache.clear();
      this.cacheTimestamp.clear();
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = `all:${user.id}`;
      if (this.isCacheValid(cacheKey)) {
        return this.taskCache.get(cacheKey) || [];
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch all tasks', {
          code: 'TASK_001',
          context: error.message,
        });
        return [];
      }

      const tasks = (data || []).map(this.transformDbTaskToTask);
      this.updateCache(cacheKey, tasks);
      return tasks;
    } catch (error) {
      SecureLogger.error('Failed to get all tasks', {
        code: 'TASK_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async saveTask(task: Task): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const dbTask = this.transformTaskToDb(task);
      dbTask.user_id = user.id;

      const { error } = await supabase.from('tasks').insert(dbTask).select().single();

      if (error) {
        SecureLogger.error('Failed to save task', {
          code: 'TASK_003',
          context: error.message,
        });
        return false;
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    } catch (error) {
      SecureLogger.error('Failed to save task', {
        code: 'TASK_004',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async updateTask(updatedTask: Task): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const dbTask = this.transformTaskToDb(updatedTask);

      const { error } = await supabase
        .from('tasks')
        .update(dbTask)
        .eq('id', updatedTask.id)
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);

      if (error) {
        SecureLogger.error('Failed to update task', {
          code: 'TASK_005',
          context: error.message,
        });
        return false;
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    } catch (error) {
      SecureLogger.error('Failed to update task', {
        code: 'TASK_006',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        SecureLogger.error('Failed to delete task', {
          code: 'TASK_007',
          context: error.message,
        });
        return false;
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    } catch (error) {
      SecureLogger.error('Failed to delete task', {
        code: 'TASK_008',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async clearAllTasks(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('tasks').delete().eq('user_id', user.id);

      if (error) {
        SecureLogger.error('Failed to clear all tasks', {
          code: 'TASK_009',
          context: error.message,
        });
        return false;
      }

      // Invalidate all caches for this user
      this.invalidateCache(user.id);

      return true;
    } catch (error) {
      SecureLogger.error('Failed to clear all tasks', {
        code: 'TASK_010',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getTasksByCategory(categoryId: string, options?: TaskStorageOptions): Promise<Task[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = `category:${user.id}:${categoryId}`;
      if (this.isCacheValid(cacheKey) && !options?.page) {
        return this.taskCache.get(cacheKey) || [];
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .eq('category', categoryId)
        .order('created_at', { ascending: false });

      if (options?.page && options?.pageSize) {
        const offset = (options.page - 1) * options.pageSize;
        query = query.range(offset, offset + options.pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        SecureLogger.error('Failed to fetch tasks by category', {
          code: 'TASK_011',
          context: error.message,
        });
        return [];
      }

      const tasks = (data || []).map(this.transformDbTaskToTask);

      if (!options?.page) {
        this.updateCache(cacheKey, tasks);
      }

      return tasks;
    } catch (error) {
      SecureLogger.error('Failed to get tasks by category', {
        code: 'TASK_012',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getCompletedTasks(): Promise<Task[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .eq('status', TaskStatus.COMPLETED)
        .order('completed_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch completed tasks', {
          code: 'TASK_013',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get completed tasks', {
        code: 'TASK_014',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getPendingTasks(): Promise<Task[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .eq('status', TaskStatus.PENDING)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch pending tasks', {
          code: 'TASK_015',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get pending tasks', {
        code: 'TASK_016',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getTaskStats(): Promise<TaskStats> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { total: 0, completed: 0, pending: 0, totalXP: 0 };
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('status, xp_earned')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);

      if (error) {
        SecureLogger.error('Failed to fetch task stats', {
          code: 'TASK_017',
          context: error.message,
        });
        return { total: 0, completed: 0, pending: 0, totalXP: 0 };
      }

      const tasks = data || [];
      const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
        pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
        totalXP: tasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0),
      };

      return stats;
    } catch (error) {
      SecureLogger.error('Failed to get task stats', {
        code: 'TASK_018',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return { total: 0, completed: 0, pending: 0, totalXP: 0 };
    }
  }

  async getTasksForUser(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch tasks for user', {
          code: 'TASK_019',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get tasks for user', {
        code: 'TASK_020',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getTasksAssignedByUser(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch tasks assigned by user', {
          code: 'TASK_021',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get tasks assigned by user', {
        code: 'TASK_022',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getAssignedTasks(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch assigned tasks', {
          code: 'TASK_023',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get assigned tasks', {
        code: 'TASK_024',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getPartnerTasks(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_by.eq.${userId},assigned_to.eq.${userId}`)
        .neq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.error('Failed to fetch partner tasks', {
          code: 'TASK_025',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get partner tasks', {
        code: 'TASK_026',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .lt('due_date', now)
        .neq('status', TaskStatus.COMPLETED)
        .order('due_date', { ascending: true });

      if (error) {
        SecureLogger.error('Failed to fetch overdue tasks', {
          code: 'TASK_027',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get overdue tasks', {
        code: 'TASK_028',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getUpcomingTasks(userId: string, hoursAhead: number = 24): Promise<Task[]> {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .gte('due_date', now.toISOString())
        .lte('due_date', future.toISOString())
        .neq('status', TaskStatus.COMPLETED)
        .order('due_date', { ascending: true });

      if (error) {
        SecureLogger.error('Failed to fetch upcoming tasks', {
          code: 'TASK_029',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbTaskToTask);
    } catch (error) {
      SecureLogger.error('Failed to get upcoming tasks', {
        code: 'TASK_030',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  subscribeToTaskUpdates(
    userId: string,
    callback: (task: Task, eventType: string) => void,
  ): () => void {
    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbTask>) => {
          if (payload.new) {
            const task = this.transformDbTaskToTask(payload.new as DbTask);
            callback(task, payload.eventType);

            // Invalidate cache for this user
            this.invalidateCache(userId);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbTask>) => {
          if (payload.new) {
            const task = this.transformDbTaskToTask(payload.new as DbTask);
            callback(task, payload.eventType);

            // Invalidate cache for this user
            this.invalidateCache(userId);
          }
        },
      )
      .subscribe();

    // Store subscription
    this.subscriptions.set(userId, channel);

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(userId);
      if (sub) {
        sub.unsubscribe();
        this.subscriptions.delete(userId);
      }
    };
  }
}

export default new TaskStorageService();
export { TaskStorageService };
export type { ITaskStorageService, TaskStorageOptions, TaskStats };
