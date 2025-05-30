// ABOUTME: Tests for CreateTaskScreen component
// Verifies task creation UI and functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateTaskScreen from '../CreateTaskScreen';
import TaskStorageService from '../../services/TaskStorageService';
import { TASK_CATEGORIES, TIME_PRESETS } from '../../constants/TaskConstants';

// Mock dependencies
jest.mock('../../services/TaskStorageService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TaskStorageService.saveTask.mockResolvedValue(true);
  });

  it('should render all required input fields', () => {
    const { getByPlaceholderText, getByTestId } = render(<CreateTaskScreen />);

    expect(getByPlaceholderText('Task title')).toBeTruthy();
    expect(getByPlaceholderText('Task description (optional)')).toBeTruthy();
    expect(getByTestId('category-selector')).toBeTruthy();
    expect(getByTestId('time-preset-selector')).toBeTruthy();
  });

  it('should display all category options', () => {
    const { getByText } = render(<CreateTaskScreen />);

    expect(getByText(TASK_CATEGORIES.HOME.label)).toBeTruthy();
    expect(getByText(TASK_CATEGORIES.WORK.label)).toBeTruthy();
    expect(getByText(TASK_CATEGORIES.PERSONAL.label)).toBeTruthy();
  });

  it('should display all time preset options', () => {
    const { getByText } = render(<CreateTaskScreen />);

    TIME_PRESETS.forEach((preset) => {
      expect(getByText(preset.label)).toBeTruthy();
    });
  });

  it('should enable save button only when title is provided', () => {
    const { getByPlaceholderText, getByTestId } = render(<CreateTaskScreen />);

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

    const { getByPlaceholderText, getByTestId } = render(<CreateTaskScreen />);

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
    const { getByTestId, getByPlaceholderText } = render(<CreateTaskScreen />);

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
    const { getByTestId, getByPlaceholderText } = render(<CreateTaskScreen />);

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
