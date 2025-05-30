// ABOUTME: Service for cryptographic operations including password hashing and token generation
// Uses expo-crypto for secure password hashing and random token generation

import * as Crypto from 'expo-crypto';

class CryptoService {
  // Generate a salt for password hashing
  async generateSalt() {
    // Generate 16 random bytes for salt
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return this.bytesToHex(randomBytes);
  }

  // Hash a password with salt using multiple rounds of SHA-256
  // Since expo-crypto doesn't support PBKDF2, we implement a similar approach
  async hashPassword(password, salt) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt must be a non-empty string');
    }

    // Use multiple iterations of SHA-256 to simulate PBKDF2-like key stretching
    // This is not as secure as proper PBKDF2 but provides reasonable protection
    const iterations = 10000; // Reduced from 100k due to performance constraints

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
  async verifyPassword(password, hash, salt) {
    const computedHash = await this.hashPassword(password, salt);
    return computedHash === hash;
  }

  // Generate a secure random token
  async generateToken(length = 32) {
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    return this.bytesToHex(randomBytes);
  }

  // Generate a session token with timestamp
  async generateSessionToken() {
    const token = await this.generateToken(32);
    const timestamp = Date.now();
    return `${token}.${timestamp}`;
  }

  // Validate session token format and extract timestamp
  parseSessionToken(token) {
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

  // Check if a session token is expired (default 30 days)
  isTokenExpired(token, maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const parsed = this.parseSessionToken(token);
    if (!parsed || !parsed.isValid) {
      return true;
    }

    const now = Date.now();
    const age = now - parsed.timestamp;
    return age > maxAgeMs;
  }

  // Helper function to convert bytes to hex string
  bytesToHex(bytes) {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper function to convert hex string to bytes
  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Hash sensitive data for storage (like security questions)
  async hashData(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data, {
      encoding: Crypto.CryptoEncoding.HEX,
    });

    return hash;
  }
}

export default new CryptoService();
