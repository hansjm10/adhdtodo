// ABOUTME: Authentication context providing app-wide authentication state and methods
// including biometric auth, PIN fallback, auto-lock, and sensitive data protection

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import {
  BiometricAuthService,
  AuthResult,
  SecuritySettings,
} from '../services/BiometricAuthService';
import { PINAuthService } from '../services/PINAuthService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  authSettings: SecuritySettings | null;
  authenticateWithBiometric: (reason?: string) => Promise<AuthResult>;
  authenticateWithPIN: (pin: string) => Promise<boolean>;
  protectSensitiveAction: (action: () => Promise<void>, reason: string) => Promise<void>;
  lock: () => void;
  unlock: () => Promise<void>;
  recordActivity: () => void;
  updateSecuritySettings: (settings: SecuritySettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [authSettings, setAuthSettings] = useState<SecuritySettings | null>(null);
  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const appState = useRef(AppState.currentState);

  // Check authentication requirement on mount
  useEffect(() => {
    checkAuthRequirement();
  }, []);

  // Handle app state changes for auto-lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [authSettings]);

  // Set up auto-lock timer
  useEffect(() => {
    if (authSettings && authSettings.autoLockTimeout > 0) {
      setupAutoLockTimer();
    }
    return () => {
      if (autoLockTimer.current) {
        clearTimeout(autoLockTimer.current);
      }
    };
  }, [authSettings, isLocked]);

  const checkAuthRequirement = async () => {
    try {
      const settings = await BiometricAuthService.getSecuritySettings();
      setAuthSettings(settings);

      if (settings.requireAuthOnLaunch) {
        const result = await BiometricAuthService.authenticate();
        setIsAuthenticated(result.success);

        if (!result.success) {
          Alert.alert('Authentication Required', 'Please authenticate to access your data', [
            { text: 'Try Again', onPress: checkAuthRequirement },
          ]);
        }
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth requirement:', error);
      setIsAuthenticated(true); // Fail open for now
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // App going to background
      if (authSettings?.autoLockTimeout === 0) {
        // Immediate lock on background
        lock();
      }
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App coming to foreground
      checkAutoLock();
    }
    appState.current = nextAppState;
  };

  const setupAutoLockTimer = () => {
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
    }

    if (authSettings && authSettings.autoLockTimeout > 0 && !isLocked) {
      autoLockTimer.current = setTimeout(() => {
        lock();
      }, authSettings.autoLockTimeout);
    }
  };

  const checkAutoLock = () => {
    if (!authSettings || isLocked) return;

    const timeSinceLastActivity = Date.now() - lastActivity.current;
    if (timeSinceLastActivity >= authSettings.autoLockTimeout) {
      lock();
    } else {
      // Reset timer for remaining time
      const remainingTime = authSettings.autoLockTimeout - timeSinceLastActivity;
      if (autoLockTimer.current) {
        clearTimeout(autoLockTimer.current);
      }
      autoLockTimer.current = setTimeout(() => {
        lock();
      }, remainingTime);
    }
  };

  const authenticateWithBiometric = useCallback(async (reason?: string): Promise<AuthResult> => {
    const result = await BiometricAuthService.authenticate(reason);
    if (result.success) {
      recordActivity();
    }
    return result;
  }, []);

  const authenticateWithPIN = useCallback(async (pin: string): Promise<boolean> => {
    const isValid = await PINAuthService.verifyPIN(pin);
    if (isValid) {
      await PINAuthService.resetFailedPINAttempts();
      recordActivity();
    } else {
      await PINAuthService.recordFailedPINAttempt();
    }
    return isValid;
  }, []);

  const protectSensitiveAction = useCallback(
    async (action: () => Promise<void>, reason: string): Promise<void> => {
      if (authSettings?.sensitiveDataAuth) {
        const result = await BiometricAuthService.authenticate(reason);
        if (result.success) {
          await action();
        }
      } else {
        await action();
      }
    },
    [authSettings],
  );

  const lock = useCallback(() => {
    setIsLocked(true);
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
    }
  }, []);

  const unlock = useCallback(async () => {
    const result = await BiometricAuthService.authenticate('Unlock to access your ADHD Todo data');
    if (result.success) {
      setIsLocked(false);
      recordActivity();
      setupAutoLockTimer();
    }
  }, [authSettings]);

  const recordActivity = useCallback(() => {
    lastActivity.current = Date.now();
    if (authSettings && authSettings.autoLockTimeout > 0 && !isLocked) {
      setupAutoLockTimer();
    }
  }, [authSettings, isLocked]);

  const updateSecuritySettings = useCallback(async (settings: SecuritySettings) => {
    await BiometricAuthService.setupAppSecurity(settings);
    setAuthSettings(settings);
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLocked,
    authSettings,
    authenticateWithBiometric,
    authenticateWithPIN,
    protectSensitiveAction,
    lock,
    unlock,
    recordActivity,
    updateSecuritySettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
