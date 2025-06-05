// ABOUTME: Simplified UserStorageService that directly uses Supabase for all user storage
// No local storage fallback, no migration logic - pure Supabase implementation

import * as SecureStore from 'expo-secure-store';
import { supabase } from './SupabaseService';
import SecureLogger from './SecureLogger';
import type { User } from '../types/user.types';
import { UserRole, NotificationPreference } from '../types/user.types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface IUserStorageService {
  getCurrentUser(): Promise<User | null>;
  setCurrentUser(user: User): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  saveUser(user: User): Promise<boolean>;
  updateUser(updatedUser: User): Promise<boolean>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  logout(): Promise<boolean>;
  saveUserToken(token: string): Promise<boolean>;
  getUserToken(): Promise<string | null>;
  clearAllUsers(): Promise<boolean>;
  subscribeToUserUpdates(userId: string, callback: (user: User) => void): Promise<() => void>;
}

// Database user type mapping
interface DbUser {
  id: string;
  email?: string;
  name?: string;
  theme?: string;
  notification_preferences?: Record<string, unknown>;
  encouragement_messages?: string[];
  partner_id?: string | null;
  xp_total?: number;
  current_streak?: number;
  longest_streak?: number;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  last_active?: string;
}

// Supabase Auth user type
interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
}

class UserStorageService implements IUserStorageService {
  private currentUserCache: User | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subscriptions = new Map<string, RealtimeChannel>();

