// ABOUTME: Real-time presence service for tracking user online/offline status
// Shows when partners are online and what they're working on with live updates

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './SupabaseService';

// Type for Supabase presence data - represents the raw data from Supabase
type PresenceData = Record<string, unknown>;

export interface PresenceState {
  userId: string;
  status: 'online' | 'away' | 'offline';
  currentTaskId?: string;
  lastSeen: Date;
  metadata?: {
    deviceType?: string;
    location?: string;
    workingOn?: string;
  };
}

export interface PresenceConfig {
  heartbeatInterval: number; // ms
  awayTimeout: number; // ms
  offlineTimeout: number; // ms
}

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private awayTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUserId: string | null = null;
  private presenceState: Map<string, PresenceState> = new Map();

  private readonly config: PresenceConfig = {
    heartbeatInterval: 30000, // 30 seconds
    awayTimeout: 300000, // 5 minutes
    offlineTimeout: 900000, // 15 minutes
  };

  /**
   * Initialize presence tracking for a user
   */
  async startPresence(userId: string, initialTaskId?: string): Promise<void> {
    if (this.currentUserId === userId && this.channel) {
      return; // Already tracking
    }

    await this.stopPresence();

    this.currentUserId = userId;
    this.channel = supabase.channel(`presence:${userId}`);

    // Track own presence
    await this.updatePresence('online', initialTaskId);

    // Set up presence subscription for all users
    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(key, leftPresences);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.startHeartbeat();
        }
      });
  }

  /**
   * Stop presence tracking
   */
  async stopPresence(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
      this.awayTimer = null;
    }

    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.currentUserId = null;
    this.presenceState.clear();
  }

  /**
   * Update user's presence status
   */
  async updatePresence(
    status: 'online' | 'away' | 'offline',
    currentTaskId?: string,
    metadata?: PresenceState['metadata'],
  ): Promise<void> {
    if (!this.channel || !this.currentUserId) {
      console.warn('Presence not initialized');
      return;
    }

    const presenceData: Partial<PresenceState> = {
      userId: this.currentUserId,
      status,
      currentTaskId,
      lastSeen: new Date(),
      metadata,
    };

    await this.channel?.track(presenceData);

    // Reset away timer when user is active
    if (status === 'online') {
      this.resetAwayTimer();
    }
  }

  /**
   * Set current task user is working on
   */
  async setCurrentTask(taskId: string | null): Promise<void> {
    if (!this.currentUserId) return;

    const currentState = this.presenceState.get(this.currentUserId);
    const status = currentState?.status ?? 'online';

    await this.updatePresence(status, taskId ?? undefined);
  }

  /**
   * Get presence state for a specific user
   */
  getPresenceState(userId: string): PresenceState | null {
    return this.presenceState.get(userId) ?? null;
  }

  /**
   * Get presence state for all tracked users
   */
  getAllPresenceStates(): Map<string, PresenceState> {
    return new Map(this.presenceState);
  }

  /**
   * Get users who are currently online
   */
  getOnlineUsers(): PresenceState[] {
    return Array.from(this.presenceState.values()).filter((state) => state.status === 'online');
  }

  /**
   * Check if a specific user is online
   */
  isUserOnline(userId: string): boolean {
    const state = this.presenceState.get(userId);
    return state?.status === 'online';
  }

  /**
   * Subscribe to presence changes for specific users (e.g., partners)
   */
  subscribeToUserPresence(
    userIds: string[],
    callback: (userId: string, presence: PresenceState) => void,
  ): () => void {
    const handlePresenceChange = () => {
      for (const userId of userIds) {
        const presence = this.presenceState.get(userId);
        if (presence) {
          callback(userId, presence);
        }
      }
    };

    // Initial call
    handlePresenceChange();

    // Return unsubscribe function
    return () => {
      // Since this is using the main channel, we don't need to unsubscribe
      // The main channel handles all presence updates
    };
  }

  /**
   * Mark user as away due to inactivity
   */
  private async markAway(): Promise<void> {
    if (!this.currentUserId) return;

    const currentState = this.presenceState.get(this.currentUserId);
    if (currentState?.status === 'online') {
      await this.updatePresence('away', currentState.currentTaskId);
    }
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (!this.currentUserId) return;

      const currentState = this.presenceState.get(this.currentUserId);
      if (currentState?.status === 'online') {
        void this.updatePresence('online', currentState.currentTaskId);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Reset the away timer when user is active
   */
  private resetAwayTimer(): void {
    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
    }

    this.awayTimer = setTimeout(() => {
      void this.markAway();
    }, this.config.awayTimeout);
  }

  /**
   * Handle presence sync event
   */
  private handlePresenceSync(): void {
    if (!this.channel) return;

    const state = this.channel.presenceState();

    for (const [_userId, presences] of Object.entries(state)) {
      const latestPresence = presences[presences.length - 1] as Record<string, unknown>;
      if (latestPresence?.userId) {
        this.presenceState.set(latestPresence.userId as string, {
          userId: latestPresence.userId as string,
          status: (latestPresence.status as 'online' | 'away' | 'offline') || 'online',
          lastSeen: latestPresence.lastSeen
            ? new Date(latestPresence.lastSeen as string)
            : new Date(),
          currentTaskId: latestPresence.currentTaskId as string | undefined,
          metadata: latestPresence.metadata as PresenceState['metadata'],
        });
      }
    }

    this.cleanupStalePresence();
  }

  /**
   * Handle user joining presence
   */
  private handlePresenceJoin(key: string, newPresences: PresenceData[]): void {
    const latestPresence = newPresences[newPresences.length - 1] as unknown as Record<
      string,
      unknown
    >;
    if (latestPresence?.userId) {
      this.presenceState.set(latestPresence.userId as string, {
        userId: latestPresence.userId as string,
        status: (latestPresence.status as 'online' | 'away' | 'offline') || 'online',
        lastSeen: latestPresence.lastSeen
          ? new Date(latestPresence.lastSeen as string)
          : new Date(),
        currentTaskId: latestPresence.currentTaskId as string | undefined,
        metadata: latestPresence.metadata as PresenceState['metadata'],
      });
    }
  }

  /**
   * Handle user leaving presence
   */
  private handlePresenceLeave(key: string, leftPresences: PresenceData[]): void {
    for (const presence of leftPresences) {
      const presenceData = presence as unknown as Record<string, unknown>;
      if (presenceData?.userId) {
        // Mark as offline instead of removing
        this.presenceState.set(presenceData.userId as string, {
          userId: presenceData.userId as string,
          status: 'offline' as const,
          lastSeen: new Date(),
          currentTaskId: presenceData.currentTaskId as string | undefined,
          metadata: presenceData.metadata as PresenceState['metadata'],
        });
      }
    }
  }

  /**
   * Clean up stale presence entries
   */
  private cleanupStalePresence(): void {
    const now = Date.now();

    for (const [userId, presence] of this.presenceState.entries()) {
      const lastSeenTime = presence.lastSeen.getTime();
      const timeSinceLastSeen = now - lastSeenTime;

      if (timeSinceLastSeen > this.config.offlineTimeout) {
        // Mark as offline if not seen for a long time
        this.presenceState.set(userId, {
          ...presence,
          status: 'offline',
        });
      } else if (timeSinceLastSeen > this.config.awayTimeout && presence.status === 'online') {
        // Mark as away if not active for a while
        this.presenceState.set(userId, {
          ...presence,
          status: 'away',
        });
      }
    }
  }

  /**
   * Get activity indicator for user (what they're working on)
   */
  getUserActivity(userId: string): string | null {
    const presence = this.presenceState.get(userId);
    if (!presence || presence.status === 'offline') {
      return null;
    }

    if (presence.currentTaskId) {
      return `Working on task ${presence.currentTaskId}`;
    }

    if (presence.metadata?.workingOn) {
      return presence.metadata.workingOn;
    }

    return presence.status === 'online' ? 'Online' : 'Away';
  }

  /**
   * Signal user activity (call this on user interactions)
   */
  async signalActivity(): Promise<void> {
    if (!this.currentUserId) return;

    const currentState = this.presenceState.get(this.currentUserId);
    if (currentState?.status === 'away') {
      await this.updatePresence('online', currentState.currentTaskId);
    }

    this.resetAwayTimer();
  }
}

export default new PresenceService();
