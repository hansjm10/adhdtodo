# BaseService Migration Guide

This guide helps developers migrate existing services to use the BaseService pattern for centralized error handling and consistent Result<T> return types.

## Overview

BaseService provides:

- Centralized error handling and logging
- Consistent Result<T> return types
- Automatic error code generation
- Context-aware error tracking
- Simplified error propagation

## Migration Steps

### Step 1: Extend BaseService

Change your service from a standalone class to extending BaseService:

**Before:**

```typescript
class MyService {
  private logger = SecureLogger;

  async doSomething(): Promise<string> {
    // Implementation
  }
}
```

**After:**

```typescript
import { BaseService } from './BaseService';
import type { Result } from '../types/common.types';

class MyService extends BaseService {
  constructor() {
    super('MyService'); // Service name for error codes
  }

  async doSomething(): Promise<Result<string>> {
    // Implementation
  }
}
```

### Step 2: Update Method Signatures

Change all public async methods to return `Result<T>`:

**Before:**

```typescript
async createItem(data: ItemData): Promise<Item> {
  const item = await database.create(data);
  return item;
}

async getItem(id: string): Promise<Item | null> {
  const item = await database.findById(id);
  return item;
}

async deleteItem(id: string): Promise<void> {
  await database.delete(id);
}
```

**After:**

```typescript
async createItem(data: ItemData): Promise<Result<Item>> {
  // Implementation with wrapAsync
}

async getItem(id: string): Promise<Result<Item | null>> {
  // Implementation with wrapAsync
}

async deleteItem(id: string): Promise<Result<boolean>> {
  // Implementation with wrapAsync
}
```

### Step 3: Wrap Method Implementations

Use `wrapAsync` for async operations and `wrapSync` for synchronous operations:

**Before:**

```typescript
async createItem(data: ItemData): Promise<Item> {
  try {
    const validated = this.validateData(data);
    const item = await database.create(validated);
    this.logger.info('Item created', { id: item.id });
    return item;
  } catch (error) {
    this.logger.error('Failed to create item', error);
    throw error;
  }
}
```

**After:**

```typescript
async createItem(data: ItemData): Promise<Result<Item>> {
  return this.wrapAsync(
    'createItem', // Method name for error code
    async () => {
      const validated = this.validateData(data);
      const item = await database.create(validated);
      this.logger.info('Item created', { id: item.id });
      return item;
    },
    { itemType: data.type } // Context for error logging
  );
}
```

### Step 4: Update Error Handling

Replace try-catch blocks with Result checking:

**Before:**

```typescript
async processItems(): Promise<void> {
  try {
    const items = await this.getAllItems();
    for (const item of items) {
      await this.processItem(item);
    }
  } catch (error) {
    console.error('Processing failed:', error);
    throw new Error('Failed to process items');
  }
}
```

**After:**

```typescript
async processItems(): Promise<Result<boolean>> {
  return this.wrapAsync('processItems', async () => {
    const itemsResult = await this.getAllItems();
    if (!itemsResult.success) {
      throw new Error(`Failed to get items: ${itemsResult.error?.message}`);
    }

    for (const item of itemsResult.data!) {
      const processResult = await this.processItem(item);
      if (!processResult.success) {
        this.logger.warn('Failed to process item', {
          itemId: item.id,
          error: processResult.error,
        });
        // Continue processing other items
      }
    }

    return true;
  });
}
```

### Step 5: Handle Static Methods

Convert static methods to instance methods or create a singleton:

**Before:**

```typescript
class PINAuthService {
  static async verifyPIN(userId: string, pin: string): Promise<boolean> {
    // Implementation
  }
}

// Usage
const isValid = await PINAuthService.verifyPIN(userId, pin);
```

**After:**

```typescript
class PINAuthService extends BaseService {
  constructor() {
    super('PINAuth');
  }

  async verifyPIN(userId: string, pin: string): Promise<Result<boolean>> {
    return this.wrapAsync('verifyPIN', async () => {
      // Implementation
    });
  }
}

// Export singleton
export default new PINAuthService();

// Usage
const result = await PINAuthService.verifyPIN(userId, pin);
if (result.success && result.data) {
  // PIN is valid
}
```

### Step 6: Update Tests

Update test expectations to handle Result types:

**Before:**

```typescript
it('should create item', async () => {
  const item = await service.createItem(mockData);
  expect(item.id).toBeDefined();
});

it('should handle errors', async () => {
  mockDb.create.mockRejectedValue(new Error('DB Error'));
  await expect(service.createItem(mockData)).rejects.toThrow('DB Error');
});
```

**After:**

```typescript
it('should create item', async () => {
  const result = await service.createItem(mockData);
  expect(result.success).toBe(true);
  expect(result.data?.id).toBeDefined();
});

it('should handle errors', async () => {
  mockDb.create.mockRejectedValue(new Error('DB Error'));
  const result = await service.createItem(mockData);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('DB Error');
  expect(result.error?.code).toContain('MYSERVICE_CREATEITEM');
});
```

