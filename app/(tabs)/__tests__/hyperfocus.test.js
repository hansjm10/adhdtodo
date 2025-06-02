// ABOUTME: Tests for HyperfocusScreen with Expo Router
// Verifies that the screen properly renders the HyperfocusContainer

import React from 'react';
import { render } from '@testing-library/react-native';
import HyperfocusScreen from '../hyperfocus';
import HyperfocusContainer from '../../../src/components/HyperfocusContainer';

// Mock the HyperfocusContainer since we test its UI separately
jest.mock('../../../src/components/HyperfocusContainer', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="hyperfocus-container">
        <Text>HyperfocusContainer</Text>
      </View>
    )),
  };
});

describe('HyperfocusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render HyperfocusContainer', () => {
    const { getByTestId } = render(<HyperfocusScreen />);
    expect(getByTestId('hyperfocus-container')).toBeTruthy();
    expect(HyperfocusContainer).toHaveBeenCalled();
  });
});
