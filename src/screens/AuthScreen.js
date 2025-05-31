// ABOUTME: Authentication screen for user login and signup
// Handles user registration, login, and role selection for accountability partnerships

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { createUser, validateUser } from '../utils/UserModel';
import UserStorageService from '../services/UserStorageService';
import { USER_ROLE } from '../constants/UserConstants';

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(USER_ROLE.ADHD_USER);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const existingUser = await UserStorageService.getUserByEmail(email);
        if (!existingUser) {
          Alert.alert('Error', 'No account found with this email');
          setLoading(false);
          return;
        }

        await UserStorageService.setCurrentUser(existingUser);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        // Signup flow
        const existingUser = await UserStorageService.getUserByEmail(email);
        if (existingUser) {
          Alert.alert('Error', 'An account already exists with this email');
          setLoading(false);
          return;
        }

        const newUser = createUser({
          email: email.toLowerCase(),
          name,
          role,
        });

        const validation = validateUser(newUser);
        if (!validation.isValid) {
          Alert.alert('Error', validation.errors.join('\n'));
          setLoading(false);
          return;
        }

        await UserStorageService.saveUser(newUser);
        await UserStorageService.setCurrentUser(newUser);

        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setName('');
    setRole(USER_ROLE.ADHD_USER);
  };

  const RoleButton = ({ roleValue, label, description }) => (
    <TouchableOpacity
      style={[styles.roleButton, role === roleValue && styles.roleButtonActive]}
      onPress={() => setRole(roleValue)}
      disabled={isLogin}
    >
      <Text style={[styles.roleLabel, role === roleValue && styles.roleLabelActive]}>{label}</Text>
      <Text style={[styles.roleDescription, role === roleValue && styles.roleDescriptionActive]}>
        {description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>ADHD Todo</Text>
          <Text style={styles.subtitle}>Your accountability partner app</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <View style={styles.roleSection}>
                <Text style={styles.roleSectionTitle}>I am:</Text>
                <RoleButton
                  roleValue={USER_ROLE.ADHD_USER}
                  label="Someone with ADHD"
                  description="I need help staying on track"
                />
                <RoleButton
                  roleValue={USER_ROLE.PARTNER}
                  label="An Accountability Partner"
                  description="I want to help someone stay organized"
                />
                <RoleButton
                  roleValue={USER_ROLE.BOTH}
                  label="Both"
                  description="I have ADHD and want to help others"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={toggleAuthMode} disabled={loading}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Login'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#2C3E50',
  },
  roleSection: {
    marginBottom: 24,
  },
  roleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  roleButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roleButtonActive: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  roleLabelActive: {
    color: '#3498DB',
  },
  roleDescription: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  roleDescriptionActive: {
    color: '#5DADE2',
  },
  button: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  switchTextBold: {
    fontWeight: 'bold',
    color: '#3498DB',
  },
});

export default AuthScreen;
