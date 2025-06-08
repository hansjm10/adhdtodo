// ABOUTME: Abstract base class for all services providing centralized error handling
// Ensures consistent error logging and response handling across the application

import SecureLogger from './SecureLogger';
import type { ErrorResponse, Result } from '../types/common.types';

/**
 * Abstract base service class that provides centralized error handling
 * All services should extend this class to ensure consistent error handling
 */
export abstract class BaseService {
  protected readonly logger = SecureLogger;
  protected readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Handles errors in a consistent way across all services
   * @param error The error that occurred
   * @param operation The operation that was being performed
   * @param context Additional context about the error
   * @returns Standardized error response
   */
  protected handleError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>,
  ): ErrorResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = `${this.serviceName.toUpperCase()}_${operation.toUpperCase()}_ERROR`;

    // Log the error with full context
    this.logError(operation, error, context);

    // Return sanitized error response
    return {
      code: errorCode,
      message: this.getSafeErrorMessage(errorMessage, operation),
      details: global.__DEV__ ? { operation, ...context } : undefined,
    };
  }

  /**
   * Logs errors with appropriate detail based on environment
   * @param operation The operation that failed
   * @param error The error that occurred
   * @param context Additional context about the error
   */
  protected logError(operation: string, error: unknown, context?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const metadata = {
      code: `${this.serviceName.toUpperCase()}_${operation.toUpperCase()}_001`,
      context: context ? JSON.stringify(context) : undefined,
    };

    if (global.__DEV__) {
      console.error(`[${this.serviceName}] ${operation} failed:`, error);
      if (context) {
        console.error('Context:', context);
      }
    }

    // Use SecureLogger for production-safe logging
    this.logger.error(`${operation} failed: ${errorMessage}`, metadata);
  }

  /**
   * Wraps an async operation with error handling
   * @param operation The operation name
   * @param fn The async function to execute
   * @param context Additional context
   * @returns Result with data or error
   */
  protected async wrapAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<Result<T>> {
    // Capture call stack before async operation for better debugging
    const callStack = new Error().stack;

    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      // Include call stack in context for debugging
      const enhancedContext = {
        ...context,
        ...(global.__DEV__ && callStack ? { callStack } : {}),
      };

      return {
        success: false,
        error: this.handleError(error, operation, enhancedContext),
      };
    }
  }

  /**
   * Wraps a sync operation with error handling
   * @param operation The operation name
   * @param fn The function to execute
   * @param context Additional context
   * @returns Result with data or error
   */
  protected wrapSync<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, unknown>,
  ): Result<T> {
    // Capture call stack for better debugging
    const callStack = new Error().stack;

    try {
      const data = fn();
      return { success: true, data };
    } catch (error) {
      // Include call stack in context for debugging
      const enhancedContext = {
        ...context,
        ...(global.__DEV__ && callStack ? { callStack } : {}),
      };

      return {
        success: false,
        error: this.handleError(error, operation, enhancedContext),
      };
    }
  }

  /**
   * Gets a safe error message for user display
   * @param errorMessage The original error message
   * @param operation The operation that failed
   * @returns User-friendly error message
   */
  private getSafeErrorMessage(errorMessage: string, operation: string): string {
    // In production, return generic messages to avoid exposing sensitive information
    if (!global.__DEV__) {
      const operationMessages: Record<string, string> = {
        login: 'Login failed. Please check your credentials and try again.',
        signup: 'Sign up failed. Please try again.',
        save: 'Failed to save. Please try again.',
        load: 'Failed to load data. Please try again.',
        delete: 'Failed to delete. Please try again.',
        update: 'Failed to update. Please try again.',
        sync: 'Sync failed. Please check your connection.',
        auth: 'Authentication failed. Please try again.',
      };

      // Return operation-specific message or generic one
      return operationMessages[operation.toLowerCase()] || 'Operation failed. Please try again.';
    }

    // In development, return the actual error message
    return errorMessage;
  }
}

export default BaseService;
