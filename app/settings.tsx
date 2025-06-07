// ABOUTME: Mac-inspired settings screen using NativeWind
// Clean configuration interface for app preferences and Pomodoro timer

import React, { useState, useEffect } from 'react';
import {
  View,
  Switch,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ThemedContainer,
  ThemedText,
  ThemedCard,
  ThemedInput,
  ThemedButton,
  ThemedIcon,
} from '../src/components/themed';
import type { AppSettings } from '../src/services/SettingsService';
import settingsService, { SettingsService } from '../src/services/SettingsService';

const SettingsScreen = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings().catch((error) => {
      if (global.__DEV__) {
        console.error('Failed to load settings:', error);
      }
    });
  }, []);

  const loadSettings = async () => {
    const loaded = await settingsService.loadSettings();
    setSettings(loaded);
  };

  const handleSave = async () => {
    if (!settings) return;

    const success = await settingsService.saveSettings(settings);
    if (success) {
      setHasChanges(false);
      Alert.alert('Success', 'Settings saved successfully!');
    } else {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updatePomodoroDuration = (field: keyof AppSettings['pomodoro'], value: string) => {
    const numValue = parseInt(value, 10) || 0;

    // Validate based on field
    let isValid = true;
    switch (field) {
      case 'workDuration':
        isValid = SettingsService.validateWorkDuration(numValue);
        break;
      case 'breakDuration':
        isValid = SettingsService.validateBreakDuration(numValue);
        break;
      case 'longBreakDuration':
        isValid = SettingsService.validateLongBreakDuration(numValue);
        break;
    }

    if (isValid || value === '') {
      setSettings({
        ...settings!,
        pomodoro: {
          ...settings!.pomodoro,
          [field]: value === '' ? 0 : numValue,
        },
      });
      setHasChanges(true);
    }
  };

  const toggleSetting = (key: keyof AppSettings) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [key]: !settings[key],
    });
    setHasChanges(true);
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Unsaved Changes', 'You have unsaved changes. Do you want to save them?', [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
        {
          text: 'Save',
          onPress: (): void => {
            handleSave()
              .then(() => {
                router.back();
              })
              .catch((error) => {
                if (global.__DEV__) {
                  console.error('Failed to save settings:', error);
                }
              });
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  if (!settings) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <ThemedText variant="body" color="secondary">
          Loading settings...
        </ThemedText>
      </ThemedContainer>
    );
  }

  return (
    <ThemedContainer variant="screen" safeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <ThemedIcon name="arrow-back" size="md" color="primary" />
          </TouchableOpacity>
          <ThemedText variant="h3" color="primary">
            Settings
          </ThemedText>
          <TouchableOpacity
            onPress={() => {
              handleSave().catch((error) => {
                if (global.__DEV__) {
                  console.error('Failed to save settings:', error);
                }
              });
            }}
            className={`px-4 py-2${!hasChanges ? ' opacity-50' : ''}`}
            disabled={!hasChanges}
          >
            <ThemedText
              variant="body"
              color={hasChanges ? 'primary' : 'tertiary'}
              weight="semibold"
            >
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Pomodoro Settings */}
          <View className="mb-4">
            <ThemedCard variant="elevated" spacing="medium">
              <ThemedText variant="h4" color="primary" className="mb-4">
                Pomodoro Timer
              </ThemedText>

              <View className="gap-4">
                <SettingRow
                  label="Work Duration"
                  value={settings.pomodoro.workDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('workDuration', value);
                  }}
                  suffix="min"
                  hint="5-90 minutes"
                />

                <SettingRow
                  label="Break Duration"
                  value={settings.pomodoro.breakDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('breakDuration', value);
                  }}
                  suffix="min"
                  hint="1-30 minutes"
                />

                <SettingRow
                  label="Long Break Duration"
                  value={settings.pomodoro.longBreakDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('longBreakDuration', value);
                  }}
                  suffix="min"
                  hint="10-60 minutes"
                />

                <SettingRow
                  label="Long Break After"
                  value={settings.pomodoro.longBreakAfter.toString()}
                  onChangeText={(value) => {
                    const num = parseInt(value, 10) || 0;
                    if ((num >= 1 && num <= 10) || value === '') {
                      setSettings({
                        ...settings,
                        pomodoro: {
                          ...settings.pomodoro,
                          longBreakAfter: value === '' ? 0 : num,
                        },
                      });
                      setHasChanges(true);
                    }
                  }}
                  suffix="sessions"
                  hint="1-10 sessions"
                  maxLength={1}
                />
              </View>
            </ThemedCard>
          </View>

          {/* General Settings */}
          <View className="mb-4">
            <ThemedCard variant="elevated" spacing="medium">
              <ThemedText variant="h4" color="primary" className="mb-4">
                General
              </ThemedText>

              <View className="gap-4">
                <SwitchRow
                  label="Sound Effects"
                  value={settings.soundEnabled}
                  onValueChange={() => {
                    toggleSetting('soundEnabled');
                  }}
                />

                <SwitchRow
                  label="Haptic Feedback"
                  value={settings.hapticEnabled}
                  onValueChange={() => {
                    toggleSetting('hapticEnabled');
                  }}
                />

                <SwitchRow
                  label="Celebration Animations"
                  value={settings.celebrationAnimations}
                  onValueChange={() => {
                    toggleSetting('celebrationAnimations');
                  }}
                />

                <SettingRow
                  label="Visible Tasks Limit"
                  value={settings.taskLimit.toString()}
                  onChangeText={(value) => {
                    const num = parseInt(value, 10) || 0;
                    if (SettingsService.validateTaskLimit(num) || value === '') {
                      setSettings({
                        ...settings,
                        taskLimit: value === '' ? 0 : num,
                      });
                      setHasChanges(true);
                    }
                  }}
                  suffix="tasks"
                  hint="3-10 tasks"
                />
              </View>
            </ThemedCard>
          </View>

          {/* Reset Button */}
          <View className="m-4">
            <ThemedButton
              label="Reset to Defaults"
              variant="danger"
              size="large"
              fullWidth
              onPress={() => {
                Alert.alert(
                  'Reset Settings',
                  'Are you sure you want to reset all settings to defaults?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: (): void => {
                        settingsService
                          .resetToDefaults()
                          .then(() => loadSettings())
                          .then(() => {
                            setHasChanges(false);
                            Alert.alert('Success', 'Settings reset to defaults');
                          })
                          .catch((error) => {
                            if (global.__DEV__) {
                              console.error('Failed to reset settings:', error);
                            }
                            Alert.alert('Error', 'Failed to reset settings');
                          });
                      },
                    },
                  ],
                );
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedContainer>
  );
};

// Helper Components
interface SettingRowProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix: string;
  hint: string;
  maxLength?: number;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  value,
  onChangeText,
  suffix,
  hint,
  maxLength = 2,
}) => (
  <View>
    <View className="flex-row justify-between items-center mb-2">
      <ThemedText variant="body" color="primary" className="flex-1">
        {label}
      </ThemedText>
      <View className="flex-row items-center">
        <ThemedInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          maxLength={maxLength}
          className="w-[60px]"
          inputClassName="text-center"
        />
        <ThemedText variant="body" color="secondary" className="ml-2">
          {suffix}
        </ThemedText>
      </View>
    </View>
    <ThemedText variant="caption" color="tertiary">
      {hint}
    </ThemedText>
  </View>
);

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: () => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({ label, value, onValueChange }) => (
  <View className="flex-row justify-between items-center">
    <ThemedText variant="body" color="primary" className="flex-1">
      {label}
    </ThemedText>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e5e7eb', true: '#22c55e' }}
      thumbColor={value ? '#ffffff' : '#f4f3f4'}
    />
  </View>
);

export default SettingsScreen;
