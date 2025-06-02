// ABOUTME: Tests for CreateTaskScreen with Expo Router
// Verifies that the screen properly renders the CreateTaskContainer

import React from 'react';
import { render } from '@testing-library/react-native';
import CreateTaskScreen from '../create';
import CreateTaskContainer from '../../../src/components/CreateTaskContainer';

// Mock the CreateTaskContainer since we test its UI separately
jest.mock('../../../src/components/CreateTaskContainer', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="create-task-container">
        <Text>CreateTaskContainer</Text>
      </View>
    )),
  };
});

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render CreateTaskContainer', () => {
    const { getByTestId } = render(<CreateTaskScreen />);
    expect(getByTestId('create-task-container')).toBeTruthy();
    expect(CreateTaskContainer).toHaveBeenCalled();
  });
});
