// ABOUTME: Tests for ValidationService ensuring proper input validation and sanitization

import ValidationService from '../ValidationService';
import { testDataFactories } from '../../../tests/utils';

describe('ValidationService', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(ValidationService.validateEmail('user@example.com')).toBe(true);
      expect(ValidationService.validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(ValidationService.validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(ValidationService.validateEmail('')).toBe(false);
      expect(ValidationService.validateEmail('notanemail')).toBe(false);
      expect(ValidationService.validateEmail('user@')).toBe(false);
      expect(ValidationService.validateEmail('@example.com')).toBe(false);
      expect(ValidationService.validateEmail('user@.com')).toBe(false);
      expect(ValidationService.validateEmail('user@example')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(ValidationService.validateEmail(longEmail)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(ValidationService.validateEmail(null)).toBe(false);
      expect(ValidationService.validateEmail(undefined)).toBe(false);
    });
  });

  describe('User ID Validation', () => {
    it('should validate UUID format user IDs', () => {
      expect(ValidationService.validateUserId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(ValidationService.validateUserId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid user IDs', () => {
      expect(ValidationService.validateUserId('')).toBe(false);
      expect(ValidationService.validateUserId('not-a-uuid')).toBe(false);
      expect(ValidationService.validateUserId('123e4567-e89b-12d3-a456')).toBe(false);
      expect(ValidationService.validateUserId('123e4567e89b12d3a456426614174000')).toBe(false);
    });
  });

  describe('Task Data Validation', () => {
    it('should validate valid task data', () => {
      const validTask = testDataFactories.task({
        title: 'Test Task',
        description: 'A valid description',
        priority: 'high',
        category: 'work',
      });
      const result = ValidationService.validateTaskData(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject task with empty title', () => {
      const invalidTask = {
        title: '',
        description: 'Description',
      };
      const result = ValidationService.validateTaskData(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task title is required');
    });

    it('should reject task with title too long', () => {
      const invalidTask = {
        title: 'a'.repeat(201),
        description: 'Description',
      };
      const result = ValidationService.validateTaskData(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task title must not exceed 200 characters');
    });

    it('should reject task with description too long', () => {
      const invalidTask = {
        title: 'Valid Title',
        description: 'a'.repeat(1001),
      };
      const result = ValidationService.validateTaskData(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task description must not exceed 1000 characters');
    });

    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      validPriorities.forEach((priority) => {
        const task = { title: 'Test', priority };
        const result = ValidationService.validateTaskData(task);
        expect(result.isValid).toBe(true);
      });

      const invalidTask = { title: 'Test', priority: 'invalid' };
      const result = ValidationService.validateTaskData(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid priority value');
    });
  });

  describe('Notification Message Validation', () => {
    it('should validate and sanitize notification messages', () => {
      const result = ValidationService.validateNotificationMessage(
        'Hello, this is a test message!',
      );
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello, this is a test message!');
    });

    it('should reject empty messages', () => {
      const result = ValidationService.validateNotificationMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(501);
      const result = ValidationService.validateNotificationMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message must not exceed 500 characters');
    });

    it('should sanitize XSS attempts', () => {
      const xssMessage = 'Hello <script>alert("XSS")</script> world!';
      const result = ValidationService.validateNotificationMessage(xssMessage);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello  world!');
    });

    it('should sanitize HTML tags', () => {
      const htmlMessage = 'Hello <b>world</b> <a href="evil.com">click</a>!';
      const result = ValidationService.validateNotificationMessage(htmlMessage);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello world click!');
    });
  });

  describe('Partnership Invite Code Validation', () => {
    it('should validate correct invite codes', () => {
      expect(ValidationService.validateInviteCode('ABC123')).toBe(true);
      expect(ValidationService.validateInviteCode('INVITE2023')).toBe(true);
      expect(ValidationService.validateInviteCode('123456')).toBe(true);
    });

    it('should reject invalid invite codes', () => {
      expect(ValidationService.validateInviteCode('')).toBe(false);
      expect(ValidationService.validateInviteCode('AB')).toBe(false); // Too short
      expect(ValidationService.validateInviteCode('TOOLONGCODE123')).toBe(false); // Too long
      expect(ValidationService.validateInviteCode('ABC 123')).toBe(false); // Contains space
      expect(ValidationService.validateInviteCode('ABC@123')).toBe(false); // Special chars
    });
  });

  describe('Sanitize User Input', () => {
    it('should sanitize general user input', () => {
      expect(ValidationService.sanitizeInput('Normal text')).toBe('Normal text');
      expect(ValidationService.sanitizeInput('<script>alert(1)</script>')).toBe('');
      expect(ValidationService.sanitizeInput('Text with <b>HTML</b>')).toBe('Text with HTML');
    });

    it('should handle null and undefined', () => {
      expect(ValidationService.sanitizeInput(null)).toBe('');
      expect(ValidationService.sanitizeInput(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(ValidationService.sanitizeInput('  trimmed  ')).toBe('trimmed');
    });
  });

  describe('Validate Size Limits', () => {
    it('should validate string length', () => {
      expect(ValidationService.validateLength('test', 1, 10)).toBe(true);
      expect(ValidationService.validateLength('', 0, 10)).toBe(true);
      expect(ValidationService.validateLength('toolong', 1, 5)).toBe(false);
      expect(ValidationService.validateLength('', 1, 10)).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(ValidationService.validateLength(null, 0, 10)).toBe(false);
      expect(ValidationService.validateLength(undefined, 0, 10)).toBe(false);
      expect(ValidationService.validateLength(123, 0, 10)).toBe(false);
    });
  });
});
