// ABOUTME: Service for validating and sanitizing user input to prevent XSS and injection attacks
// Provides validation methods for emails, user IDs, task data, and other user inputs

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface SanitizationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}

export interface IValidationService {
  validateEmail(email: unknown): boolean;
  validateUserId(userId: unknown): boolean;
  validateTaskData(taskData: unknown): ValidationResult;
  validateNotificationMessage(message: unknown): SanitizationResult;
  validateInviteCode(code: unknown): boolean;
  sanitizeInput(input: unknown): string;
  validateLength(value: unknown, min: number, max: number): boolean;
}

class ValidationService implements IValidationService {
  // Email validation regex (RFC 5322 simplified)
  private readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // UUID validation regex (any version)
  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Alphanumeric only for invite codes
  private readonly INVITE_CODE_REGEX = /^[A-Z0-9]+$/i;

  // Maximum lengths
  private readonly MAX_EMAIL_LENGTH = 254;
  private readonly MAX_TITLE_LENGTH = 200;
  private readonly MAX_DESCRIPTION_LENGTH = 1000;
  private readonly MAX_MESSAGE_LENGTH = 500;
  private readonly MIN_INVITE_CODE_LENGTH = 4;
  private readonly MAX_INVITE_CODE_LENGTH = 12;

  validateEmail(email: unknown): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const trimmed = email.trim().toLowerCase();

    if (trimmed.length === 0 || trimmed.length > this.MAX_EMAIL_LENGTH) {
      return false;
    }

    return this.EMAIL_REGEX.test(trimmed);
  }

  validateUserId(userId: unknown): boolean {
    if (!userId || typeof userId !== 'string') {
      return false;
    }

    return this.UUID_REGEX.test(userId);
  }

  validateTaskData(taskData: unknown): ValidationResult {
    const errors: string[] = [];

    if (!taskData || typeof taskData !== 'object' || taskData === null) {
      return {
        isValid: false,
        errors: ['Invalid task data format'],
      };
    }

    const task = taskData as Record<string, unknown>;

    // Validate title
    if (!task.title || typeof task.title !== 'string') {
      errors.push('Task title is required');
    } else {
      const title = task.title;
      if (title.trim().length === 0) {
        errors.push('Task title is required');
      } else if (title.length > this.MAX_TITLE_LENGTH) {
        errors.push(`Task title must not exceed ${this.MAX_TITLE_LENGTH} characters`);
      }
    }

    // Validate description if provided
    if (task.description !== undefined && task.description !== null) {
      if (typeof task.description !== 'string') {
        errors.push('Task description must be a string');
      } else if ((task.description).length > this.MAX_DESCRIPTION_LENGTH) {
        errors.push(`Task description must not exceed ${this.MAX_DESCRIPTION_LENGTH} characters`);
      }
    }

    // Validate priority if provided
    if (task.priority !== undefined && task.priority !== null) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(task.priority as string)) {
        errors.push('Invalid priority value');
      }
    }

    // Validate category if provided
    if (task.category !== undefined && task.category !== null) {
      const validCategories = ['work', 'personal', 'health', 'finance', 'education', 'other'];
      if (!validCategories.includes(task.category as string)) {
        errors.push('Invalid category value');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateNotificationMessage(message: unknown): SanitizationResult {
    if (message === '' || (typeof message === 'string' && message.trim() === '')) {
      return {
        isValid: false,
        error: 'Message cannot be empty',
      };
    }

    if (!message || typeof message !== 'string') {
      return {
        isValid: false,
        error: 'Message must be a string',
      };
    }

    const trimmed = message.trim();

    if (trimmed.length > this.MAX_MESSAGE_LENGTH) {
      return {
        isValid: false,
        error: `Message must not exceed ${this.MAX_MESSAGE_LENGTH} characters`,
      };
    }

    // Sanitize the message to prevent XSS
    const sanitized = this.sanitizeInput(trimmed);

    return {
      isValid: true,
      sanitized,
    };
  }

  validateInviteCode(code: unknown): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    const trimmed = code.trim();

    if (
      trimmed.length < this.MIN_INVITE_CODE_LENGTH ||
      trimmed.length > this.MAX_INVITE_CODE_LENGTH
    ) {
      return false;
    }

    return this.INVITE_CODE_REGEX.test(trimmed);
  }

  sanitizeInput(input: unknown): string {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove all HTML tags and script content
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Remove any remaining potentially dangerous characters
    sanitized = sanitized.replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');

    return sanitized;
  }

  validateLength(value: unknown, min: number, max: number): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const length = value.length;
    return length >= min && length <= max;
  }
}

export default new ValidationService();
