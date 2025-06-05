// ABOUTME: Supabase-based partnership service with real-time capabilities
// Manages partnerships between ADHD users and accountability partners with live sync

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './SupabaseService';
import UserStorageService from './UserStorageService';
import type { Partnership, PartnershipStats, PartnershipSettings } from '../types';
import { PartnershipStatus } from '../types';
import { createPartnership, acceptPartnership } from '../utils/PartnershipModel';
import { setUserPartner } from '../utils/UserModel';

export interface IPartnershipService {
  getAllPartnerships(): Promise<Partnership[]>;
  savePartnership(partnership: Partnership): Promise<boolean>;
  updatePartnership(updatedPartnership: Partnership): Promise<boolean>;
  createPartnershipInvite(
    invitingUserId: string,
    invitedUserRole: string,
  ): Promise<Partnership | null>;
  acceptPartnershipInvite(
    inviteCode: string,
    acceptingUserId: string,
  ): Promise<{ success: boolean; error?: string; partnership?: Partnership }>;
  getPartnershipByUsers(userId1: string, userId2: string): Promise<Partnership | null>;
  getPartnershipByInviteCode(inviteCode: string): Promise<Partnership | null>;
  getUserPartnerships(userId: string): Promise<Partnership[]>;
  getActivePartnership(userId: string): Promise<Partnership | null>;
  incrementPartnershipStat(
    partnershipId: string,
    statKey: keyof PartnershipStats,
    increment?: number,
  ): Promise<boolean>;
  clearAllPartnerships(): Promise<boolean>;
  subscribeToPartnershipUpdates(
    userId: string,
    callback: (partnership: Partnership, action: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  ): RealtimeChannel;
}

class SupabasePartnershipService implements IPartnershipService {
  private cache = new Map<string, { data: Partnership[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  async getAllPartnerships(): Promise<Partnership[]> {
    try {
      return await this.getCachedOrFetch(this.getCacheKey('all'), async () => {
        const { data, error } = await supabase.from('partnerships').select('*');

        if (error) throw error;
        return this.transformDatabasePartnerships(data || []);
      });
    } catch (error) {
      console.error('Error fetching partnerships:', error);
      return [];
    }
  }

  async savePartnership(partnership: Partnership): Promise<boolean> {
    try {
      const dbPartnership = this.transformToDatabase(partnership);

      const { error } = await supabase.from('partnerships').insert([dbPartnership]);

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error saving partnership:', error);
      return false;
    }
  }

  async updatePartnership(updatedPartnership: Partnership): Promise<boolean> {
    try {
      const dbPartnership = this.transformToDatabase(updatedPartnership);

      const { error } = await supabase
        .from('partnerships')
        .update(dbPartnership)
        .eq('id', updatedPartnership.id);

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error updating partnership:', error);
      return false;
    }
  }

  async createPartnershipInvite(
    invitingUserId: string,
    invitedUserRole: string,
  ): Promise<Partnership | null> {
    try {
      // Generate unique invite code
      const { data: inviteCode, error: codeError } = await supabase.rpc('generate_invite_code');

      if (codeError) throw codeError;

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
        .single();

      if (error) throw error;

      this.invalidateCache();
      return this.transformDatabasePartnership(data);
    } catch (error) {
      console.error('Error creating partnership invite:', error);
      return null;
    }
  }

  async acceptPartnershipInvite(
    inviteCode: string,
    acceptingUserId: string,
  ): Promise<{ success: boolean; error?: string; partnership?: Partnership }> {
    try {
      // Find the partnership by invite code
      const { data: partnershipData, error: findError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (findError || !partnershipData) {
        return { success: false, error: 'Invalid invite code' };
      }

      const partnership = this.transformDatabasePartnership(partnershipData);

      if (partnership.status !== PartnershipStatus.PENDING) {
        return { success: false, error: 'Invite already used' };
      }

      // Set the accepting user in the appropriate role
      if (!partnership.adhdUserId) {
        partnership.adhdUserId = acceptingUserId;
      } else if (!partnership.partnerId) {
        partnership.partnerId = acceptingUserId;
      } else {
        return { success: false, error: 'Partnership already complete' };
      }

      const acceptedPartnership = acceptPartnership(partnership);
      const dbPartnership = this.transformToDatabase(acceptedPartnership);

      const { data: updatedData, error: updateError } = await supabase
        .from('partnerships')
        .update(dbPartnership)
        .eq('id', partnership.id)
        .select()
        .single();

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
      return {
        success: true,
        partnership: this.transformDatabasePartnership(updatedData),
      };
    } catch (error) {
      console.error('Error accepting partnership invite:', error);
      return { success: false, error: 'Failed to accept invite' };
    }
  }

  async getPartnershipByUsers(userId1: string, userId2: string): Promise<Partnership | null> {
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .or(
          `and(adhd_user_id.eq.${userId1},partner_id.eq.${userId2}),and(adhd_user_id.eq.${userId2},partner_id.eq.${userId1})`,
        )
        .single();

      if (error || !data) return null;

      return this.transformDatabasePartnership(data);
    } catch (error) {
      console.error('Error getting partnership by users:', error);
      return null;
    }
  }

  async getPartnershipByInviteCode(inviteCode: string): Promise<Partnership | null> {
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (error || !data) return null;

      return this.transformDatabasePartnership(data);
    } catch (error) {
      console.error('Error getting partnership by invite code:', error);
      return null;
    }
  }

  async getUserPartnerships(userId: string): Promise<Partnership[]> {
    try {
      return await this.getCachedOrFetch(this.getCacheKey(`user_${userId}`), async () => {
        const { data, error } = await supabase
          .from('partnerships')
          .select('*')
          .or(`adhd_user_id.eq.${userId},partner_id.eq.${userId}`);

        if (error) throw error;
        return this.transformDatabasePartnerships(data || []);
      });
    } catch (error) {
      console.error('Error getting user partnerships:', error);
      return [];
    }
  }

  async getActivePartnership(userId: string): Promise<Partnership | null> {
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .or(`adhd_user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq('status', 'active')
        .single();

      if (error || !data) return null;

      return this.transformDatabasePartnership(data);
    } catch (error) {
      console.error('Error getting active partnership:', error);
      return null;
    }
  }

  async incrementPartnershipStat(
    partnershipId: string,
    statKey: keyof PartnershipStats,
    increment: number = 1,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_partnership_stats', {
        partnership_id: partnershipId,
        stat_key: statKey,
        increment: increment,
      });

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error incrementing partnership stat:', error);
      return false;
    }
  }

  async clearAllPartnerships(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('partnerships')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Error clearing partnerships:', error);
      return false;
    }
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
            const partnership = this.transformDatabasePartnership(payload.new);
            callback(partnership, payload.eventType);
          } else if (payload.old && payload.eventType === 'DELETE') {
            const partnership = this.transformDatabasePartnership(payload.old);
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

  private transformDatabasePartnership(dbPartnership: Record<string, unknown>): Partnership {
    return {
      id: dbPartnership.id as string,
      adhdUserId: dbPartnership.adhd_user_id as string | null,
      partnerId: dbPartnership.partner_id as string | null,
      status: dbPartnership.status as PartnershipStatus,
      inviteCode: dbPartnership.invite_code as string,
      inviteSentBy: dbPartnership.invite_sent_by as string | null,
      settings: dbPartnership.settings as PartnershipSettings,
      stats: dbPartnership.stats as PartnershipStats,
      createdAt: new Date(dbPartnership.created_at as string),
      updatedAt: new Date(dbPartnership.updated_at as string),
      acceptedAt: dbPartnership.accepted_at ? new Date(dbPartnership.accepted_at as string) : null,
      terminatedAt: dbPartnership.terminated_at
        ? new Date(dbPartnership.terminated_at as string)
        : null,
    };
  }

  private transformDatabasePartnerships(dbPartnerships: Array<Record<string, unknown>>): Partnership[] {
    return dbPartnerships.map((dbPartnership) => this.transformDatabasePartnership(dbPartnership));
  }
}

export default new SupabasePartnershipService();
