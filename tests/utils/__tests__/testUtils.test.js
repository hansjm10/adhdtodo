// ABOUTME: Tests for core test utilities
// Verifies that renderWithProviders and other utilities work correctly

import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import {
  renderWithProviders,
  waitForLoadingToFinish,
  getByTestIdSafe,
  waitFor,
} from '../testUtils';
import { useRouter } from 'expo-router';
import { useUser } from '../../../src/contexts/UserContext';
import { useTasks } from '../../../src/contexts/TaskContext';
import { useNotifications } from '../../../src/contexts/NotificationContext';

// Test components
const TestComponent = ({ testID = 'test-component' }) => (
  <View testID={testID}>
    <Text>Test Component</Text>
  </View>
);

const LoadingComponent = ({ isLoading }) => (
  <View>{isLoading ? <ActivityIndicator testID="loading-indicator" /> : <Text>Loaded</Text>}</View>
);

const NavigationTestComponent = () => {
  const router = useRouter();
  return (
    <View>
      <Text testID="navigation-status">{router ? 'Has router' : 'No router'}</Text>
    </View>
  );
};

const ContextTestComponent = () => {
  const { user } = useUser();
  const { tasks } = useTasks();
  const { notifications } = useNotifications();

  return (
    <View>
      <Text testID="user-context">{user ? 'Has user' : 'No user'}</Text>
      <Text testID="task-context">{tasks ? 'Has tasks' : 'No tasks'}</Text>
      <Text testID="notification-context">
        {notifications ? 'Has notifications' : 'No notifications'}
      </Text>
    </View>
  );
};

describe('Test Utils', () => {
  describe('renderWithProviders', () => {
    it('should render component with all providers', async () => {
      const { getByTestId, getByText } = renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('test-component')).toBeTruthy();
        expect(getByText('Test Component')).toBeTruthy();
      });
    });

    it('should work with components using expo-router', async () => {
      const { getByTestId } = renderWithProviders(<NavigationTestComponent />);

      await waitFor(() => {
        expect(getByTestId('navigation-status')).toBeTruthy();
        expect(getByTestId('navigation-status').props.children).toBe('Has router');
      });
    });

    it('should provide app contexts', async () => {
      const { getByTestId } = renderWithProviders(<ContextTestComponent />);

      await waitFor(() => {
        // All contexts should be available
        expect(getByTestId('user-context')).toBeTruthy();
        expect(getByTestId('task-context')).toBeTruthy();
        expect(getByTestId('notification-context')).toBeTruthy();
      });
    });

    it('should accept initial state for context providers', async () => {
      const initialState = {
        user: { id: 'test-user' },
      };

      const { root } = renderWithProviders(<TestComponent />, { initialState });

      await waitFor(() => {
        expect(root).toBeTruthy();
      });
    });

    it('should accept render options', async () => {
      const { root } = renderWithProviders(<TestComponent />, { createNodeMock: () => {} });

      await waitFor(() => {
        expect(root).toBeTruthy();
      });
    });
  });

  describe('waitForLoadingToFinish', () => {
    it('should wait for loading indicator to disappear', async () => {
      const { rerender, ...screen } = renderWithProviders(<LoadingComponent isLoading={true} />);

      // Initially should have loading indicator
      expect(screen.queryByTestId('loading-indicator')).toBeTruthy();

      // Rerender without loading
      rerender(<LoadingComponent isLoading={false} />);

      // Wait for loading to finish
      await waitForLoadingToFinish(screen);

      // Should not have loading indicator
      expect(screen.queryByTestId('loading-indicator')).toBeFalsy();
      expect(screen.getByText('Loaded')).toBeTruthy();
    });

    it('should check for loading text', async () => {
      const LoadingTextComponent = ({ isLoading }) => (
        <View>{isLoading ? <Text>Loading...</Text> : <Text>Done</Text>}</View>
      );

      const { rerender, ...screen } = renderWithProviders(
        <LoadingTextComponent isLoading={true} />,
      );

      expect(screen.queryByText(/loading/i)).toBeTruthy();

      rerender(<LoadingTextComponent isLoading={false} />);

      await waitForLoadingToFinish(screen);

      expect(screen.queryByText(/loading/i)).toBeFalsy();
    });

    it('should handle when no loading indicators exist', async () => {
      const screen = renderWithProviders(<TestComponent />);

      // Should not throw when no loading indicators
      await expect(waitForLoadingToFinish(screen)).resolves.not.toThrow();
    });
  });

  describe('getByTestIdSafe', () => {
    it('should get element by test ID', () => {
      const MultipleTestIds = () => (
        <View>
          <Text testID="first-id">First</Text>
          <Text testID="second-id">Second</Text>
          <Text testID="third-id">Third</Text>
        </View>
      );

      const screen = renderWithProviders(<MultipleTestIds />);

      const element = getByTestIdSafe(screen, 'second-id');
      expect(element).toBeTruthy();
      expect(element.props.children).toBe('Second');
    });

    it('should throw helpful error when element not found', () => {
      const MultipleTestIds = () => (
        <View>
          <Text testID="available-id-1">First</Text>
          <Text testID="available-id-2">Second</Text>
        </View>
      );

      const screen = renderWithProviders(<MultipleTestIds />);

      expect(() => {
        getByTestIdSafe(screen, 'missing-id');
      }).toThrow(/Unable to find element with testID: missing-id/);

      // Error should list available test IDs
      try {
        getByTestIdSafe(screen, 'missing-id');
      } catch (error) {
        expect(error.message).toContain('available-id-1');
        expect(error.message).toContain('available-id-2');
      }
    });
  });

  describe('Re-exports', () => {
    it('should re-export testing library functions', () => {
      // Import from our utils
      const { render, fireEvent, waitFor, act } = require('../testUtils');

      // These should be the same as the original exports
      const rtl = require('@testing-library/react-native');

      expect(render).toBe(rtl.render);
      expect(fireEvent).toBe(rtl.fireEvent);
      expect(waitFor).toBe(rtl.waitFor);
      expect(act).toBe(rtl.act);
    });
  });
});
