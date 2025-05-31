// ABOUTME: Service for managing partnerships between ADHD users and accountability partners
// Handles partnership creation, invites, status updates, and partnership-related operations

import SecureStorageService from './SecureStorageService';
import {
  createPartnership,
  acceptPartnership,
  updatePartnershipStats,
} from '../utils/PartnershipModel';
import { setUserPartner } from '../utils/UserModel';
import UserStorageService from './UserStorageService';

const STORAGE_KEY = 'partnerships';

class PartnershipService {
  async getAllPartnerships() {
    try {
      const partnerships = await SecureStorageService.getItem(STORAGE_KEY);
      if (!partnerships) {
        return [];
      }
      return Array.isArray(partnerships) ? partnerships : [];
    } catch (error) {
      console.error('Error loading partnerships:', error);
      return [];
    }
  }

  async savePartnership(partnership) {
    try {
      const partnerships = await this.getAllPartnerships();
      partnerships.push(partnership);
      await SecureStorageService.setItem(STORAGE_KEY, partnerships);
      return true;
    } catch (error) {
      console.error('Error saving partnership:', error);
      return false;
    }
  }

  async updatePartnership(updatedPartnership) {
    try {
      const partnerships = await this.getAllPartnerships();
      const partnershipIndex = partnerships.findIndex((p) => p.id === updatedPartnership.id);

      if (partnershipIndex === -1) {
        return false;
      }

      partnerships[partnershipIndex] = updatedPartnership;
      await SecureStorageService.setItem(STORAGE_KEY, partnerships);
      return true;
    } catch (error) {
      console.error('Error updating partnership:', error);
      return false;
    }
  }

  async createPartnershipInvite(invitingUserId, invitedUserRole) {
    try {
      const partnership = createPartnership({
        inviteSentBy: invitingUserId,
        // Set the inviting user in the appropriate role
        adhdUserId: invitedUserRole === 'partner' ? invitingUserId : null,
        partnerId: invitedUserRole === 'adhd_user' ? invitingUserId : null,
      });

      await this.savePartnership(partnership);
      return partnership;
    } catch (error) {
      console.error('Error creating partnership invite:', error);
      return null;
    }
  }

  async acceptPartnershipInvite(inviteCode, acceptingUserId) {
    try {
      const partnerships = await this.getAllPartnerships();
      const partnership = partnerships.find((p) => p.inviteCode === inviteCode);

      if (!partnership) {
        return { success: false, error: 'Invalid invite code' };
      }

      if (partnership.status !== 'pending') {
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
      await this.updatePartnership(acceptedPartnership);

      // Update both users with partner IDs
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

      return { success: true, partnership: acceptedPartnership };
    } catch (error) {
      console.error('Error accepting partnership invite:', error);
      return { success: false, error: 'Failed to accept invite' };
    }
  }

  async getPartnershipByUsers(userId1, userId2) {
    try {
      const partnerships = await this.getAllPartnerships();
      return (
        partnerships.find(
          (p) =>
            (p.adhdUserId === userId1 && p.partnerId === userId2) ||
            (p.adhdUserId === userId2 && p.partnerId === userId1),
        ) || null
      );
    } catch (error) {
      console.error('Error getting partnership by users:', error);
      return null;
    }
  }

  async getPartnershipByInviteCode(inviteCode) {
    try {
      const partnerships = await this.getAllPartnerships();
      return partnerships.find((p) => p.inviteCode === inviteCode) || null;
    } catch (error) {
      console.error('Error getting partnership by invite code:', error);
      return null;
    }
  }

  async getUserPartnerships(userId) {
    try {
      const partnerships = await this.getAllPartnerships();
      return partnerships.filter((p) => p.adhdUserId === userId || p.partnerId === userId);
    } catch (error) {
      console.error('Error getting user partnerships:', error);
      return [];
    }
  }

  async getActivePartnership(userId) {
    try {
      const partnerships = await this.getUserPartnerships(userId);
      return partnerships.find((p) => p.status === 'active') || null;
    } catch (error) {
      console.error('Error getting active partnership:', error);
      return null;
    }
  }

  async incrementPartnershipStat(partnershipId, statKey, increment = 1) {
    try {
      const partnerships = await this.getAllPartnerships();
      const partnership = partnerships.find((p) => p.id === partnershipId);

      if (!partnership) {
        return false;
      }

      const updatedStats = {
        [statKey]: (partnership.stats[statKey] || 0) + increment,
      };

      const updatedPartnership = updatePartnershipStats(partnership, updatedStats);
      return await this.updatePartnership(updatedPartnership);
    } catch (error) {
      console.error('Error incrementing partnership stat:', error);
      return false;
    }
  }

  async clearAllPartnerships() {
    try {
      await SecureStorageService.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing partnerships:', error);
      return false;
    }
  }
}

export default new PartnershipService();
