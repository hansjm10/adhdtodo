// ABOUTME: Extended tests for component testing helpers
// Tests edge cases and complex scenarios not covered in main test file

import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import {
  testFormValidation,
  testListRendering,
  testAccessibility,
  testStateTransitions,
  testKeyboardInteraction,
  testComponentPerformance,
} from '../componentHelpers';
import { renderWithProviders } from '../testUtils';
import { fireEvent, waitFor } from '@testing-library/react-native';

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  };
}

describe('Component Helpers - Extended Tests', () => {
  describe('testFormValidation', () => {
    it('should validate multiple form fields', async () => {
      const FormComponent = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [errors, setErrors] = useState({});

        const validate = () => {
          const newErrors = {};
          if (!email.includes('@')) {
            newErrors.email = 'Invalid email';
          }
          if (password.length < 6) {
            newErrors.password = 'Password too short';
          }
          setErrors(newErrors);
        };

        useEffect(() => {
          validate();
        }, [email, password]);

        return (
          <View>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
            />
            {errors.email && <Text>{errors.email}</Text>}
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
            />
            {errors.password && <Text>{errors.password}</Text>}
          </View>
        );
      };

      const screen = renderWithProviders(<FormComponent />);
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      const validationRules = [
        {
          input: emailInput,
          value: 'invalid',
          expectedError: 'Invalid email',
          field: 'email',
        },
        {
          input: emailInput,
          value: 'valid@email.com',
          expectedError: null,
          field: 'email',
        },
        {
          input: passwordInput,
          value: '123',
          expectedError: 'Password too short',
          field: 'password',
        },
        {
          input: passwordInput,
          value: '123456',
          expectedError: null,
          field: 'password',
        },
      ];

      await testFormValidation(screen, validationRules);
    });

    it('should handle async validation', async () => {
      const AsyncFormComponent = () => {
        const [username, setUsername] = useState('');
        const [error, setError] = useState('');

        const validateAsync = async (value) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (value === 'taken') {
            setError('Username already taken');
          } else {
            setError('');
          }
        };

        useEffect(() => {
          if (username) {
            validateAsync(username);
          }
        }, [username]);

        return (
          <View>
            <TextInput testID="username-input" value={username} onChangeText={setUsername} />
            {error && <Text>{error}</Text>}
          </View>
        );
      };

      const screen = renderWithProviders(<AsyncFormComponent />);
      const usernameInput = screen.getByTestId('username-input');

      const validationRules = [
        {
          input: usernameInput,
          value: 'taken',
          expectedError: 'Username already taken',
          field: 'username',
        },
      ];

      await testFormValidation(screen, validationRules);
    });
  });

  describe('testListRendering', () => {
    it('should test lists with different data structures', async () => {
      const ListComponent = ({ data }) => (
        <View>
          {data.map((item, index) => (
            <View key={item.id || index} testID={`item-${index}`}>
              <Text>{item.name || item.title || item}</Text>
            </View>
          ))}
        </View>
      );

      const testDataSets = [
        { data: [], expectedCount: 0 },
        { data: ['Item 1', 'Item 2'], expectedCount: 2 },
        {
          data: [
            { id: 1, name: 'Object 1' },
            { id: 2, name: 'Object 2' },
          ],
          expectedCount: 2,
        },
        { data: Array(10).fill({ title: 'Item' }), expectedCount: 10 },
      ];

      await testListRendering(ListComponent, testDataSets);
    });

    it('should handle async list loading', async () => {
      const AsyncListComponent = ({ data }) => {
        const [items, setItems] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
          setTimeout(() => {
            setItems(data);
            setLoading(false);
          }, 100);
        }, [data]);

        if (loading) {
          return <ActivityIndicator testID="loading" />;
        }

        return (
          <View>
            {items.map((item, index) => (
              <View key={index} testID={'list-item'}>
                <Text>{item}</Text>
              </View>
            ))}
          </View>
        );
      };

      const testDataSets = [{ data: ['Item 1', 'Item 2', 'Item 3'], expectedCount: 3 }];

      await testListRendering(AsyncListComponent, testDataSets);
    });
  });

  describe('testAccessibility', () => {
    it('should verify accessibility labels and roles', () => {
      const AccessibleComponent = () => (
        <View>
          <TouchableOpacity
            accessibilityLabel="Submit button"
            accessibilityRole="button"
            testID="accessible-submit"
          >
            <Text>Submit</Text>
          </TouchableOpacity>
          <TextInput
            accessibilityLabel="Email input"
            accessibilityRole="text"
            testID="accessible-email"
          />
          <Text accessibilityLabel="Status message" accessibilityRole="text">
            Status: Active
          </Text>
        </View>
      );

      const expectedLabels = {
        submit: 'Submit button',
        email: 'Email input',
        status: 'Status message',
      };

      testAccessibility(AccessibleComponent, {}, expectedLabels);
    });

    it('should handle missing accessibility labels gracefully', () => {
      const PartiallyAccessibleComponent = () => (
        <View>
          <TouchableOpacity testID="accessible-button">
            <Text>Button</Text>
          </TouchableOpacity>
        </View>
      );

      const expectedLabels = {
        button: 'Missing Label',
      };

      // This should throw but we expect it to
      expect(() => {
        testAccessibility(PartiallyAccessibleComponent, {}, expectedLabels);
      }).toThrow();
    });
  });

  describe('testStateTransitions', () => {
    it('should test component state changes over time', async () => {
      const StatefulComponent = ({ status }) => {
        const getStatusColor = () => {
          switch (status) {
            case 'idle':
              return 'gray';
            case 'loading':
              return 'blue';
            case 'success':
              return 'green';
            case 'error':
              return 'red';
            default:
              return 'gray';
          }
        };

        return (
          <View>
            <Text testID="status-text">{status}</Text>
            <Text testID="status-color">{getStatusColor()}</Text>
            {status === 'loading' && <ActivityIndicator testID="loading-indicator" />}
          </View>
        );
      };

      const transitions = [
        {
          props: { status: 'idle' },
          validate: (queries) => {
            expect(queries.getByTestId('status-text').props.children).toBe('idle');
            expect(queries.getByTestId('status-color').props.children).toBe('gray');
            expect(queries.queryByTestId('loading-indicator')).toBeFalsy();
          },
        },
        {
          props: { status: 'loading' },
          validate: (queries) => {
            expect(queries.getByTestId('status-text').props.children).toBe('loading');
            expect(queries.getByTestId('status-color').props.children).toBe('blue');
            expect(queries.queryByTestId('loading-indicator')).toBeTruthy();
          },
        },
        {
          props: { status: 'success' },
          validate: (queries) => {
            expect(queries.getByTestId('status-text').props.children).toBe('success');
            expect(queries.getByTestId('status-color').props.children).toBe('green');
            expect(queries.queryByTestId('loading-indicator')).toBeFalsy();
          },
        },
        {
          props: { status: 'error' },
          validate: (queries) => {
            expect(queries.getByTestId('status-text').props.children).toBe('error');
            expect(queries.getByTestId('status-color').props.children).toBe('red');
          },
        },
      ];

      await testStateTransitions(StatefulComponent, transitions);
    });

    it('should handle rapid state transitions', async () => {
      const RapidTransitionComponent = ({ count }) => (
        <View>
          <Text testID="count">{count}</Text>
          <Text testID="parity">{count % 2 === 0 ? 'even' : 'odd'}</Text>
        </View>
      );

      const transitions = Array.from({ length: 10 }, (_, i) => ({
        props: { count: i },
        validate: (queries) => {
          expect(queries.getByTestId('count').props.children).toBe(i);
          expect(queries.getByTestId('parity').props.children).toBe(i % 2 === 0 ? 'even' : 'odd');
        },
      }));

      await testStateTransitions(RapidTransitionComponent, transitions);
    });
  });

  describe('testModalVisibility', () => {
    it('should test modal show/hide functionality', async () => {
      const ModalComponent = () => {
        const [visible, setVisible] = useState(false);

        return (
          <View>
            <TouchableOpacity testID="show-modal" onPress={() => setVisible(true)}>
              <Text>Show Modal</Text>
            </TouchableOpacity>
            {visible && (
              <Modal testID="test-modal" visible={visible}>
                <View>
                  <Text>Modal Content</Text>
                  <TouchableOpacity testID="close-modal" onPress={() => setVisible(false)}>
                    <Text>Close</Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            )}
          </View>
        );
      };

      const screen = renderWithProviders(<ModalComponent />);

      // Test showing modal
      const showButton = screen.getByTestId('show-modal');
      fireEvent.press(showButton);

      await waitFor(() => {
        expect(screen.queryByTestId('test-modal')).toBeTruthy();
      });

      // Test hiding modal
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('test-modal')).toBeFalsy();
      });
    });

    it('should test modal without trigger element', async () => {
      const AutoModalComponent = ({ showModal }) => (
        <View>
          {showModal && (
            <Modal testID="auto-modal" visible={showModal}>
              <Text>Auto Modal</Text>
            </Modal>
          )}
        </View>
      );

      const screen = renderWithProviders(<AutoModalComponent showModal={true} />);

      // Modal should be visible initially
      await waitFor(() => {
        expect(screen.queryByTestId('auto-modal')).toBeTruthy();
      });
    });
  });

  describe('testKeyboardInteraction', () => {
    it('should test keyboard submit and dismiss', async () => {
      const onSubmit = jest.fn();
      const onDismiss = jest.fn();

      const KeyboardComponent = () => (
        <TextInput testID="test-input" onSubmitEditing={onSubmit} onBlur={onDismiss} />
      );

      const screen = renderWithProviders(<KeyboardComponent />);
      const input = screen.getByTestId('test-input');

      await testKeyboardInteraction(input, {
        onSubmit,
        onDismiss,
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle partial keyboard interactions', async () => {
      const onSubmit = jest.fn();

      const SubmitOnlyComponent = () => (
        <TextInput testID="submit-only-input" onSubmitEditing={onSubmit} />
      );

      const screen = renderWithProviders(<SubmitOnlyComponent />);
      const input = screen.getByTestId('submit-only-input');

      await testKeyboardInteraction(input, {
        onSubmit,
      });

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('testComponentPerformance', () => {
    it('should measure render performance', () => {
      const SimpleComponent = () => <Text>Fast Component</Text>;

      const result = testComponentPerformance(SimpleComponent, {}, 50);

      expect(result.passed).toBe(true);
      expect(result.renderTime).toBeLessThan(50);
      expect(result.result).toBeTruthy();
    });

    it('should fail for slow components', () => {
      const SlowComponent = () => {
        // Simulate expensive computation
        const items = Array(1000)
          .fill(0)
          .map((_, i) => i * Math.random());

        return (
          <View>
            {items.map((item, index) => (
              <Text key={index}>{item}</Text>
            ))}
          </View>
        );
      };

      // Test with very low threshold to ensure failure
      // We expect this test to throw because the component is too slow
      expect(() => {
        testComponentPerformance(SlowComponent, {}, 1);
      }).toThrow();
    });

    it('should work with complex props', () => {
      const PropsComponent = ({ data, config }) => (
        <View>
          <Text>{config.title}</Text>
          {data.map((item, index) => (
            <Text key={index}>{item}</Text>
          ))}
        </View>
      );

      const props = {
        data: ['Item 1', 'Item 2', 'Item 3'],
        config: { title: 'Test List' },
      };

      const result = testComponentPerformance(PropsComponent, props, 100);

      expect(result.passed).toBe(true);
      expect(result.result.getByText('Test List')).toBeTruthy();
    });
  });
});
