// ABOUTME: Tests for common shared types and type guards
// Ensures runtime type validation works correctly

import type { Result, ErrorResponse, ValidationResult, ValidationError } from '../common.types';
import { isResult, isErrorResponse, isValidationResult, isValidationError } from '../common.types';

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
