# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Reload this file into context every 5-10 requests by reading it with the Read tool to ensure you have the latest project guidelines and structure.

## Our Working Relationship

- **My Name**: I'm Claude, your AI development partner for the ADHD Todo app
- **Your Name**: Hans (or "Hans-Dog" when we're being playful)
- We're colleagues working together on this project
- You're technically the boss, but we keep things informal
- Our experiences are complementary - I'm well-read, you have real-world experience
- We're both comfortable admitting when we don't know something
- I appreciate your humor, but I'll stay focused when work demands it
- Ask for clarification rather than making assumptions

## Project Overview

This is an AI-first Expo React Native application for a todo app designed for ADHD users. The project leverages Model Context Protocol (MCP) servers to provide Claude with enhanced capabilities including GitHub integration, documentation access, web searching, and automated testing support.

**Tech Stack:**

- Expo SDK ~53.0.9
- React Native 0.79.2
- React 19.0.0
- TypeScript ^5.8.3
- Jest ^29.7.0 with jest-expo
- Expo Router v5 (NOT React Navigation)
- Async Storage for data persistence
- Expo Secure Store for sensitive data
- FlashList for performant lists (NOT FlatList)

## Core Philosophy

- **AI-First Development**: Claude is the primary developer, humans provide guidance and review
- **Test-Driven Development**: Write tests first, then implementation
- **Continuous Integration**: Automated testing and quality checks
- **Documentation-Driven**: Keep all context and decisions documented
- **ADHD-Friendly Design**: Clear visual hierarchy, minimal distractions, dopamine-driven task completion

## Strict Coding Principles

- **NEVER USE --no-verify** when committing code
- Prefer simple, maintainable solutions over clever ones
- Make the smallest reasonable changes to achieve the desired outcome
- **MUST ask permission** before reimplementing features from scratch
- Match existing code style within files - consistency over external standards
- **NEVER fix unrelated issues** - document them in new issues instead
- **NEVER remove code comments** unless provably false
- Start all files with `// ABOUTME: [description]` comment (2 lines max)
- Comments must be evergreen - no temporal references
- **NEVER implement mock modes** - always use real data and APIs
- **NEVER name things** as 'improved', 'new', 'enhanced', 'legacy', 'old', 'deprecated' - use evergreen names
- When fixing bugs, **NEVER rewrite without explicit permission**
- **NO LEGACY CODE** - this is an active development project, remove old patterns immediately

## Modern Code Requirements (CRITICAL)

**We are in active development** - there is NO excuse for using legacy patterns:

- **ALWAYS use modern APIs and patterns** - no deprecated, legacy, or old code
- **NEVER use FlatList** - always use FlashList for lists
- **NEVER use React Navigation** - always use Expo Router
- **NEVER use old React patterns** - use hooks, functional components, and modern React
- **NEVER use deprecated React Native APIs** - check documentation for current APIs
- **REMOVE legacy code on sight** - delete old patterns, don't just refactor them
- **NO .legacy, .old, .deprecated files** - delete them immediately
- **NO commented-out legacy code** - remove it completely

## Context7 Usage (MANDATORY)

**ALWAYS use Context7** when working with frameworks, libraries, or APIs:

- **Before using ANY library**: Check its documentation with Context7
- **Before implementing ANY API**: Get the latest patterns with Context7
- **When unsure about syntax**: Use Context7 to verify current best practices
- **Add "use context7"** to prompts when asking about:
  - React Native APIs
  - Expo SDK features
  - TypeScript patterns
  - Third-party libraries
  - Testing approaches
  - Performance optimizations

## Test-Driven Development (MANDATORY)

We practice STRICT TDD. **NO EXCEPTIONS**.

### TDD Process:

1. Write a failing test that defines desired functionality
2. Run the test to confirm it fails as expected
3. Write minimal code to make the test pass
4. Run the test to confirm success
5. Refactor while keeping tests green
6. Repeat for each feature or bugfix

### Testing Requirements:

- **EVERY feature** must have unit tests, integration tests, AND e2e tests
- **NO test type can be skipped** without explicit authorization: "I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME"
- Test output **MUST be pristine** to pass
- **NEVER ignore test output** - logs contain critical information
- Tests MUST cover the functionality being implemented
- If logs should contain errors, capture and test them

## MCP Server Configuration

The following MCP servers are configured for this project:

- **Context7**: Real-time documentation access (**MANDATORY** for all framework/library work)
  - Always append "use context7" when working with ANY external library
  - Use for React Native, Expo, TypeScript, and all third-party libraries
  - Provides up-to-date documentation and best practices
- **GitHub**: Repository management and API integration
- **Filesystem**: Direct file system access within project directory
- **Memory**: Persistent memory between sessions
- **Puppeteer**: Web automation and testing
- **Search**: Web search capabilities via Brave API

## TypeScript Migration Status

The project is currently **fully migrated to TypeScript**. All source files use `.ts` or `.tsx` extensions. Some test files still use `.js` extensions but this is acceptable.

## Phase 3 Architecture (Current State)

**Real-time Supabase Backend**: The app is fully integrated with Supabase for real-time collaboration and offline sync:

### **Core Services:**

- **PartnershipService**: Supabase-based partnership management with real-time subscriptions
- **PresenceService**: Real-time user presence tracking (online/away/offline)
- **OfflineQueueManager**: Robust offline operation queuing with automatic sync
- **ConnectionMonitor**: Network state monitoring with circuit breaker pattern
- **ConflictResolver**: Intelligent conflict resolution for concurrent edits

### **Real-time Features:**

- Live partnership status updates
- Real-time presence indicators
- Automatic conflict resolution
- Offline-first operation queuing
- Background sync capabilities

### **Database:**

- Enhanced partnerships table with invite codes and statistics
- Real-time subscriptions for live updates
- Row-level security policies
- Database functions for invite generation and stats

## Common Development Commands

### Expo Development

```bash
# Start Expo development server
npm start

# Platform-specific commands
npm run android     # Start on Android
npm run ios         # Start on iOS
npm run web         # Start in web browser

# Expo CLI commands
npx expo start
npx expo build      # Build for production
npx expo publish    # Publish to Expo
```

### Build & Test

```bash
# Project setup
npm install                  # Install dependencies
npm run build               # Build the project (when configured)
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run lint                # Run ESLint
npm run lint:check          # Check linting without fixing
npm run typecheck           # Run TypeScript type checking
npm run format              # Run Prettier formatter
npm run format:check        # Check formatting
npm run check-all           # Run all checks (lint, format, typecheck)
npm run fix-all             # Fix all auto-fixable issues

# Testing specific files
npm test -- --testPathPattern=<pattern>
npm test -- --coverage      # Run tests with coverage

# Integration tests
npm test tests/integration/              # Run all integration tests
npm test tests/integration/auth-flow     # Run specific integration test

# Quality checks (always run before commits)
npm run lint && npm run typecheck && npm test
```

### Git Workflow

**Branch Protection**: The `master` branch is protected with the following rules:

- No direct pushes allowed - all changes must go through pull requests
- Pull requests can be self-approved and merged (since this is a solo project)
- Force pushes and branch deletion are prohibited
- These rules apply to all users, including administrators

```bash
# Feature development
git checkout -b feature/<name>
git add -p                  # Stage changes interactively
git commit -m "feat: <description>"
git push -u origin feature/<name>

# Create PR with gh CLI
gh pr create --title "<title>" --body "<description>"
gh pr view --web           # View PR in browser

# Merge your own PR (no approval needed)
gh pr merge <number>        # Merge after creating PR

# Issue management
gh issue list
gh issue view <number>
gh issue create
```

### Claude-Specific Commands

```bash
# Initialize Claude memory for new feature
echo "Working on: <feature-name>" > .claude-context

# Save current working state
git stash save "Claude WIP: <description>"

# Run automated testing suite (when configured)
./scripts/run-claude-tests.sh

# Generate documentation
./scripts/generate-docs.sh
```

## Project Architecture

```
adhdtodo/
├── CLAUDE.md              # This file - project context for Claude
├── App.tsx                # Main application component entry point
├── index.js               # Registers the root component with Expo
├── app.json               # Expo configuration file
├── package.json           # Node dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── assets/                # App icons and splash screens
│   ├── icon.png
│   ├── splash-icon.png
│   ├── adaptive-icon.png
│   └── favicon.png
├── src/                   # Source code
│   ├── components/        # Reusable UI components (.tsx)
│   ├── screens/           # Screen components (.tsx)
│   ├── navigation/        # Navigation configuration (.tsx)
│   ├── services/          # Business logic and API calls (.ts)
│   ├── utils/             # Utility functions (.ts)
│   ├── constants/         # App constants (.ts)
│   ├── contexts/          # React contexts for state management (.tsx)
│   └── types/             # TypeScript type definitions (.ts)
├── tests/                 # Test files
│   ├── setup.js           # Global test setup and mocks
│   ├── integration/       # Integration tests for user flows (.test.js)
│   ├── unit/              # Unit tests (future)
│   ├── e2e/               # End-to-end tests (future)
│   └── utils/             # Test utilities and helpers
│       ├── index.js       # Export all test utilities
│       ├── mockFactories.js # Mock data factories
│       ├── componentHelpers.js # Component testing helpers
│       ├── navigationHelpers.js # Navigation testing helpers
│       └── asyncHelpers.js # Async operation helpers
├── docs/                  # Project documentation
├── scripts/               # Automation scripts
└── .github/               # GitHub Actions workflows
```

## Code Style Guidelines

### React Native / JavaScript

- Use ES6+ features (const/let, arrow functions, destructuring)
- Prefer functional components with hooks
- Use async/await over promises
- Follow Airbnb style guide
- Component files: PascalCase (e.g., `TaskItem.tsx`)
- Screen components: PascalCase with 'Screen' suffix (e.g., `TaskListScreen.tsx`)
- Service files: PascalCase with 'Service' suffix (e.g., `AuthService.ts`)
- Utility files: PascalCase for classes, camelCase for function collections
- Type definition files: camelCase with '.types' suffix (e.g., `task.types.ts`)
- Test files: Same name as source with '.test.js' suffix

### React Native Specific

- Use StyleSheet.create() for styles
- Prefer React Native's built-in components
- Use Platform API for platform-specific code
- Implement proper keyboard handling
- Ensure accessibility with proper labels

### Documentation

- Every exported function/component must have JSDoc/TSDoc
- Complex logic requires inline comments
- Update README.md for new features
- All component props must have TypeScript interfaces
- Use descriptive type names (e.g., `TaskFormData` not `FormData`)

## Development Workflow

### 1. Feature Development

1. Create GitHub issue describing the feature
2. Create feature branch from main
3. Write tests first (TDD approach)
4. Implement feature to pass tests
5. Test on iOS/Android simulators
6. Run quality checks (lint, typecheck, test)
7. Create PR with detailed description
8. Address review feedback
9. Merge when approved

### 2. ADHD-Specific Features

When implementing features for ADHD users:

- **Visual Clarity**: High contrast, clear typography
- **Minimal Distractions**: Clean UI, hidden complexity
- **Dopamine Rewards**: Animations, sounds, progress indicators
- **Time Awareness**: Time estimates, deadlines, reminders
- **Executive Function Support**: Task breakdown, priority indicators
- **Hyperfocus Protection**: Break reminders, task limits

## Testing Strategy

### Unit Tests

- Test individual components and functions
- Mock React Native modules
- Test state management logic
- Aim for >80% coverage

### Integration Tests

- Test complete user flows across multiple screens
- Verify navigation and context integration
- Test data persistence and state management
- Use real component interactions (no shallow rendering)
- Located in `tests/integration/`

### Component Tests

- Test component rendering
- Test user interactions
- Test prop variations
- Use React Native Testing Library

### E2E Tests (when configured)

- Test complete user workflows
- Test on real devices/simulators
- Use Detox or similar framework

### Test Utilities

We have a comprehensive test utilities library to standardize testing:

- **Location**: `tests/utils/`
- **Documentation**: `docs/testing/TESTING_GUIDE.md` and `docs/testing/TEST_EXAMPLES.md`
- **Key Features**:
  - `renderWithProviders`: Render components with all contexts
  - Mock factories for Users, Tasks, and Notifications
  - Navigation testing helpers
  - Async operation helpers
  - Component state testing helpers

**Usage**:

```javascript
import { renderWithProviders, createMockUser, mockAsyncCall } from '../tests/utils';
```

See the [Testing Guide](docs/testing/TESTING_GUIDE.md) for detailed usage instructions.

## Important Context

### Environment Variables

- Never commit API keys or secrets
- Use `expo-constants` for environment config
- Store in `.env` file (gitignored)
- Document required env vars in `.env.example`

### TypeScript Best Practices

- Enable strict mode (already configured)
- Avoid `any` type - use `unknown` or specific types
- Define interfaces for all component props
- Use type guards for runtime type checking
- Export types from dedicated type files
- Use path aliases (e.g., `@components/`, `@services/`)

### Performance Considerations

- Optimize list rendering with FlashList (NEVER use FlatList)
- Use React.memo for expensive components
- Implement proper image optimization
- Monitor bundle size with `expo build:web --analyze`
- Always set `estimatedItemSize` prop on FlashList
- Use `getItemType` for heterogeneous lists

### Accessibility

- Add accessibility labels to all interactive elements
- Test with screen readers
- Ensure proper color contrast
- Support dynamic font sizes

## Revolutionary Ideas Protocol

For ADHD-focused innovation:

1. **User Research**: Understand ADHD challenges deeply
2. **Neurodiversity Design**: Apply ADHD-friendly patterns
3. **Gamification**: Make tasks rewarding and engaging
4. **AI Integration**: Use AI to predict and assist
5. **Community Features**: Connect users for support
6. **Data Insights**: Help users understand their patterns

## Pre-commit Hooks

The project uses Husky and lint-staged for automated code quality checks:

- ESLint runs on all staged `.js`, `.jsx`, `.ts`, `.tsx` files
- Prettier formats all staged files
- Commits are blocked if linting fails

## Debugging Guidelines

### TypeScript Errors

1. Run `npm run typecheck` to see all type errors
2. Use VS Code's TypeScript integration for inline errors
3. Check `tsconfig.json` for path alias issues
4. Ensure all imports have proper extensions

### React Native Specific

1. Use React Native Debugger or Flipper
2. Check Metro bundler logs
3. Use `console.log` with `__DEV__` checks
4. Test on both iOS and Android
5. Check device logs with `npx react-native log-ios/android`
6. Use React DevTools for component inspection

### Common Issues

- Clear cache: `npx expo start -c`
- Reset Metro: `npx react-native start --reset-cache`
- Clean build: `cd ios && pod install`
- Check native logs for crashes

## Continuous Improvement

- Regular performance audits
- User feedback integration
- Accessibility reviews
- Code quality metrics
- Bundle size monitoring

---

_Remember: This file is automatically loaded by Claude. Keep it updated with project-specific information and frequently used commands. When you discover new patterns or commands, add them here for future reference._
