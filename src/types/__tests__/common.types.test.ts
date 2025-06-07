// ABOUTME: Tests for common shared types and type guards
// Ensures runtime type validation works correctly

import type { Result, ErrorResponse, ValidationResult, ValidationError } from '../common.types';
import {
  isResult,
  isErrorResponse,
  isValidationResult,
  isValidationError,
  successResult,
  errorResult,
  createError,
} from '../common.types';

describe('Common Types - Type Guards', () => {
  describe('isResult', () => {
    it('should return true for valid Result objects with success', () => {
      const result: Result<string> = {
        success: true,
        data: 'test data',
      };
      expect(isResult(result)).toBe(true);
    });

    it('should return true for valid Result objects with error', () => {
      const result: Result<string> = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      };
      expect(isResult(result)).toBe(true);
    });

    it('should return true for minimal valid Result', () => {
      const result = { success: true };
      expect(isResult(result)).toBe(true);
    });

    it('should return false for invalid Result objects', () => {
      expect(isResult({})).toBe(false);
      expect(isResult(null)).toBe(false);
      expect(isResult(undefined)).toBe(false);
      expect(isResult('string')).toBe(false);
      expect(isResult(123)).toBe(false);
      expect(isResult({ success: 'true' })).toBe(false); // success must be boolean
      expect(isResult({ data: 'test' })).toBe(false); // missing success
    });

    it('should validate error property if present', () => {
      const invalidResult = {
        success: false,
        error: 'string error', // should be ErrorResponse object
      };
      expect(isResult(invalidResult)).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for valid ErrorResponse objects', () => {
      const error: ErrorResponse = {
        code: 'AUTH_001',
        message: 'Authentication failed',
      };
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should return true for ErrorResponse with details', () => {
      const error: ErrorResponse = {
        code: 'VALIDATION_001',
        message: 'Validation failed',
        details: {
          field: 'email',
          reason: 'Invalid format',
        },
      };
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should return false for invalid ErrorResponse objects', () => {
      expect(isErrorResponse({})).toBe(false);
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse(undefined)).toBe(false);
      expect(isErrorResponse({ code: 'TEST' })).toBe(false); // missing message
      expect(isErrorResponse({ message: 'Test' })).toBe(false); // missing code
      expect(isErrorResponse({ code: 123, message: 'Test' })).toBe(false); // code must be string
    });
  });

  describe('isValidationResult', () => {
    it('should return true for valid ValidationResult objects', () => {
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
      };
      expect(isValidationResult(validation)).toBe(true);
    });

    it('should return true for ValidationResult with errors', () => {
      const validation: ValidationResult = {
        isValid: false,
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
          },
        ],
      };
      expect(isValidationResult(validation)).toBe(true);
    });

    it('should return false for invalid ValidationResult objects', () => {
      expect(isValidationResult({})).toBe(false);
      expect(isValidationResult(null)).toBe(false);
      expect(isValidationResult({ isValid: true })).toBe(false); // missing errors array
      expect(isValidationResult({ errors: [] })).toBe(false); // missing isValid
      expect(isValidationResult({ isValid: 'true', errors: [] })).toBe(false); // isValid must be boolean
    });

    it('should validate errors array contains valid ValidationError objects', () => {
      const invalidValidation = {
        isValid: false,
        errors: ['string error'], // should be ValidationError objects
      };
      expect(isValidationResult(invalidValidation)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for valid ValidationError objects', () => {
      const error: ValidationError = {
        message: 'Field is required',
        code: 'REQUIRED',
      };
      expect(isValidationError(error)).toBe(true);
    });

    it('should return true for ValidationError with field', () => {
      const error: ValidationError = {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      };
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for invalid ValidationError objects', () => {
      expect(isValidationError({})).toBe(false);
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError({ message: 'Test' })).toBe(false); // missing code
      expect(isValidationError({ code: 'TEST' })).toBe(false); // missing message
      expect(isValidationError({ message: 123, code: 'TEST' })).toBe(false); // message must be string
    });
  });
});

