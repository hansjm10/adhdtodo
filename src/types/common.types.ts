// ABOUTME: Shared type definitions to reduce duplication across services
// Provides generic Result<T>, ErrorResponse, and validation types with runtime type guards

/**
 * Generic result type for all service operations
 * @template T The type of data returned on success
 */
export interface Result<T> {
  /** Indicates whether the operation was successful */
  success: boolean;
  /** The data returned on success */
  data?: T;
  /** Error information if the operation failed */
  error?: ErrorResponse;
}

/**
 * Structured error response for consistent error handling
 */
export interface ErrorResponse {
  /** Unique error code for identifying the error type */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details or context */
  details?: Record<string, unknown>;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** List of validation errors if validation failed */
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** The field that failed validation (optional for general errors) */
  field?: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
}

/**
 * Type guard to check if a value is a valid Result<T>
 * @param value The value to check
 * @returns True if the value is a valid Result
 */
export function isResult<T>(value: unknown): value is Result<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // success is required and must be boolean
  if (typeof obj.success !== 'boolean') {
    return false;
  }

  // If error is present, it must be a valid ErrorResponse
  if (obj.error !== undefined && !isErrorResponse(obj.error)) {
    return false;
  }

  // Semantic validation: successful results should have data, failed results should have error
  if (obj.success && obj.data === undefined) {
    if (global.__DEV__) {
      console.warn('Successful Result should include data');
    }
  }
  if (!obj.success && obj.error === undefined) {
    if (global.__DEV__) {
      console.warn('Failed Result should include error');
    }
  }

  // data can be anything or undefined
  return true;
}

/**
 * Type guard to check if a value is a valid ErrorResponse
 * @param value The value to check
 * @returns True if the value is a valid ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // code and message are required and must be strings
  if (typeof obj.code !== 'string' || typeof obj.message !== 'string') {
    return false;
  }

  // details is optional but must be an object if present
  if (obj.details !== undefined && (typeof obj.details !== 'object' || obj.details === null)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is a valid ValidationResult
 * @param value The value to check
 * @returns True if the value is a valid ValidationResult
 */
export function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // isValid is required and must be boolean
  if (typeof obj.isValid !== 'boolean') {
    return false;
  }

  // errors is required and must be an array
  if (!Array.isArray(obj.errors)) {
    return false;
  }

  // Performance consideration: limit array size to prevent excessive validation time
  const MAX_VALIDATION_ERRORS = 100;
  if (obj.errors.length > MAX_VALIDATION_ERRORS) {
    if (global.__DEV__) {
      console.warn(
        `ValidationResult contains ${obj.errors.length} errors, which exceeds the recommended maximum of ${MAX_VALIDATION_ERRORS}`,
      );
    }
  }

  // All items in errors array must be valid ValidationError objects
  // For performance, only validate up to MAX_VALIDATION_ERRORS items
  const itemsToValidate = Math.min(obj.errors.length, MAX_VALIDATION_ERRORS);
  for (let i = 0; i < itemsToValidate; i++) {
    if (!isValidationError(obj.errors[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Type guard to check if a value is a valid ValidationError
 * @param value The value to check
 * @returns True if the value is a valid ValidationError
 */
export function isValidationError(value: unknown): value is ValidationError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // message and code are required and must be strings
  if (typeof obj.message !== 'string' || typeof obj.code !== 'string') {
    return false;
  }

  // field is optional but must be a string if present
  if (obj.field !== undefined && typeof obj.field !== 'string') {
    return false;
  }

  return true;
}

/**
 * Helper function to create a successful Result
 * @template T The type of data
 * @param data The data to return
 * @returns A successful Result<T>
 */
export function successResult<T>(data: T): Result<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Helper function to create a failed Result
 * @template T The type of data (for type consistency)
 * @param error The error response
 * @returns A failed Result<T>
 */
export function errorResult<T>(error: ErrorResponse): Result<T> {
  return {
    success: false,
    error,
  };
}

/**
 * Helper function to create an ErrorResponse
 * @param code The error code
 * @param message The error message
 * @param details Optional error details
 * @returns An ErrorResponse object
 */
export function createError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    code,
    message,
    details,
  };
}
