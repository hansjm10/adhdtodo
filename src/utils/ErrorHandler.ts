// ABOUTME: Global error handling utility for user-friendly error messages
// Provides consistent error feedback and retry mechanisms for ADHD users

import type { AlertButton } from 'react-native';
import { Alert } from 'react-native';
import SecureLogger from '../services/SecureLogger';
import type { ErrorResponse } from '../types/common.types';

type StorageOperation = 'save' | 'load' | 'delete' | 'update';
type RetryFunction = () => void;

class ErrorHandler {
  private static logger = SecureLogger;
  private static errorCounts = new Map<string, { count: number; lastReset: number }>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly MAX_ERRORS_PER_WINDOW = 10;

  /**
   * Converts various error types to a standardized ErrorResponse
   * @param error The error to handle
   * @param context Additional context about where the error occurred
   * @returns Standardized error response
   */
  static handleError(error: unknown, context?: string): ErrorResponse {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (error instanceof Error) {
      message = error.message;
      code = error.name || 'ERROR';
      if (global.__DEV__) {
        details = {
          stack: error.stack,
          context,
        };
      }
    } else if (typeof error === 'string') {
      message = error;
      code = 'STRING_ERROR';
    } else if (error && typeof error === 'object') {
      // Handle custom error objects
      const errorObj = error as Record<string, unknown>;
      if (errorObj.code) code = String(errorObj.code);
      if (errorObj.message) message = String(errorObj.message);
      if (errorObj.details && global.__DEV__) details = errorObj.details as Record<string, unknown>;
    }

    // Log the error
    this.logError(context ?? 'Unknown context', error);

    return {
      code: context ? `${context.toUpperCase()}_${code}` : code,
      message,
      details,
    };
  }

  /**
   * Centralized error logging that respects environment settings
   * Rate limited to prevent log flooding (10 errors per minute per context)
   * @param context The context where the error occurred
   * @param error The error to log
   */
  static logError(context: string, error: unknown): void {
    // Check rate limiting
    if (!this.shouldLogError(context)) {
      return;
    }

    if (global.__DEV__) {
      console.error(`[${context}] Error:`, error);
    }

    // Use SecureLogger for production-safe logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${errorMessage}`, {
      code: `${context.toUpperCase()}_ERROR`,
    });
  }

  /**
   * Rate limiting check for error logging
   * @param context The context to check rate limiting for
   * @returns true if error should be logged, false if rate limited
   */
  private static shouldLogError(context: string): boolean {
    const now = Date.now();
    const contextData = this.errorCounts.get(context);

    if (!contextData) {
      // First error for this context
      this.errorCounts.set(context, { count: 1, lastReset: now });
      return true;
    }

    // Reset counter if window has passed
    if (now - contextData.lastReset >= this.RATE_LIMIT_WINDOW) {
      this.errorCounts.set(context, { count: 1, lastReset: now });
      return true;
    }

    // Check if under rate limit
    if (contextData.count < this.MAX_ERRORS_PER_WINDOW) {
      contextData.count++;
      return true;
    }

    // Rate limited - only log once per window when limit exceeded
    if (contextData.count === this.MAX_ERRORS_PER_WINDOW) {
      contextData.count++; // Mark that we've shown the rate limit message
      if (global.__DEV__) {
        console.warn(
          `[${context}] Error logging rate limited (max ${this.MAX_ERRORS_PER_WINDOW} per minute)`,
        );
      }
    }

    return false;
  }

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

// Export standalone functions for convenience
export const handleError = (error: unknown, context?: string): ErrorResponse => {
  return ErrorHandler.handleError(error, context);
};

export const logError = (context: string, error: unknown): void => {
  ErrorHandler.logError(context, error);
};

export default ErrorHandler;
