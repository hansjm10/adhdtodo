// ABOUTME: Mac-inspired biometric authentication using NativeWind
// Clean Face ID, Touch ID, fingerprint authentication with PIN fallback

import React, { useState, useEffect } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  ThemedContainer,
  ThemedText,
  ThemedCard,
  ThemedInput,
  ThemedButton,
  ThemedIcon,
} from './themed';
import type { BiometricSupport, SecuritySettings } from '../services/BiometricAuthService';
import { BiometricAuthService } from '../services/BiometricAuthService';
import { PINAuthService } from '../services/PINAuthService';

interface BiometricAuthScreenProps {
  onSuccess: () => void;
  reason?: string;
}

const BiometricAuthScreen: React.FC<BiometricAuthScreenProps> = ({
  onSuccess,
  reason = 'Access your ADHD Todo data',
}) => {
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport | null>(null);
  const [showPIN, setShowPIN] = useState(false);
  const [pin, setPIN] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPINEnabled, setIsPINEnabled] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    checkAuthMethods().catch((error) => {
      if (global.__DEV__) {
        console.error('Failed to check auth methods:', error);
      }
    });
  }, []);

  const checkAuthMethods = async () => {
    try {
      const [support, pinEnabled, settings] = await Promise.all([
        BiometricAuthService.checkBiometricSupport(),
        PINAuthService.isPINEnabled(),
        BiometricAuthService.getSecuritySettings(),
      ]);

      setBiometricSupport(support);
      setIsPINEnabled(pinEnabled);
      setSecuritySettings(settings);

      // If no biometric support, switch to PIN automatically
      if (support.biometricType === 'none' && pinEnabled) {
        setShowPIN(true);
      }
    } catch (error) {
      console.error('Error checking auth methods:', error);
    }
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const result = await BiometricAuthService.authenticate(reason);
      if (result.success) {
        onSuccess();
      } else {
        Alert.alert('Authentication Failed', 'Please try again or use PIN', [
          {
            text: 'Try Again',
            onPress: (): void => {
              handleBiometricAuth().catch((error) => {
                if (global.__DEV__) {
                  console.error('Failed biometric auth:', error);
                }
              });
            },
          },
          {
            text: 'Use PIN',
            onPress: () => {
              setShowPIN(true);
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePINSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    try {
      const isValid = await PINAuthService.verifyPIN(pin);
      if (isValid) {
        await PINAuthService.resetFailedPINAttempts();
        onSuccess();
      } else {
        const attempts = await PINAuthService.recordFailedPINAttempt();
        const maxAttempts = securitySettings?.maxFailedAttempts ?? 5;
        const remaining = maxAttempts - attempts;

        if (attempts >= maxAttempts) {
          Alert.alert('Account Locked', 'Too many failed attempts. Please contact support.', [
            { text: 'OK' },
          ]);
        } else {
          Alert.alert('Incorrect PIN', `Please try again. ${remaining} attempts remaining.`);
          setPIN('');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBiometricTitle = () => {
    if (!biometricSupport) return 'Authentication';
    switch (biometricSupport.biometricType) {
      case 'faceId':
        return 'Face ID Authentication';
      case 'fingerprint':
        return 'Fingerprint Authentication';
      case 'iris':
        return 'Iris Authentication';
      default:
        return 'PIN Authentication';
    }
  };

  const getBiometricButtonText = () => {
    if (!biometricSupport) return 'Authenticate';
    switch (biometricSupport.biometricType) {
      case 'faceId':
        return 'Use Face ID';
      case 'fingerprint':
        return 'Use Fingerprint';
      case 'iris':
        return 'Use Iris Scan';
      default:
        return 'Authenticate';
    }
  };

  // No authentication methods available
  if (biometricSupport && biometricSupport.biometricType === 'none' && !isPINEnabled) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <View className="max-w-[400px] w-full">
          <ThemedCard variant="elevated" spacing="large">
            <View className="items-center">
              <View className="mb-4">
                <ThemedIcon name="lock-closed-outline" size="xl" color="danger" />
              </View>
              <ThemedText variant="h3" color="primary" align="center" className="mb-3">
                No Authentication Method
              </ThemedText>
              <ThemedText variant="body" color="secondary" align="center">
                Please set up biometric authentication or a PIN in your device settings.
              </ThemedText>
            </View>
          </ThemedCard>
        </View>
      </ThemedContainer>
    );
  }

  // Show PIN entry
  if (showPIN) {
    return (
      <ThemedContainer variant="screen" safeArea>
        <KeyboardAvoidingView
          className="flex-1 justify-center px-5"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="max-w-[400px] w-full self-center">
            <ThemedCard variant="elevated" spacing="large">
              <View className="items-center mb-6">
                <View className="mb-4">
                  <ThemedIcon name="keypad-outline" size="xl" color="primary" />
                </View>
                <ThemedText variant="h3" color="primary" align="center" className="mb-2">
                  PIN Authentication
                </ThemedText>
                <ThemedText variant="body" color="secondary" align="center">
                  {reason}
                </ThemedText>
              </View>

              <ThemedInput
                placeholder="Enter PIN"
                value={pin}
                onChangeText={setPIN}
                keyboardType="numeric"
                secureTextEntry
                maxLength={8}
                editable={!loading}
                autoFocus
                className="text-2xl text-center tracking-widest mb-6"
              />

              <View className="mb-4">
                <ThemedButton
                  label={loading ? '' : 'Submit'}
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={loading || pin.length === 0}
                  loading={loading}
                  onPress={() => {
                    handlePINSubmit().catch((error) => {
                      if (global.__DEV__) {
                        console.error('Failed to submit PIN:', error);
                      }
                    });
                  }}
                />
              </View>

              {biometricSupport && biometricSupport.biometricType !== 'none' && (
                <ThemedButton
                  label="Use Biometric"
                  variant="ghost"
                  size="medium"
                  fullWidth
                  disabled={loading}
                  onPress={() => {
                    setShowPIN(false);
                    setPIN('');
                  }}
                />
              )}
            </ThemedCard>
          </View>
        </KeyboardAvoidingView>
      </ThemedContainer>
    );
  }

  // Show biometric authentication
  return (
    <ThemedContainer variant="screen" safeArea centered className="bg-[#F9FAFB]">
      <ThemedCard variant="elevated" spacing="large" className="max-w-[400px] w-full">
        <View className="items-center mb-6">
          <View className="mb-4">
            <ThemedIcon
              name={
                biometricSupport?.biometricType === 'faceId'
                  ? 'scan-outline'
                  : 'finger-print-outline'
              }
              size="xl"
              color="primary"
            />
          </View>
          <ThemedText variant="h3" color="primary" align="center" className="mb-2">
            {getBiometricTitle()}
          </ThemedText>
          <ThemedText variant="body" color="secondary" align="center">
            {reason}
          </ThemedText>
        </View>

        <View className="mb-4">
          <ThemedButton
            label={loading ? '' : getBiometricButtonText()}
            variant="primary"
            size="large"
            fullWidth
            disabled={loading}
            loading={loading}
            onPress={() => {
              handleBiometricAuth().catch((error) => {
                if (global.__DEV__) {
                  console.error('Failed biometric auth:', error);
                }
              });
            }}
          />
        </View>

        {isPINEnabled && (
          <ThemedButton
            label="Use PIN Instead"
            variant="ghost"
            size="medium"
            fullWidth
            disabled={loading}
            onPress={() => {
              setShowPIN(true);
            }}
          />
        )}
      </ThemedCard>
    </ThemedContainer>
  );
};

export default BiometricAuthScreen;
