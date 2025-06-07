// ABOUTME: Global error handling utility for user-friendly error messages
// Provides consistent error feedback and retry mechanisms for ADHD users

import type { AlertButton } from 'react-native';
import { Alert } from 'react-native';

type StorageOperation = 'save' | 'load' | 'delete' | 'update';
type RetryFunction = () => void;

class ErrorHandler {
  static showError(message: string, retry: RetryFunction | null = null): void {
    const buttons: AlertButton[] = [{ text: 'OK' }];
    if (retry) {
      buttons.unshift({ text: 'Retry', onPress: retry });
    }
    Alert.alert('Oops!', message, buttons);
  }

  static handleStorageError(
    error: Error | unknown,
    operation: StorageOperation,
    retry: RetryFunction | null = null,
  ): void {
    console.error(`Storage error during ${operation}:`, error);

    const messages: Record<StorageOperation, string> = {
      save: 'Failed to save. Please try again.',
      load: 'Failed to load data. Please try again.',
      delete: 'Failed to delete. Please try again.',
      update: 'Failed to update. Please try again.',
    };

    const message = messages[operation] || 'Something went wrong. Please try again.';
    this.showError(message, retry);
  }

  static handleNetworkError(error: Error | unknown, retry: RetryFunction | null = null): void {
    console.error('Network error:', error);
    this.showError('Connection error. Please check your internet and try again.', retry);
  }

  static handleValidationError(message: string): void {
    this.showError(message);
  }

  static handleCriticalError(error: Error | unknown): void {
    console.error('Critical error:', error);
    this.showError('A critical error occurred. Please restart the app.');
  }
}

export default ErrorHandler;
