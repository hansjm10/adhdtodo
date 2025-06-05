// ABOUTME: UserContext provides centralized user, partner, and partnership state management
// Integrates with real-time user updates from Supabase for live synchronization

import type {
  ReactNode} from 'react';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import UserStorageService from '../services/UserStorageService';
import type { User, Partnership } from '../types/user.types';

interface UserContextValue {
  user: User | null;
  partner: User | null;
  partnership: Partnership | null;
  loading: boolean;
  error: string | null;
  setUser: (newUser: User | null) => Promise<void>;
  setPartner: (newPartner: User | null) => Promise<void>;
  setPartnership: (newPartnership: Partnership | null) => Promise<void>;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUserState] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const partnerUnsubscribeRef = useRef<(() => void) | null>(null);

  // Load user data from AsyncStorage
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First verify if session is still valid
      const sessionResult = await AuthService.verifySession();

      if (sessionResult.isValid && sessionResult.user) {
        setUserState(sessionResult.user as User);

        // If user has a partner, load partner and partnership data
        if (sessionResult.user.partnerId) {
          const [partnershipData, partnerData] = await Promise.all([
            AsyncStorage.getItem(`partnership_${sessionResult.user.id}`),
            AsyncStorage.getItem(`user_${sessionResult.user.partnerId}`),
          ]);

          if (partnershipData) {
            setPartnership(JSON.parse(partnershipData));
          }
          if (partnerData) {
            setPartner(JSON.parse(partnerData));
          }
        }
      } else {
        // Session is invalid or expired
        setUserState(null);
        setPartner(null);
        setPartnership(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user data on mount and set up real-time subscriptions
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Set up real-time user subscription
  useEffect(() => {
    if (!user?.id) {
      // Clean up any existing subscriptions
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Subscribe to real-time user updates
    const setupSubscription = async () => {
      const unsubscribe = await UserStorageService.subscribeToUserUpdates(
        user.id,
        (updatedUser) => {
          setUserState(updatedUser);
        },
      );
      unsubscribeRef.current = unsubscribe;
    };

    setupSubscription();

    // Cleanup on unmount or user change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id]);

  // Set up real-time partner subscription
  useEffect(() => {
    if (!partner?.id) {
      // Clean up any existing subscriptions
      if (partnerUnsubscribeRef.current) {
        partnerUnsubscribeRef.current();
        partnerUnsubscribeRef.current = null;
      }
      return;
    }

    // Subscribe to real-time partner updates
    const setupPartnerSubscription = async () => {
      const unsubscribe = await UserStorageService.subscribeToUserUpdates(
        partner.id,
        (updatedPartner) => {
          setPartner(updatedPartner);
        },
      );
      partnerUnsubscribeRef.current = unsubscribe;
    };

    setupPartnerSubscription();

    // Cleanup on unmount or partner change
    return () => {
      if (partnerUnsubscribeRef.current) {
        partnerUnsubscribeRef.current();
        partnerUnsubscribeRef.current = null;
      }
    };
  }, [partner?.id]);

  // Update user and persist to storage
  const setUser = useCallback(async (newUser: User | null): Promise<void> => {
    try {
      setUserState(newUser);
      if (newUser) {
        await UserStorageService.setCurrentUser(newUser);
      } else {
        await UserStorageService.logout();
        setPartner(null);
        setPartnership(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating user:', err);
    }
  }, []);

  // Update partner and persist to storage
  const setPartnerData = useCallback(
    async (newPartner: User | null): Promise<void> => {
      try {
        setPartner(newPartner);
        if (newPartner && user) {
          await AsyncStorage.setItem(`user_${newPartner.id}`, JSON.stringify(newPartner));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error updating partner:', err);
      }
    },
    [user],
  );

  // Update partnership and persist to storage
  const setPartnershipData = useCallback(
    async (newPartnership: Partnership | null): Promise<void> => {
      try {
        setPartnership(newPartnership);
        if (newPartnership && user) {
          await AsyncStorage.setItem(`partnership_${user.id}`, JSON.stringify(newPartnership));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error updating partnership:', err);
      }
    },
    [user],
  );

  // Refresh all user data
  const refreshUserData = useCallback(async (): Promise<void> => {
    await loadUserData();
  }, [loadUserData]);

  // Logout - clear all user data
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Clean up real-time subscriptions
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (partnerUnsubscribeRef.current) {
        partnerUnsubscribeRef.current();
        partnerUnsubscribeRef.current = null;
      }

      await AuthService.logout();
      setUserState(null);
      setPartner(null);
      setPartnership(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error during logout:', err);
    }
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      partner,
      partnership,
      loading,
      error,
      setUser,
      setPartner: setPartnerData,
      setPartnership: setPartnershipData,
      refreshUserData,
      logout,
    }),
    [
      user,
      partner,
      partnership,
      loading,
      error,
      setUser,
      setPartnerData,
      setPartnershipData,
      refreshUserData,
      logout,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