  async getCurrentUser(): Promise<User | null> {
    try {
      // Check cache first
      if (this.currentUserCache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
        return this.currentUserCache;
      }

      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        SecureLogger.info('No active session found', { code: 'USER_001' });
        return null;
      }

      // Fetch user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single<DbUser>();

      if (profileError || !profile) {
        SecureLogger.error('Failed to fetch user profile', {
          code: 'USER_002',
          context: profileError?.message ?? 'No profile found',
        });
        return null;
      }

      // Transform database user to User type
      const user = this.transformDbUserToUser(profile, session.user as AuthUser);

      // Update cache
      this.currentUserCache = user;
      this.cacheTimestamp = Date.now();

      return user;
    } catch (error) {
      SecureLogger.error('Failed to get current user', {
        code: 'USER_003',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async setCurrentUser(user: User): Promise<boolean> {
    try {
      // Update cache
      this.currentUserCache = user;
      this.cacheTimestamp = Date.now();

      // Update user profile in database
      const { error } = await supabase
        .from('users')
        .update({
          name: user.name,
          theme: user.theme ?? 'system',
          notification_preferences: user.notificationPreferences ?? {
            global: NotificationPreference.ALL,
          },
          encouragement_messages: user.encouragementMessages ?? [],
          partner_id: user.partnerId,
          xp_total: user.stats?.totalXP ?? 0,
          current_streak: user.stats?.currentStreak ?? 0,
          longest_streak: user.stats?.longestStreak ?? 0,
          last_active: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      SecureLogger.info('Current user updated', {
        code: 'USER_004',
        context: `User: ${user.id}`,
      });

      return true;
    } catch (error) {
      SecureLogger.error('Failed to set current user', {
        code: 'USER_005',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      // In Supabase context, we typically only have access to current user
      // This method might be used for partner functionality
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return [];
      }

      const users: User[] = [currentUser];

      // If user has a partner, fetch partner data
      if (currentUser.partnerId) {
        const { data: partner, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.partnerId)
          .single<DbUser>();

        if (!error && partner) {
          // Note: We can't get full auth user data for partner
          const partnerUser = this.transformDbUserToUser(partner);
          users.push(partnerUser);
        }
      }

      return users;
    } catch (error) {
      SecureLogger.error('Failed to get all users', {
        code: 'USER_006',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async saveUser(user: User): Promise<boolean> {
    try {
      // In Supabase, users are created through auth flow
      // This method updates existing user data
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme ?? 'system',
        notification_preferences: user.notificationPreferences ?? {
          global: NotificationPreference.ALL,
        },
        encouragement_messages: user.encouragementMessages ?? [],
        partner_id: user.partnerId,
        xp_total: user.stats?.totalXP ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        longest_streak: user.stats?.longestStreak ?? 0,
        last_active: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to save user', {
        code: 'USER_007',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async updateUser(updatedUser: User): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: updatedUser.name,
          theme: updatedUser.theme ?? 'system',
          notification_preferences: updatedUser.notificationPreferences ?? {
            global: NotificationPreference.ALL,
          },
          encouragement_messages: updatedUser.encouragementMessages ?? [],
          partner_id: updatedUser.partnerId,
          xp_total: updatedUser.stats?.totalXP ?? 0,
          current_streak: updatedUser.stats?.currentStreak ?? 0,
          longest_streak: updatedUser.stats?.longestStreak ?? 0,
          last_active: new Date().toISOString(),
        })
        .eq('id', updatedUser.id);

      if (error) {
        throw error;
      }

      // Update cache if it's the current user
      if (this.currentUserCache?.id === updatedUser.id) {
        this.currentUserCache = updatedUser;
        this.cacheTimestamp = Date.now();
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to update user', {
        code: 'USER_008',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single<DbUser>();

      if (error || !profile) {
        return null;
      }

      return this.transformDbUserToUser(profile);
    } catch (error) {
      SecureLogger.error('Failed to get user by ID', {
        code: 'USER_009',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single<DbUser>();

      if (error || !profile) {
        return null;
      }

      return this.transformDbUserToUser(profile);
    } catch (error) {
      SecureLogger.error('Failed to get user by email', {
        code: 'USER_010',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async logout(): Promise<boolean> {
    try {
      // Clear cache
      this.currentUserCache = null;
      this.cacheTimestamp = 0;

      // Clear any stored tokens
      await SecureStore.deleteItemAsync('user_token').catch(() => {});

      // Note: Actual Supabase logout is handled by AuthService
      return true;
    } catch (error) {
      SecureLogger.error('Failed to complete logout operation', {
        code: 'USER_011',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async saveUserToken(token: string): Promise<boolean> {
    try {
      // In Supabase, tokens are managed by the auth service
      // Store in SecureStore for compatibility
      await SecureStore.setItemAsync('user_token', token, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to save token',
      });
      return true;
    } catch (error) {
      SecureLogger.error('Failed to save user token', {
        code: 'USER_012',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getUserToken(): Promise<string | null> {
    try {
      // Try to get token from Supabase session first
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }

      // Fall back to SecureStore for compatibility
      return await SecureStore.getItemAsync('user_token');
    } catch (error) {
      SecureLogger.error('Failed to retrieve user token', {
        code: 'USER_013',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async clearAllUsers(): Promise<boolean> {
    try {
      // In Supabase context, we don't clear all users
      // Just clear local cache and token
      this.currentUserCache = null;
      this.cacheTimestamp = 0;
      await SecureStore.deleteItemAsync('user_token').catch(() => {});

      SecureLogger.info('Local user data cleared', {
        code: 'USER_014',
      });

      return true;
    } catch (error) {
      SecureLogger.error('Failed to clear user data', {
        code: 'USER_015',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // Helper method to transform database user to User type
  private transformDbUserToUser(dbUser: DbUser, authUser?: AuthUser): User {
    return {
      id: dbUser.id,
      email: dbUser.email ?? authUser?.email ?? '',
      name: dbUser.name ?? 'User',
      role: UserRole.ADHD_USER, // Default role, would be stored in metadata or separate table
      createdAt: new Date(dbUser.created_at ?? authUser?.created_at ?? Date.now()),
      updatedAt: new Date(dbUser.updated_at ?? Date.now()),
      lastLoginAt: new Date(dbUser.last_login ?? Date.now()),
      lastActiveAt: new Date(dbUser.last_active ?? Date.now()),
      sessionToken: null, // Managed by Supabase Auth
      passwordHash: '', // Not stored locally
      passwordSalt: '', // Not stored locally
      notificationPreferences: dbUser.notification_preferences
        ? {
            global:
              (dbUser.notification_preferences.global as NotificationPreference) ??
              NotificationPreference.ALL,
            taskAssigned: true,
            taskStarted: true,
            taskCompleted: true,
            taskOverdue: true,
            encouragement: true,
            checkIn: true,
          }
        : {
            global: NotificationPreference.ALL,
            taskAssigned: true,
            taskStarted: true,
            taskCompleted: true,
            taskOverdue: true,
            encouragement: true,
            checkIn: true,
          },
      encouragementMessages: dbUser.encouragement_messages ?? [],
      stats: {
        tasksAssigned: 0, // Would need to query tasks table
        tasksCompleted: 0, // Would need to query tasks table
        currentStreak: dbUser.current_streak ?? 0,
        longestStreak: dbUser.longest_streak ?? 0,
        totalXP: dbUser.xp_total ?? 0,
      },
      partnerId: dbUser.partner_id ?? null,
      theme: dbUser.theme ?? 'system',
    };
  }

  subscribeToUserUpdates(userId: string, callback: (user: User) => void): Promise<() => void> {
    return new Promise((resolve) => {
      try {
        // Create channel for user updates
        const channel = supabase
          .channel(`user:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${userId}`,
            },
            (payload: RealtimePostgresChangesPayload<DbUser>) => {
              if (payload.new) {
                const updatedUser = this.transformDbUserToUser(payload.new as DbUser);

                // Update cache if it's the current user
                if (this.currentUserCache?.id === userId) {
                  this.currentUserCache = updatedUser;
                  this.cacheTimestamp = Date.now();
                }

                // Notify callback
                callback(updatedUser);
              }
            },
          )
          .subscribe();

        // Store subscription
        this.subscriptions.set(userId, channel);

        // Return unsubscribe function
        resolve(() => {
          const sub = this.subscriptions.get(userId);
          if (sub) {
            void sub.unsubscribe();
            this.subscriptions.delete(userId);
          }
        });
      } catch (error) {
        SecureLogger.error('Failed to subscribe to user updates', {
          code: 'USER_016',
          context: error instanceof Error ? error.message : 'Unknown error',
        });

        // Return no-op unsubscribe function
        resolve(() => {});
      }
    });
  }
}

// Export singleton instance
export default new UserStorageService();
