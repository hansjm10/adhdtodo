// ABOUTME: Context for managing user presence and online status throughout the app
// Provides real-time presence data and user activity indicators with collaborative features

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import type { PresenceState } from '../services/PresenceService';
import PresenceService from '../services/PresenceService';
import { useUser } from './UserContext';
import { logError } from '../utils/ErrorHandler';

interface PresenceContextType {
  presenceStates: Map<string, PresenceState>;
  isUserOnline: (userId: string) => boolean;
  getUserActivity: (userId: string) => string | null;
  setCurrentTask: (taskId: string | null) => Promise<void>;
  signalActivity: () => Promise<void>;
  getOnlineUsers: () => PresenceState[];
  myPresence: PresenceState | null;
  subscribeToPartnerPresence: (partnerIds: string[]) => () => void;
  updatePresence: (status: 'online' | 'away' | 'offline', currentTaskId?: string) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

interface PresenceProviderProps {
  children: React.ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [presenceStates, setPresenceStates] = useState<Map<string, PresenceState>>(new Map());
  const [myPresence, setMyPresence] = useState<PresenceState | null>(null);

  // Initialize presence when user logs in
  useEffect(() => {
    if (!user?.id) return undefined;

    let updateInterval: ReturnType<typeof setInterval> | null = null;

    const initializePresence = async () => {
      try {
        await PresenceService.startPresence(user.id);

        // Set up periodic updates
        updateInterval = setInterval(() => {
          setPresenceStates(new Map(PresenceService.getAllPresenceStates()));
          setMyPresence(PresenceService.getPresenceState(user.id) ?? null);
        }, 5000); // Update every 5 seconds
      } catch (error) {
        logError('PresenceContext.initializePresence', error);
      }
    };

    void initializePresence();

    // Cleanup on unmount or user change
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      void PresenceService.stopPresence();
    };
  }, [user?.id]);

  // Set up activity tracking
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        void PresenceService.signalActivity();
      }
    };

    // Track app state changes (equivalent to visibility in React Native)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const isUserOnline = useCallback((userId: string): boolean => {
    return PresenceService.isUserOnline(userId);
  }, []);

  const getUserActivity = useCallback((userId: string): string | null => {
    return PresenceService.getUserActivity(userId);
  }, []);

  const setCurrentTask = useCallback(async (taskId: string | null): Promise<void> => {
    await PresenceService.setCurrentTask(taskId);
  }, []);

  const signalActivity = useCallback(async (): Promise<void> => {
    await PresenceService.signalActivity();
  }, []);

  const getOnlineUsers = useCallback((): PresenceState[] => {
    return PresenceService.getOnlineUsers();
  }, []);

  const subscribeToPartnerPresence = useCallback((partnerIds: string[]): (() => void) => {
    return PresenceService.subscribeToUserPresence(partnerIds, (userId, presence) => {
      setPresenceStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, presence);
        return newMap;
      });
    });
  }, []);

  const updatePresence = useCallback(
    async (status: 'online' | 'away' | 'offline', currentTaskId?: string): Promise<void> => {
      await PresenceService.updatePresence(status, currentTaskId);
      if (user?.id) {
        setMyPresence(PresenceService.getPresenceState(user.id) ?? null);
      }
    },
    [user?.id],
  );

  const value: PresenceContextType = React.useMemo(
    () => ({
      presenceStates,
      isUserOnline,
      getUserActivity,
      setCurrentTask,
      signalActivity,
      getOnlineUsers,
      myPresence,
      subscribeToPartnerPresence,
      updatePresence,
    }),
    [
      presenceStates,
      isUserOnline,
      getUserActivity,
      setCurrentTask,
      signalActivity,
      getOnlineUsers,
      myPresence,
      subscribeToPartnerPresence,
      updatePresence,
    ],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

export const usePresence = (): PresenceContextType => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};

export default PresenceContext;