### Step 7: Update Consumers

Update all code that calls the service:

**Before:**

```typescript
try {
  const user = await UserService.getUser(userId);
  setUser(user);
} catch (error) {
  Alert.alert('Error', 'Failed to load user');
}
```

**After:**

```typescript
const result = await UserService.getUser(userId);
if (result.success && result.data) {
  setUser(result.data);
} else {
  Alert.alert('Error', result.error?.message || 'Failed to load user');
}
```

## Common Patterns

### Pattern 1: Maintaining Backward Compatibility

If you need to maintain backward compatibility temporarily:

```typescript
// New method returning Result
async getUserNew(id: string): Promise<Result<User | null>> {
  return this.wrapAsync('getUser', async () => {
    // Implementation
  });
}

// Deprecated method for backward compatibility
async getUser(id: string): Promise<User | null> {
  const result = await this.getUserNew(id);
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to get user');
  }
  return result.data || null;
}
```

### Pattern 2: Complex Operations

For operations with multiple steps:

```typescript
async complexOperation(data: ComplexData): Promise<Result<ComplexResult>> {
  return this.wrapAsync('complexOperation', async () => {
    // Step 1: Validate
    const validation = this.validateComplex(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.error}`);
    }

    // Step 2: Process
    const processed = await this.processData(validation.data);

    // Step 3: Save
    const saved = await this.saveResults(processed);

    return {
      processed,
      saved,
      timestamp: new Date(),
    };
  }, {
    dataSize: data.items.length,
    operation: 'complex',
  });
}
```

### Pattern 3: Synchronous Methods

For synchronous operations, use `wrapSync`:

```typescript
validateEmail(email: string): Result<boolean> {
  return this.wrapSync('validateEmail', () => {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }
    return true;
  });
}
```

## Checklist

- [ ] Service extends BaseService
- [ ] Constructor calls `super(serviceName)`
- [ ] All public async methods return `Result<T>`
- [ ] All method implementations use `wrapAsync` or `wrapSync`
- [ ] Error logging includes relevant context
- [ ] Static methods converted to instance methods
- [ ] Singleton pattern implemented if needed
- [ ] Tests updated to expect Result types
- [ ] All consumers updated to handle Result types
- [ ] No direct `throw` statements outside of wrap functions
- [ ] Backward compatibility maintained if needed

## Benefits After Migration

1. **Consistent Error Handling**: All errors follow the same pattern
2. **Better Debugging**: Error codes include service and method names
3. **No Uncaught Exceptions**: All errors are caught and wrapped
4. **Rich Error Context**: Errors include contextual information
5. **Easier Testing**: Predictable error responses
6. **Type Safety**: TypeScript ensures Result types are handled
7. **Centralized Logging**: All errors logged consistently
8. **Performance Tracking**: Easy to add metrics and monitoring

## Example: Complete Migration

Here's a complete example of migrating a service:

**Original Service:**

```typescript
// services/TodoService.ts
class TodoService {
  static async createTodo(text: string, userId: string): Promise<Todo> {
    if (!text || !userId) {
      throw new Error('Invalid input');
    }

    try {
      const todo = await database.todos.create({
        text,
        userId,
        completed: false,
        createdAt: new Date(),
      });

      await NotificationService.notifyTodoCreated(todo);

      return todo;
    } catch (error) {
      console.error('Failed to create todo:', error);
      throw error;
    }
  }
}
```

**Migrated Service:**

```typescript
// services/TodoService.ts
import { BaseService } from './BaseService';
import type { Result } from '../types/common.types';

class TodoService extends BaseService {
  constructor() {
    super('TodoService');
  }

  async createTodo(text: string, userId: string): Promise<Result<Todo>> {
    return this.wrapAsync(
      'createTodo',
      async () => {
        if (!text || !userId) {
          throw new Error('Invalid input: text and userId are required');
        }

        const todo = await database.todos.create({
          text,
          userId,
          completed: false,
          createdAt: new Date(),
        });

        // Non-critical operation - log but don't fail
        const notifyResult = await NotificationService.notifyTodoCreated(todo);
        if (!notifyResult.success) {
          this.logger.warn('Failed to send notification', {
            todoId: todo.id,
            error: notifyResult.error,
          });
        }

        return todo;
      },
      { userId, textLength: text.length },
    );
  }
}

export default new TodoService();
```

**Updated Consumer:**

```typescript
// Before
try {
  const todo = await TodoService.createTodo(text, userId);
  setTodos([...todos, todo]);
  Alert.alert('Success', 'Todo created!');
} catch (error) {
  Alert.alert('Error', error.message);
}

// After
const result = await TodoService.createTodo(text, userId);
if (result.success && result.data) {
  setTodos([...todos, result.data]);
  Alert.alert('Success', 'Todo created!');
} else {
  Alert.alert('Error', result.error?.message || 'Failed to create todo');
}
```

This completes the migration to BaseService pattern!
