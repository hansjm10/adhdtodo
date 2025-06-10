# Error Recovery Patterns

This document outlines standard patterns for handling `Result<T>` return types from BaseService-based services in the ADHD Todo application.

## Overview

All services that extend `BaseService` return `Result<T>` objects instead of throwing exceptions. This provides consistent error handling and better error tracking across the application.

## Result Type

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

interface ErrorResponse {
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
}
```

## Component-Level Error Handling Patterns

### Pattern 1: Basic Error Handling with User Feedback

```typescript
const handleTaskCreate = async () => {
  const result = await TaskStorageService.createTask(taskData);

  if (result.success && result.data) {
    // Handle success
    navigation.navigate('TaskList');
  } else {
    // Show user-friendly error
    Alert.alert('Error', result.error?.message || 'Failed to create task');
  }
};
```

### Pattern 2: Loading States with Error Recovery

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  setLoading(true);
  setError(null);

  const result = await PartnershipService.getUserPartnerships(userId);

  if (result.success && result.data) {
    setPartnerships(result.data);
  } else {
    setError(result.error?.message || 'Failed to load partnerships');
    // Optionally retry or fallback to cached data
  }

  setLoading(false);
};
```

### Pattern 3: Context-Level Error Handling

```typescript
const startEditingSession = async (taskId: string) => {
  const sessionResult = await CollaborativeEditingService.startEditSession(taskId, user.id);

  if (sessionResult.success && sessionResult.data) {
    dispatch({
      type: 'START_SESSION',
      payload: { taskId, session: sessionResult.data },
    });
  } else {
    // Log error for debugging
    logger.error('Failed to start editing session', {
      code: 'COLLAB_START_FAILED',
      context: sessionResult.error?.message ?? 'Unknown error',
    });

    // Update UI state to show disconnected
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { isConnected: false },
    });
  }
};
```

### Pattern 4: Retry with Exponential Backoff

```typescript
const executeWithRetry = async <T>(
  operation: () => Promise<Result<T>>,
  maxRetries = 3,
): Promise<Result<T>> => {
  let lastResult: Result<T> = {
    success: false,
    error: { message: 'Operation failed', code: 'UNKNOWN' },
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await operation();

    if (lastResult.success) {
      return lastResult;
    }

    // Don't retry on client errors (4xx)
    if (
      lastResult.error?.statusCode &&
      lastResult.error.statusCode >= 400 &&
      lastResult.error.statusCode < 500
    ) {
      break;
    }

    // Exponential backoff
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult;
};
```

### Pattern 5: Graceful Degradation

```typescript
const loadUserProfile = async () => {
  const result = await UserStorageService.getUserProfile(userId);

  if (result.success && result.data) {
    setUserProfile(result.data);
  } else {
    // Fall back to cached data
    const cachedProfile = await getCachedProfile(userId);
    if (cachedProfile) {
      setUserProfile(cachedProfile);
      setIsOfflineMode(true);
    } else {
      // Show limited functionality
      setIsLimitedMode(true);
    }
  }
};
```

## Service-Level Patterns

### Pattern 1: Wrapping External API Calls

```typescript
class MyService extends BaseService {
  async fetchData(id: string): Promise<Result<Data>> {
    return this.wrapAsync(
      'fetchData',
      async () => {
        const response = await externalAPI.get(`/data/${id}`);
        if (!response.data) {
          throw new Error('No data returned');
        }
        return response.data;
      },
      { dataId: id }, // Context for error logging
    );
  }
}
```

### Pattern 2: Chaining Operations with Error Propagation

```typescript
async updateTaskWithNotification(
  taskId: string,
  updates: TaskUpdate
): Promise<Result<Task>> {
  // Update task
  const updateResult = await this.updateTask(taskId, updates);
  if (!updateResult.success) {
    return updateResult;
  }

  // Send notification
  const notifyResult = await NotificationService.sendTaskUpdate(
    updateResult.data!
  );
  if (!notifyResult.success) {
    // Log notification failure but don't fail the whole operation
    this.logger.warn('Failed to send notification', {
      code: 'TASK_NOTIFY_FAILED',
      context: notifyResult.error,
    });
  }

  return updateResult;
}
```

## Testing Patterns

### Pattern 1: Testing Success Cases

```typescript
it('should create task successfully', async () => {
  const mockTask = createMockTask();
  mockSupabase.insert.mockResolvedValue({ data: mockTask, error: null });

  const result = await TaskService.createTask(mockTask);

  expect(result.success).toBe(true);
  expect(result.data).toEqual(mockTask);
  expect(result.error).toBeUndefined();
});
```

### Pattern 2: Testing Error Cases

```typescript
it('should handle database errors', async () => {
  mockSupabase.insert.mockResolvedValue({
    data: null,
    error: new Error('Database connection failed'),
  });

  const result = await TaskService.createTask(mockTask);

  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error?.message).toContain('Database connection failed');
  expect(result.error?.code).toContain('TASK_CREATE');
});
```

## Best Practices

1. **Always check `result.success`** before accessing `result.data`
2. **Provide fallback behavior** for critical operations
3. **Log errors with context** for debugging
4. **Show user-friendly messages** instead of technical errors
5. **Use proper TypeScript guards** when accessing optional properties
6. **Consider retry logic** for transient failures
7. **Implement circuit breakers** for external services
8. **Cache successful results** for offline support
9. **Test both success and failure paths**
10. **Document expected error codes** in service methods

## Common Error Codes

Each service uses a consistent error code pattern:

- `{SERVICE}_{METHOD}_{ERROR_NUMBER}`
- Example: `TASK_CREATE_001`, `AUTH_LOGIN_002`

This helps with debugging and error tracking in production.
