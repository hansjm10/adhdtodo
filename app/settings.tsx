// ABOUTME: Settings screen for configuring app preferences
// Allows users to customize Pomodoro timer durations and other settings

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AppSettings } from '../src/services/SettingsService';
import settingsService, { SettingsService } from '../src/services/SettingsService';
import { colors, typography, spacing, borderRadius } from '../src/styles';

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
    const result = await settingsService.loadSettings();
    if (result.success && result.data) {
      setSettings(result.data);
    }
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity
            onPress={() => {
              handleSave().catch((error) => {
                if (global.__DEV__) {
                  console.error('Failed to save settings:', error);
                }
              });
            }}
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            disabled={!hasChanges}
          >
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pomodoro Timer</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Work Duration</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={settings.pomodoro.workDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('workDuration', value);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
            </View>
            <Text style={styles.hint}>5-90 minutes</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Break Duration</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={settings.pomodoro.breakDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('breakDuration', value);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
            </View>
            <Text style={styles.hint}>1-30 minutes</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Long Break Duration</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={settings.pomodoro.longBreakDuration.toString()}
                  onChangeText={(value) => {
                    updatePomodoroDuration('longBreakDuration', value);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
            </View>
            <Text style={styles.hint}>10-60 minutes</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Long Break After</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
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
                  keyboardType="numeric"
                  maxLength={1}
                />
                <Text style={styles.inputSuffix}>sessions</Text>
              </View>
            </View>
            <Text style={styles.hint}>1-10 sessions</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={() => {
                  toggleSetting('soundEnabled');
                }}
                trackColor={{ false: colors.border, true: colors.semantic.success }}
                thumbColor={settings.soundEnabled ? colors.background : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Switch
                value={settings.hapticEnabled}
                onValueChange={() => {
                  toggleSetting('hapticEnabled');
                }}
                trackColor={{ false: colors.border, true: colors.semantic.success }}
                thumbColor={settings.hapticEnabled ? colors.background : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Celebration Animations</Text>
              <Switch
                value={settings.celebrationAnimations}
                onValueChange={() => {
                  toggleSetting('celebrationAnimations');
                }}
                trackColor={{ false: colors.border, true: colors.semantic.success }}
                thumbColor={settings.celebrationAnimations ? colors.background : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Visible Tasks Limit</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
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
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputSuffix}>tasks</Text>
              </View>
            </View>
            <Text style={styles.hint}>3-10 tasks</Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
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
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  inputSuffix: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  resetButton: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.bodyMedium,
    color: colors.background,
    fontWeight: '600',
  },
});

export default SettingsScreen;
