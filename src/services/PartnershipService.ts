// ABOUTME: Supabase-based partnership service with real-time capabilities
// Manages partnerships between ADHD users and accountability partners with live sync

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './SupabaseService';
import { BaseService } from './BaseService';
import UserStorageService from './UserStorageService';
import type { Partnership, PartnershipStats, PartnershipSettings, Result } from '../types';
import { PartnershipStatus } from '../types';
import { createPartnership, acceptPartnership } from '../utils/PartnershipModel';
import { setUserPartner } from '../utils/UserModel';

// Database type definitions for partnerships table
interface DatabasePartnership {
  id: string;
  adhd_user_id: string | null;
  partner_id: string | null;
  status: string;
  invite_code: string;
  invite_sent_by: string | null;
  settings: PartnershipSettings;
  stats: PartnershipStats;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  terminated_at: string | null;
}

export interface IPartnershipService {
  getAllPartnerships(): Promise<Result<Partnership[]>>;
  savePartnership(partnership: Partnership): Promise<Result<boolean>>;
  updatePartnership(updatedPartnership: Partnership): Promise<Result<boolean>>;
  createPartnershipInvite(
    invitingUserId: string,
    invitedUserRole: string,
  ): Promise<Result<Partnership>>;
  acceptPartnershipInvite(
    inviteCode: string,
    acceptingUserId: string,
  ): Promise<Result<Partnership>>;
  getPartnershipByUsers(userId1: string, userId2: string): Promise<Result<Partnership | null>>;
  getPartnershipByInviteCode(inviteCode: string): Promise<Result<Partnership | null>>;
  getUserPartnerships(userId: string): Promise<Result<Partnership[]>>;
  getActivePartnership(userId: string): Promise<Result<Partnership | null>>;
  incrementPartnershipStat(
    partnershipId: string,
    statKey: keyof PartnershipStats,
    increment?: number,
  ): Promise<Result<boolean>>;
  clearAllPartnerships(): Promise<Result<boolean>>;
  subscribeToPartnershipUpdates(
    userId: string,
    callback: (partnership: Partnership, action: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  ): RealtimeChannel;
}

class SupabasePartnershipService extends BaseService implements IPartnershipService {
  private cache = new Map<string, { data: Partnership[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super('Partnership');
  }

  private getCacheKey(key: string): string {
    return `partnerships_${key}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async getCachedOrFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(cacheKey, { data: data as Partnership[], timestamp: Date.now() });
    return data;
  }

  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async getAllPartnerships(): Promise<Result<Partnership[]>> {
    return this.wrapAsync(
      'getAllPartnerships',
      async () => {
        return this.getCachedOrFetch(this.getCacheKey('all'), async () => {
          const { data, error } = await supabase.from('partnerships').select('*');

          if (error) throw error;
          return this.transformDatabasePartnerships((data ?? []) as DatabasePartnership[]);
        });
      },
      { operation: 'fetch_all_partnerships' },
    );
  }

  async savePartnership(partnership: Partnership): Promise<Result<boolean>> {
    return this.wrapAsync(
      'savePartnership',
      async () => {
        const dbPartnership = this.transformToDatabase(partnership);

        const { error } = await supabase.from('partnerships').insert([dbPartnership]);

        if (error) throw error;

        this.invalidateCache();
        return true;
      },
      { partnership_id: partnership.id, operation: 'save_partnership' },
    );
  }

  async updatePartnership(updatedPartnership: Partnership): Promise<Result<boolean>> {
    return this.wrapAsync(
      'updatePartnership',
      async () => {
        const dbPartnership = this.transformToDatabase(updatedPartnership);

        const { error } = await supabase
          .from('partnerships')
          .update(dbPartnership)
          .eq('id', updatedPartnership.id);

        if (error) throw error;

        this.invalidateCache();
        return true;
      },
      { partnership_id: updatedPartnership.id, operation: 'update_partnership' },
    );
  }

  async createPartnershipInvite(
    invitingUserId: string,
    invitedUserRole: string,
  ): Promise<Result<Partnership>> {
    return this.wrapAsync(
      'createPartnershipInvite',
      async () => {
        // Generate unique invite code
        const result = await supabase.rpc('generate_invite_code');

        if (result.error) throw result.error;

        const inviteCode = result.data as string;

        const partnership = createPartnership({
          inviteSentBy: invitingUserId,
          adhdUserId: invitedUserRole === 'partner' ? invitingUserId : null,
          partnerId: invitedUserRole === 'adhd_user' ? invitingUserId : null,
          inviteCode: inviteCode,
        });

        const dbPartnership = this.transformToDatabase(partnership);

        const { data, error } = await supabase
          .from('partnerships')
          .insert([dbPartnership])
          .select()
          .single<DatabasePartnership>();

        if (error) throw error;

        this.invalidateCache();
        return this.transformDatabasePartnership(data);
      },
      {
        inviting_user_id: invitingUserId,
        invited_user_role: invitedUserRole,
        operation: 'create_partnership_invite',
      },
    );
  }

  async acceptPartnershipInvite(
    inviteCode: string,
    acceptingUserId: string,
  ): Promise<Result<Partnership>> {
    return this.wrapAsync(
      'acceptPartnershipInvite',
      async () => {
        // Find the partnership by invite code
        const { data: partnershipData, error: findError } = await supabase
          .from('partnerships')
          .select('*')
          .eq('invite_code', inviteCode)
          .single<DatabasePartnership>();

        if (findError || !partnershipData) {
          throw new Error('Invalid invite code');
        }

        const partnership = this.transformDatabasePartnership(partnershipData);

        if (partnership.status !== PartnershipStatus.PENDING) {
          throw new Error('Invite already used');
        }

        // Set the accepting user in the appropriate role
        if (!partnership.adhdUserId) {
          partnership.adhdUserId = acceptingUserId;
        } else if (!partnership.partnerId) {
          partnership.partnerId = acceptingUserId;
        } else {
          throw new Error('Partnership already complete');
        }

        const acceptedPartnership = acceptPartnership(partnership);
        const dbPartnership = this.transformToDatabase(acceptedPartnership);

        const { data: updatedData, error: updateError } = await supabase
          .from('partnerships')
          .update(dbPartnership)
          .eq('id', partnership.id)
          .select()
          .single<DatabasePartnership>();

        if (updateError) throw updateError;

        // Update both users with partner IDs
        if (acceptedPartnership.adhdUserId && acceptedPartnership.partnerId) {
          const adhdUser = await UserStorageService.getUserById(acceptedPartnership.adhdUserId);
          const partner = await UserStorageService.getUserById(acceptedPartnership.partnerId);

          if (adhdUser) {
            const updatedAdhdUser = setUserPartner(adhdUser, acceptedPartnership.partnerId);
            await UserStorageService.updateUser(updatedAdhdUser);
          }

          if (partner) {
            const updatedPartner = setUserPartner(partner, acceptedPartnership.adhdUserId);
            await UserStorageService.updateUser(updatedPartner);
          }
        }

        this.invalidateCache();
        return this.transformDatabasePartnership(updatedData);
      },
      {
        invite_code: inviteCode,
        accepting_user_id: acceptingUserId,
        operation: 'accept_partnership_invite',
      },
    );
  }

  async getPartnershipByUsers(userId1: string, userId2: string): Promise<Result<Partnership | null>> {
    return this.wrapAsync(
      'getPartnershipByUsers',
      async () => {
        const { data, error } = await supabase
          .from('partnerships')
          .select('*')
          .or(
            `and(adhd_user_id.eq.${userId1},partner_id.eq.${userId2}),and(adhd_user_id.eq.${userId2},partner_id.eq.${userId1})`,
          )
          .single<DatabasePartnership>();

        if (error || !data) return null;

        return this.transformDatabasePartnership(data);
      },
      {
        user_id_1: userId1,
        user_id_2: userId2,
        operation: 'get_partnership_by_users',
      },
    );
  }

  async getPartnershipByInviteCode(inviteCode: string): Promise<Result<Partnership | null>> {
    return this.wrapAsync(
      'getPartnershipByInviteCode',
      async () => {
        const { data, error } = await supabase
          .from('partnerships')
          .select('*')
          .eq('invite_code', inviteCode)
          .single<DatabasePartnership>();

        if (error || !data) return null;

        return this.transformDatabasePartnership(data);
      },
      {
        invite_code: inviteCode,
        operation: 'get_partnership_by_invite_code',
      },
    );
  }

  async getUserPartnerships(userId: string): Promise<Result<Partnership[]>> {
    return this.wrapAsync(
      'getUserPartnerships',
      async () => {
        return this.getCachedOrFetch(this.getCacheKey(`user_${userId}`), async () => {
          const { data, error } = await supabase
            .from('partnerships')
            .select('*')
            .or(`adhd_user_id.eq.${userId},partner_id.eq.${userId}`);

          if (error) throw error;
          return this.transformDatabasePartnerships((data ?? []) as DatabasePartnership[]);
        });
      },
      {
        user_id: userId,
        operation: 'get_user_partnerships',
      },
    );
  }

  async getActivePartnership(userId: string): Promise<Result<Partnership | null>> {
    return this.wrapAsync(
      'getActivePartnership',
      async () => {
        const { data, error } = await supabase
          .from('partnerships')
          .select('*')
          .or(`adhd_user_id.eq.${userId},partner_id.eq.${userId}`)
          .eq('status', 'active')
          .single<DatabasePartnership>();

        if (error || !data) return null;

        return this.transformDatabasePartnership(data);
      },
      {
        user_id: userId,
        operation: 'get_active_partnership',
      },
    );
  }

  async incrementPartnershipStat(
    partnershipId: string,
    statKey: keyof PartnershipStats,
    increment: number = 1,
  ): Promise<Result<boolean>> {
    return this.wrapAsync(
      'incrementPartnershipStat',
      async () => {
        const { error } = await supabase.rpc('update_partnership_stats', {
          partnership_id: partnershipId,
          stat_key: statKey,
          increment: increment,
        });

        if (error) throw error;

        this.invalidateCache();
        return true;
      },
      {
        partnership_id: partnershipId,
        stat_key: statKey,
        increment,
        operation: 'increment_partnership_stat',
      },
    );
  }

  async clearAllPartnerships(): Promise<Result<boolean>> {
    return this.wrapAsync(
      'clearAllPartnerships',
      async () => {
        const { error } = await supabase
          .from('partnerships')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;

        this.invalidateCache();
        return true;
      },
      { operation: 'clear_all_partnerships' },
    );
  }

  subscribeToPartnershipUpdates(
    userId: string,
    callback: (partnership: Partnership, action: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  ): RealtimeChannel {
    const channel = supabase
      .channel(`partnerships-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partnerships',
          filter: `or(adhd_user_id.eq.${userId},partner_id.eq.${userId})`,
        },
        (payload) => {
          this.invalidateCache(userId);

          if (payload.new && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
            const partnership = this.transformDatabasePartnership(
              payload.new as DatabasePartnership,
            );
            callback(partnership, payload.eventType);
          } else if (payload.old && payload.eventType === 'DELETE') {
            const partnership = this.transformDatabasePartnership(
              payload.old as DatabasePartnership,
            );
            callback(partnership, payload.eventType);
          }
        },
      )
      .subscribe();

