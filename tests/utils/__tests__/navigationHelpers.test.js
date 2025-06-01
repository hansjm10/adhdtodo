// ABOUTME: Tests for navigation testing helpers
// Verifies that navigation mocks work correctly for React Navigation

import {
  createNavigationMock,
  createRouteMock,
  createNavigationState,
  createUseNavigationMock,
  createUseRouteMock,
  createUseFocusEffectMock,
  createUseIsFocusedMock,
  expectNavigationCalledWith,
  expectNavigationCalledTimes,
  resetNavigationMocks,
  simulateNavigationEvent,
} from '../navigationHelpers';

describe('Navigation Helpers', () => {
  describe('createNavigationMock', () => {
    it('should create a navigation mock with all methods', () => {
      const navigation = createNavigationMock();

      // Check all navigation methods exist and are mocks
      expect(navigation.navigate).toBeDefined();
      expect(navigation.navigate).toHaveBeenCalledTimes(0);
      expect(navigation.goBack).toBeDefined();
      expect(navigation.setOptions).toBeDefined();
      expect(navigation.setParams).toBeDefined();
      expect(navigation.dispatch).toBeDefined();
      expect(navigation.reset).toBeDefined();
      expect(navigation.replace).toBeDefined();
      expect(navigation.push).toBeDefined();
      expect(navigation.pop).toBeDefined();
      expect(navigation.popToTop).toBeDefined();
      expect(navigation.canGoBack).toBeDefined();
      expect(navigation.isFocused).toBeDefined();
      expect(navigation.addListener).toBeDefined();
      expect(navigation.removeListener).toBeDefined();
      expect(navigation.getState).toBeDefined();
      expect(navigation.getParent).toBeDefined();
    });

    it('should return expected values from methods', () => {
      const navigation = createNavigationMock();

      expect(navigation.canGoBack()).toBe(true);
      expect(navigation.isFocused()).toBe(true);
      expect(navigation.getParent()).toBe(null);

      const state = navigation.getState();
      expect(state).toHaveProperty('routeNames');
      expect(state).toHaveProperty('index');
      expect(state).toHaveProperty('routes');
    });

    it('should allow overriding methods', () => {
      const customNavigate = jest.fn();
      const navigation = createNavigationMock({
        navigate: customNavigate,
        canGoBack: jest.fn(() => false),
      });

      expect(navigation.navigate).toBe(customNavigate);
      expect(navigation.canGoBack()).toBe(false);
    });

    it('should handle event listeners', () => {
      const navigation = createNavigationMock();
      const listener = jest.fn();

      const unsubscribe = navigation.addListener('focus', listener);
      expect(navigation.addListener).toHaveBeenCalledWith('focus', listener);
      expect(unsubscribe.remove).toBeDefined();
    });
  });

  describe('createRouteMock', () => {
    it('should create a route with default values', () => {
      const route = createRouteMock();

      expect(route).toHaveProperty('params', {});
      expect(route).toHaveProperty('key');
      expect(route).toHaveProperty('name', 'TestScreen');
      expect(route).toHaveProperty('path', '/test');
      expect(route.key).toMatch(/^test-route-\d+$/);
    });

    it('should accept params', () => {
      const params = { id: '123', title: 'Test' };
      const route = createRouteMock(params);

      expect(route.params).toEqual(params);
    });

    it('should allow overriding properties', () => {
      const route = createRouteMock(
        {},
        {
          name: 'CustomScreen',
          path: '/custom',
        },
      );

      expect(route.name).toBe('CustomScreen');
      expect(route.path).toBe('/custom');
    });
  });

  describe('createNavigationState', () => {
    it('should create default navigation state', () => {
      const state = createNavigationState();

      expect(state).toEqual({
        type: 'stack',
        key: 'stack-1',
        routeNames: ['TasksList'],
        routes: [{ name: 'TasksList', key: 'TasksList-1' }],
        index: 0,
        stale: false,
      });
    });

    it('should accept custom routes', () => {
      const routes = [
        { name: 'Home', key: 'Home-1' },
        { name: 'Profile', key: 'Profile-1' },
      ];

      const state = createNavigationState(routes, 1);

      expect(state.routes).toEqual(routes);
      expect(state.routeNames).toEqual(['Home', 'Profile']);
      expect(state.index).toBe(1);
    });
  });

  describe('Hook mocks', () => {
    it('should create useNavigation mock', () => {
      const navigation = createNavigationMock();
      const useNavigation = createUseNavigationMock(navigation);

      expect(useNavigation()).toBe(navigation);
    });

    it('should create useRoute mock', () => {
      const route = createRouteMock({ id: '123' });
      const useRoute = createUseRouteMock(route);

      expect(useRoute()).toBe(route);
    });

    it('should create useFocusEffect mock', () => {
      const useFocusEffect = createUseFocusEffectMock();
      const callback = jest.fn();

      useFocusEffect(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should create useIsFocused mock', () => {
      const useIsFocused = createUseIsFocusedMock(false);

      expect(useIsFocused()).toBe(false);
    });
  });

  describe('Assertion helpers', () => {
    it('should assert navigation was called correctly', () => {
      const navigation = createNavigationMock();

      navigation.navigate('TestScreen', { id: '123' });

      expectNavigationCalledWith(navigation, 'TestScreen', { id: '123' });

      navigation.navigate('OtherScreen');

      expectNavigationCalledWith(navigation, 'OtherScreen');
    });

    it('should assert navigation call count', () => {
      const navigation = createNavigationMock();

      navigation.navigate('Screen1');
      navigation.navigate('Screen2');

      expectNavigationCalledTimes(navigation, 2);
    });
  });

  describe('resetNavigationMocks', () => {
    it('should reset all navigation mocks', () => {
      const navigation = createNavigationMock();

      navigation.navigate('Test');
      navigation.goBack();
      navigation.setOptions({});

      expect(navigation.navigate).toHaveBeenCalledTimes(1);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
      expect(navigation.setOptions).toHaveBeenCalledTimes(1);

      resetNavigationMocks(navigation);

      expect(navigation.navigate).toHaveBeenCalledTimes(0);
      expect(navigation.goBack).toHaveBeenCalledTimes(0);
      expect(navigation.setOptions).toHaveBeenCalledTimes(0);
    });
  });

  describe('simulateNavigationEvent', () => {
    it('should simulate navigation events', () => {
      const navigation = createNavigationMock();
      const focusListener = jest.fn();
      const blurListener = jest.fn();

      navigation.addListener('focus', focusListener);
      navigation.addListener('blur', blurListener);

      simulateNavigationEvent(navigation, 'focus', { data: 'test' });

      expect(focusListener).toHaveBeenCalledWith({ data: 'test' });
      expect(blurListener).not.toHaveBeenCalled();

      simulateNavigationEvent(navigation, 'blur');

      expect(blurListener).toHaveBeenCalled();
    });
  });
});
