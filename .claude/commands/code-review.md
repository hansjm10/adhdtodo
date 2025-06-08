# code-review <PR-NUMBER>

Perform a comprehensive code review of the specified pull request.

## Prerequisites

Before starting the code review:

- Ensure you have the latest version of the main branch
- Have the PR number ready
- Verify you have necessary permissions to view the PR

## Step 1: PR Analysis

First, I'll fetch and understand the PR:

```bash
# Get PR details
gh pr view <PR-NUMBER>

# View PR diff
gh pr diff <PR-NUMBER>

# Check PR status and checks
gh pr checks <PR-NUMBER>

# View PR comments
gh api repos/hansjm10/ADHDTodo/pulls/<PR-NUMBER>/comments
```

## Step 2: Local Setup

Set up the PR locally for testing:

```bash
# Fetch the PR branch
gh pr checkout <PR-NUMBER>

# Verify current branch
git status

# Update dependencies if needed
npm install
```

## Step 3: Code Review

Review all changes systematically:

1. **File Structure**

   - Check if new files follow project structure
   - Verify file naming conventions
   - Ensure proper file organization

2. **Code Quality**

   - Review for adherence to CLAUDE.md guidelines
   - Check for modern patterns (no legacy code)
   - Verify TypeScript usage and type safety
   - Look for proper error handling
   - Check for code duplication

3. **React Native Specific**
   - Verify use of FlashList (not FlatList)
   - Check Expo Router usage (not React Navigation)
   - Ensure proper StyleSheet usage
   - Verify platform-specific code handling

## Step 4: Testing Verification

Ensure proper test coverage:

```bash
# Run all tests
npm test

# Check test coverage
npm test -- --coverage

# Run specific test files if changes are localized
npm test -- --testPathPattern=<pattern>
```

Verify:

- Unit tests for new components/functions
- Integration tests for new features
- Tests follow TDD principles
- Test output is pristine (no warnings/errors)

## Step 5: Quality Checks

Run all quality checks:

```bash
# ESLint
npm run lint

# TypeScript type checking
npm run typecheck

# Prettier formatting
npm run format:check

# Run all checks
npm run check-all
```

## Step 6: Architecture Review

Validate adherence to project architecture:

1. **Component Structure**

   - Components in `src/components/`
   - Screens use proper naming conventions
   - Services follow Service suffix pattern

2. **Type Safety**

   - All props have TypeScript interfaces
   - No `any` types used
   - Proper type exports in type files

3. **State Management**
   - Proper use of contexts
   - No prop drilling
   - Efficient re-renders

## Step 7: Performance Review

Check for performance issues:

1. **List Performance**

   - FlashList used with `estimatedItemSize`
   - Proper `getItemType` for heterogeneous lists
   - React.memo used where appropriate

2. **Bundle Size**
   - No unnecessary dependencies added
   - Lazy loading implemented where needed

## Step 8: Security Review

Look for security concerns:

1. **Data Storage**

   - Sensitive data uses Secure Store
   - No hardcoded API keys or secrets
   - Proper authentication checks

2. **Input Validation**
   - All user inputs validated
   - SQL injection prevention
   - XSS protection

## Step 9: Documentation Review

Ensure proper documentation:

1. **Code Documentation**

   - JSDoc/TSDoc for exported functions
   - Complex logic has inline comments
   - ABOUTME comments at file start

2. **README Updates**
   - New features documented
   - API changes noted
   - Setup instructions updated if needed

## Step 10: ADHD-Specific Features

If PR includes UI changes, verify:

1. **Accessibility**

   - Proper accessibility labels
   - Screen reader compatibility
   - Color contrast compliance

2. **ADHD-Friendly Design**
   - Clear visual hierarchy
   - Minimal distractions
   - Dopamine reward mechanisms
   - Time awareness features

## Step 11: Feedback

Provide feedback focusing only on issues found:

```bash
# If issues found, request changes
gh pr review <PR-NUMBER> --request-changes --body "Issues found:

- [FILE:LINE] Issue description
- [FILE:LINE] Issue description
"

# If no issues, approve
gh pr review <PR-NUMBER> --approve --body "No issues found."
```

## Step 12: Follow-Up

If changes are requested:

1. Work with the author to implement changes
2. Re-review after updates
3. Ensure all feedback is addressed
4. Approve and merge when ready

## Checklist

Use this checklist for every code review:

- [ ] Code follows CLAUDE.md guidelines
- [ ] No legacy patterns or deprecated APIs
- [ ] TypeScript types are properly defined
- [ ] Tests are comprehensive and passing
- [ ] ESLint and TypeScript checks pass
- [ ] Documentation is updated
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] ADHD-friendly design maintained
- [ ] No unrelated changes included
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

## Common Issues to Look For

1. **React Native Anti-Patterns**

   - Using FlatList instead of FlashList
   - React Navigation instead of Expo Router
   - Direct style objects instead of StyleSheet

2. **TypeScript Issues**

   - Missing type definitions
   - Use of `any` type
   - Incorrect type assertions

3. **Testing Gaps**

   - Missing tests for new features
   - Tests that don't actually test functionality
   - Ignored test failures

4. **Performance Problems**

   - Unnecessary re-renders
   - Large bundle imports
   - Inefficient list rendering

5. **Security Concerns**
   - Exposed API keys
   - Improper data validation
   - Missing authentication checks

## Review Output Format

When reporting issues, use this concise format:

```
Issues found:

- [src/components/TaskItem.tsx:45] Replace FlatList with FlashList
- [src/services/AuthService.ts:23] Remove 'any' type, use proper interface
- [src/screens/HomeScreen.tsx:12] Missing test coverage for error handling
- [package.json:15] Unnecessary dependency added: lodash
```

Only list actionable issues. Skip positive feedback to minimize tokens.
