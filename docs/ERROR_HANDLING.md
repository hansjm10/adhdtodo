# Error Handling Patterns

This document describes the centralized error handling patterns implemented in the ADHD Todo app.

## Overview

The app uses a centralized error handling approach to ensure consistent error logging, user-friendly error messages, and proper error recovery mechanisms. This replaces the previously duplicated pattern of `catch (error) { if (global.__DEV__) { console.error(...) } }` found throughout the codebase.

## Core Components

### 1. BaseService

All service classes should extend `BaseService` to inherit centralized error handling capabilities.

```typescript
import { BaseService } from './BaseService';

class MyService extends BaseService {
  constructor() {
    super('MyService');
  }

  async performOperation(): Promise<Result<Data>> {
    return this.wrapAsync(
      'performOperation',
      async () => {
        // Your async logic here
        return data;
      },
      { userId: this.userId }, // Optional context
    );
  }
}
```

**Key Features:**

- Automatic error logging with SecureLogger
- Standardized error response format
- Development vs production error messages
- Context-aware error handling

### 2. ErrorHandler Utility

For non-service error handling, use the `ErrorHandler` utility or its exported functions.

```typescript
import ErrorHandler, { handleError, logError } from '../utils/ErrorHandler';

// Handle and convert errors to ErrorResponse
const errorResponse = handleError(error, 'ComponentName');

// Log errors with context
logError('OperationName', error);

// Show user-friendly error alerts
ErrorHandler.showError('Something went wrong', retryFunction);

// Handle specific error types
ErrorHandler.handleStorageError(error, 'save', retryFunction);
ErrorHandler.handleNetworkError(error, retryFunction);
```

### 3. Error Boundaries

Use error boundaries to catch React component errors and provide recovery UI.

#### ErrorBoundary

For synchronous React errors:

```tsx
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary
  onError={(error, errorInfo) => {
    // Optional error handler
  }}
  showDetails={__DEV__} // Show error details in development
>
  <YourComponent />
</ErrorBoundary>;
```

#### AsyncErrorBoundary

For unhandled promise rejections:

```tsx
import AsyncErrorBoundary from '../components/AsyncErrorBoundary';

<AsyncErrorBoundary
  onError={(error) => {
    // Optional error handler
  }}
  maxRetries={3}
  retryDelay={1000}
>
  <YourAsyncComponent />
</AsyncErrorBoundary>;
```

## Migration Guide

### Before (Old Pattern)

```typescript
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  if (global.__DEV__) {
    console.error('Operation failed:', error);
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

### After (New Pattern)

#### For Services

```typescript
class MyService extends BaseService {
  async someOperation(): Promise<Result<Data>> {
    return this.wrapAsync('someOperation', async () => {
      const result = await performOperation();
      return result;
    });
  }
}
```

#### For Components

```typescript
import { logError } from '../utils/ErrorHandler';

try {
  await someOperation();
} catch (error) {
  logError('ComponentName', error);
  // Handle UI updates
}
```

## Error Response Format

All errors follow a consistent format:

```typescript
interface ErrorResponse {
  code: string; // Unique error code (e.g., "AUTH_LOGIN_ERROR")
  message: string; // User-friendly message
  details?: Record<string, unknown>; // Additional details (dev only)
}
```

## Best Practices

1. **Always extend BaseService** for service classes
2. **Use appropriate error boundaries** around components that might throw
3. **Provide context** when handling errors (operation name, relevant IDs, etc.)
4. **Use retry functions** for transient errors (network, storage)
5. **Keep error messages user-friendly** - technical details are logged separately
6. **Test error scenarios** - ensure error handling works as expected

## ADHD-Friendly Error Handling

The error handling system is designed with ADHD users in mind:

- **Clear, encouraging messages** instead of technical jargon
- **Retry options** for easy recovery from mistakes
- **Visual feedback** with emojis and clear UI
- **Minimal cognitive load** - users don't need to understand what went wrong
- **Quick recovery** - one-tap retry or reset options

## Security Considerations

- **SecureLogger** sanitizes sensitive information before logging
- Production builds never expose technical error details to users
- Error codes are logged for debugging without exposing system internals
- No sensitive data (passwords, tokens, etc.) in error messages

## Examples

### Service with Error Handling

```typescript
export class TaskStorageService extends BaseService {
  constructor() {
    super('TaskStorage');
  }

  async saveTask(task: Task): Promise<Result<Task>> {
    return this.wrapAsync(
      'saveTask',
      async () => {
        const validated = validateTask(task);
        await AsyncStorage.setItem(`task_${task.id}`, JSON.stringify(validated));
        return validated;
      },
      { taskId: task.id },
    );
  }
}
```

### Component with Error Boundary

```tsx
const TaskListScreen = () => {
  return (
    <ErrorBoundary>
      <AsyncErrorBoundary>
        <TaskList />
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
};
```

### Manual Error Handling

```typescript
const handleSubmit = async () => {
  try {
    await saveData();
  } catch (error) {
    const errorResponse = handleError(error, 'TaskForm');
    ErrorHandler.showError(
      errorResponse.message,
      () => handleSubmit(), // Retry function
    );
  }
};
```

## Testing Error Handling

See the test files for examples:

- `src/services/__tests__/BaseService.test.js`
- `src/utils/__tests__/ErrorHandler.test.js`
- `src/components/__tests__/ErrorBoundary.test.js`
- `src/components/__tests__/AsyncErrorBoundary.test.js`

These tests demonstrate proper usage and expected behavior of the error handling system.
