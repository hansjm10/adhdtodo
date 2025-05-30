// ABOUTME: UserContext provides centralized user, partner, and partnership state management
// Eliminates prop drilling and duplicate data fetching across screens

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import UserStorageService from '../services/UserStorageService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [partner, setPartner] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data from AsyncStorage
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First verify if session is still valid
      const sessionResult = await AuthService.verifySession();

      if (sessionResult.isValid && sessionResult.user) {
        setUserState(sessionResult.user);

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
      setError(err.message);
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Update user and persist to storage
  const setUser = useCallback(async (newUser) => {
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
      setError(err.message);
      console.error('Error updating user:', err);
    }
  }, []);

  // Update partner and persist to storage
  const setPartnerData = useCallback(
    async (newPartner) => {
      try {
        setPartner(newPartner);
        if (newPartner && user) {
          await AsyncStorage.setItem(`user_${newPartner.id}`, JSON.stringify(newPartner));
        }
      } catch (err) {
        setError(err.message);
        console.error('Error updating partner:', err);
      }
    },
    [user],
  );

  // Update partnership and persist to storage
  const setPartnershipData = useCallback(
    async (newPartnership) => {
      try {
        setPartnership(newPartnership);
        if (newPartnership && user) {
          await AsyncStorage.setItem(`partnership_${user.id}`, JSON.stringify(newPartnership));
        }
      } catch (err) {
        setError(err.message);
        console.error('Error updating partnership:', err);
      }
    },
    [user],
  );

  // Refresh all user data
  const refreshUserData = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  // Logout - clear all user data
  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setUserState(null);
      setPartner(null);
      setPartnership(null);
    } catch (err) {
      setError(err.message);
      console.error('Error during logout:', err);
    }
  }, []);

  const value = {
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
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
