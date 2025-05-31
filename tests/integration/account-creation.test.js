// ABOUTME: Integration tests for new account creation flow
// Tests the complete signup process including validation, storage, and navigation

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AuthScreen from '../../src/screens/AuthScreen';
import AuthService from '../../src/services/AuthService';
import UserStorageService from '../../src/services/UserStorageService';
import { USER_ROLE } from '../../src/constants/UserConstants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock expo-secure-store
const mockStorage = new Map();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key, value) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => {
    return Promise.resolve(mockStorage.get(key) || null);
  }),
  deleteItemAsync: jest.fn((key) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
}));

// Mock expo-crypto with only the functions that actually exist
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn((length) => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Promise.resolve(bytes);
  }),
  digestStringAsync: jest.fn((algorithm, data) => {
    // Simple mock hash - in real implementation this would be SHA-256
    const mockHash = `mocked-hash-${data.substring(0, 10)}`;
    return Promise.resolve(mockHash);
  }),
  // NOTE: pbkdf2Async does NOT exist in expo-crypto!
  // This is why we need to use digestStringAsync for password hashing
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Account Creation Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear storage before each test
    mockStorage.clear();
    await UserStorageService.logout();
  });

  describe('Successful Account Creation', () => {
    it('should create a new account with all valid data', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in valid account details
      fireEvent.changeText(getByPlaceholderText('Email'), 'newuser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Select role
      fireEvent.press(getByText('Someone with ADHD'));

      // Submit the form
      fireEvent.press(getByText('Sign Up', { exact: false }));

      // Wait for async operations
      await waitFor(
        () => {
          // Should not show any error alerts
          expect(Alert.alert).not.toHaveBeenCalled();
        },
        { timeout: 5000 },
      );

      // Verify user was created and stored
      const currentUser = await UserStorageService.getCurrentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser.email).toBe('newuser@example.com');
      expect(currentUser.name).toBe('Test User');
      expect(currentUser.role).toBe(USER_ROLE.ADHD_USER);
      expect(currentUser.passwordHash).toBeTruthy();
      expect(currentUser.passwordSalt).toBeTruthy();
      expect(currentUser.sessionToken).toBeTruthy();
    });

    it('should create account with Partner role', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in account details
      fireEvent.changeText(getByPlaceholderText('Email'), 'partner@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'PartnerPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Partner User');

      // Select partner role
      fireEvent.press(getByText('An Accountability Partner'));

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(async () => {
        const currentUser = await UserStorageService.getCurrentUser();
        expect(currentUser.role).toBe(USER_ROLE.PARTNER);
      });
    });

    it('should create account with Both role', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in account details
      fireEvent.changeText(getByPlaceholderText('Email'), 'both@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'BothPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Both User');

      // Select both role
      fireEvent.press(getByText('Both'));

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(async () => {
        const currentUser = await UserStorageService.getCurrentUser();
        expect(currentUser.role).toBe(USER_ROLE.BOTH);
      });
    });
  });

  describe('Email Validation', () => {
    it('should show error for empty email', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in other fields but leave email empty
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email');
      });
    });

    it('should show error for invalid email format', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in invalid email
      fireEvent.changeText(getByPlaceholderText('Email'), 'notanemail');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid email address');
      });
    });

    it('should show error for duplicate email', async () => {
      // First create a user
      await AuthService.signUp(
        'existing@example.com',
        'ExistingPass123!',
        'Existing User',
        USER_ROLE.ADHD_USER,
      );

      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Try to create account with same email
      fireEvent.changeText(getByPlaceholderText('Email'), 'existing@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'NewPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'New User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'An account already exists with this email',
        );
      });
    });
  });

  describe('Password Validation', () => {
    it('should show error for empty password', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in fields but leave password empty
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your password');
      });
    });

    it('should show error for password too short', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in short password
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'Short1!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('at least 8 characters'),
        );
      });
    });

    it('should show error for password missing uppercase', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in password without uppercase
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'nouppercase123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('uppercase letter'),
        );
      });
    });

    it('should show error for password missing lowercase', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in password without lowercase
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'NOLOWERCASE123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('lowercase letter'),
        );
      });
    });

    it('should show error for password missing number', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in password without number
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'NoNumbers!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('one number'));
      });
    });

    it('should show error for password missing special character', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in password without special character
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'NoSpecial123');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('special character'),
        );
      });
    });
  });

  describe('Name Validation', () => {
    it('should show error for empty name', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in fields but leave name empty
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your name');
      });
    });

    it('should show error for name with only spaces', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in name with only spaces
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), '   ');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your name');
      });
    });
  });

  describe('UI State and Navigation', () => {
    it('should show password hint text during signup', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByText } = render(<AuthScreen navigation={mockNavigation} />);

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Check for password hint
      expect(getByText(/Password must be at least 8 characters/)).toBeTruthy();
    });

    it('should toggle password visibility', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      const passwordInput = getByPlaceholderText('Password');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);

      // Toggle to show password
      fireEvent.press(getByText('Show'));
      expect(passwordInput.props.secureTextEntry).toBe(false);

      // Toggle to hide password
      fireEvent.press(getByText('Hide'));
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should disable form inputs while loading', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in valid data
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      // Check that inputs are disabled during loading
      await waitFor(() => {
        expect(getByText('Please wait...')).toBeTruthy();
        expect(getByPlaceholderText('Email').props.editable).toBe(false);
        expect(getByPlaceholderText('Password').props.editable).toBe(false);
        expect(getByPlaceholderText('Name').props.editable).toBe(false);
      });
    });

    it('should reset form when switching between login and signup', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in some data
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'TestPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');

      // Switch back to login
      fireEvent.press(getByText('Login'));

      // Switch to signup again
      fireEvent.press(getByText('Sign Up'));

      // Check that fields are cleared
      expect(getByPlaceholderText('Email').props.value).toBe('');
      expect(getByPlaceholderText('Password').props.value).toBe('');
      expect(getByPlaceholderText('Name').props.value).toBe('');
    });

    it('should navigate to Main screen after successful signup', async () => {
      const mockNavigation = {
        reset: jest.fn(),
      };

      const MockedAuthScreen = (props) => {
        return <AuthScreen {...props} navigation={mockNavigation} />;
      };

      const { getByPlaceholderText, getByText } = render(<MockedAuthScreen />);

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in valid data
      fireEvent.changeText(getByPlaceholderText('Email'), 'navigate@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'StrongPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Navigate User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      });
    });
  });

  describe('Session Management', () => {
    it('should save session token after successful signup', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in valid data
      fireEvent.changeText(getByPlaceholderText('Email'), 'session@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'SessionPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Session User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(async () => {
        const token = await UserStorageService.getUserToken();
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
      });
    });

    it('should verify session after signup', async () => {
      const mockNavigation = { reset: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <AuthScreen navigation={mockNavigation} />,
      );

      // Switch to signup mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in valid data
      fireEvent.changeText(getByPlaceholderText('Email'), 'verify@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'VerifyPass123!');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Verify User');

      // Submit
      fireEvent.press(getByText('Sign Up', { exact: false }));

      await waitFor(async () => {
        const sessionResult = await AuthService.verifySession();
        expect(sessionResult.isValid).toBe(true);
        expect(sessionResult.user.email).toBe('verify@example.com');
      });
    });
  });
});
