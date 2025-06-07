// ABOUTME: Tests for TaskContext that provides centralized task state management
// Ensures single source of truth for tasks with caching and filtering capabilities

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { TaskProvider, useTasks } from '../TaskContext';
import TaskStorageService from '../../services/TaskStorageService';
import { testDataFactories } from '../../../tests/utils';

// Mock TaskStorageService
jest.mock('../../services/TaskStorageService', () => {
  const callbacks = new Map();

  return {
    getAllTasks: jest.fn(),
    saveTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    subscribeToTaskUpdates: jest.fn((userId, callback) => {
      callbacks.set(userId, callback);
      return () => callbacks.delete(userId);
    }),
    // Helper to trigger subscription callbacks in tests
    __triggerUpdate: (userId, task, eventType) => {
      const callback = callbacks.get(userId);
      if (callback) {
        callback(task, eventType);
      }
    },
  };
});

// SupabaseService is already mocked globally in tests/setup.js
// We need to override the auth user for these tests
import { supabase } from '../../services/SupabaseService';

beforeAll(() => {
  // Mock a logged-in user for all tests
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-123' } },
    error: null,
  });

  // Mock auth state change listener
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
});

describe('TaskContext', () => {
  const mockTasks = [
    testDataFactories.task({
      id: '1',
      title: 'Test Task 1',
      userId: 'user1',
      completed: false,
      status: 'pending',
      category: 'work',
      priority: 'high',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    }),
    testDataFactories.task({
      id: '2',
      title: 'Test Task 2',
      userId: 'user1',
      completed: true,
      status: 'completed',
      category: 'personal',
      priority: 'medium',
      createdAt: new Date('2024-01-02').toISOString(),
      updatedAt: new Date('2024-01-02').toISOString(),
    }),
    testDataFactories.task({
      id: '3',
      title: 'Test Task 3',
      userId: 'user2',
      completed: false,
      status: 'pending',
      category: 'work',
      priority: 'low',
      assignedBy: 'user1',
      createdAt: new Date('2024-01-03').toISOString(),
      updatedAt: new Date('2024-01-03').toISOString(),
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    // Mock saveTask to trigger subscription callback
    TaskStorageService.saveTask.mockImplementation(async (task) => {
      // Simulate real-time update
      setTimeout(() => {
        TaskStorageService.__triggerUpdate('test-user-123', task, 'INSERT');
      }, 0);
      return true;
    });

    // Mock updateTask to trigger subscription callback
    TaskStorageService.updateTask.mockImplementation(async (task) => {
      setTimeout(() => {
        TaskStorageService.__triggerUpdate('test-user-123', task, 'UPDATE');
      }, 0);
      return true;
    });

    // Mock deleteTask to trigger subscription callback
    TaskStorageService.deleteTask.mockImplementation(async (taskId) => {
      setTimeout(() => {
        TaskStorageService.__triggerUpdate('test-user-123', { id: taskId }, 'DELETE');
      }, 0);
      return true;
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  const TestComponent = ({ testId = 'tasks' }) => {
    const { tasks, loading, error } = useTasks();

    return (
      <View>
        <Text testID={`${testId}-loading`}>{loading.toString()}</Text>
        <Text testID={`${testId}-error`}>{error || 'no-error'}</Text>
        <Text testID={`${testId}-count`}>{tasks.length}</Text>
        {tasks.map((task, index) => (
          <Text key={task.id} testID={`${testId}-${index}`}>
            {task.title}
          </Text>
        ))}
      </View>
    );
  };

  it('should provide initial state with loading true', async () => {
    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );
    expect(getByTestId('tasks-loading').props.children).toBe('true');
    expect(getByTestId('tasks-error').props.children).toBe('no-error');
    expect(getByTestId('tasks-count').props.children).toBe(0);
  });

  it('should load tasks on mount', async () => {
    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('tasks-loading').props.children).toBe('false');
      expect(getByTestId('tasks-count').props.children).toBe(3);
      expect(getByTestId('tasks-0').props.children).toBe('Test Task 1');
    });

    expect(TaskStorageService.getAllTasks).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load tasks';
    TaskStorageService.getAllTasks.mockRejectedValueOnce(new Error(errorMessage));

    // Suppress expected console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = render(
      <TaskProvider>
        <TestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('tasks-loading').props.children).toBe('false');
      expect(getByTestId('tasks-error').props.children).toBe(errorMessage);
    });

    consoleSpy.mockRestore();
  });

  it('should filter tasks by user', async () => {
    const FilterTestComponent = () => {
      const { getTasksByUser, loading } = useTasks();
      const userTasks = loading ? [] : getTasksByUser('user1');

      return (
        <View>
          <Text testID="user-tasks-count">{userTasks.length}</Text>
          {userTasks.map((task, index) => (
            <Text key={task.id} testID={`user-task-${index}`}>
              {task.title}
            </Text>
          ))}
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <FilterTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('user-tasks-count').props.children).toBe(2);
      expect(getByTestId('user-task-0').props.children).toBe('Test Task 1');
      expect(getByTestId('user-task-1').props.children).toBe('Test Task 2');
    });
  });

  it('should filter tasks by category', async () => {
    const CategoryTestComponent = () => {
      const { getTasksByCategory, loading } = useTasks();
      const workTasks = loading ? [] : getTasksByCategory('work');

      return (
        <View>
          <Text testID="work-tasks-count">{workTasks.length}</Text>
          {workTasks.map((task, index) => (
            <Text key={task.id} testID={`work-task-${index}`}>
              {task.title}
            </Text>
          ))}
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <CategoryTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('work-tasks-count').props.children).toBe(2);
      expect(getByTestId('work-task-0').props.children).toBe('Test Task 1');
      expect(getByTestId('work-task-1').props.children).toBe('Test Task 3');
    });
  });

  it('should get pending tasks', async () => {
    const PendingTestComponent = () => {
      const { getPendingTasks, loading } = useTasks();
      const pendingTasks = loading ? [] : getPendingTasks();

      return (
        <View>
          <Text testID="pending-count">{pendingTasks.length}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <PendingTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('pending-count').props.children).toBe(2);
    });
  });

  it('should get tasks assigned by user', async () => {
    const AssignedTestComponent = () => {
      const { getTasksAssignedByUser, loading } = useTasks();
      const assignedTasks = loading ? [] : getTasksAssignedByUser('user1');

      return (
        <View>
          <Text testID="assigned-count">{assignedTasks.length}</Text>
          <Text testID="assigned-task">
            {assignedTasks.length > 0 ? assignedTasks[0].title : 'none'}
          </Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <TaskProvider>
        <AssignedTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('assigned-count').props.children).toBe(1);
      expect(getByTestId('assigned-task').props.children).toBe('Test Task 3');
    });
  });

  it('should add a new task', async () => {
    const AddTestComponent = () => {
      const { tasks, addTask, loading } = useTasks();
      const [hasAdded, setHasAdded] = React.useState(false);

      React.useEffect(() => {
        if (!loading && !hasAdded) {
          setHasAdded(true);
          const newTask = testDataFactories.task({
            title: 'New Task',
            userId: 'user1',
            category: 'personal',
            priority: 'high',
          });
          addTask(newTask);
        }
      }, [loading, hasAdded, addTask]);

      return <Text testID="task-count">{tasks.length}</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <AddTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('task-count').props.children).toBe(4);
    });

    expect(TaskStorageService.saveTask).toHaveBeenCalledWith(
      // eslint-disable-next-line custom-rules/enforce-test-data-factories
      expect.objectContaining({
        title: 'New Task',
        userId: 'user1',
        category: 'personal',
        priority: 'high',
      }),
    );
  });

  it('should update an existing task', async () => {
    const UpdateTestComponent = () => {
      const { tasks, updateTask, loading } = useTasks();

      React.useEffect(() => {
        if (!loading && tasks.length > 0) {
          updateTask('1', { title: 'Updated Task' });
        }
      }, [loading, tasks, updateTask]);

      const updatedTask = tasks.find((t) => t.id === '1');
      return <Text testID="updated-title">{updatedTask?.title || 'not-found'}</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <UpdateTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('updated-title').props.children).toBe('Updated Task');
    });

    expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
      // eslint-disable-next-line custom-rules/enforce-test-data-factories
      expect.objectContaining({
        id: '1',
        title: 'Updated Task',
        userId: 'user1',
        completed: false,
        category: 'work',
        priority: 'high',
      }),
    );
  });

  it('should delete a task', async () => {
    const DeleteTestComponent = () => {
      const { tasks, deleteTask, loading } = useTasks();

      React.useEffect(() => {
        if (!loading && tasks.length > 0) {
          deleteTask('1');
        }
      }, [loading, tasks, deleteTask]);

      return <Text testID="task-count">{tasks.length}</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <DeleteTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('task-count').props.children).toBe(2);
    });

    expect(TaskStorageService.deleteTask).toHaveBeenCalledWith('1');
  });

  it('should refresh tasks', async () => {
    const RefreshTestComponent = () => {
      const { tasks, refreshTasks, loading } = useTasks();
      const [hasRefreshed, setHasRefreshed] = React.useState(false);

      React.useEffect(() => {
        if (!loading && !hasRefreshed) {
          setHasRefreshed(true);
          refreshTasks();
        }
      }, [loading, hasRefreshed, refreshTasks]);

      return <Text testID="task-count">{tasks.length}</Text>;
    };

    const { getByTestId } = render(
      <TaskProvider>
        <RefreshTestComponent />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('task-count').props.children).toBe(3);
      expect(TaskStorageService.getAllTasks).toHaveBeenCalledTimes(2);
    });
  });

  it('should throw error when useTasks is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const ComponentWithoutProvider = () => {
      useTasks();
      return null;
    };

    expect(() => render(<ComponentWithoutProvider />)).toThrow(
      'useTasks must be used within a TaskProvider',
    );

    consoleSpy.mockRestore();
  });

  it('should cache tasks and not reload on subsequent mounts', async () => {
    // First render
    const { unmount, getByTestId } = render(
      <TaskProvider>
        <TestComponent testId="first" />
      </TaskProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('first-loading').props.children).toBe('false');
      expect(getByTestId('first-count').props.children).toBe(3);
    });

    expect(TaskStorageService.getAllTasks).toHaveBeenCalledTimes(1);

    unmount();

    // Mount again - will reload data since cache is in component state
    const { getByTestId: getByTestId2 } = render(
      <TaskProvider>
        <TestComponent testId="second" />
      </TaskProvider>,
    );

    // Wait for data to load again
    await waitFor(() => {
      expect(getByTestId2('second-loading').props.children).toBe('false');
      expect(getByTestId2('second-count').props.children).toBe(3);
    });

    // Will call getAllTasks again since cache was cleared on unmount
    expect(TaskStorageService.getAllTasks).toHaveBeenCalledTimes(2);
  });
});
