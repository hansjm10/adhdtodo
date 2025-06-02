// ABOUTME: Tests for navigation testing helpers
// Verifies that router mocks work correctly for Expo Router

import {
  createRouterMock,
  createSearchParamsMock,
  createUseRouterMock,
  createUseLocalSearchParamsMock,
  createUseSearchParamsMock,
  createUseFocusEffectMock,
  createUsePathnameMock,
  createUseSegmentsMock,
  expectRouterPushCalledWith,
  expectRouterReplaceCalledWith,
  expectRouterCalledTimes,
  resetRouterMocks,
  simulateFocusEffect,
  // Backwards compatibility aliases
  createNavigationMock,
  expectNavigationCalledWith,
  expectNavigationCalledTimes,
  resetNavigationMocks,
} from '../navigationHelpers';

describe('Navigation Helpers', () => {
  describe('createRouterMock', () => {
    it('should create a router mock with all methods', () => {
      const router = createRouterMock();

      // Check all router methods exist and are mocks
      expect(router.push).toBeDefined();
      expect(router.push).toHaveBeenCalledTimes(0);
      expect(router.replace).toBeDefined();
      expect(router.back).toBeDefined();
      expect(router.canGoBack).toBeDefined();
      expect(router.setParams).toBeDefined();
      expect(router.navigate).toBeDefined();
      expect(router.dismiss).toBeDefined();
      expect(router.dismissAll).toBeDefined();
    });

    it('should return expected values from methods', () => {
      const router = createRouterMock();

      expect(router.canGoBack()).toBe(true);
    });

    it('should allow overriding methods', () => {
      const customPush = jest.fn();
      const router = createRouterMock({
        push: customPush,
        canGoBack: jest.fn(() => false),
      });

      expect(router.push).toBe(customPush);
      expect(router.canGoBack()).toBe(false);
    });
  });

  describe('createSearchParamsMock', () => {
    it('should create search params with default values', () => {
      const params = createSearchParamsMock();

      expect(params).toEqual({});
    });

    it('should accept params', () => {
      const searchParams = { id: '123', title: 'Test' };
      const params = createSearchParamsMock(searchParams);

      expect(params).toEqual(searchParams);
    });
  });

  describe('Hook mocks', () => {
    it('should create useRouter mock', () => {
      const router = createRouterMock();
      const useRouter = createUseRouterMock(router);

      expect(useRouter()).toBe(router);
    });

    it('should create useLocalSearchParams mock', () => {
      const params = createSearchParamsMock({ id: '123' });
      const useLocalSearchParams = createUseLocalSearchParamsMock(params);

      expect(useLocalSearchParams()).toBe(params);
    });

    it('should create useSearchParams mock', () => {
      const params = createSearchParamsMock({ id: '123' });
      const useSearchParams = createUseSearchParamsMock(params);

      expect(useSearchParams()).toBe(params);
    });

    it('should create useFocusEffect mock', () => {
      const useFocusEffect = createUseFocusEffectMock();
      const callback = jest.fn();

      useFocusEffect(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should create usePathname mock', () => {
      const usePathname = createUsePathnameMock('/test');

      expect(usePathname()).toBe('/test');
    });

    it('should create useSegments mock', () => {
      const useSegments = createUseSegmentsMock(['profile', 'settings']);

      expect(useSegments()).toEqual(['profile', 'settings']);
    });
  });

  describe('Assertion helpers', () => {
    it('should assert router push was called correctly', () => {
      const router = createRouterMock();

      router.push({ pathname: '/test', params: { id: '123' } });

      expectRouterPushCalledWith(router, '/test', { id: '123' });

      router.push('/other');

      expectRouterPushCalledWith(router, '/other');
    });

    it('should assert router replace was called correctly', () => {
      const router = createRouterMock();

      router.replace({ pathname: '/test', params: { id: '123' } });

      expectRouterReplaceCalledWith(router, '/test', { id: '123' });

      router.replace('/other');

      expectRouterReplaceCalledWith(router, '/other');
    });

    it('should assert router call count', () => {
      const router = createRouterMock();

      router.push('/screen1');
      router.push('/screen2');

      expectRouterCalledTimes(router, 'push', 2);

      router.replace('/screen3');

      expectRouterCalledTimes(router, 'replace', 1);
    });
  });

  describe('resetRouterMocks', () => {
    it('should reset all router mocks', () => {
      const router = createRouterMock();

      router.push('/test');
      router.back();
      router.setParams({});

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.setParams).toHaveBeenCalledTimes(1);

      resetRouterMocks(router);

      expect(router.push).toHaveBeenCalledTimes(0);
      expect(router.back).toHaveBeenCalledTimes(0);
      expect(router.setParams).toHaveBeenCalledTimes(0);
    });
  });

  describe('simulateFocusEffect', () => {
    it('should simulate focus effect', () => {
      const useFocusEffect = createUseFocusEffectMock();
      const callback = jest.fn();

      simulateFocusEffect(useFocusEffect, callback);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Backwards compatibility', () => {
    it('should support legacy navigation mock creation', () => {
      const navigation = createNavigationMock();

      expect(navigation.push).toBeDefined();
      expect(navigation.replace).toBeDefined();
      expect(navigation.back).toBeDefined();
    });

    it('should support legacy expectNavigationCalledWith', () => {
      const navigation = createNavigationMock();

      navigation.push('/test');

      expectNavigationCalledWith(navigation, '/test');
    });

    it('should support legacy expectNavigationCalledTimes', () => {
      const navigation = createNavigationMock();

      navigation.push('/test1');
      navigation.push('/test2');

      expectNavigationCalledTimes(navigation, 2);
    });

    it('should support legacy resetNavigationMocks', () => {
      const navigation = createNavigationMock();

      navigation.push('/test');
      expect(navigation.push).toHaveBeenCalledTimes(1);

      resetNavigationMocks(navigation);

      expect(navigation.push).toHaveBeenCalledTimes(0);
    });
  });
});
