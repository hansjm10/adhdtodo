// ABOUTME: Tests for TaskItem React.memo optimization
// Verifies that TaskItem is properly memoized with custom comparison

import React from 'react';
import { render } from '@testing-library/react-native';
import TaskItem from '../TaskItem';
import { testDataFactories } from '../../../tests/utils';

// Mock services that TaskItem uses
jest.mock('../../services/TaskStorageService');
jest.mock('../../services/RewardService');
jest.mock('../../services/NotificationService');
jest.mock('../../services/PartnershipService');
jest.mock('../RewardAnimation', () => 'RewardAnimation');

// Import mocked services to set up responses
import TaskStorageService from '../../services/TaskStorageService';
import RewardService from '../../services/RewardService';
import NotificationService from '../../services/NotificationService';
import PartnershipService from '../../services/PartnershipService';

describe('TaskItem - React.memo Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock responses
    TaskStorageService.updateTask.mockResolvedValue(true);
    RewardService.calculateTaskXP.mockReturnValue(10);
    RewardService.updateStreak.mockResolvedValue(true);
    NotificationService.notifyTaskCompleted.mockResolvedValue(true);
    NotificationService.notifyTaskStarted.mockResolvedValue(true);
    PartnershipService.getActivePartnership.mockResolvedValue(null);
    PartnershipService.incrementPartnershipStat.mockResolvedValue(true);
  });

  it('should verify React.memo is applied', () => {
    // Check that TaskItem is wrapped with React.memo
    expect(TaskItem.$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('should use custom comparison function', () => {
    // TaskItem should have a custom compare function
    expect(typeof TaskItem.compare).toBe('function');
  });

  it('should have correct comparison logic for visual properties', () => {
    const mockOnUpdate = jest.fn();
    const mockOnPress = jest.fn();
    const currentUser = testDataFactories.user({ id: 'user1' });
    const partner = testDataFactories.user({ id: 'partner1' });

    const task1 = testDataFactories.task({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
      completed: false,
      priority: 'medium',
    });

    const prevProps = {
      task: task1,
      onUpdate: mockOnUpdate,
      onPress: mockOnPress,
      currentUser,
      partner,
    };

    // Test that updatedAt changes don't trigger re-render
    const task2 = { ...task1, updatedAt: new Date().toISOString() };
    const nextProps1 = { ...prevProps, task: task2 };
    expect(TaskItem.compare(prevProps, nextProps1)).toBe(true);

    // Test that visual changes do trigger re-render
    const task3 = { ...task1, title: 'Different Title' };
    const nextProps2 = { ...prevProps, task: task3 };
    expect(TaskItem.compare(prevProps, nextProps2)).toBe(false);

    // Test that completion status changes trigger re-render
    const task4 = { ...task1, completed: true };
    const nextProps3 = { ...prevProps, task: task4 };
    expect(TaskItem.compare(prevProps, nextProps3)).toBe(false);

    // Test that priority changes trigger re-render
    const task5 = { ...task1, priority: 'high' };
    const nextProps4 = { ...prevProps, task: task5 };
    expect(TaskItem.compare(prevProps, nextProps4)).toBe(false);
  });

  it('should render without errors', () => {
    const task = testDataFactories.task({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const mockOnUpdate = jest.fn();
    const mockOnPress = jest.fn();
    const currentUser = testDataFactories.user({ id: 'user1' });
    const partner = testDataFactories.user({ id: 'partner1' });

    const { getByText } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={currentUser}
        partner={partner}
      />,
    );

    expect(getByText('Test Task')).toBeTruthy();
  });
});
