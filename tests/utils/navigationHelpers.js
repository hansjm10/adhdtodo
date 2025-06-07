// ABOUTME: Navigation testing helpers for mocking Expo Router
// Provides utilities to create router and search params mocks for testing

/**
 * Create a mock router object with all common router methods
 * @param {Object} overrides - Methods to override
 * @returns {Object} Mock router object
 */
export const createRouterMock = (overrides = {}) => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  const canGoBack = jest.fn(() => true);
  const setParams = jest.fn();
  const navigate = jest.fn();
  const dismiss = jest.fn();
  const dismissAll = jest.fn();

  return {
    push,
    replace,
    back,
    canGoBack,
    setParams,
    navigate,
    dismiss,
    dismissAll,
    // Override with custom implementations if needed
    ...overrides,
  };
};

/**
 * Create a mock search params object
 * @param {Object} params - Search parameters
 * @returns {Object} Mock search params object
 */
export const createSearchParamsMock = (params = {}) => {
  return { ...params };
};

/**
 * Create a mock for useRouter hook
 * @param {Object} routerMock - Router mock to return
 * @returns {Function} Mock hook
 */
export const createUseRouterMock = (routerMock = null) => {
  return () => routerMock || createRouterMock();
};

/**
 * Create a mock for useLocalSearchParams hook
 * @param {Object} paramsMock - Params mock to return
 * @returns {Function} Mock hook
 */
export const createUseLocalSearchParamsMock = (paramsMock = null) => {
  return () => paramsMock || createSearchParamsMock();
};

/**
 * Create a mock for useSearchParams hook
 * @param {Object} paramsMock - Params mock to return
 * @returns {Function} Mock hook
 */
export const createUseSearchParamsMock = (paramsMock = null) => {
  return () => paramsMock || createSearchParamsMock();
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
 * Create a mock for usePathname hook
 * @param {string} pathname - Current pathname
 * @returns {Function} Mock hook
 */
export const createUsePathnameMock = (pathname = '/') => {
  return () => pathname;
};

/**
 * Create a mock for useSegments hook
 * @param {Array} segments - Current segments
 * @returns {Function} Mock hook
 */
export const createUseSegmentsMock = (segments = []) => {
  return () => segments;
};

/**
 * Assert router push was called with expected arguments
 * @param {Object} router - Router mock object
 * @param {string} href - Expected href
 * @param {Object} params - Expected params
 */
export const expectRouterPushCalledWith = (router, href, params = undefined) => {
  if (params !== undefined) {
    expect(router.push).toHaveBeenCalledWith({ pathname: href, params });
  } else {
    expect(router.push).toHaveBeenCalledWith(href);
  }
};

/**
 * Assert router replace was called with expected arguments
 * @param {Object} router - Router mock object
 * @param {string} href - Expected href
 * @param {Object} params - Expected params
 */
export const expectRouterReplaceCalledWith = (router, href, params = undefined) => {
  if (params !== undefined) {
    expect(router.replace).toHaveBeenCalledWith({ pathname: href, params });
  } else {
    expect(router.replace).toHaveBeenCalledWith(href);
  }
};

/**
 * Assert router was called N times
 * @param {Object} router - Router mock object
 * @param {string} method - Method name (push, replace, etc)
 * @param {number} times - Expected number of calls
 */
export const expectRouterCalledTimes = (router, method, times) => {
  expect(router[method]).toHaveBeenCalledTimes(times);
};

/**
 * Reset all router mocks
 * @param {Object} router - Router mock object
 */
export const resetRouterMocks = (router) => {
  if (!router || typeof router !== 'object') {
    return;
  }

  Object.keys(router).forEach((key) => {
    if (typeof router[key] === 'function' && router[key].mockClear) {
      router[key].mockClear();
    }
  });
};

/**
 * Helper to simulate focus effect
 * @param {Function} useFocusEffect - Mock useFocusEffect hook
 * @param {Function} callback - Callback to execute
 */
export const simulateFocusEffect = (useFocusEffect, callback) => {
  useFocusEffect(callback);
};

// Backwards compatibility aliases for easier migration
export const createNavigationMock = createRouterMock;
export const expectNavigationCalledWith = expectRouterPushCalledWith;
export const expectNavigationCalledTimes = (navigation, times) =>
  expectRouterCalledTimes(navigation, 'push', times);
export const resetNavigationMocks = resetRouterMocks;
