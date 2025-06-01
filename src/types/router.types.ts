// ABOUTME: TypeScript type definitions for Expo Router
// Defines route params for type-safe navigation with file-based routing

// Route params for different screens
export interface RouteParams {
  // Task routes
  '/task/create': {
    category?: string;
  };
  '/task/[id]': {
    id: string;
    task?: string; // JSON stringified task for editing
  };

  // Focus modes
  '/(tabs)/hyperfocus': {
    taskId?: string;
  };

  // Partnership routes
  '/profile/partnership/assign': {
    taskId?: string;
  };
}

// Type-safe route paths
export type AppRoutes =
  | '/(auth)/sign-in'
  | '/(tabs)'
  | '/(tabs)/focus'
  | '/(tabs)/hyperfocus'
  | '/(tabs)/scattered'
  | '/profile'
  | '/profile/partnership'
  | '/profile/partnership/invite'
  | '/profile/partnership/dashboard'
  | '/profile/partnership/assign'
  | '/task/create'
  | '/task/[id]'
  | '/notifications';

// Helper type for route params
export type RouteParamsFor<T extends keyof RouteParams> = RouteParams[T];
