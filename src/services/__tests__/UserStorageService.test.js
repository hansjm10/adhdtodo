// ABOUTME: Comprehensive unit tests for UserStorageService
// Tests user data persistence, authentication, and profile management

import UserStorageService from '../UserStorageService';
import SecureStorageService from '../SecureStorageService';
import ErrorHandler from '../../utils/ErrorHandler';
import { USER_ROLE } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('../SecureStorageService');
jest.mock('../../utils/ErrorHandler');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('UserStorageService', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: USER_ROLE.ADHD_USER,
    createdAt: new Date('2024-01-01'),
  };

  const mockPartnerUser = {
    id: 'partner_456',
    email: 'partner@example.com',
    name: 'Partner User',
    role: USER_ROLE.PARTNER,
    createdAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    SecureStorageService.getItem.mockResolvedValue(null);
    SecureStorageService.setItem.mockResolvedValue();
    SecureStorageService.removeItem.mockResolvedValue();
    ErrorHandler.handleStorageError.mockImplementation(() => {});
  });

  describe('getCurrentUser', () => {
    it('should return current user from secure storage', async () => {
      SecureStorageService.getItem.mockResolvedValue(mockUser);

      const result = await UserStorageService.getCurrentUser();

      expect(SecureStorageService.getItem).toHaveBeenCalledWith('current_user');
      expect(result).toEqual(mockUser);
    });

    it('should return null if no current user', async () => {
      SecureStorageService.getItem.mockResolvedValue(null);

      const result = await UserStorageService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      SecureStorageService.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await UserStorageService.getCurrentUser();

      expect(ErrorHandler.handleStorageError).toHaveBeenCalledWith(expect.any(Error), 'load');
      expect(result).toBeNull();
    });
  });

  describe('setCurrentUser', () => {
    it('should save current user to secure storage', async () => {
      SecureStorageService.getItem.mockResolvedValue([]); // Empty users list

      const result = await UserStorageService.setCurrentUser(mockUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('current_user', mockUser);
      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [mockUser]);
      expect(result).toBe(true);
    });

    it('should update user in all users list', async () => {
      const existingUsers = [mockPartnerUser, { ...mockUser, name: 'Old Name' }];
      SecureStorageService.getItem.mockResolvedValue(existingUsers);

      const updatedUser = { ...mockUser, name: 'New Name' };
      const result = await UserStorageService.setCurrentUser(updatedUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        mockPartnerUser,
        updatedUser,
      ]);
      expect(result).toBe(true);
    });

    it('should handle storage errors with retry', async () => {
      SecureStorageService.setItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await UserStorageService.setCurrentUser(mockUser);

      expect(ErrorHandler.handleStorageError).toHaveBeenCalledWith(
        expect.any(Error),
        'save',
        expect.any(Function),
      );
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users from storage', async () => {
      const users = [mockUser, mockPartnerUser];
      SecureStorageService.getItem.mockResolvedValue(users);

      const result = await UserStorageService.getAllUsers();

      expect(SecureStorageService.getItem).toHaveBeenCalledWith('all_users');
      expect(result).toEqual(users);
    });

    it('should return empty array if no users', async () => {
      SecureStorageService.getItem.mockResolvedValue(null);

      const result = await UserStorageService.getAllUsers();

      expect(result).toEqual([]);
    });

    it('should handle non-array data gracefully', async () => {
      SecureStorageService.getItem.mockResolvedValue('invalid');

      const result = await UserStorageService.getAllUsers();

      expect(result).toEqual([]);
    });

    it('should handle storage errors', async () => {
      SecureStorageService.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await UserStorageService.getAllUsers();

      expect(ErrorHandler.handleStorageError).toHaveBeenCalledWith(expect.any(Error), 'load');
      expect(result).toEqual([]);
    });
  });

  describe('saveUser', () => {
    it('should add new user to storage', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnerUser]);

      const result = await UserStorageService.saveUser(mockUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        mockPartnerUser,
        mockUser,
      ]);
      expect(result).toBe(true);
    });

    it('should update existing user', async () => {
      const oldUser = { ...mockUser, name: 'Old Name' };
      SecureStorageService.getItem.mockResolvedValue([oldUser, mockPartnerUser]);

      const updatedUser = { ...mockUser, name: 'New Name' };
      const result = await UserStorageService.saveUser(updatedUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        updatedUser,
        mockPartnerUser,
      ]);
      expect(result).toBe(true);
    });

    it('should handle empty users list', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const result = await UserStorageService.saveUser(mockUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [mockUser]);
      expect(result).toBe(true);
    });

    it('should handle save errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.setItem.mockRejectedValue(new Error('Save error'));

      const result = await UserStorageService.saveUser(mockUser);

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to save user data',
        'Code: USER_SAVE_001',
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('updateUser', () => {
    it('should update existing user in storage', async () => {
      const oldUser = { ...mockUser, name: 'Old Name' };
      SecureStorageService.getItem
        .mockResolvedValueOnce([oldUser, mockPartnerUser]) // getAllUsers
        .mockResolvedValueOnce(oldUser); // getCurrentUser

      const updatedUser = { ...mockUser, name: 'New Name' };
      const result = await UserStorageService.updateUser(updatedUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        updatedUser,
        mockPartnerUser,
      ]);
      expect(SecureStorageService.setItem).toHaveBeenCalledWith('current_user', updatedUser);
      expect(result).toBe(true);
    });

    it('should save as new user if not found', async () => {
      SecureStorageService.getItem
        .mockResolvedValueOnce([mockPartnerUser]) // getAllUsers
        .mockResolvedValueOnce([mockPartnerUser]); // getAllUsers in saveUser

      const result = await UserStorageService.updateUser(mockUser);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        mockPartnerUser,
        mockUser,
      ]);
      expect(result).toBe(true);
    });

    it('should not update current user if different', async () => {
      SecureStorageService.getItem
        .mockResolvedValueOnce([mockUser, mockPartnerUser]) // getAllUsers
        .mockResolvedValueOnce(mockUser); // getCurrentUser

      const updatedPartner = { ...mockPartnerUser, name: 'Updated Partner' };
      const result = await UserStorageService.updateUser(updatedPartner);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('all_users', [
        mockUser,
        updatedPartner,
      ]);
      expect(SecureStorageService.setItem).not.toHaveBeenCalledWith('current_user', updatedPartner);
      expect(result).toBe(true);
    });

    it('should handle update errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // First getAllUsers call succeeds
      SecureStorageService.getItem.mockResolvedValueOnce([mockUser, mockPartnerUser]);
      // setItem fails
      SecureStorageService.setItem.mockRejectedValue(new Error('Update error'));

      const result = await UserStorageService.updateUser(mockUser);

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to update user data',
        'Code: USER_UPDATE_001',
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('getUserById', () => {
    it('should find user by ID', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockUser, mockPartnerUser]);

      const result = await UserStorageService.getUserById('user_123');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnerUser]);

      const result = await UserStorageService.getUserById('unknown_id');

      expect(result).toBeNull();
    });

    it('should handle empty users list', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const result = await UserStorageService.getUserById('user_123');

      expect(result).toBeNull();
    });

    it('should handle errors from getAllUsers gracefully', async () => {
      // When getAllUsers encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await UserStorageService.getUserById('user_123');

      // getAllUsers handles the error and returns [], so getUserById returns null
      expect(ErrorHandler.handleStorageError).toHaveBeenCalledWith(expect.any(Error), 'load');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should find user by email', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockUser, mockPartnerUser]);

      const result = await UserStorageService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should be case-insensitive', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockUser, mockPartnerUser]);

      const result = await UserStorageService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockUser, mockPartnerUser]);

      const result = await UserStorageService.getUserByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should handle errors from getAllUsers gracefully', async () => {
      // When getAllUsers encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await UserStorageService.getUserByEmail('test@example.com');

      // getAllUsers handles the error and returns [], so getUserByEmail returns null
      expect(ErrorHandler.handleStorageError).toHaveBeenCalledWith(expect.any(Error), 'load');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear current user and token', async () => {
      const result = await UserStorageService.logout();

      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('current_user');
      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('user_token');
      expect(result).toBe(true);
    });

    it('should handle logout errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.removeItem.mockRejectedValue(new Error('Remove error'));

      const result = await UserStorageService.logout();

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to complete logout operation',
        'Code: USER_LOGOUT_001',
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('saveUserToken', () => {
    it('should save user token to secure storage', async () => {
      const token = 'mock_token_123';
      const result = await UserStorageService.saveUserToken(token);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('user_token', token);
      expect(result).toBe(true);
    });

    it('should handle save token errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.setItem.mockRejectedValue(new Error('Save error'));

      const result = await UserStorageService.saveUserToken('token');

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to save user token',
        'Code: USER_TOKEN_SAVE_001',
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('getUserToken', () => {
    it('should get user token from secure storage', async () => {
      const token = 'mock_token_123';
      SecureStorageService.getItem.mockResolvedValue(token);

      const result = await UserStorageService.getUserToken();

      expect(SecureStorageService.getItem).toHaveBeenCalledWith('user_token');
      expect(result).toBe(token);
    });

    it('should return null if no token', async () => {
      SecureStorageService.getItem.mockResolvedValue(null);

      const result = await UserStorageService.getUserToken();

      expect(result).toBeNull();
    });

    it('should handle get token errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await UserStorageService.getUserToken();

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to retrieve user token',
        'Code: USER_TOKEN_GET_001',
      );
      expect(result).toBeNull();

      consoleError.mockRestore();
    });
  });

  describe('clearAllUsers', () => {
    it('should clear all user data', async () => {
      const result = await UserStorageService.clearAllUsers();

      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('all_users');
      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('current_user');
      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('user_token');
      expect(SecureStorageService.removeItem).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it('should handle clear errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.removeItem.mockRejectedValue(new Error('Remove error'));

      const result = await UserStorageService.clearAllUsers();

      expect(consoleError).toHaveBeenCalledWith(
        '[ERROR] Failed to clear user data',
        'Code: USER_CLEAR_001',
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });
});
