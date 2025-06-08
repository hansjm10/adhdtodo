# implement-pr-feedback <PR-NUMBER>

Implement the requested changes from a pull request review.

## Prerequisites

Before implementing feedback:

- Ensure you're on the correct PR branch
- Have read all review comments
- Understand the requested changes

## Step 1: Fetch PR Feedback

First, I'll gather all review comments and requested changes:

```bash
# View PR details and current status
gh pr view <PR-NUMBER>

# Get all review comments
gh api repos/hansjm10/ADHDTodo/pulls/<PR-NUMBER>/reviews

# Get inline code comments
gh api repos/hansjm10/ADHDTodo/pulls/<PR-NUMBER>/comments

# Check current branch
git status
```

## Step 2: Analyze Feedback

I'll organize the feedback into categories:

1. **Critical Issues** (must fix)

   - Bugs and errors
   - Security vulnerabilities
   - Breaking changes

2. **Code Quality** (should fix)

   - TypeScript improvements
   - Pattern violations
   - Performance issues

3. **Style/Documentation** (nice to have)
   - Code formatting
   - Comment updates
   - Documentation improvements

## Step 3: Create Implementation Plan

I'll use the TodoWrite tool to track all required changes:

```bash
# Example todo structure:
- Fix TypeScript error in TaskItem component
- Replace FlatList with FlashList in scattered.tsx
- Add missing tests for PartnershipService
- Update documentation for new API endpoints
- Fix ESLint warnings in auth flow
```

## Step 4: Implement Changes

Work through each feedback item systematically:

### 4.1 Code Changes

For each code change request:

1. Locate the file mentioned in the review
2. Read the current implementation
3. Implement the requested change
4. Verify the change addresses the feedback

### 4.2 Test Updates

For test-related feedback:

1. Write missing tests using TDD approach
2. Fix failing tests
3. Ensure test coverage meets requirements
4. Verify tests pass with pristine output

### 4.3 Documentation Updates

For documentation requests:

1. Update code comments and JSDoc
2. Update README if needed
3. Add ABOUTME comments to new files
4. Ensure all exports are documented

## Step 5: Quality Verification

After implementing each change:

```bash
# Run tests for affected files
npm test -- --testPathPattern=<affected-file>

# Check TypeScript
npm run typecheck

# Run ESLint
npm run lint

# Verify formatting
npm run format:check
```

## Step 6: Cross-Reference Review

Ensure all feedback is addressed:

1. Re-read each review comment
2. Verify the implementation addresses the concern
3. Check for any missed feedback
4. Ensure no new issues were introduced

## Step 7: Final Quality Check

Run comprehensive checks:

```bash
# Full test suite
npm test

# All quality checks
npm run check-all

# Build verification (if applicable)
npm run build
```

## Step 8: Commit Changes

Commit the changes with clear messages:

```bash
# Stage changes carefully
git add -p

# Commit with descriptive message
git commit -m "fix: Address PR feedback for <feature>

- <specific change 1>
- <specific change 2>
- <specific change 3>

Addresses review comments from PR #<PR-NUMBER>"
```

## Step 9: Push and Update PR

Push the changes and update the PR:

```bash
# Push to the PR branch
git push

# Add a comment summarizing changes
gh pr comment <PR-NUMBER> --body "I've addressed all the review feedback:

✅ Fixed TypeScript errors in...
✅ Replaced FlatList with FlashList
✅ Added comprehensive tests for...
✅ Updated documentation
✅ All quality checks passing

Ready for re-review!"
```

## Step 10: Request Re-Review

Ask reviewers to take another look:

```bash
# Request re-review from original reviewers
gh pr ready <PR-NUMBER>
```

## Common Feedback Patterns

### TypeScript Issues

```typescript
// Feedback: "Avoid using 'any' type"
// ❌ Before
const handleData = (data: any) => { ... }

// ✅ After
interface DataPayload {
  id: string;
  value: number;
}
const handleData = (data: DataPayload) => { ... }
```

### React Native Patterns

```typescript
// Feedback: "Use FlashList instead of FlatList"
// ❌ Before
import { FlatList } from 'react-native';

// ✅ After
import { FlashList } from '@shopify/flash-list';
// Add estimatedItemSize prop
```

### Testing Improvements

```typescript
// Feedback: "Add test for error case"
// ✅ Add new test
it('should handle API errors gracefully', async () => {
  // Mock error response
  mockAPI.rejects(new Error('Network error'));

  // Test error handling
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### Performance Optimizations

```typescript
// Feedback: "Memoize expensive computation"
// ✅ Add memoization
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

## Handling Disagreements

If you disagree with feedback:

1. **Understand First**

   - Re-read the feedback carefully
   - Consider the reviewer's perspective
   - Check if it aligns with CLAUDE.md

2. **Discuss Constructively**

   ```bash
   gh pr comment <PR-NUMBER> --body "Regarding the suggestion to X:

   I understand the concern about Y. However, I chose approach Z because:
   1. It aligns with our existing pattern in src/services/
   2. It provides better performance for our use case
   3. It maintains consistency with CLAUDE.md guidelines

   Would you like me to proceed with the original approach or would you prefer alternative A?"
   ```

3. **Find Compromise**
   - Suggest alternatives
   - Explain trade-offs
   - Be open to learning

## Checklist

Before marking feedback as complete:

- [ ] All review comments addressed
- [ ] No new ESLint warnings introduced
- [ ] TypeScript compilation successful
- [ ] All tests passing
- [ ] Documentation updated where needed
- [ ] Code follows CLAUDE.md guidelines
- [ ] Performance considerations addressed
- [ ] Security concerns resolved
- [ ] Commit messages are descriptive
- [ ] PR comment added summarizing changes

## Tips for Success

1. **Stay Organized**

   - Use TodoWrite to track all feedback
   - Address similar issues together
   - Test after each significant change

2. **Communicate Progress**

   - Update PR comments as you work
   - Ask for clarification when needed
   - Acknowledge good suggestions

3. **Quality Over Speed**

   - Don't rush implementations
   - Test thoroughly
   - Consider edge cases

4. **Learn from Feedback**
   - Understand why changes were requested
   - Apply lessons to future code
   - Update CLAUDE.md if new patterns emerge

Remember: The goal is to improve the code quality while maintaining a collaborative relationship with reviewers.
