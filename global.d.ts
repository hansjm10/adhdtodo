/* eslint-disable no-var */
declare var __DEV__: boolean;

// Window declarations for React Native compatibility
interface Window {
  addEventListener(
    type: 'unhandledrejection',
    listener: (event: PromiseRejectionEvent) => void,
  ): void;
  removeEventListener(
    type: 'unhandledrejection',
    listener: (event: PromiseRejectionEvent) => void,
  ): void;
}

interface PromiseRejectionEvent extends Event {
  readonly promise: Promise<unknown>;
  readonly reason: unknown;
  preventDefault(): void;
}

declare var window: Window | undefined;
