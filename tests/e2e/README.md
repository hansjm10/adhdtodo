# E2E Testing with Maestro

This directory contains end-to-end tests for the ADHD Todo app using Maestro.

## Installation

### Prerequisites

- macOS or Linux (Windows via WSL2)
- iOS Simulator (for iOS testing)
- Android Emulator (for Android testing)

### Install Maestro CLI

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test flow
npm run test:e2e tests/e2e/flows/auth-flow.yaml

# Run tests on iOS
npm run test:e2e:ios

# Run tests on Android
npm run test:e2e:android

# Run tests with recording
npm run test:e2e:record
```

## Writing Tests

Tests are written in YAML format in the `flows/` directory. Example:

```yaml
appId: host.exp.Exponent # Expo Go app ID
---
- launchApp
- assertVisible: 'Welcome to ADHD Todo'
- tapOn: 'Sign In'
- inputText: 'test@example.com'
- tapOn: 'Continue'
```

## Test Structure

```
tests/e2e/
├── README.md           # This file
├── flows/              # Test flow definitions
│   ├── auth-flow.yaml
│   ├── task-creation.yaml
│   ├── focus-mode.yaml
│   └── partnership.yaml
├── config/             # Maestro configuration
│   └── config.yaml
└── helpers/            # Reusable test components
    └── common.yaml
```

## Best Practices

1. **Test Real User Flows**: Focus on critical user journeys
2. **Keep Tests Simple**: One flow per file
3. **Use Test IDs**: Add testID props to components for reliable selection
4. **Handle Async**: Use `waitForVisible` for async operations
5. **Test Both Platforms**: Ensure tests work on iOS and Android

## Debugging

```bash
# Run in debug mode
maestro test --debug flows/auth-flow.yaml

# Take screenshot during test
maestro studio
```

## CI/CD Integration

Tests can be run in CI using Maestro Cloud or self-hosted runners. See `.github/workflows/e2e.yml` for configuration.
