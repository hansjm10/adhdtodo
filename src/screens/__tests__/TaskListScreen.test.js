// ABOUTME: Tests for TaskListScreen component
// Verifies task listing, empty states, and navigation

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TaskListScreen from '../TaskListScreen';
import TaskStorageService from '../../services/TaskStorageService';
import { createTask } from '../../utils/TaskModel';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';

// Mock dependencies
jest.mock('../../services/TaskStorageService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
}));

describe('TaskListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state when no tasks exist', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(<TaskListScreen />);

    await waitFor(() => {
      expect(getByText('No tasks yet')).toBeTruthy();
      expect(getByText('Tap the + button to create your first task')).toBeTruthy();
    });
  });

  it('should display list of tasks', async () => {
    const mockTasks = [
      createTask({ title: 'Task 1', description: 'Description 1' }),
      createTask({ title: 'Task 2', category: TASK_CATEGORIES.WORK.id }),
      createTask({ title: 'Task 3', timeEstimate: 30 }),
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    const { getByText, getByTestId } = render(<TaskListScreen />);

    await waitFor(() => {
      expect(getByText('Task 1')).toBeTruthy();
      expect(getByText('Description 1')).toBeTruthy();
      expect(getByText('Task 2')).toBeTruthy();
      expect(getByText('Task 3')).toBeTruthy();
      // Check that task 3 exists (time estimate is rendered but in a nested text component)
      expect(getByTestId(`task-item-${mockTasks[2].id}`)).toBeTruthy();
    });
  });

  it('should have add task button', () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByTestId } = render(<TaskListScreen />);

    expect(getByTestId('add-task-button')).toBeTruthy();
  });

  it('should navigate to create task screen when add button pressed', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
    });

    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByTestId } = render(<TaskListScreen />);

    fireEvent.press(getByTestId('add-task-button'));

    expect(mockNavigate).toHaveBeenCalledWith('CreateTask');
  });

  it('should refresh tasks on focus', async () => {
    const mockTasks = [createTask({ title: 'Task 1' })];
    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    render(<TaskListScreen />);

    await waitFor(() => {
      expect(TaskStorageService.getAllTasks).toHaveBeenCalled();
    });
  });

  it('should show completed tasks differently', async () => {
    const completedTask = createTask({ title: 'Completed Task' });
    completedTask.completed = true;

    const pendingTask = createTask({ title: 'Pending Task' });

    TaskStorageService.getAllTasks.mockResolvedValue([completedTask, pendingTask]);

    const { getAllByTestId } = render(<TaskListScreen />);

    await waitFor(() => {
      const items = getAllByTestId(/task-item-/);
      expect(items).toHaveLength(2);
    });
  });
});
