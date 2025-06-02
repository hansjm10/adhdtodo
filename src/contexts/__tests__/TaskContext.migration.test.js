// ABOUTME: Migration tests for converting LegacyTask to Task format
// Ensures data integrity during the type standardization

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { TaskProvider, useTasks } from '../TaskContext';
import TaskStorageService from '../../services/TaskStorageService';
import { TaskStatus, TaskPriority } from '../../types/task.types';

// Mock TaskStorageService
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

describe('TaskContext Migration from LegacyTask to Task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createLegacyTask = (overrides = {}) => ({
    id: '1',
    title: 'Legacy Task',
    description: 'Task description',
    category: 'work',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    timeEstimate: 30,
    timeSpent: 0,
    isComplete: false, // Legacy field name
    createdAt: '2024-01-01T00:00:00.000Z', // Legacy string format
    updatedAt: '2024-01-02T00:00:00.000Z', // Legacy string format
    completedAt: null,
    xpEarned: 0,
    streakContribution: false,
    assignedBy: null,
    assignedTo: null,
    dueDate: null,
    preferredStartTime: null,
    startedAt: null,
    partnerNotified: {
      onStart: false,
      onComplete: false,
      onOverdue: false,
    },
    encouragementReceived: [],
    userId: 'user1',
    ...overrides,
  });

  const createModernTask = (overrides = {}) => ({
    id: '1',
    title: 'Modern Task',
    description: 'Task description',
    category: 'work',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    timeEstimate: 30,
    timeSpent: 0,
    completed: false, // Modern field name
    createdAt: new Date('2024-01-01T00:00:00.000Z'), // Modern Date object
    updatedAt: new Date('2024-01-02T00:00:00.000Z'), // Modern Date object
    completedAt: null,
    xpEarned: 0,
    streakContribution: false,
    assignedBy: null,
    assignedTo: null,
    dueDate: null,
    preferredStartTime: null,
    startedAt: null,
    partnerNotified: {
      onStart: false,
      onComplete: false,
      onOverdue: false,
    },
    encouragementReceived: [],
    userId: 'user1',
    ...overrides,
  });

  it('should handle modern Task format without conversion', async () => {
    const modernTasks = [
      createModernTask({ id: '1', title: 'Task 1', completed: false }),
      createModernTask({ id: '2', title: 'Task 2', completed: true }),
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(modernTasks);

    const TestComponent = () => {
      const { tasks, loading } = useTasks();

      if (loading) return <Text testID="loading">Loading</Text>;

      return (
        <View>
          <Text testID="task-count">{tasks.length}</Text>
          {tasks.map((task) => (
            <View key={task.id}>
              <Text testID={`task-${task.id}-title`}>{task.title}</Text>
              <Text testID={`task-${task.id}-completed`}>{task.completed.toString()}</Text>
              <Text testID={`task-${task.id}-createdAt`}>
                {task.createdAt instanceof Date ? 'date' : 'not-date'}
              </Text>
            </View>
          ))}
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('task-count').props.children).toBe(2);
      expect(getByTestId('task-1-title').props.children).toBe('Task 1');
      expect(getByTestId('task-1-completed').props.children).toBe('false');
      expect(getByTestId('task-1-createdAt').props.children).toBe('date');
      expect(getByTestId('task-2-completed').props.children).toBe('true');
    });
  });

  it('should handle mixed legacy and modern task formats', async () => {
    const mixedTasks = [
      createLegacyTask({ id: '1', title: 'Legacy Task', isComplete: true }),
      createModernTask({ id: '2', title: 'Modern Task', completed: false }),
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mixedTasks);

    const TestComponent = () => {
      const { tasks, loading } = useTasks();

      if (loading) return <Text testID="loading">Loading</Text>;

      return (
        <View>
          <Text testID="task-count">{tasks.length}</Text>
          {tasks.map((task) => (
            <View key={task.id}>
              <Text testID={`task-${task.id}-title`}>{task.title}</Text>
              <Text testID={`task-${task.id}-completed`}>{task.completed.toString()}</Text>
            </View>
          ))}
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('task-count').props.children).toBe(2);
      // Legacy task should be converted properly
      expect(getByTestId('task-1-completed').props.children).toBe('true');
      // Modern task should remain unchanged
      expect(getByTestId('task-2-completed').props.children).toBe('false');
    });
  });

  it('should convert string dates to Date objects', async () => {
    const legacyTask = createLegacyTask({
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      completedAt: '2024-01-03T00:00:00.000Z',
      dueDate: '2024-01-04T00:00:00.000Z',
    });

    TaskStorageService.getAllTasks.mockResolvedValue([legacyTask]);

    const TestComponent = () => {
      const { tasks, loading } = useTasks();

      if (loading) return <Text testID="loading">Loading</Text>;

      const task = tasks[0];

      return (
        <View>
          <Text testID="createdAt-type">
            {task?.createdAt instanceof Date ? 'date' : 'not-date'}
          </Text>
          <Text testID="updatedAt-type">
            {task?.updatedAt instanceof Date ? 'date' : 'not-date'}
          </Text>
          <Text testID="completedAt-type">
            {task?.completedAt instanceof Date ? 'date' : 'not-date'}
          </Text>
          <Text testID="dueDate-type">{task?.dueDate instanceof Date ? 'date' : 'not-date'}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('createdAt-type').props.children).toBe('date');
      expect(getByTestId('updatedAt-type').props.children).toBe('date');
      expect(getByTestId('completedAt-type').props.children).toBe('date');
      expect(getByTestId('dueDate-type').props.children).toBe('date');
    });
  });

  it('should save tasks in modern format when adding new task', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);
    TaskStorageService.saveTask.mockResolvedValue(true);

    const TestComponent = () => {
      const { addTask } = useTasks();

      React.useEffect(() => {
        addTask({
          title: 'New Task',
          description: 'Description',
          category: 'work',
          userId: 'user1',
        });
      }, [addTask]);

      return <Text testID="done">Done</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('done')).toBeTruthy();
    });

    expect(TaskStorageService.saveTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Task',
        completed: false, // Modern field name
        createdAt: expect.any(Date), // Date object, not string
        updatedAt: expect.any(Date), // Date object, not string
      }),
    );

    // Ensure isComplete field is NOT present
    expect(TaskStorageService.saveTask).not.toHaveBeenCalledWith(
      expect.objectContaining({
        isComplete: expect.anything(),
      }),
    );
  });

  it('should update tasks using modern format', async () => {
    const modernTask = createModernTask({ id: '1', completed: false });
    TaskStorageService.getAllTasks.mockResolvedValue([modernTask]);
    TaskStorageService.updateTask.mockResolvedValue(true);

    const TestComponent = () => {
      const { updateTask, tasks } = useTasks();

      React.useEffect(() => {
        if (tasks.length > 0) {
          updateTask('1', { completed: true });
        }
      }, [updateTask, tasks]);

      return <Text testID="done">Done</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('done')).toBeTruthy();
    });

    expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        completed: true, // Modern field name
      }),
    );

    // Ensure isComplete field is NOT present
    expect(TaskStorageService.updateTask).not.toHaveBeenCalledWith(
      expect.objectContaining({
        isComplete: expect.anything(),
      }),
    );
  });
});
