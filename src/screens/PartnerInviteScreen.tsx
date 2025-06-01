// ABOUTME: Screen for entering and accepting partnership invite codes
// Allows users to join partnerships by entering 6-character invite codes

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import PartnershipService from '../services/PartnershipService';
import UserStorageService from '../services/UserStorageService';
import { RootStackParamList } from '../types/navigation.types';

type PartnerInviteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PartnerInvite'>;

interface Props {
  navigation: PartnerInviteScreenNavigationProp;
}

const PartnerInviteScreen = ({ navigation }: Props) => {
  const [inviteCode, setInviteCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number): void => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const newCode = [...inviteCode];
      for (let i = 0; i < Math.min(pastedCode.length, 6 - index); i++) {
        newCode[index + i] = pastedCode[i];
      }
      setInviteCode(newCode);

      // Focus last filled input or next empty one
      const lastFilledIndex = Math.min(index + pastedCode.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    } else {
      // Single character input
      const newCode = [...inviteCode];
      newCode[index] = value.toUpperCase();
      setInviteCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ): void => {
    if (e.nativeEvent.key === 'Backspace' && !inviteCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleAcceptInvite = async (): Promise<void> => {
    const code = inviteCode.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a complete 6-character code');
      return;
    }

    setLoading(true);

    try {
      const currentUser = await UserStorageService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please login first');
        navigation.navigate('Auth');
        return;
      }

      const result = await PartnershipService.acceptPartnershipInvite(code, currentUser.id);

      if (result.success) {
        Alert.alert('Success!', 'Partnership established successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Partnership'),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invite');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCodeComplete = inviteCode.every((char) => char !== '');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#2C3E50" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="link-outline" size={80} color="#3498DB" />
        </View>

        <Text style={styles.title}>Enter Invite Code</Text>
        <Text style={styles.subtitle}>Ask your partner for their 6-character invite code</Text>

        <View style={styles.codeContainer}>
          {inviteCode.map((char, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.codeInput, char && styles.codeInputFilled]}
              value={char}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              maxLength={1}
              autoCapitalize="characters"
              keyboardType="default"
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, (!isCodeComplete || loading) && styles.acceptButtonDisabled]}
          onPress={handleAcceptInvite}
          disabled={!isCodeComplete || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept Invite</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#7F8C8D" />
          <Text style={styles.helpText}>
            Invite codes are 6 characters long and contain only letters and numbers
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginHorizontal: 5,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    backgroundColor: 'white',
  },
  codeInputFilled: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  acceptButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  acceptButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  helpText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});

export default PartnerInviteScreen;
