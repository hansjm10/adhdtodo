// ABOUTME: Service for cryptographic operations including password hashing and token generation
// Uses expo-crypto for secure password hashing and random token generation

import * as Crypto from 'expo-crypto';

interface SessionTokenInfo {
  token: string;
  timestamp: number;
  isValid: boolean;
}

export interface ICryptoService {
  generateSalt(): Promise<string>;
  hashPassword(password: string, salt: string): Promise<string>;
  verifyPassword(password: string, hash: string, salt: string): Promise<boolean>;
  generateToken(length?: number): Promise<string>;
  generateSessionToken(): Promise<string>;
  parseSessionToken(token: string): SessionTokenInfo | null;
  isTokenExpired(token: string, maxAgeMs?: number): boolean;
  hashData(data: string): Promise<string>;
  safeCompare(a: string, b: string): boolean;
}

class CryptoService implements ICryptoService {
  // Generate a salt for password hashing
  async generateSalt(): Promise<string> {
    // Generate 16 random bytes for salt
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return this.bytesToHex(randomBytes);
  }

  // Hash a password with salt using multiple rounds of SHA-256
  // Since expo-crypto doesn't support PBKDF2, we implement a similar approach
  async hashPassword(password: string, salt: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt must be a non-empty string');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 200) {
      throw new Error('Password must not exceed 200 characters');
    }

    // Check for at least one number and one special character
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    if (!hasNumber || !hasSpecial) {
      throw new Error('Password must contain at least one number and one special character');
    }

    // Use OWASP recommended 100,000 iterations for password hashing
    const iterations = 100000;

    let hash = password + salt;

    // Apply SHA-256 multiple times
    for (let i = 0; i < iterations; i++) {
      hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hash + salt + i.toString(),
        { encoding: Crypto.CryptoEncoding.HEX },
      );
    }

    return hash;
  }

  // Verify a password against a hash
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password, salt);
    return this.safeCompare(computedHash, hash);
  }

  // Generate a secure random token
  async generateToken(length: number = 32): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    return this.bytesToHex(randomBytes);
  }

  // Generate a session token with timestamp
  async generateSessionToken(): Promise<string> {
    const token = await this.generateToken(32);
    const timestamp = Date.now();
    return `${token}.${timestamp}`;
  }

  // Validate session token format and extract timestamp
  parseSessionToken(token: string): SessionTokenInfo | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [tokenPart, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return null;
    }

    return {
      token: tokenPart,
      timestamp,
      isValid: true,
    };
  }

  // Check if a session token is expired (default 7 days for security)
  isTokenExpired(token: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    const parsed = this.parseSessionToken(token);
    if (!parsed || !parsed.isValid) {
      return true;
    }

    const now = Date.now();
    const age = now - parsed.timestamp;
    return age > maxAgeMs;
  }

  // Helper function to convert bytes to hex string
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper function to convert hex string to bytes
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Hash sensitive data for storage (like security questions)
  async hashData(data: string): Promise<string> {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data, {
      encoding: Crypto.CryptoEncoding.HEX,
    });

    return hash;
  }

  // Constant-time string comparison to prevent timing attacks
  safeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    // Always compare same-length strings to avoid timing differences
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

export default new CryptoService();