    return channel;
  }

  // Database transformation methods
  private transformToDatabase(partnership: Partnership): Record<string, unknown> {
    return {
      id: partnership.id,
      adhd_user_id: partnership.adhdUserId,
      partner_id: partnership.partnerId,
      status: partnership.status,
      invite_code: partnership.inviteCode,
      invite_sent_by: partnership.inviteSentBy,
      settings: partnership.settings,
      stats: partnership.stats,
      created_at: partnership.createdAt?.toISOString(),
      updated_at: partnership.updatedAt?.toISOString(),
      accepted_at: partnership.acceptedAt?.toISOString(),
      terminated_at: partnership.terminatedAt?.toISOString(),
    };
  }

  private transformDatabasePartnership(dbPartnership: DatabasePartnership): Partnership {
    return {
      id: dbPartnership.id,
      adhdUserId: dbPartnership.adhd_user_id,
      partnerId: dbPartnership.partner_id,
      status: dbPartnership.status as PartnershipStatus,
      inviteCode: dbPartnership.invite_code,
      inviteSentBy: dbPartnership.invite_sent_by,
      settings: dbPartnership.settings,
      stats: dbPartnership.stats,
      createdAt: new Date(dbPartnership.created_at),
      updatedAt: new Date(dbPartnership.updated_at),
      acceptedAt: dbPartnership.accepted_at ? new Date(dbPartnership.accepted_at) : null,
      terminatedAt: dbPartnership.terminated_at ? new Date(dbPartnership.terminated_at) : null,
    };
  }

  private transformDatabasePartnerships(dbPartnerships: DatabasePartnership[]): Partnership[] {
    return dbPartnerships.map((dbPartnership) => this.transformDatabasePartnership(dbPartnership));
  }
}

export default new SupabasePartnershipService();
