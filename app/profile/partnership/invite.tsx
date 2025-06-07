// ABOUTME: Mac-inspired invite code entry screen using NativeWind
// Clean interface for accepting partnership invitations

import React, { useState, useRef } from 'react';
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ThemedText,
  ThemedContainer,
  ThemedButton,
  ThemedIcon,
} from '../../../src/components/themed';
import PartnershipService from '../../../src/services/PartnershipService';
import UserStorageService from '../../../src/services/UserStorageService';

const PartnerInviteScreen = () => {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

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
        router.replace('/(auth)/sign-in');
        return;
      }

      const result = await PartnershipService.acceptPartnershipInvite(code, currentUser.id);

      if (result.success) {
        Alert.alert('Success!', 'Partnership established successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/profile/partnership');
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error ?? 'Failed to accept invite');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCodeComplete = inviteCode.every((char) => char !== '');

  return (
    <ThemedContainer variant="screen" safeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity
          className="absolute top-12 left-5 z-10 p-2.5"
          onPress={() => {
            router.back();
          }}
        >
          <ThemedIcon name="arrow-back" size="md" color="primary" />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center px-5">
          <View className="mb-8">
            <ThemedIcon name="link-outline" size="xl" color="primary" />
          </View>

          <ThemedText variant="h1" color="primary" weight="bold" className="mb-2.5">
            Enter Invite Code
          </ThemedText>
          <ThemedText variant="body" color="secondary" align="center" className="mb-10">
            Ask your partner for their 6-character invite code
          </ThemedText>

          <View className="flex-row justify-center mb-10">
            {inviteCode.map((char, index) => (
              <TextInput
                key={`code-input-${index.toString()}`}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className={`w-11 h-14 mx-1.5 text-center text-2xl font-bold rounded-xl border-2 ${char ? 'bg-primary-50 border-primary-500 text-primary-600' : 'bg-white border-neutral-200 text-neutral-900'}`}
                value={char}
                onChangeText={(value) => {
                  handleCodeChange(value, index);
                }}
                onKeyPress={(e) => {
                  handleKeyPress(e, index);
                }}
                maxLength={1}
                autoCapitalize="characters"
                keyboardType="default"
                editable={!loading}
              />
            ))}
          </View>

          <View className="px-12 mb-8">
            <ThemedButton
              label={loading ? '' : 'Accept Invite'}
              variant="primary"
              size="large"
              onPress={() => {
                handleAcceptInvite().catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to accept invite:', error);
                  }
                });
              }}
              disabled={!isCodeComplete || loading}
              loading={loading}
            />
          </View>

          <View className="flex-row items-center px-10">
            <ThemedIcon name="information-circle-outline" size="sm" color="tertiary" />
            <ThemedText variant="caption" color="tertiary" align="center" className="ml-2 flex-1">
              Invite codes are 6 characters long and contain only letters and numbers
            </ThemedText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedContainer>
  );
};

export default PartnerInviteScreen;
