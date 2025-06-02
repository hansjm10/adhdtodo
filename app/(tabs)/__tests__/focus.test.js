// ABOUTME: Tests for FocusModeScreen with Expo Router
// Verifies that the screen properly renders the FocusModeContainer

import React from 'react';
import { render } from '@testing-library/react-native';
import FocusModeScreen from '../focus';
import FocusModeContainer from '../../../src/components/FocusModeContainer';

// Mock the FocusModeContainer since we test its UI separately
jest.mock('../../../src/components/FocusModeContainer', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="focus-mode-container">
        <Text>FocusModeContainer</Text>
      </View>
    )),
  };
});

describe('FocusModeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render FocusModeContainer', () => {
    const { getByTestId } = render(<FocusModeScreen />);
    expect(getByTestId('focus-mode-container')).toBeTruthy();
    expect(FocusModeContainer).toHaveBeenCalled();
  });
});
