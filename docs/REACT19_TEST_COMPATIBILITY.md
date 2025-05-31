# React 19 Test Compatibility Issues

## Overview

This project is using **React 19.1.0** with **React Native Testing Library 13.2.0**, which causes test failures due to incompatibility. React Native Testing Library 13.x is designed for React 18, not React 19.

## Issue Details

### Root Cause

- React 19 deprecated `react-test-renderer`, which React Native Testing Library depends on
- This causes `AggregateError` and act() warnings in tests
- The React team recommends migrating to @testing-library/react or @testing-library/react-native v14+ (when available)

### Affected Tests

All test files that use `fireEvent` or state updates are affected:

- `NotificationContext.test.js` - async state updates in context
- `AuthScreen.test.js` - login form interactions
- `CreateTaskScreen.test.js` - form input handling
- `TaskListScreen.test.js` - async data loading
- `HyperfocusScreen.test.js` - timer state updates
- `FocusModeScreen.test.js` - navigation and mode selection

### Error Symptoms

1. **AggregateError**: Appears when using fireEvent with React 19
2. **act() warnings**: "An update to Component inside a test was not wrapped in act(...)"
3. **Test renderer errors**: "Can't access .root on unmounted test renderer"

## Current Status

As of December 2024:

- React Native Testing Library team is working on React 19 support
- Plan is to release RNTL v14 with React 19 support
- RNTL v13 will continue to support React 18 and earlier

## Temporary Solutions

### Option 1: Skip Problematic Tests (Current Approach)

```javascript
describe.skip('Component Tests', () => {
  // Tests that fail with React 19
});
```

### Option 2: Mock fireEvent

```javascript
jest.mock('@testing-library/react-native', () => ({
  ...jest.requireActual('@testing-library/react-native'),
  fireEvent: {
    press: jest.fn(),
    changeText: jest.fn(),
  },
}));
```

### Option 3: Use Direct Props Calling

Instead of:

```javascript
fireEvent.press(button);
```

Use:

```javascript
act(() => {
  button.props.onPress();
});
```

## Long-term Solution

### Option 1: Wait for RNTL v14

Monitor the React Native Testing Library repository for v14 release with React 19 support.

### Option 2: Downgrade to React 18

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.79.2"
  }
}
```

### Option 3: Use Alternative Testing Approach

Consider using Detox or other E2E testing frameworks that don't depend on react-test-renderer.

## References

1. [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
2. [RNTL React 19 Support RFC](https://github.com/callstack/react-native-testing-library/issues/1593)
3. [React Test Renderer Deprecation](https://react.dev/warnings/react-test-renderer)

## Action Items

- [ ] Monitor RNTL repository for v14 release
- [ ] Consider downgrading to React 18 if tests are critical
- [ ] Implement E2E tests as alternative to unit tests
- [ ] Update this document when RNTL v14 is released
