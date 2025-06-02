// ABOUTME: Tests for task list screen (tabs index) with Expo Router
// Verifies that the screen properly renders the TaskListContainer

import React from 'react';
import { render } from '@testing-library/react-native';
import TaskListScreen from '../index';
import TaskListContainer from '../../../src/components/TaskListContainer';

// Mock the TaskListContainer since we test its UI separately
jest.mock('../../../src/components/TaskListContainer', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="task-list-container">
        <Text>TaskListContainer</Text>
      </View>
    )),
  };
});

describe('TaskListScreen (tabs index)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render TaskListContainer', () => {
    const { getByTestId } = render(<TaskListScreen />);
    expect(getByTestId('task-list-container')).toBeTruthy();
    expect(TaskListContainer).toHaveBeenCalled();
  });
});
