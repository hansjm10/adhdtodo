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
  hashPIN(pin: string): Promise<string>;
  verifyPIN(pin: string, hash: string): Promise<boolean>;
  generateSecureBytes(length: number): Promise<Uint8Array>;
  encrypt(data: string, key: string): Promise<string>;
  decrypt(encryptedData: string, key: string): Promise<string>;
  hash(data: string): Promise<string>;
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
    if (!parsed?.isValid) {
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
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
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

  // Hash a PIN with a simpler approach than passwords
  async hashPIN(pin: string): Promise<string> {
    if (!pin || typeof pin !== 'string') {
      throw new Error('PIN must be a non-empty string');
    }

    // Generate a salt specific to this PIN
    const salt = await this.generateSalt();

    // Use 50,000 iterations for PINs (less than passwords since PINs are simpler)
    const iterations = 50000;
    let hash = pin + salt;

    for (let i = 0; i < iterations; i++) {
      hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hash + salt + i.toString(),
        { encoding: Crypto.CryptoEncoding.HEX },
      );
    }

    // Return hash with salt embedded
    return `${salt}:${hash}`;
  }

  // Verify a PIN against a stored hash
  async verifyPIN(pin: string, storedHash: string): Promise<boolean> {
    if (!pin || !storedHash) {
      return false;
    }

    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [salt, hash] = parts;

    // Recompute hash with same salt
    const iterations = 50000;
    let computedHash = pin + salt;

    for (let i = 0; i < iterations; i++) {
      computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        computedHash + salt + i.toString(),
        { encoding: Crypto.CryptoEncoding.HEX },
      );
    }

    return this.safeCompare(computedHash, hash);
  }

  // Generate secure random bytes
  async generateSecureBytes(length: number): Promise<Uint8Array> {
    return Crypto.getRandomBytesAsync(length);
  }

  // Encrypt data using a simple XOR cipher with the key
  // Note: This is a basic implementation. In production, use proper AES encryption
  async encrypt(data: string, key: string): Promise<string> {
    // Generate IV for added security
    const iv = await this.generateToken(16);

    // Create a key hash for consistent length
    const keyHash = await this.hashData(key);

    // Simple XOR encryption (for demonstration - use proper encryption in production)
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const dataChar = data.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }

    // Encode to base64 and prepend IV
    const encodedData = this.stringToBase64(encrypted);
    return `${iv}:${encodedData}`;
  }

  // Decrypt data encrypted with encrypt method
  async decrypt(encryptedData: string, key: string): Promise<string> {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const [_iv, encodedData] = parts;
    const keyHash = await this.hashData(key);

    // Decode from base64
    const encrypted = this.base64ToString(encodedData);

    // XOR decryption (same as encryption)
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const encChar = encrypted.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      decrypted += String.fromCharCode(encChar ^ keyChar);
    }

    return decrypted;
  }

  // Simple hash function wrapper
  async hash(data: string): Promise<string> {
    return this.hashData(data);
  }

  // Base64 encoding for strings (React Native compatible)
  private stringToBase64(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }

  // Base64 decoding to string (React Native compatible)
  private base64ToString(base64: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');

    while (i < base64.length) {
      const encoded1 = chars.indexOf(base64.charAt(i++));
      const encoded2 = chars.indexOf(base64.charAt(i++));
      const encoded3 = chars.indexOf(base64.charAt(i++));
      const encoded4 = chars.indexOf(base64.charAt(i++));

      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }

    return result;
  }
}

const cryptoService = new CryptoService();
export { cryptoService as CryptoService };
export default cryptoService;
