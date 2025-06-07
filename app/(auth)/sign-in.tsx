// ABOUTME: Mac-inspired elegant authentication screen using NativeWind
// Clean login/signup flow with modern card-based design

import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import {
  ThemedContainer,
  ThemedText,
  ThemedCard,
  ThemedInput,
  ThemedButton,
  ThemedIcon,
} from '../../src/components/themed';
import AuthService from '../../src/services/AuthService';
import { useUser } from '../../src/contexts/UserContext';
import type { User } from '../../src/types/user.types';
import { UserRole } from '../../src/types/user.types';

interface RoleButtonProps {
  label: string;
  description: string;
  isActive: boolean;
  onPress: () => void;
  disabled: boolean;
}

const RoleButton = ({ label, description, isActive, onPress, disabled }: RoleButtonProps) => (
  <ThemedCard
    variant="outlined"
    spacing="medium"
    onPress={onPress}
    disabled={disabled}
    className="mb-3"
  >
    <ThemedText
      variant="body"
      color={isActive ? 'primary' : 'secondary'}
      weight="semibold"
      className="mb-1"
    >
      {label}
    </ThemedText>
    <ThemedText variant="caption" color={isActive ? 'primary' : 'tertiary'}>
      {description}
    </ThemedText>
  </ThemedCard>
);

const SignInScreen = () => {
  const { setUser } = useUser();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<UserRole>(UserRole.ADHD_USER);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleAuth = async (): Promise<void> => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isLogin) {
        // Login flow
        result = await AuthService.login(email, password);
      } else {
        // Signup flow
        result = await AuthService.signUp(email, password, name, role);
      }

      if (result.success) {
        // Set the user in context, which will trigger navigation update
        await setUser(result.user as User);
        // Navigation is handled automatically by the root layout based on auth state
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (): void => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setName('');
    setRole(UserRole.ADHD_USER);
    setShowPassword(false);
  };

  return (
    <ThemedContainer variant="screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-10 flex-grow justify-center"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-10">
            <ThemedText variant="h1" color="primary" align="center" className="mb-2">
              ADHD Todo
            </ThemedText>
            <ThemedText variant="body" color="secondary" align="center">
              Your accountability partner app
            </ThemedText>
          </View>

          {/* Auth Form */}
          <ThemedCard variant="elevated" spacing="large">
            <ThemedText variant="h3" color="primary" align="center" className="mb-6">
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </ThemedText>

            {/* Email Input */}
            <ThemedInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!loading}
              className="mb-4"
            />

            {/* Password Input */}
            <View className={`relative ${!isLogin ? 'mb-2' : 'mb-4'}`}>
              <ThemedInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <View className="absolute right-3 top-9.5">
                <ThemedIcon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size="sm"
                  color="secondary"
                  onPress={() => {
                    setShowPassword(!showPassword);
                  }}
                />
              </View>
            </View>

            {/* Password Hint */}
            {!isLogin && (
              <View className="mb-4 px-1">
                <ThemedText variant="caption" color="tertiary">
                  Password must be at least 8 characters with uppercase, lowercase, number, and
                  special character
                </ThemedText>
              </View>
            )}

            {/* Name Input for Sign Up */}
            {!isLogin && (
              <ThemedInput
                label="Name"
                value={name}
                onChangeText={setName}
                editable={!loading}
                className="mb-6"
              />
            )}

            {/* Role Selection for Sign Up */}
            {!isLogin && (
              <View className="mb-6">
                <ThemedText variant="body" color="primary" weight="semibold" className="mb-3">
                  I am:
                </ThemedText>
                <RoleButton
                  label="Someone with ADHD"
                  description="I need help staying on track"
                  isActive={role === UserRole.ADHD_USER}
                  onPress={() => {
                    setRole(UserRole.ADHD_USER);
                  }}
                  disabled={isLogin}
                />
                <RoleButton
                  label="An Accountability Partner"
                  description="I want to help someone stay organized"
                  isActive={role === UserRole.PARTNER}
                  onPress={() => {
                    setRole(UserRole.PARTNER);
                  }}
                  disabled={isLogin}
                />
                <RoleButton
                  label="Both"
                  description="I have ADHD and want to help others"
                  isActive={role === UserRole.BOTH}
                  onPress={() => {
                    setRole(UserRole.BOTH);
                  }}
                  disabled={isLogin}
                />
              </View>
            )}

            {/* Auth Button */}
            <ThemedButton
              label={(() => {
                if (loading) return 'Please wait...';
                return isLogin ? 'Login' : 'Sign Up';
              })()}
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
              onPress={() => {
                handleAuth().catch((error) => {
                  // Error is already handled in handleAuth
                  if (global.__DEV__) {
                    console.info('Auth error handled internally:', error);
                  }
                });
              }}
            />

            {/* Switch Auth Mode */}
            <ThemedButton
              label={(() => {
                const prefix = isLogin ? "Don't have an account? " : 'Already have an account? ';
                const action = isLogin ? 'Sign Up' : 'Login';
                return prefix + action;
              })()}
              variant="ghost"
              size="medium"
              fullWidth
              disabled={loading}
              onPress={toggleAuthMode}
            />
          </ThemedCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedContainer>
  );
};

export default SignInScreen;
