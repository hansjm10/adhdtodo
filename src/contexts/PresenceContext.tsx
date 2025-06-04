// ABOUTME: Context for managing user presence and online status throughout the app
// Provides real-time presence data and user activity indicators

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import PresenceService, { PresenceState } from '../services/PresenceService';
import { useUser } from './UserContext';

interface PresenceContextType {
  presenceStates: Map<string, PresenceState>;
  isUserOnline: (userId: string) => boolean;
  getUserActivity: (userId: string) => string | null;
  setCurrentTask: (taskId: string | null) => Promise<void>;
  signalActivity: () => Promise<void>;
  getOnlineUsers: () => PresenceState[];
  myPresence: PresenceState | null;
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
    if (user?.id) {
      const initializePresence = async () => {
        try {
          await PresenceService.startPresence(user.id);

          // Set up periodic updates
          const updateInterval = setInterval(() => {
            setPresenceStates(new Map(PresenceService.getAllPresenceStates()));
            setMyPresence(PresenceService.getPresenceState(user.id) || null);
          }, 5000); // Update every 5 seconds

          return () => {
            clearInterval(updateInterval);
          };
        } catch (error) {
          console.error('Error initializing presence:', error);
        }
      };

      initializePresence();

      // Cleanup on unmount or user change
      return () => {
        PresenceService.stopPresence();
      };
    }
  }, [user?.id]);

  // Set up activity tracking
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        PresenceService.signalActivity();
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

  const value: PresenceContextType = {
    presenceStates,
    isUserOnline,
    getUserActivity,
    setCurrentTask,
    signalActivity,
    getOnlineUsers,
    myPresence,
  };

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
