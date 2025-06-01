// ABOUTME: Tests for sign-in screen with password authentication

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AuthScreen from '../sign-in';
import AuthService from '../../../src/services/AuthService';
import { USER_ROLE } from '../../../src/constants/UserConstants';

// Mock UserContext
const mockSetUser = jest.fn();
jest.mock('../../../src/contexts/UserContext', () => ({
  useUser: () => ({
    setUser: mockSetUser,
    user: null,
    loading: false,
  }),
}));

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock AuthService
jest.mock('../../../src/services/AuthService', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    signUp: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('AuthScreen (sign-in)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
    mockSetUser.mockClear();
  });

  describe('Login Mode', () => {
    it('should render login form correctly', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<AuthScreen />);

      expect(getByText('Welcome Back!')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
      expect(queryByText('Name')).toBeFalsy();
    });

    it('should show/hide password when toggle is pressed', () => {
      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const passwordInput = getByPlaceholderText('Password');
      const toggleButton = getByText('Show');

      expect(passwordInput.props.secureTextEntry).toBe(true);

      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);
      expect(getByText('Hide')).toBeTruthy();

      fireEvent.press(getByText('Hide'));
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should validate email input', async () => {
      const { getByText } = render(<AuthScreen />);

      const loginButton = getByText('Login');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email');
    });

    it('should validate password input', async () => {
      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your password');
    });

    it('should handle successful login', async () => {
      AuthService.login.mockResolvedValue({
        success: true,
        user: { id: 'user_123', email: 'test@example.com' },
        token: 'mock_token',
      });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'Test123!@#');
        expect(mockSetUser).toHaveBeenCalledWith({ id: 'user_123', email: 'test@example.com' });
      });
    });

    it('should handle login failure', async () => {
      AuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'WrongPassword');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid email or password');
      });
    });
  });

  describe('Sign Up Mode', () => {
    it('should render signup form correctly', () => {
      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      fireEvent.press(getByText('Sign Up'));

      expect(getByText('Create Account')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Name')).toBeTruthy();
      expect(getByText('I am:')).toBeTruthy();
      expect(getByText('Someone with ADHD')).toBeTruthy();
    });

    it('should display password hint in signup mode', () => {
      const { getByText } = render(<AuthScreen />);

      fireEvent.press(getByText('Sign Up'));

      expect(getByText(/Password must be at least 8 characters/)).toBeTruthy();
    });

    it('should validate name input', async () => {
      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      fireEvent.press(getByText('Sign Up'));

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');

      await act(async () => {
        fireEvent.press(signUpButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your name');
    });

    it('should handle successful signup', async () => {
      AuthService.signUp.mockResolvedValue({
        success: true,
        user: { id: 'user_123', email: 'test@example.com' },
        token: 'mock_token',
      });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      fireEvent.press(getByText('Sign Up'));

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const nameInput = getByPlaceholderText('Name');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');
      fireEvent.changeText(nameInput, 'Test User');

      await act(async () => {
        fireEvent.press(signUpButton);
      });

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith(
          'test@example.com',
          'Test123!@#',
          'Test User',
          USER_ROLE.ADHD_USER,
        );
        expect(mockSetUser).toHaveBeenCalledWith({ id: 'user_123', email: 'test@example.com' });
      });
    });

    it('should allow role selection', async () => {
      AuthService.signUp.mockResolvedValue({
        success: true,
        user: { id: 'user_123' },
        token: 'mock_token',
      });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      fireEvent.press(getByText('Sign Up'));

      const partnerRole = getByText('An Accountability Partner');
      fireEvent.press(partnerRole);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const nameInput = getByPlaceholderText('Name');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'partner@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');
      fireEvent.changeText(nameInput, 'Partner User');

      await act(async () => {
        fireEvent.press(signUpButton);
      });

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith(
          'partner@example.com',
          'Test123!@#',
          'Partner User',
          USER_ROLE.PARTNER,
        );
      });
    });
  });

  describe('Mode Switching', () => {
    it('should switch between login and signup modes', () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);

      // Start in login mode
      expect(getByText('Welcome Back!')).toBeTruthy();

      // Switch to signup
      fireEvent.press(getByText('Sign Up'));
      expect(getByText('Create Account')).toBeTruthy();
      expect(getByPlaceholderText('Name')).toBeTruthy();

      // Switch back to login
      fireEvent.press(getByText('Login'));
      expect(getByText('Welcome Back!')).toBeTruthy();
    });

    it('should clear form when switching modes', () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(getByText('Sign Up'));

      expect(getByPlaceholderText('Email').props.value).toBe('');
      expect(getByPlaceholderText('Password').props.value).toBe('');
    });
  });

  describe('Loading State', () => {
    it('should disable inputs and show loading text during authentication', async () => {
      AuthService.login.mockImplementation(() => new Promise(() => {})); // Never resolve

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Please wait...')).toBeTruthy();
        expect(emailInput.props.editable).toBe(false);
        expect(passwordInput.props.editable).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      AuthService.login.mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Something went wrong. Please try again.',
        );
      });
    });
  });
});
