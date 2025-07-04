// ABOUTME: Tests for SettingsService
// Verifies settings storage, retrieval, and validation functionality

import AsyncStorage from '@react-native-async-storage/async-storage';
import settingsService, { SettingsService } from '../SettingsService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for each test
    SettingsService.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = SettingsService.getInstance();
      const instance2 = SettingsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from AsyncStorage', async () => {
      const storedSettings = {
        pomodoro: {
          workDuration: 30,
          breakDuration: 10,
        },
        soundEnabled: true,
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSettings));

      const result = await settingsService.loadSettings();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@adhd_todo_settings');
      expect(result.success).toBe(true);
      expect(result.data.pomodoro.workDuration).toBe(30);
      expect(result.data.soundEnabled).toBe(true);
    });

    it('should return default settings if nothing is stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const freshService = SettingsService.getInstance();
      const result = await freshService.loadSettings();

      expect(result.success).toBe(true);
      expect(result.data.pomodoro.workDuration).toBe(25);
      expect(result.data.pomodoro.breakDuration).toBe(5);
      expect(result.data.soundEnabled).toBe(false);
    });

    it('should handle errors and return error result', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await settingsService.loadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('SETTINGSSERVICE_LOADSETTINGS_ERROR');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to AsyncStorage', async () => {
      const newSettings = {
        pomodoro: {
          workDuration: 45,
          breakDuration: 15,
          longBreakDuration: 30,
          longBreakAfter: 3,
          autoStartBreaks: true,
          autoStartWork: false,
          breakReminders: true,
          reminderInterval: 60,
        },
        soundEnabled: true,
        hapticEnabled: false,
        taskLimit: 7,
        celebrationAnimations: true,
      };

      AsyncStorage.setItem.mockResolvedValue();

      const result = await settingsService.saveSettings(newSettings);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@adhd_todo_settings',
        JSON.stringify(newSettings),
      );
    });

    it('should handle save errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await settingsService.saveSettings({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('SETTINGSSERVICE_SAVESETTINGS_ERROR');
    });
  });

  describe('updatePomodoroSettings', () => {
    it('should update only pomodoro settings', async () => {
      // Create a fresh instance for this test
      const freshService = SettingsService.getInstance();

      // Load initial settings
      AsyncStorage.getItem.mockResolvedValue(null);
      await freshService.loadSettings();

      AsyncStorage.setItem.mockResolvedValue();

      const result = await freshService.updatePomodoroSettings({
        workDuration: 50,
        breakDuration: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const savedSettings = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedSettings.pomodoro.workDuration).toBe(50);
      expect(savedSettings.pomodoro.breakDuration).toBe(10);
      expect(savedSettings.pomodoro.longBreakDuration).toBe(15); // Default unchanged
    });
  });

  describe('updateSetting', () => {
    it('should update a specific setting', async () => {
      // Load initial settings
      AsyncStorage.getItem.mockResolvedValue(null);
      await settingsService.loadSettings();

      AsyncStorage.setItem.mockResolvedValue();

      const result = await settingsService.updateSetting('soundEnabled', true);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const savedSettings = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedSettings.soundEnabled).toBe(true);
    });
  });

  describe('getSettings and getPomodoroSettings', () => {
    it('should return current settings', async () => {
      // Create a fresh instance
      const freshService = SettingsService.getInstance();

      AsyncStorage.getItem.mockResolvedValue(null);
      await freshService.loadSettings();

      const settings = freshService.getSettings();
      const pomodoroSettings = freshService.getPomodoroSettings();

      expect(settings).toBeDefined();
      expect(pomodoroSettings.workDuration).toBe(25);
      expect(pomodoroSettings.breakDuration).toBe(5);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await settingsService.resetToDefaults();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const savedSettings = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedSettings.pomodoro.workDuration).toBe(25);
      expect(savedSettings.soundEnabled).toBe(false);
      expect(savedSettings.taskLimit).toBe(5);
    });
  });

  describe('validation helpers', () => {
    it('should validate work duration', () => {
      expect(SettingsService.validateWorkDuration(25)).toBe(true);
      expect(SettingsService.validateWorkDuration(5)).toBe(true);
      expect(SettingsService.validateWorkDuration(90)).toBe(true);
      expect(SettingsService.validateWorkDuration(4)).toBe(false);
      expect(SettingsService.validateWorkDuration(91)).toBe(false);
    });

    it('should validate break duration', () => {
      expect(SettingsService.validateBreakDuration(5)).toBe(true);
      expect(SettingsService.validateBreakDuration(1)).toBe(true);
      expect(SettingsService.validateBreakDuration(30)).toBe(true);
      expect(SettingsService.validateBreakDuration(0)).toBe(false);
      expect(SettingsService.validateBreakDuration(31)).toBe(false);
    });

    it('should validate long break duration', () => {
      expect(SettingsService.validateLongBreakDuration(15)).toBe(true);
      expect(SettingsService.validateLongBreakDuration(10)).toBe(true);
      expect(SettingsService.validateLongBreakDuration(60)).toBe(true);
      expect(SettingsService.validateLongBreakDuration(9)).toBe(false);
      expect(SettingsService.validateLongBreakDuration(61)).toBe(false);
    });

    it('should validate task limit', () => {
      expect(SettingsService.validateTaskLimit(5)).toBe(true);
      expect(SettingsService.validateTaskLimit(3)).toBe(true);
      expect(SettingsService.validateTaskLimit(10)).toBe(true);
      expect(SettingsService.validateTaskLimit(2)).toBe(false);
      expect(SettingsService.validateTaskLimit(11)).toBe(false);
    });
  });

  describe('compatibility methods', () => {
    it('should load settings with backward compatibility', async () => {
      const storedSettings = {
        pomodoro: {
          workDuration: 30,
          breakDuration: 10,
        },
        soundEnabled: true,
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSettings));

      const settings = await settingsService.loadSettingsCompat();

      expect(settings.pomodoro.workDuration).toBe(30);
      expect(settings.soundEnabled).toBe(true);
    });

    it('should return defaults on error with loadSettingsCompat', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const settings = await settingsService.loadSettingsCompat();

      expect(settings.pomodoro.workDuration).toBe(25);
      expect(settings.soundEnabled).toBe(false);
    });

    it('should save settings with backward compatibility', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await settingsService.saveSettingsCompat({
        pomodoro: {
          workDuration: 45,
          breakDuration: 15,
          longBreakDuration: 30,
          longBreakAfter: 3,
          autoStartBreaks: true,
          autoStartWork: false,
          breakReminders: true,
          reminderInterval: 60,
        },
        soundEnabled: true,
        hapticEnabled: false,
        taskLimit: 7,
        celebrationAnimations: true,
      });

      expect(result).toBe(true);
    });

    it('should return false on save error with saveSettingsCompat', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await settingsService.saveSettingsCompat({});

      expect(result).toBe(false);
    });
  });
});
