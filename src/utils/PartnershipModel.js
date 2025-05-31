// ABOUTME: Partnership model for managing relationships between ADHD users and their accountability partners
// Handles partnership creation, status management, and communication preferences

import { PARTNERSHIP_STATUS } from '../constants/UserConstants';

export const generatePartnershipId = () => {
  return `partnership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createPartnership = (partnershipData = {}) => {
  const now = new Date();

  return {
    id: generatePartnershipId(),
    adhdUserId: partnershipData.adhdUserId || null,
    partnerId: partnershipData.partnerId || null,
    status: PARTNERSHIP_STATUS.PENDING,
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

export const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const validatePartnership = (partnership) => {
  const errors = [];

  if (!partnership || typeof partnership !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid partnership object'],
    };
  }

  if (!partnership.adhdUserId && !partnership.partnerId) {
    errors.push('At least one user ID is required');
  }

  const validStatuses = Object.values(PARTNERSHIP_STATUS);
  if (!validStatuses.includes(partnership.status)) {
    errors.push('Invalid partnership status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const acceptPartnership = (partnership) => {
  return {
    ...partnership,
    status: PARTNERSHIP_STATUS.ACTIVE,
    acceptedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const declinePartnership = (partnership) => {
  return {
    ...partnership,
    status: PARTNERSHIP_STATUS.DECLINED,
    updatedAt: new Date(),
  };
};

export const pausePartnership = (partnership) => {
  return {
    ...partnership,
    status: PARTNERSHIP_STATUS.PAUSED,
    updatedAt: new Date(),
  };
};

export const resumePartnership = (partnership) => {
  return {
    ...partnership,
    status: PARTNERSHIP_STATUS.ACTIVE,
    updatedAt: new Date(),
  };
};

export const terminatePartnership = (partnership) => {
  return {
    ...partnership,
    status: PARTNERSHIP_STATUS.TERMINATED,
    terminatedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const updatePartnershipSettings = (partnership, settings) => {
  return {
    ...partnership,
    settings: {
      ...partnership.settings,
      ...settings,
    },
    updatedAt: new Date(),
  };
};

export const updatePartnershipStats = (partnership, statUpdates) => {
  return {
    ...partnership,
    stats: {
      ...partnership.stats,
      ...statUpdates,
    },
    updatedAt: new Date(),
  };
};
