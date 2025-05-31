// ABOUTME: Service for managing user data persistence using SecureStorageService
// Handles user authentication, profile management, and partnership connections

import SecureStorageService from './SecureStorageService';
import ErrorHandler from '../utils/ErrorHandler';

const STORAGE_KEYS = {
  CURRENT_USER: 'current_user',
  ALL_USERS: 'all_users',
  USER_TOKEN: 'user_token',
};

class UserStorageService {
  async getCurrentUser() {
    try {
      const user = await SecureStorageService.getItem(STORAGE_KEYS.CURRENT_USER);
      return user;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return null;
    }
  }

  async setCurrentUser(user) {
    try {
      await SecureStorageService.setItem(STORAGE_KEYS.CURRENT_USER, user);
      // Also update in all users list
      await this.updateUser(user);
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'save', () => this.setCurrentUser(user));
      return false;
    }
  }

  async getAllUsers() {
    try {
      const users = await SecureStorageService.getItem(STORAGE_KEYS.ALL_USERS);
      if (!users) {
        return [];
      }
      return Array.isArray(users) ? users : [];
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async saveUser(user) {
    try {
      const users = await this.getAllUsers();
      const existingIndex = users.findIndex((u) => u.id === user.id);

      if (existingIndex !== -1) {
        // Update existing user
        users[existingIndex] = user;
      } else {
        // Add new user
        users.push(user);
      }

      await SecureStorageService.setItem(STORAGE_KEYS.ALL_USERS, users);
      return true;
    } catch (error) {
      console.error('Error saving user:', error);
      return false;
    }
  }

  async updateUser(updatedUser) {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex((u) => u.id === updatedUser.id);

      if (userIndex === -1) {
        // User doesn't exist, save as new
        return await this.saveUser(updatedUser);
      }

      users[userIndex] = updatedUser;
      await SecureStorageService.setItem(STORAGE_KEYS.ALL_USERS, users);

      // Update current user if it's the same
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === updatedUser.id) {
        await SecureStorageService.setItem(STORAGE_KEYS.CURRENT_USER, updatedUser);
      }

      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async getUserById(userId) {
    try {
      const users = await this.getAllUsers();
      return users.find((u) => u.id === userId) || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      const users = await this.getAllUsers();
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async logout() {
    try {
      await SecureStorageService.removeItem(STORAGE_KEYS.CURRENT_USER);
      await SecureStorageService.removeItem(STORAGE_KEYS.USER_TOKEN);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  async saveUserToken(token) {
    try {
      await SecureStorageService.setItem(STORAGE_KEYS.USER_TOKEN, token);
      return true;
    } catch (error) {
      console.error('Error saving user token:', error);
      return false;
    }
  }

  async getUserToken() {
    try {
      return await SecureStorageService.getItem(STORAGE_KEYS.USER_TOKEN);
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  async clearAllUsers() {
    try {
      await SecureStorageService.removeItem(STORAGE_KEYS.ALL_USERS);
      await SecureStorageService.removeItem(STORAGE_KEYS.CURRENT_USER);
      await SecureStorageService.removeItem(STORAGE_KEYS.USER_TOKEN);
      return true;
    } catch (error) {
      console.error('Error clearing users:', error);
      return false;
    }
  }
}

export default new UserStorageService();
