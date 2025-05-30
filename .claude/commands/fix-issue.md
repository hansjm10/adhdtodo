# Fix GitHub Issue

Please analyze and fix the GitHub issue: $ARGUMENTS

Follow these steps:

1. **Understand the Issue**

   - Use `gh issue view $ARGUMENTS` to get the issue details
   - Read the issue description and comments carefully
   - Identify acceptance criteria and expected behavior

2. **Analyze the Codebase**

   - Search for relevant files using grep/glob
   - Understand the current implementation
   - Identify the root cause of the issue

3. **Plan the Solution**

   - Create a todo list for the fix
   - Consider edge cases and potential impacts
   - Think about the most elegant solution

4. **Implement the Fix**

   - Write tests first (TDD approach)
   - Implement the minimal code needed to fix the issue
   - Ensure the fix doesn't break existing functionality

5. **Verify the Solution**

   - Run all relevant tests
   - Manually test the fix if applicable
   - Check for any regression issues

6. **Quality Assurance**

   - Run linting: `npm run lint`
   - Run type checking: `npm run typecheck`
   - Ensure all tests pass: `npm test`

7. **Documentation**

   - Update any affected documentation
   - Add code comments if the logic is complex
   - Update CHANGELOG.md if appropriate

8. **Create Pull Request**
   - Create a descriptive commit message
   - Push changes to a feature branch
   - Create PR with `gh pr create`
   - Link the PR to the issue

Remember to follow the project's code style guidelines and testing requirements!
