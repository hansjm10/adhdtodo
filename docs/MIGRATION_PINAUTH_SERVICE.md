# PINAuthService Migration Guide

## Overview

As part of PR #152 (Phase 2 - Migrate feature services to BaseService error handling), the `PINAuthService` has undergone a significant refactoring that introduces breaking changes. This guide will help you migrate your code to work with the new implementation.

## Breaking Changes

### 1. Static to Instance Methods

The most significant change is the conversion from static methods to instance-based methods using the singleton pattern.

#### Before:

```typescript
import { PINAuthService } from './services/PINAuthService';

// Static method calls
const result = await PINAuthService.setupPIN(userId, pin);
const isValid = await PINAuthService.verifyPIN(userId, pin);
```

#### After:

```typescript
import PINAuthService from './services/PINAuthService';

// Instance method calls (singleton)
const result = await PINAuthService.setupPIN(userId, pin);
const isValid = await PINAuthService.verifyPIN(userId, pin);
```

### 2. Import Statement Change

The service is now exported as a default export instead of a named export.

#### Before:

```typescript
import { PINAuthService } from './services/PINAuthService';
```

#### After:

```typescript
import PINAuthService from './services/PINAuthService';
```

### 3. Return Type Changes

All async methods now return `Result<T>` types instead of raw values, requiring proper error handling.

#### Before:

```typescript
const isValid = await PINAuthService.verifyPIN(userId, pin);
if (isValid) {
  // PIN is valid
}
```

#### After:

```typescript
const result = await PINAuthService.verifyPIN(userId, pin);
if (result.success && result.data) {
  // PIN is valid
} else {
  // Handle error
  console.error('PIN verification failed:', result.error?.message);
}
```

## Migration Steps

### 1. Update Imports

Search for all instances of PINAuthService imports and update them:

```bash
# Find all files importing PINAuthService
grep -r "import.*PINAuthService.*from" src/

# Update from:
import { PINAuthService } from './services/PINAuthService';
# To:
import PINAuthService from './services/PINAuthService';
```

### 2. Update Method Calls

No changes needed to method calls themselves, as the singleton instance maintains the same API surface.

### 3. Update Error Handling

All method calls now return `Result<T>` objects. Update your error handling:

```typescript
// Example: setupPIN
const result = await PINAuthService.setupPIN(userId, pin);
if (result.success) {
  // Success - no data returned for setupPIN
} else {
  // Handle error
  logger.error('Failed to setup PIN', { error: result.error });
}

// Example: verifyPIN
const result = await PINAuthService.verifyPIN(userId, pin);
if (result.success && result.data === true) {
  // PIN is valid
} else {
  // PIN is invalid or error occurred
}

// Example: recordFailedPINAttempt
const attemptsResult = await PINAuthService.recordFailedPINAttempt();
const attempts = attemptsResult.success ? (attemptsResult.data ?? 0) : 0;
```

### 4. Update Tests

Test files need to be updated to handle the new return types:

```typescript
// Before:
expect(await PINAuthService.verifyPIN(userId, pin)).toBe(true);

// After:
const result = await PINAuthService.verifyPIN(userId, pin);
expect(result.success).toBe(true);
expect(result.data).toBe(true);
```

## Complete Method Reference

All methods now return `Result<T>` types:

- `setupPIN(userId: string, pin: string): Promise<Result<void>>`
- `verifyPIN(userId: string, pin: string): Promise<Result<boolean>>`
- `updatePIN(userId: string, currentPIN: string, newPIN: string): Promise<Result<void>>`
- `removePIN(userId: string): Promise<Result<void>>`
- `hasPIN(userId: string): Promise<Result<boolean>>`
- `recordFailedPINAttempt(): Promise<Result<number>>` - Returns attempt count
- `resetFailedPINAttempts(): Promise<Result<void>>`
- `isPINLocked(): Promise<Result<boolean>>`
- `validatePINFormat(pin: string): Result<boolean>`
- `hashPIN(pin: string): Promise<Result<string>>`

## Benefits of the Migration

1. **Centralized Error Handling**: All errors are now logged consistently through BaseService
2. **Better Error Context**: Errors include context information for debugging
3. **Type Safety**: Result<T> types ensure proper error handling at compile time
4. **Consistent Pattern**: Aligns with other services in the codebase

## Rollback Strategy

If you need to temporarily maintain backward compatibility:

1. Create a compatibility wrapper that exports static methods
2. Gradually migrate code to use the new pattern
3. Remove the wrapper once all code is migrated

## Support

For questions or issues related to this migration, please:

1. Check the PR #152 discussion
2. Review the test files for usage examples
3. Contact the maintainers if you encounter unexpected issues
