// ABOUTME: Partnership model for managing relationships between ADHD users and their accountability partners
// Handles partnership creation, status management, and communication preferences

import type { Partnership, PartnershipSettings } from '../types/user.types';
import { PartnershipStatus } from '../types/user.types';
import type { ValidationResult } from './UserModel';

export const generatePartnershipId = (): string => {
  return `partnership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createPartnership = (partnershipData: Partial<Partnership> = {}): Partnership => {
  const now = new Date();

  return {
    id: generatePartnershipId(),
    adhdUserId: partnershipData.adhdUserId || null,
    partnerId: partnershipData.partnerId || null,
    status: PartnershipStatus.PENDING,
    inviteCode: generateInviteCode(),
    inviteSentBy: partnershipData.inviteSentBy || null,
    settings: {
      allowTaskAssignment: true,
      shareProgress: true,
      allowEncouragement: true,
      allowCheckIns: true,
      quietHoursStart: null, // e.g., "22:00"
      quietHoursEnd: null, // e.g., "08:00"
    },
    stats: {
      tasksAssigned: 0,
      tasksCompleted: 0,
      encouragementsSent: 0,
      checkInsCompleted: 0,
      partnershipDuration: 0, // in days
    },
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    terminatedAt: null,
  };
};

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const validatePartnership = (partnership: Partial<Partnership>): ValidationResult => {
  const errors: string[] = [];

  if (!partnership || typeof partnership !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid partnership object'],
    };
  }

  if (!partnership.adhdUserId && !partnership.partnerId) {
    errors.push('At least one user ID is required');
  }

  const validStatuses = Object.values(PartnershipStatus);
  if (partnership.status && !validStatuses.includes(partnership.status)) {
    errors.push('Invalid partnership status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const acceptPartnership = (partnership: Partnership): Partnership => {
  return {
    ...partnership,
    status: PartnershipStatus.ACTIVE,
    acceptedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const declinePartnership = (partnership: Partnership): Partnership => {
  return {
    ...partnership,
    status: PartnershipStatus.DECLINED,
    updatedAt: new Date(),
  };
};

export const pausePartnership = (partnership: Partnership): Partnership => {
  return {
    ...partnership,
    status: PartnershipStatus.PAUSED,
    updatedAt: new Date(),
  };
};

export const resumePartnership = (partnership: Partnership): Partnership => {
  return {
    ...partnership,
    status: PartnershipStatus.ACTIVE,
    updatedAt: new Date(),
  };
};

export const terminatePartnership = (partnership: Partnership): Partnership => {
  return {
    ...partnership,
    status: PartnershipStatus.TERMINATED,
    terminatedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const updatePartnershipSettings = (
  partnership: Partnership,
  settings: Partial<PartnershipSettings>,
): Partnership => {
  return {
    ...partnership,
    settings: {
      ...partnership.settings,
      ...settings,
    },
    updatedAt: new Date(),
  };
};

export const updatePartnershipStats = (
  partnership: Partnership,
  statUpdates: Partial<Partnership['stats']>,
): Partnership => {
  return {
    ...partnership,
    stats: {
      ...partnership.stats,
      ...statUpdates,
    },
    updatedAt: new Date(),
  };
};
