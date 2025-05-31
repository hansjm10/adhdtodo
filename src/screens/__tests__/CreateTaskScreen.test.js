// ABOUTME: Tests for CreateTaskScreen component
// Verifies task creation UI and functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateTaskScreen from '../CreateTaskScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { TASK_CATEGORIES, TIME_PRESETS } from '../../constants/TaskConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

// Mock TaskStorageService at the module level
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Import after mocking
const TaskStorageService = require('../../services/TaskStorageService');

// Test wrapper component with contexts
const TestWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset context caches
    require('../../contexts/TaskContext')._resetCache();
    require('../../contexts/NotificationContext')._resetNotifications();

    // Setup default mocks
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify({ id: 'user1', name: 'Test User' }));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);
    TaskStorageService.getAllTasks.mockResolvedValue([]);
    TaskStorageService.saveTask.mockResolvedValue(true);
  });

  it('should render all required input fields', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByPlaceholderText('Task title')).toBeTruthy();
    });

    expect(getByPlaceholderText('Task description (optional)')).toBeTruthy();
    expect(getByTestId('category-selector')).toBeTruthy();
    expect(getByTestId('time-preset-selector')).toBeTruthy();
  });

  it('should display all category options', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByText(TASK_CATEGORIES.HOME.label)).toBeTruthy();
    });

    expect(getByText(TASK_CATEGORIES.WORK.label)).toBeTruthy();
    expect(getByText(TASK_CATEGORIES.PERSONAL.label)).toBeTruthy();
  });

  it('should display all time preset options', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      TIME_PRESETS.forEach((preset) => {
        expect(getByText(preset.label)).toBeTruthy();
      });
    });
  });

  it('should enable save button only when title is provided', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('save-button')).toBeTruthy();
    });

    const saveButton = getByTestId('save-button');
    const titleInput = getByPlaceholderText('Task title');

    expect(saveButton).toBeDisabled();

    fireEvent.changeText(titleInput, 'New Task');
    expect(saveButton).not.toBeDisabled();

    fireEvent.changeText(titleInput, '');
    expect(saveButton).toBeDisabled();
  });

  it('should save task and navigate back on successful save', async () => {
    const mockGoBack = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      goBack: mockGoBack,
    });

    const { getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByPlaceholderText('Task title')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Task title'), 'Test Task');
    fireEvent.changeText(getByPlaceholderText('Task description (optional)'), 'Test Description');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(TaskStorageService.saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: 'Test Description',
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('should select category when pressed', async () => {
    const { getByTestId, getByPlaceholderText } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByTestId(`category-${TASK_CATEGORIES.HOME.id}`)).toBeTruthy();
    });

    const homeCategory = getByTestId(`category-${TASK_CATEGORIES.HOME.id}`);
    fireEvent.press(homeCategory);

    // Verify category is selected by checking if it's included in saved task
    fireEvent.changeText(getByPlaceholderText('Task title'), 'Test Task');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(TaskStorageService.saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TASK_CATEGORIES.HOME.id,
        }),
      );
    });
  });

  it('should select time preset when pressed', async () => {
    const { getByTestId, getByPlaceholderText } = render(
      <TestWrapper>
        <CreateTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('time-preset-15')).toBeTruthy();
    });

    const preset15 = getByTestId('time-preset-15');
    fireEvent.press(preset15);

    // Verify time preset is selected by checking if it's included in saved task
    fireEvent.changeText(getByPlaceholderText('Task title'), 'Test Task');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(TaskStorageService.saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          timeEstimate: 15,
        }),
      );
    });
  });
});
