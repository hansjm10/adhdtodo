// ABOUTME: Navigation testing helpers for mocking React Navigation
// Provides utilities to create navigation and route mocks for testing

/**
 * Create a mock navigation object with all common navigation methods
 * @param {Object} overrides - Methods to override
 * @returns {Object} Mock navigation object
 */
export const createNavigationMock = (overrides = {}) => {
  const navigate = jest.fn();
  const goBack = jest.fn();
  const setOptions = jest.fn();
  const setParams = jest.fn();
  const dispatch = jest.fn();
  const reset = jest.fn();
  const replace = jest.fn();
  const push = jest.fn();
  const pop = jest.fn();
  const popToTop = jest.fn();
  const canGoBack = jest.fn(() => true);
  const isFocused = jest.fn(() => true);
  const addListener = jest.fn(() => ({ remove: jest.fn() }));
  const removeListener = jest.fn();

  return {
    navigate,
    goBack,
    setOptions,
    setParams,
    dispatch,
    reset,
    replace,
    push,
    pop,
    popToTop,
    canGoBack,
    isFocused,
    addListener,
    removeListener,
    // State management
    getState: jest.fn(() => ({
      routeNames: ['TasksList', 'CreateTask', 'EditTask'],
      index: 0,
      routes: [{ name: 'TasksList', key: 'TasksList-1' }],
    })),
    getParent: jest.fn(() => null),
    // Override with custom implementations if needed
    ...overrides,
  };
};

/**
 * Create a mock route object with params
 * @param {Object} params - Route parameters
 * @param {Object} overrides - Additional route properties
 * @returns {Object} Mock route object
 */
export const createRouteMock = (params = {}, overrides = {}) => {
  return {
    params,
    key: `test-route-${Date.now()}`,
    name: 'TestScreen',
    path: '/test',
    ...overrides,
  };
};

/**
 * Create a navigation state object
 * @param {Array} routes - Array of route objects
 * @param {number} index - Current route index
 * @returns {Object} Navigation state
 */
export const createNavigationState = (routes = [], index = 0) => {
  const defaultRoutes = [{ name: 'TasksList', key: 'TasksList-1' }];

  return {
    type: 'stack',
    key: 'stack-1',
    routeNames: routes.length > 0 ? routes.map((r) => r.name) : ['TasksList'],
    routes: routes.length > 0 ? routes : defaultRoutes,
    index: index,
    stale: false,
  };
};

/**
 * Create a mock for useNavigation hook
 * @param {Object} navigationMock - Navigation mock to return
 * @returns {Function} Mock hook
 */
export const createUseNavigationMock = (navigationMock = null) => {
  return () => navigationMock || createNavigationMock();
};

/**
 * Create a mock for useRoute hook
 * @param {Object} routeMock - Route mock to return
 * @returns {Function} Mock hook
 */
export const createUseRouteMock = (routeMock = null) => {
  return () => routeMock || createRouteMock();
};

/**
 * Create a mock for useFocusEffect hook
 * @returns {Function} Mock hook
 */
export const createUseFocusEffectMock = () => {
  return jest.fn((callback) => {
    // Execute the callback immediately in tests
    callback();
  });
};

/**
 * Create a mock for useIsFocused hook
 * @param {boolean} isFocused - Whether screen is focused
 * @returns {Function} Mock hook
 */
export const createUseIsFocusedMock = (isFocused = true) => {
  return () => isFocused;
};

/**
 * Assert navigation was called with expected arguments
 * @param {Object} navigation - Navigation mock object
 * @param {string} screenName - Expected screen name
 * @param {Object} params - Expected params
 */
export const expectNavigationCalledWith = (navigation, screenName, params = undefined) => {
  if (params !== undefined) {
    expect(navigation.navigate).toHaveBeenCalledWith(screenName, params);
  } else {
    expect(navigation.navigate).toHaveBeenCalledWith(screenName);
  }
};

/**
 * Assert navigation was called N times
 * @param {Object} navigation - Navigation mock object
 * @param {number} times - Expected number of calls
 */
export const expectNavigationCalledTimes = (navigation, times) => {
  expect(navigation.navigate).toHaveBeenCalledTimes(times);
};

/**
 * Reset all navigation mocks
 * @param {Object} navigation - Navigation mock object
 */
export const resetNavigationMocks = (navigation) => {
  Object.keys(navigation).forEach((key) => {
    if (typeof navigation[key] === 'function' && navigation[key].mockClear) {
      navigation[key].mockClear();
    }
  });
};

/**
 * Create a mock navigation container for testing
 * @param {React.Component} children - Components to wrap
 * @param {Object} initialState - Initial navigation state
 * @returns {React.Component} Wrapped component
 */
export const MockNavigationContainer = ({ children, initialState }) => {
  const React = require('react');
  const { NavigationContainer } = require('@react-navigation/native');

  return React.createElement(NavigationContainer, { initialState }, children);
};

/**
 * Helper to simulate navigation events
 * @param {Object} navigation - Navigation mock
 * @param {string} eventName - Event name (focus, blur, etc)
 * @param {Object} data - Event data
 */
export const simulateNavigationEvent = (navigation, eventName, data = {}) => {
  const listeners = navigation.addListener.mock.calls
    .filter((call) => call[0] === eventName)
    .map((call) => call[1]);

  listeners.forEach((listener) => listener(data));
};
