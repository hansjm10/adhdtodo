# ADHDTodo Codebase Refactoring Epic

## Executive Summary

This document outlines a comprehensive refactoring plan for the ADHDTodo codebase to improve maintainability, reduce code duplication, and establish consistent architectural patterns. The refactoring will be executed in four phases, prioritizing high-impact improvements while maintaining application stability.

## Current State Analysis

### Key Issues Identified

1. **Code Duplication**

   - Result interfaces duplicated across 3+ services
   - Error handling pattern repeated in 20+ files
   - Alert patterns duplicated across container components
   - Similar state management logic in multiple containers

2. **Architectural Inconsistencies**

   - Mixed service patterns (classes vs singleton objects)
   - Inconsistent export patterns (default vs named)
   - No shared base types or interfaces
   - No centralized error handling

3. **Legacy Dependencies**

   - Test utilities use React Navigation instead of Expo Router
   - `react-test-renderer` package no longer needed
   - Some dev dependencies may be redundant

4. **Testing Infrastructure**
   - Tests incompatible with Expo Router
   - Duplicated test setup code
   - Inconsistent mock patterns

## Proposed Architecture

### Core Principles

1. **DRY (Don't Repeat Yourself)**: Extract common patterns into reusable utilities
2. **Consistency**: Standardize patterns across similar components
3. **Type Safety**: Leverage TypeScript for better developer experience
4. **Testability**: Ensure all code is easily testable
5. **Modern APIs**: Use latest React Native and Expo patterns

### Architectural Patterns

#### 1. Shared Type System

```typescript
// src/types/common.types.ts
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field?: string;
  message: string;
  code: string;
}
```

#### 2. Service Architecture

```typescript
// src/services/BaseService.ts
export abstract class BaseService {
  protected handleError(error: unknown): ErrorResponse {
    // Centralized error handling
  }

  protected logError(operation: string, error: unknown): void {
    // Consistent error logging
  }
}

// All services extend BaseService
export class AuthService extends BaseService implements IAuthService {
  // Implementation
}
```

#### 3. Custom Hooks Pattern

```typescript
// src/hooks/useAlert.ts
export const useAlert = () => {
  const showError = (title: string, message: string) => {
    /* ... */
  };
  const showSuccess = (title: string, message: string) => {
    /* ... */
  };
  const showConfirmation = (config: ConfirmationConfig) => {
    /* ... */
  };

  return { showError, showSuccess, showConfirmation };
};

// src/hooks/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    /* ... */
  };
  const handleAsyncError = async (fn: () => Promise<void>) => {
    /* ... */
  };

  return { handleError, handleAsyncError };
};
```

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Establish core infrastructure for refactoring

#### Tasks:

1. **Create Shared Type Definitions** (2 days)

   - [ ] Create `src/types/common.types.ts`
   - [ ] Define Result<T>, ErrorResponse, ValidationResult interfaces
   - [ ] Create type guards for runtime validation
   - [ ] Add JSDoc documentation

2. **Update Test Infrastructure** (2 days)

   - [ ] Create Expo Router test utilities
   - [ ] Remove React Navigation from test utils
   - [ ] Update renderWithProviders for Expo Router
   - [ ] Create migration guide for test updates

3. **Create Error Handling Utilities** (1 day)

   - [ ] Implement BaseService class
   - [ ] Create centralized error logger
   - [ ] Add error boundary components
   - [ ] Document error handling patterns

4. **Clean Dependencies** (0.5 days)
   - [ ] Remove react-test-renderer
   - [ ] Audit and remove unused dependencies
   - [ ] Update package.json scripts
   - [ ] Verify build still works

**Deliverables**:

- Core type system established
- Test infrastructure compatible with Expo Router
- Error handling utilities ready
- Clean dependency tree

### Phase 2: Component Standardization (Week 2)

**Goal**: Reduce component duplication and establish patterns

#### Tasks:

1. **Extract Container Logic** (2 days)

   - [ ] Create useContainerLogic hook
   - [ ] Extract exit confirmation logic
   - [ ] Standardize navigation patterns
   - [ ] Update Focus, Hyperfocus, Scattered containers

2. **Create Alert Service** (1 day)

   - [ ] Implement useAlert hook
   - [ ] Create alert configuration types
   - [ ] Migrate existing alerts
   - [ ] Add haptic feedback support

3. **Standardize Component Patterns** (2 days)
   - [ ] Document component conventions
   - [ ] Create component template
   - [ ] Refactor inconsistent components
   - [ ] Update component tests

**Deliverables**:

- Reduced code duplication in containers
- Centralized alert system
- Consistent component architecture

### Phase 3: Service Architecture (Week 3)

**Goal**: Standardize service layer and reduce duplication

#### Tasks:

1. **Implement Base Service** (1 day)

   - [ ] Create BaseService class
   - [ ] Add common service methods
   - [ ] Implement error handling
   - [ ] Add logging capabilities

2. **Migrate Auth Services** (2 days)

   - [ ] Consolidate auth interfaces
   - [ ] Extend BaseService in all auth services
   - [ ] Remove duplicate result types
   - [ ] Update auth service tests

3. **Standardize Storage Services** (2 days)
   - [ ] Create IStorageService interface
   - [ ] Unify API patterns
   - [ ] Implement consistent error handling
   - [ ] Update dependent components

**Deliverables**:

- Consistent service architecture
- Reduced interface duplication
- Improved error handling

### Phase 4: Testing & Documentation (Week 4)

**Goal**: Ensure comprehensive test coverage and documentation

#### Tasks:

1. **Update All Tests** (2 days)

   - [ ] Migrate tests to new utilities
   - [ ] Remove legacy patterns
   - [ ] Ensure 80%+ coverage
   - [ ] Fix any failing tests

2. **Add Integration Tests** (1 day)

   - [ ] Test refactored services
   - [ ] Test new hooks
   - [ ] Test error scenarios
   - [ ] Verify E2E flows work

3. **Documentation** (2 days)
   - [ ] Update architecture docs
   - [ ] Create pattern guide
   - [ ] Document new utilities
   - [ ] Update CLAUDE.md

**Deliverables**:

- All tests passing
- Improved test coverage
- Comprehensive documentation

## Success Metrics

1. **Code Quality**

   - 30%+ reduction in duplicate code
   - 100% TypeScript coverage
   - Zero ESLint errors

2. **Test Coverage**

   - 80%+ unit test coverage
   - All integration tests passing
   - E2E tests unchanged

3. **Developer Experience**
   - Consistent patterns across codebase
   - Clear documentation
   - Improved type safety

## Risk Mitigation

1. **Breaking Changes**

   - Each phase is independently deployable
   - Extensive test coverage before changes
   - Feature flags for major changes

2. **Performance Impact**

   - Profile before/after each phase
   - Monitor bundle size
   - Benchmark critical paths

3. **Team Disruption**
   - Clear migration guides
   - Backward compatibility where possible
   - Gradual rollout

## Technical Decisions

### Why Class-Based Services?

- Better TypeScript support
- Easier dependency injection for testing
- Consistent with OOP principles
- Natural inheritance for shared behavior

### Why Custom Hooks Over HOCs?

- Cleaner component code
- Better TypeScript inference
- Easier to test
- More flexible composition

### Why Centralized Types?

- Single source of truth
- Easier refactoring
- Better IDE support
- Reduced import complexity

## Migration Guide

### For Developers

1. **Service Migration**

   ```typescript
   // Old
   const result = await AuthService.login(email, password);
   if (result.success) {
     /* ... */
   }

   // New (same API, better types)
   const result: Result<User> = await AuthService.login(email, password);
   if (result.success) {
     /* ... */
   }
   ```

2. **Component Migration**

   ```typescript
   // Old
   Alert.alert('Error', 'Something went wrong');

   // New
   const { showError } = useAlert();
   showError('Error', 'Something went wrong');
   ```

3. **Test Migration**

   ```typescript
   // Old
   import { NavigationContainer } from '@react-navigation/native';

   // New
   import { renderWithProviders } from '../tests/utils';
   ```

## Appendix: File Structure

```
src/
├── types/
│   ├── common.types.ts      # New: Shared types
│   ├── index.ts            # Updated: Export common types
│   └── ...existing types
├── services/
│   ├── BaseService.ts      # New: Base service class
│   ├── __tests__/
│   │   └── BaseService.test.ts
│   └── ...existing services (refactored)
├── hooks/
│   ├── useAlert.ts         # New: Alert hook
│   ├── useErrorHandler.ts  # New: Error handling hook
│   ├── useContainerLogic.ts # New: Container patterns
│   └── __tests__/
│       └── ...hook tests
├── utils/
│   ├── errorHandler.ts     # New: Error utilities
│   └── ...existing utils
└── components/
    └── ...existing components (refactored)
```

## Timeline

- **Total Duration**: 4 weeks
- **Start Date**: TBD
- **End Date**: TBD
- **Review Checkpoints**: End of each phase

## Next Steps

1. Review and approve this design document
2. Create GitHub Epic and related issues
3. Assign phase 1 tasks
4. Set up tracking dashboard
5. Begin implementation

---

_This document is a living document and will be updated as the refactoring progresses._
