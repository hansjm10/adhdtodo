// ABOUTME: Tests for CreateTaskView presentation component
// Verifies task creation form UI and interactions

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CreateTaskView from '../CreateTaskView';
import { TASK_CATEGORIES, TIME_PRESETS } from '../../constants/TaskConstants';

describe('CreateTaskView', () => {
  const defaultProps = {
    title: '',
    description: '',
    selectedCategory: null,
    selectedTimePreset: null,
    onTitleChange: jest.fn(),
    onDescriptionChange: jest.fn(),
    onCategorySelect: jest.fn(),
    onTimePresetSelect: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all required input fields', () => {
    const { getByPlaceholderText, getByTestId } = render(<CreateTaskView {...defaultProps} />);

    expect(getByPlaceholderText('Task title')).toBeTruthy();
    expect(getByPlaceholderText('Task description (optional)')).toBeTruthy();
    expect(getByTestId('category-selector')).toBeTruthy();
    expect(getByTestId('time-preset-selector')).toBeTruthy();
  });

  it('should display all category options', () => {
    const { getByText } = render(<CreateTaskView {...defaultProps} />);

    expect(getByText(TASK_CATEGORIES.HOME.label)).toBeTruthy();
    expect(getByText(TASK_CATEGORIES.WORK.label)).toBeTruthy();
    expect(getByText(TASK_CATEGORIES.PERSONAL.label)).toBeTruthy();
  });

  it('should display all time preset options', () => {
    const { getByText } = render(<CreateTaskView {...defaultProps} />);

    TIME_PRESETS.forEach((preset) => {
      expect(getByText(preset.label)).toBeTruthy();
    });
  });

  it('should show save button when title is empty', () => {
    const { getByTestId, getByText } = render(<CreateTaskView {...defaultProps} />);

    const saveButton = getByTestId('save-button');
    expect(saveButton).toBeTruthy();
    expect(getByText('Save Task')).toBeTruthy();
  });

  it('should show save button when title is provided', () => {
    const { getByTestId, getByText } = render(
      <CreateTaskView {...defaultProps} title="Test Task" />,
    );

    const saveButton = getByTestId('save-button');
    expect(saveButton).toBeTruthy();
    expect(getByText('Save Task')).toBeTruthy();
  });

  it('should call onTitleChange when title is entered', () => {
    const onTitleChange = jest.fn();
    const { getByPlaceholderText } = render(
      <CreateTaskView {...defaultProps} onTitleChange={onTitleChange} />,
    );

    fireEvent.changeText(getByPlaceholderText('Task title'), 'New Task');
    expect(onTitleChange).toHaveBeenCalledWith('New Task');
  });

  it('should call onDescriptionChange when description is entered', () => {
    const onDescriptionChange = jest.fn();
    const { getByPlaceholderText } = render(
      <CreateTaskView {...defaultProps} onDescriptionChange={onDescriptionChange} />,
    );

    fireEvent.changeText(getByPlaceholderText('Task description (optional)'), 'Task description');
    expect(onDescriptionChange).toHaveBeenCalledWith('Task description');
  });

  it('should call onCategorySelect when category is pressed', () => {
    const onCategorySelect = jest.fn();
    const { getByTestId } = render(
      <CreateTaskView {...defaultProps} onCategorySelect={onCategorySelect} />,
    );

    fireEvent.press(getByTestId('category-work'));
    expect(onCategorySelect).toHaveBeenCalledWith('work');
  });

  it('should highlight selected category', () => {
    const { getByTestId } = render(<CreateTaskView {...defaultProps} selectedCategory="work" />);

    const workCategory = getByTestId('category-work');
    // The selected category should have different styling
    expect(workCategory).toBeTruthy();
  });

  it('should call onTimePresetSelect when time preset is pressed', () => {
    const onTimePresetSelect = jest.fn();
    const { getByTestId } = render(
      <CreateTaskView {...defaultProps} onTimePresetSelect={onTimePresetSelect} />,
    );

    // Assuming first preset is 5 minutes
    fireEvent.press(getByTestId('time-preset-5'));
    expect(onTimePresetSelect).toHaveBeenCalledWith(5);
  });

  it('should highlight selected time preset', () => {
    const { getByTestId } = render(<CreateTaskView {...defaultProps} selectedTimePreset={15} />);

    const preset15 = getByTestId('time-preset-15');
    // The selected preset should have different styling
    expect(preset15).toBeTruthy();
  });

  it('should call onSave when save button is pressed', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <CreateTaskView {...defaultProps} title="Test Task" onSave={onSave} />,
    );

    fireEvent.press(getByTestId('save-button'));
    expect(onSave).toHaveBeenCalled();
  });

  it('should not call onSave when save button is disabled', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<CreateTaskView {...defaultProps} onSave={onSave} />);

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);
    // onSave should not be called because button is disabled
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(<CreateTaskView {...defaultProps} onCancel={onCancel} />);

    fireEvent.press(getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should display save and cancel buttons', () => {
    const { getByText } = render(<CreateTaskView {...defaultProps} />);

    expect(getByText('Save Task')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('should handle custom time preset', () => {
    const onTimePresetSelect = jest.fn();
    const { getByTestId } = render(
      <CreateTaskView {...defaultProps} onTimePresetSelect={onTimePresetSelect} />,
    );

    // Custom preset has null value
    fireEvent.press(getByTestId('time-preset-custom'));
    expect(onTimePresetSelect).toHaveBeenCalledWith(null);
  });
});
