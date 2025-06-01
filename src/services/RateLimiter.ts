// ABOUTME: Service for rate limiting authentication attempts to prevent brute force attacks
// Implements per-user and per-IP rate limiting with configurable thresholds

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

interface IPAttempt {
  count: number;
  windowStart: number;
}

export interface IRateLimiter {
  canAttemptLogin(identifier: string): boolean;
  recordLoginAttempt(identifier: string, success: boolean): void;
  getRemainingAttempts(identifier: string): number;
  getLockoutEndTime(identifier: string): number | null;
  canAttemptFromIP(ipAddress: string): boolean;
  recordIPAttempt(ipAddress: string): void;
  cleanup(): void;
  reset(): void;
}

class RateLimiter implements IRateLimiter {
  // Configuration
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_IP_ATTEMPTS = 10;
  private readonly IP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  // Storage
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private ipAttempts: Map<string, IPAttempt> = new Map();
  private lastCleanup: number = Date.now();

  canAttemptLogin(identifier: string): boolean {
    this.periodicCleanup();

    const attempts = this.loginAttempts.get(identifier);
    if (!attempts) {
      return true;
    }

    // Check if locked out
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      return false;
    }

    // If lockout has expired, reset attempts
    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      this.loginAttempts.delete(identifier);
      return true;
    }

    return attempts.count < this.MAX_LOGIN_ATTEMPTS;
  }

  recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      // Reset attempts on successful login
      this.loginAttempts.delete(identifier);
      return;
    }

    const now = Date.now();
    let attempts = this.loginAttempts.get(identifier);

    if (!attempts) {
      attempts = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
      };
      this.loginAttempts.set(identifier, attempts);
    }

    attempts.count++;
    attempts.lastAttempt = now;

    // Lock the account if max attempts reached
    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      attempts.lockedUntil = now + this.LOCKOUT_DURATION_MS;
    }
  }

  getRemainingAttempts(identifier: string): number {
    const attempts = this.loginAttempts.get(identifier);
    if (!attempts) {
      return this.MAX_LOGIN_ATTEMPTS;
    }

    // If locked out, return 0
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      return 0;
    }

    // If lockout expired, return full attempts
    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      return this.MAX_LOGIN_ATTEMPTS;
    }

    return Math.max(0, this.MAX_LOGIN_ATTEMPTS - attempts.count);
  }

  getLockoutEndTime(identifier: string): number | null {
    const attempts = this.loginAttempts.get(identifier);
    if (!attempts || !attempts.lockedUntil) {
      return null;
    }

    // If lockout has expired, return null
    if (Date.now() >= attempts.lockedUntil) {
      return null;
    }

    return attempts.lockedUntil;
  }

  canAttemptFromIP(ipAddress: string): boolean {
    this.periodicCleanup();

    const ipAttempt = this.ipAttempts.get(ipAddress);
    if (!ipAttempt) {
      return true;
    }

    const now = Date.now();

    // Check if window has expired
    if (now - ipAttempt.windowStart > this.IP_WINDOW_MS) {
      this.ipAttempts.delete(ipAddress);
      return true;
    }

    return ipAttempt.count < this.MAX_IP_ATTEMPTS;
  }

  recordIPAttempt(ipAddress: string): void {
    const now = Date.now();
    let ipAttempt = this.ipAttempts.get(ipAddress);

    if (!ipAttempt || now - ipAttempt.windowStart > this.IP_WINDOW_MS) {
      // Start a new window
      ipAttempt = {
        count: 1,
        windowStart: now,
      };
      this.ipAttempts.set(ipAddress, ipAttempt);
    } else {
      ipAttempt.count++;
    }
  }

  cleanup(): void {
    const now = Date.now();

    // Clean up expired login attempts
    for (const [identifier, attempts] of this.loginAttempts.entries()) {
      if (attempts.lockedUntil && now >= attempts.lockedUntil) {
        this.loginAttempts.delete(identifier);
      } else if (now - attempts.lastAttempt > this.LOCKOUT_DURATION_MS) {
        // Also clean up old attempts that haven't reached lockout
        this.loginAttempts.delete(identifier);
      }
    }

    // Clean up expired IP attempts
    for (const [ipAddress, ipAttempt] of this.ipAttempts.entries()) {
      if (now - ipAttempt.windowStart > this.IP_WINDOW_MS) {
        this.ipAttempts.delete(ipAddress);
      }
    }

    this.lastCleanup = now;
  }

  reset(): void {
    this.loginAttempts.clear();
    this.ipAttempts.clear();
    this.lastCleanup = Date.now();
  }

  private periodicCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL_MS) {
      this.cleanup();
    }
  }
}

export default new RateLimiter();
