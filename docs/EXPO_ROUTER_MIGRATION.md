# Expo Router Migration Guide

## Migration Status

This document tracks the migration from React Navigation to Expo Router.

### ✅ Completed

1. **Phase 1: Setup**

   - Installed expo-router package
   - Updated package.json main entry to "expo-router/entry"
   - Added scheme to app.json for deep linking
   - Created metro.config.js for web support

2. **Phase 2: App Directory Structure**

   - Created complete file-based routing structure
   - Set up route groups: (auth), (tabs)
   - Created placeholder files for all routes

3. **Phase 3: Layouts**

   - Migrated root layout with authentication handling
   - Created auth layout for sign-in flow
   - Created tabs layout with bottom navigation

4. **Phase 4: Screen Migration**
   All screens successfully migrated:

   - AuthScreen → app/(auth)/sign-in.tsx
   - TaskListScreen → app/(tabs)/index.tsx
   - CreateTaskScreen → app/task/create.tsx
   - EditTaskScreen → app/task/[id].tsx
   - FocusModeScreen → app/(tabs)/focus.tsx
   - HyperfocusScreen → app/(tabs)/hyperfocus.tsx
   - ScatteredScreen → app/(tabs)/scattered.tsx
   - ProfileScreen → app/profile/index.tsx
   - PartnershipScreen → app/profile/partnership/index.tsx
   - PartnerInviteScreen → app/profile/partnership/invite.tsx
   - PartnerDashboardScreen → app/profile/partnership/dashboard.tsx
   - TaskAssignmentScreen → app/profile/partnership/assign.tsx
   - NotificationListScreen → app/notifications/index.tsx

5. **Phase 5: Navigation Updates**
   - Updated NotificationContainer to use Expo Router
   - Removed old App.tsx and AppNavigator.tsx
   - Created new router.types.ts for type-safe routing
   - All screens now use:
     - `useRouter` instead of `useNavigation`
     - `router.push()` instead of `navigation.navigate()`
     - `router.back()` instead of `navigation.goBack()`
     - `router.replace()` instead of `navigation.reset()`

### 🔄 In Progress

**Phase 6: Tests and Cleanup**

- Tests need to be migrated to work with new app directory structure
- Old screen files in src/screens need to be removed after test migration

## Test Migration TODO

The following test files need to be migrated from src/screens/**tests** to app/**tests**:

1. AuthScreen.test.js → app/(auth)/**tests**/sign-in.test.js
2. TaskListScreen.test.js → app/(tabs)/**tests**/index.test.js
3. CreateTaskScreen.test.js → app/task/**tests**/create.test.js
4. EditTaskScreen.test.js → app/task/**tests**/[id].test.js
5. FocusModeScreen.test.js → app/(tabs)/**tests**/focus.test.js
6. HyperfocusScreen.test.js → app/(tabs)/**tests**/hyperfocus.test.js
7. ScatteredScreen.test.js → app/(tabs)/**tests**/scattered.test.js
8. Other test files need similar migration

### Navigation Updates Required

When updating tests, replace:

- Mock navigation prop with mock router
- `useNavigation` mocks with `useRouter` mocks
- Navigation method calls to router method calls

## Breaking Changes

1. **Route Names**: File-based paths instead of screen names
2. **Params**: Use `useLocalSearchParams` instead of `route.params`
3. **Navigation**: All navigation now uses file paths
4. **Types**: New router.types.ts for type definitions

## Next Steps

1. Migrate all tests to new structure
2. Remove old screen files from src/screens
3. Update any remaining navigation type imports
4. Remove navigation.types.ts after full migration
5. Update documentation to reflect new navigation patterns
