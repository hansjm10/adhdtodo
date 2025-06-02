// ABOUTME: Tests for ScatteredScreen with Expo Router
// Verifies that the screen properly renders the ScatteredModeContainer

import React from 'react';
import { render } from '@testing-library/react-native';
import ScatteredScreen from '../scattered';
import ScatteredModeContainer from '../../../src/components/ScatteredModeContainer';

// Mock the ScatteredModeContainer since we test its UI separately
jest.mock('../../../src/components/ScatteredModeContainer', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="scattered-mode-container">
        <Text>ScatteredModeContainer</Text>
      </View>
    )),
  };
});

describe('ScatteredScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ScatteredModeContainer', () => {
    const { getByTestId } = render(<ScatteredScreen />);
    expect(getByTestId('scattered-mode-container')).toBeTruthy();
    expect(ScatteredModeContainer).toHaveBeenCalled();
  });
});
