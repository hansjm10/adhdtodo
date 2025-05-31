// ABOUTME: Global error handling utility for user-friendly error messages
// Provides consistent error feedback and retry mechanisms for ADHD users

import { Alert } from 'react-native';

class ErrorHandler {
  static showError(message, retry = null) {
    const buttons = [{ text: 'OK' }];
    if (retry) {
      buttons.unshift({ text: 'Retry', onPress: retry });
    }
    Alert.alert('Oops!', message, buttons);
  }

  static handleStorageError(error, operation, retry = null) {
    console.error(`Storage error during ${operation}:`, error);

    const messages = {
      save: 'Failed to save. Please try again.',
      load: 'Failed to load data. Please try again.',
      delete: 'Failed to delete. Please try again.',
      update: 'Failed to update. Please try again.',
    };

    const message = messages[operation] || 'Something went wrong. Please try again.';
    this.showError(message, retry);
  }

  static handleNetworkError(error, retry = null) {
    console.error('Network error:', error);
    this.showError('Connection error. Please check your internet and try again.', retry);
  }

  static handleValidationError(message) {
    this.showError(message);
  }

  static handleCriticalError(error) {
    console.error('Critical error:', error);
    this.showError('A critical error occurred. Please restart the app.');
  }
}

export default ErrorHandler;
