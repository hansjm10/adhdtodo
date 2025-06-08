// ABOUTME: Service for managing user settings and preferences
// Handles Pomodoro timer settings, notification preferences, and other app configurations

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseService } from './BaseService';
import type { Result } from '../types/common.types';

export interface PomodoroSettings {
  workDuration: number; // in minutes (5-90)
  breakDuration: number; // in minutes (1-30)
  longBreakDuration: number; // in minutes (10-60)
  longBreakAfter: number; // number of sessions before long break
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  breakReminders: boolean;
  reminderInterval: number; // in minutes
}

export interface AppSettings {
  pomodoro: PomodoroSettings;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  taskLimit: number; // number of visible tasks (3-10)
  celebrationAnimations: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  pomodoro: {
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    longBreakAfter: 4,
    autoStartBreaks: false,
    autoStartWork: false,
    breakReminders: true,
    reminderInterval: 45,
  },
  soundEnabled: false,
  hapticEnabled: true,
  taskLimit: 5,
  celebrationAnimations: true,
};

const SETTINGS_KEY = '@adhd_todo_settings';

class SettingsService extends BaseService {
  private static instance: SettingsService;
  private settings: AppSettings = DEFAULT_SETTINGS;

  private constructor() {
    super('SettingsService');
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async loadSettings(): Promise<Result<AppSettings>> {
    const result = await this.wrapAsync(
      'loadSettings',
      async () => {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          this.settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<AppSettings>) };
        }
        return this.settings;
      },
      { storageKey: SETTINGS_KEY },
    );

    return result;
  }

  async saveSettings(settings: AppSettings): Promise<Result<boolean>> {
    const result = await this.wrapAsync(
      'saveSettings',
      async () => {
        this.settings = settings;
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
      },
      { storageKey: SETTINGS_KEY },
    );

    return result;
  }

  async updatePomodoroSettings(pomodoro: Partial<PomodoroSettings>): Promise<Result<boolean>> {
    const updated = {
      ...this.settings,
      pomodoro: {
        ...this.settings.pomodoro,
        ...pomodoro,
      },
    };
    return this.saveSettings(updated);
  }

  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<Result<boolean>> {
    const updated = {
      ...this.settings,
      [key]: value,
    };
    return this.saveSettings(updated);
  }

  getSettings(): AppSettings {
    return this.settings;
  }

  getPomodoroSettings(): PomodoroSettings {
    return this.settings.pomodoro;
  }

  resetToDefaults(): Promise<Result<boolean>> {
    return this.saveSettings(DEFAULT_SETTINGS);
  }

  // Convenience methods for backward compatibility
  // These methods provide fallback values for easier migration

  async loadSettingsCompat(): Promise<AppSettings> {
    const result = await this.loadSettings();
    if (result.success && result.data) {
      return result.data;
    }
    return DEFAULT_SETTINGS;
  }

  async saveSettingsCompat(settings: AppSettings): Promise<boolean> {
    const result = await this.saveSettings(settings);
    return result.success && result.data ? result.data : false;
  }

  async updatePomodoroSettingsCompat(pomodoro: Partial<PomodoroSettings>): Promise<boolean> {
    const result = await this.updatePomodoroSettings(pomodoro);
    return result.success && result.data ? result.data : false;
  }

  async updateSettingCompat<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<boolean> {
    const result = await this.updateSetting(key, value);
    return result.success && result.data ? result.data : false;
  }

  async resetToDefaultsCompat(): Promise<boolean> {
    const result = await this.resetToDefaults();
    return result.success && result.data ? result.data : false;
  }

  // Validation helpers
  static validateWorkDuration(minutes: number): boolean {
    return minutes >= 5 && minutes <= 90;
  }

  static validateBreakDuration(minutes: number): boolean {
    return minutes >= 1 && minutes <= 30;
  }

  static validateLongBreakDuration(minutes: number): boolean {
    return minutes >= 10 && minutes <= 60;
  }

  static validateTaskLimit(limit: number): boolean {
    return limit >= 3 && limit <= 10;
  }

  // Test helper to reset singleton instance
  static resetInstance(): void {
    if (process.env.NODE_ENV === 'test') {
      // Force reset for testing purposes

      // @ts-expect-error - Test helper for resetting singleton
      SettingsService.instance = null;
    }
  }
}

// Export the class for testing
export { SettingsService };

// Export the singleton instance as default
export default SettingsService.getInstance();
