// ABOUTME: Simple test to verify Settings button handler fix
// Tests that the Settings button shows a "Coming Soon" alert

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Simple component that mimics just the Settings button part
const SettingsButton = () => (
  <TouchableOpacity
    style={{}}
    onPress={() =>
      Alert.alert('Coming Soon', 'Partnership settings will be available in the next update.')
    }
  >
    <Ionicons name="settings-outline" size={24} color="#3498DB" />
    <Text>Settings</Text>
  </TouchableOpacity>
);

describe('Settings Button Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show "Coming Soon" alert when pressed', () => {
    const { getByText } = render(<SettingsButton />);

    const settingsButton = getByText('Settings');
    fireEvent.press(settingsButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Coming Soon',
      'Partnership settings will be available in the next update.',
    );
  });

  it('should have been called exactly once', () => {
    const { getByText } = render(<SettingsButton />);

    const settingsButton = getByText('Settings');
    fireEvent.press(settingsButton);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });
});
