// ABOUTME: Biometric authentication screen component providing UI for Face ID,
// Touch ID, fingerprint authentication with PIN fallback option

import React, { useState, useEffect } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { BiometricSupport, SecuritySettings } from '../services/BiometricAuthService';
import BiometricAuthService from '../services/BiometricAuthService';
import PINAuthService from '../services/PINAuthService';
import { logError } from '../utils/ErrorHandler';

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
      logError('BiometricAuthScreen.checkAuthMethods', error);
    });
  }, []);

  const checkAuthMethods = async () => {
    try {
      const [support, pinEnabledResult, settings] = await Promise.all([
        BiometricAuthService.checkBiometricSupport(),
        PINAuthService.isPINEnabled(),
        BiometricAuthService.getSecuritySettings(),
      ]);

      const pinEnabled = pinEnabledResult.success && pinEnabledResult.data === true;
      setBiometricSupport(support);
      setIsPINEnabled(pinEnabled);
      setSecuritySettings(settings);

      // If no biometric support, switch to PIN automatically
      if (support.biometricType === 'none' && pinEnabled) {
        setShowPIN(true);
      }
    } catch (error) {
      logError('BiometricAuthScreen.checkAuthMethods', error);
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
                logError('BiometricAuthScreen.handleBiometricAuth.retry', error);
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
      logError('BiometricAuthScreen.handleBiometricAuth', error);
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
      const verifyResult = await PINAuthService.verifyPIN(pin);
      const isValid = verifyResult.success && verifyResult.data === true;

      if (isValid) {
        await PINAuthService.resetFailedPINAttempts();
        onSuccess();
      } else {
        const attemptsResult = await PINAuthService.recordFailedPINAttempt();
        const attempts = attemptsResult.success ? (attemptsResult.data ?? 0) : 0;
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
      logError('BiometricAuthScreen.handlePINSubmit', error);
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
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>No Authentication Method</Text>
          <Text style={styles.message}>
            Please set up biometric authentication or a PIN in your device settings.
          </Text>
        </View>
      </View>
    );
  }

  // Show PIN entry
  if (showPIN) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>PIN Authentication</Text>
          <Text style={styles.message}>{reason}</Text>

          <TextInput
            style={styles.pinInput}
            placeholder="Enter PIN"
            placeholderTextColor="#999"
            value={pin}
            onChangeText={setPIN}
            keyboardType="numeric"
            secureTextEntry
            maxLength={8}
            editable={!loading}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={() => {
              handlePINSubmit().catch((error) => {
                logError('BiometricAuthScreen.handlePINSubmit.onPress', error);
              });
            }}
            disabled={loading || pin.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="white" testID="loading-indicator" />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity>

          {biometricSupport && biometricSupport.biometricType !== 'none' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setShowPIN(false);
                setPIN('');
              }}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Use Biometric</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Show biometric authentication
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{getBiometricTitle()}</Text>
        <Text style={styles.message}>{reason}</Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => {
            handleBiometricAuth().catch((error) => {
              logError('BiometricAuthScreen.handleBiometricAuth.onPress', error);
            });
          }}
          disabled={loading}
          accessibilityLabel={`Authenticate with ${getBiometricTitle()}`}
        >
          {loading ? (
            <ActivityIndicator color="white" testID="loading-indicator" />
          ) : (
            <Text style={styles.buttonText}>{getBiometricButtonText()}</Text>
          )}
        </TouchableOpacity>

        {isPINEnabled && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowPIN(true);
            }}
            disabled={loading}
            accessibilityLabel="Use PIN authentication instead"
          >
            <Text style={styles.secondaryButtonText}>Use PIN Instead</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  card: ViewStyle;
  title: TextStyle;
  message: TextStyle;
  button: ViewStyle;
  primaryButton: ViewStyle;
  buttonDisabled: ViewStyle;
  buttonText: TextStyle;
  secondaryButton: ViewStyle;
  secondaryButtonText: TextStyle;
  pinInput: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3498DB',
  },
  buttonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 10,
    padding: 10,
  },
  secondaryButtonText: {
    color: '#3498DB',
    fontSize: 16,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    marginBottom: 20,
    width: '100%',
    textAlign: 'center',
    color: '#2C3E50',
    letterSpacing: 8,
  },
});

export default BiometricAuthScreen;
