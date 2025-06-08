/* eslint-disable no-var */
declare var __DEV__: boolean;

// Ensure PromiseRejectionEvent is available
interface PromiseRejectionEvent extends Event {
  readonly promise: Promise<unknown>;
  readonly reason: unknown;
}

// Ensure window has the event listeners we need
declare global {
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
}
