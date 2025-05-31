// ABOUTME: UserContext provides centralized user, partner, and partnership state management
// Eliminates prop drilling and duplicate data fetching across screens

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserState(parsedUser);

        // If user has a partner, load partner and partnership data
        if (parsedUser.partnerId) {
          const [partnershipData, partnerData] = await Promise.all([
            AsyncStorage.getItem(`partnership_${parsedUser.id}`),
            AsyncStorage.getItem(`user_${parsedUser.partnerId}`),
          ]);

          if (partnershipData) {
            setPartnership(JSON.parse(partnershipData));
          }
          if (partnerData) {
            setPartner(JSON.parse(partnerData));
          }
        }
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
        await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem('currentUser');
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
      setUserState(null);
      setPartner(null);
      setPartnership(null);
      await AsyncStorage.removeItem('currentUser');
      // Note: We're not removing partner/partnership data as they might be needed later
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
