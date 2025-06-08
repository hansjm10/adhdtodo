// ABOUTME: Simplified TaskStorageService that directly uses Supabase for all task storage
// No local storage fallback, no migration logic - pure Supabase implementation

import { BaseService } from './BaseService';
import { supabase } from './SupabaseService';
import type { Task, PartnerNotificationStatus } from '../types/task.types';
import { TaskStatus, TaskPriority } from '../types/task.types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

class TaskStorageService extends BaseService implements ITaskStorageService {
  private taskCache = new Map<string, Task[]>();
  private cacheTimestamp = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subscriptions = new Map<string, RealtimeChannel>();

  constructor() {
    super('TaskStorage');
  }

  private transformDbTaskToTask(dbTask: DbTask): Task {
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description ?? '',
      category: dbTask.category ?? null,
      status: (dbTask.status as TaskStatus) ?? TaskStatus.PENDING,
      priority: (dbTask.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      timeEstimate: dbTask.time_estimate ?? null,
      timeSpent: dbTask.time_spent ?? 0,
      completed: dbTask.status === TaskStatus.COMPLETED,
      completedAt: dbTask.completed_at ? new Date(dbTask.completed_at) : null,
      createdAt: new Date(dbTask.created_at ?? Date.now()),
      updatedAt: new Date(dbTask.updated_at ?? Date.now()),
      xpEarned: dbTask.xp_earned ?? 0,
      streakContribution: dbTask.streak_contribution ?? false,
      assignedBy: dbTask.assigned_by ?? null,
      assignedTo: dbTask.assigned_to ?? null,
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
      description: task.description ?? null,
      category: task.category ?? null,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate ? task.dueDate.toISOString() : null,
      time_estimate: task.timeEstimate ?? null,
      time_spent: task.timeSpent ?? 0,
      started_at: task.startedAt ? task.startedAt.toISOString() : null,
      completed_at: task.completedAt ? task.completedAt.toISOString() : null,
      assigned_by: task.assignedBy ?? null,
      assigned_to: task.assignedTo ?? null,
      xp_earned: task.xpEarned ?? 0,
      streak_contribution: task.streakContribution ?? false,
      user_id: task.userId ?? '',
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
    const result = await this.wrapAsync('getAllTasks', async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = `all:${user.id}`;
      if (this.isCacheValid(cacheKey)) {
        return this.taskCache.get(cacheKey) ?? [];
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      const tasks = (data ?? []).map(this.transformDbTaskToTask);
      this.updateCache(cacheKey, tasks);
      return tasks;
    });

    return result.success && result.data ? result.data : [];
  }

  async saveTask(task: Task): Promise<boolean> {
    const result = await this.wrapAsync('saveTask', async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const dbTask = this.transformTaskToDb(task);
      dbTask.user_id = user.id;

      const { error } = await supabase.from('tasks').insert(dbTask).select().single();

      if (error) {
        throw new Error(`Failed to save task: ${error.message}`);
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    }, { taskId: task.id, title: task.title });

    return result.success && result.data === true;
  }

  async updateTask(updatedTask: Task): Promise<boolean> {
    const result = await this.wrapAsync('updateTask', async () => {
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
        throw new Error(`Failed to update task: ${error.message}`);
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    }, { taskId: updatedTask.id, title: updatedTask.title });

    return result.success && result.data === true;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const result = await this.wrapAsync('deleteTask', async () => {
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
        throw new Error(`Failed to delete task: ${error.message}`);
      }

      // Invalidate cache for this user
      this.invalidateCache(user.id);

      return true;
    }, { taskId });

    return result.success && result.data === true;
  }

  async clearAllTasks(): Promise<boolean> {
    const result = await this.wrapAsync('clearAllTasks', async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('tasks').delete().eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to clear all tasks: ${error.message}`);
      }

      // Invalidate all caches for this user
      this.invalidateCache(user.id);

      return true;
    });

    return result.success && result.data === true;
  }

  async getTasksByCategory(categoryId: string, options?: TaskStorageOptions): Promise<Task[]> {
    const result = await this.wrapAsync('getTasksByCategory', async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = `category:${user.id}:${categoryId}`;
      if (this.isCacheValid(cacheKey) && !options?.page) {
        return this.taskCache.get(cacheKey) ?? [];
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
        throw new Error(`Failed to fetch tasks by category: ${error.message}`);
      }

      const tasks = (data ?? []).map(this.transformDbTaskToTask);

      if (!options?.page) {
        this.updateCache(cacheKey, tasks);
      }

      return tasks;
    }, { categoryId, options });

    return result.success && result.data ? result.data : [];
  }

  async getCompletedTasks(): Promise<Task[]> {
    const result = await this.wrapAsync('getCompletedTasks', async () => {
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
        throw new Error(`Failed to fetch completed tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    });

    return result.success && result.data ? result.data : [];
  }

  async getPendingTasks(): Promise<Task[]> {
    const result = await this.wrapAsync('getPendingTasks', async () => {
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
        throw new Error(`Failed to fetch pending tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    });

    return result.success && result.data ? result.data : [];
  }

  async getTaskStats(): Promise<TaskStats> {
    const result = await this.wrapAsync('getTaskStats', async () => {
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
        throw new Error(`Failed to fetch task stats: ${error.message}`);
      }

      const tasks = data ?? [];
      const stats: TaskStats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
        pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
        totalXP: tasks.reduce((sum: number, t) => Number(sum) + Number(t.xp_earned ?? 0), 0),
      };

      return stats;
    });

    return result.success && result.data ? result.data : { total: 0, completed: 0, pending: 0, totalXP: 0 };
  }

  async getTasksForUser(userId: string): Promise<Task[]> {
    const result = await this.wrapAsync('getTasksForUser', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch tasks for user: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId });

    return result.success && result.data ? result.data : [];
  }

  async getTasksAssignedByUser(userId: string): Promise<Task[]> {
    const result = await this.wrapAsync('getTasksAssignedByUser', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch tasks assigned by user: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId });

    return result.success && result.data ? result.data : [];
  }

  async getAssignedTasks(userId: string): Promise<Task[]> {
    const result = await this.wrapAsync('getAssignedTasks', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId });

    return result.success && result.data ? result.data : [];
  }

  async getPartnerTasks(userId: string): Promise<Task[]> {
    const result = await this.wrapAsync('getPartnerTasks', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_by.eq.${userId},assigned_to.eq.${userId}`)
        .neq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch partner tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId });

    return result.success && result.data ? result.data : [];
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    const result = await this.wrapAsync('getOverdueTasks', async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .lt('due_date', now)
        .neq('status', TaskStatus.COMPLETED)
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch overdue tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId });

    return result.success && result.data ? result.data : [];
  }

  async getUpcomingTasks(userId: string, hoursAhead: number = 24): Promise<Task[]> {
    const result = await this.wrapAsync('getUpcomingTasks', async () => {
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
        throw new Error(`Failed to fetch upcoming tasks: ${error.message}`);
      }

      return (data ?? []).map(this.transformDbTaskToTask);
    }, { userId, hoursAhead });

    return result.success && result.data ? result.data : [];
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
        void sub.unsubscribe();
        this.subscriptions.delete(userId);
      }
    };
  }
}

export default new TaskStorageService();
export { TaskStorageService };
export type { ITaskStorageService, TaskStorageOptions, TaskStats };
