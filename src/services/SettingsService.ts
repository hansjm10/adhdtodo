// ABOUTME: Service for managing user settings and preferences
// Handles Pomodoro timer settings, notification preferences, and other app configurations

import AsyncStorage from '@react-native-async-storage/async-storage';

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

class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings = DEFAULT_SETTINGS;

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<AppSettings>) };
      }
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<boolean> {
    try {
      this.settings = settings;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  async updatePomodoroSettings(pomodoro: Partial<PomodoroSettings>): Promise<boolean> {
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
  ): Promise<boolean> {
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

  resetToDefaults(): Promise<boolean> {
    return this.saveSettings(DEFAULT_SETTINGS);
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