describe('Common Types - Type Usage', () => {
  it('should allow creating Result with generic types', () => {
    interface User {
      id: string;
      name: string;
    }

    const userResult: Result<User> = {
      success: true,
      data: {
        id: '123',
        name: 'Test User',
      },
    };

    expect(userResult.success).toBe(true);
    expect(userResult.data?.name).toBe('Test User');
  });

  it('should allow creating Result with error', () => {
    const errorResult: Result<void> = {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
        details: {
          timeout: 5000,
          url: 'https://api.example.com',
        },
      },
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.error?.code).toBe('NETWORK_ERROR');
  });

  it('should allow creating ValidationResult with multiple errors', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        {
          field: 'email',
          message: 'Email is required',
          code: 'REQUIRED',
        },
        {
          field: 'password',
          message: 'Password must be at least 8 characters',
          code: 'MIN_LENGTH',
        },
      ],
    };

    expect(validation.errors).toHaveLength(2);
    expect(validation.errors[0].field).toBe('email');
  });
});

describe('Common Types - Helper Functions', () => {
  describe('successResult', () => {
    it('should create a successful Result with data', () => {
      const data = { id: '123', name: 'Test' };
      const result = successResult(data);

      expect(result).toEqual({
        success: true,
        data,
      });
      expect(isResult(result)).toBe(true);
    });

    it('should work with primitive types', () => {
      const result = successResult('success');
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
    });

    it('should work with void/undefined data', () => {
      const result = successResult(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should work with null data', () => {
      const result = successResult(null);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should work with array data', () => {
      const data = [1, 2, 3];
      const result = successResult(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('errorResult', () => {
    it('should create a failed Result with error', () => {
      const error = createError('TEST_ERROR', 'Test error message');
      const result = errorResult<string>(error);

      expect(result).toEqual({
        success: false,
        error,
      });
      expect(isResult(result)).toBe(true);
    });

    it('should work with ErrorResponse objects', () => {
      const error: ErrorResponse = {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
        details: { userId: '123' },
      };
      const result = errorResult<unknown>(error);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
    });

    it('should properly type the generic parameter', () => {
      interface User {
        id: string;
        name: string;
      }
      const error = createError('USER_NOT_FOUND', 'User does not exist');
      const result = errorResult<User>(error);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      // TypeScript should allow this type annotation
      const typedResult: Result<User> = result;
      expect(typedResult).toBeDefined();
    });
  });

  describe('createError', () => {
    it('should create an ErrorResponse with code and message', () => {
      const error = createError('ERROR_CODE', 'Error message');

      expect(error).toEqual({
        code: 'ERROR_CODE',
        message: 'Error message',
      });
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should create an ErrorResponse with details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = createError('VALIDATION_ERROR', 'Validation failed', details);

      expect(error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      });
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should handle empty string code and message', () => {
      const error = createError('', '');
      expect(error.code).toBe('');
      expect(error.message).toBe('');
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should handle complex details objects', () => {
      const details = {
        timestamp: new Date().toISOString(),
        stack: new Error().stack,
        metadata: {
          version: '1.0.0',
          environment: 'test',
        },
      };
      const error = createError('SYSTEM_ERROR', 'System error occurred', details);

      expect(error.details).toEqual(details);
      expect(isErrorResponse(error)).toBe(true);
    });

    it('should handle undefined details', () => {
      const error = createError('ERROR_CODE', 'Error message', undefined);
      expect(error).toEqual({
        code: 'ERROR_CODE',
        message: 'Error message',
      });
      expect(error.details).toBeUndefined();
    });
  });

  describe('Helper Functions Integration', () => {
    it('should work together to create and validate results', () => {
      // Success case
      const successData = { id: '123', value: 42 };
      const success = successResult(successData);
      expect(isResult(success)).toBe(true);
      expect(success.data).toEqual(successData);

      // Error case
      const error = createError('TEST_ERROR', 'Something went wrong', { debug: true });
      const failure = errorResult<typeof successData>(error);
      expect(isResult(failure)).toBe(true);
      expect(failure.error).toEqual(error);
      expect(isErrorResponse(failure.error)).toBe(true);
    });

    it('should maintain type safety through the chain', () => {
      interface ApiResponse {
        users: Array<{ id: string; name: string }>;
        total: number;
      }

      // Success path
      const data: ApiResponse = {
        users: [{ id: '1', name: 'Alice' }],
        total: 1,
      };
      const success = successResult(data);
      expect(success.data?.users[0].name).toBe('Alice');

      // Error path
      const error = createError('API_ERROR', 'Failed to fetch users');
      const failure = errorResult<ApiResponse>(error);
      expect(failure.error?.code).toBe('API_ERROR');
    });
  });
});
