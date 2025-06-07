// ABOUTME: Consolidated auth-related type definitions
// Eliminates duplication across AuthService, SupabaseAuthService, and AuthServiceWrapper

import type { User } from './user.types';

/**
 * User type without sensitive authentication fields
 */
export type AuthUser = Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'>;

/**
 * Result of an authentication operation (login, register, etc.)
 * Note: Maintains backward compatibility with existing code
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** User data if authentication succeeded */
  user?: AuthUser;
  /** JWT or session token for authenticated requests */
  token?: string;
  /** Error message if authentication failed */
  error?: string;
}

/**
 * Result of password validation
 */
export interface PasswordValidationResult {
  /** Whether the password meets all requirements */
  isValid: boolean;
  /** List of validation errors if validation failed */
  errors: string[];
}

/**
 * Result of session verification
 */
export interface SessionVerificationResult {
  /** Whether the session is valid */
  isValid: boolean;
  /** Reason for invalid session (if applicable) */
  reason?: string;
  /** User data if session is valid */
  user?: AuthUser;
}

/**
 * Result of password reset operation
 * Note: Maintains backward compatibility with existing code
 */
export interface PasswordResetResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Success or status message */
  message?: string;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Result of biometric authentication
 * Note: Different structure from regular AuthResult
 */
export interface BiometricAuthResult {
  /** Whether biometric authentication succeeded */
  success: boolean;
  /** User ID if authentication succeeded */
  userId?: string;
  /** Error message if authentication failed */
  error?: string;
  /** Warning message for non-critical issues */
  warning?: string;
}

/**
 * Authentication method types
 */
export type AuthMethod = 'password' | 'biometric' | 'pin' | 'supabase';

/**
 * Session status types
 */
export type SessionStatus = 'active' | 'expired' | 'invalid' | 'revoked';

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'AUTH_USER_ALREADY_EXISTS',
  SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  SESSION_INVALID = 'AUTH_SESSION_INVALID',
  PASSWORD_TOO_WEAK = 'AUTH_PASSWORD_TOO_WEAK',
  BIOMETRIC_NOT_AVAILABLE = 'AUTH_BIOMETRIC_NOT_AVAILABLE',
  BIOMETRIC_NOT_ENROLLED = 'AUTH_BIOMETRIC_NOT_ENROLLED',
  BIOMETRIC_FAILED = 'AUTH_BIOMETRIC_FAILED',
  NETWORK_ERROR = 'AUTH_NETWORK_ERROR',
  UNKNOWN_ERROR = 'AUTH_UNKNOWN_ERROR',
}
