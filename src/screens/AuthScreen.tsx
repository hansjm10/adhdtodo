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
  ViewStyle,
  TextStyle,
} from 'react-native';
import AuthService from '../services/AuthService';
import { useUser } from '../contexts/UserContext';
import { User, UserRole } from '../types/user.types';
import { AuthScreenNavigationProp } from '../types/navigation.types';

interface AuthScreenProps {
  navigation?: AuthScreenNavigationProp;
}

interface RoleButtonProps {
  roleValue: UserRole;
  label: string;
  description: string;
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
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

  const RoleButton: React.FC<RoleButtonProps> = ({ roleValue, label, description }) => (
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
            autoCorrect={false}
            editable={!loading}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <Text style={styles.passwordHint}>
              Password must be at least 8 characters with uppercase, lowercase, number, and special
              character
            </Text>
          )}

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
                  roleValue={UserRole.ADHD_USER}
                  label="Someone with ADHD"
                  description="I need help staying on track"
                />
                <RoleButton
                  roleValue={UserRole.PARTNER}
                  label="An Accountability Partner"
                  description="I want to help someone stay organized"
                />
                <RoleButton
                  roleValue={UserRole.BOTH}
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

interface Styles {
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  form: ViewStyle;
  formTitle: TextStyle;
  input: TextStyle;
  passwordContainer: ViewStyle;
  passwordInput: TextStyle;
  passwordToggle: ViewStyle;
  passwordToggleText: TextStyle;
  passwordHint: TextStyle;
  roleSection: ViewStyle;
  roleSectionTitle: TextStyle;
  roleButton: ViewStyle;
  roleButtonActive: ViewStyle;
  roleLabel: TextStyle;
  roleLabelActive: TextStyle;
  roleDescription: TextStyle;
  roleDescriptionActive: TextStyle;
  button: ViewStyle;
  buttonDisabled: ViewStyle;
  buttonText: TextStyle;
  switchButton: ViewStyle;
  switchText: TextStyle;
  switchTextBold: TextStyle;
}

const styles = StyleSheet.create<Styles>({
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
  },
  passwordToggle: {
    padding: 16,
  },
  passwordToggleText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordHint: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 16,
    paddingHorizontal: 4,
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
