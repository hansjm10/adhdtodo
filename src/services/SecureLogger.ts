// ABOUTME: Secure logging service that prevents sensitive data exposure in logs
// Provides safe logging methods that sanitize sensitive information

/* global __DEV__ */

export interface ISecureLogger {
  error(message: string, metadata?: { code?: string; context?: string }): void;
  warn(message: string, metadata?: { code?: string; context?: string }): void;
  info(message: string, metadata?: { code?: string; context?: string }): void;
  debug(message: string, metadata?: { code?: string; context?: string }): void;
}

class SecureLogger implements ISecureLogger {
  private isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

  // Error logging with sanitized output
  error(message: string, metadata?: { code?: string; context?: string }): void {
    if (this.isDevelopment) {
      // In development, log with code but no sensitive details
      const safeMessage = this.sanitizeMessage(message);
      console.error(`[ERROR] ${safeMessage}`, metadata?.code ? `Code: ${metadata.code}` : '');
    } else {
      // In production, only log error codes
      if (metadata?.code) {
        console.error(`[ERROR] Operation failed. Code: ${metadata.code}`);
      }
    }
  }

  // Warning logging
  warn(message: string, metadata?: { code?: string; context?: string }): void {
    if (this.isDevelopment) {
      const safeMessage = this.sanitizeMessage(message);
      console.warn(`[WARN] ${safeMessage}`, metadata?.code ? `Code: ${metadata.code}` : '');
    }
  }

  // Info logging
  info(message: string, metadata?: { code?: string; context?: string }): void {
    if (this.isDevelopment) {
      const safeMessage = this.sanitizeMessage(message);
      console.info(`[INFO] ${safeMessage}`, metadata?.code ? `Code: ${metadata.code}` : '');
    }
  }

  // Debug logging (only in development)
  debug(message: string, metadata?: { code?: string; context?: string }): void {
    if (this.isDevelopment) {
      const safeMessage = this.sanitizeMessage(message);
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${safeMessage}`, metadata?.code ? `Code: ${metadata.code}` : '');
    }
  }

  // Sanitize messages to remove sensitive data
  private sanitizeMessage(message: string): string {
    // Remove email addresses
    let sanitized = message.replace(
      /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
      '[EMAIL]',
    );

    // Remove potential passwords (any string after 'password:' or similar)
    sanitized = sanitized.replace(/password['":\s]*[^'"\s,}]+/gi, 'password: [REDACTED]');

    // Remove token patterns
    sanitized = sanitized.replace(/token['":\s]*[^'"\s,}]+/gi, 'token: [REDACTED]');

    // Remove session IDs
    sanitized = sanitized.replace(/session['":\s]*[^'"\s,}]+/gi, 'session: [REDACTED]');

    // Remove user IDs that look like UUIDs
    sanitized = sanitized.replace(
      /user['":\s]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      'user: [USER_ID]',
    );

    // Remove API keys or similar long alphanumeric strings
    sanitized = sanitized.replace(/key['":\s]*[a-zA-Z0-9]{20,}/gi, 'key: [REDACTED]');

    return sanitized;
  }
}

export default new SecureLogger();
