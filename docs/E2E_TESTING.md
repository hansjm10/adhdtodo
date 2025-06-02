# E2E Testing Setup Guide

This guide helps you set up and run end-to-end tests for the ADHD Todo app using Maestro.

## Quick Start

### 1. Install Maestro CLI

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (via WSL2)
# First install WSL2, then run the above command

# Verify installation
maestro --version
```

### 2. Install App Dependencies

```bash
npm install
```

### 3. Start Your App

```bash
# In one terminal, start Expo
npm start

# In another terminal, run E2E tests
npm run test:e2e
```

## Platform-Specific Setup

### iOS (macOS only)

1. Install Xcode from App Store
2. Open Xcode and install iOS Simulators
3. Start a simulator:
   ```bash
   xcrun simctl list devices
   xcrun simctl boot "iPhone 15"
   ```

### Android

1. Install Android Studio
2. Create an AVD (Android Virtual Device):
   - Open Android Studio
   - Tools → AVD Manager
   - Create Virtual Device
   - Select Pixel 6, API 33
3. Start the emulator:
   ```bash
   emulator -avd Pixel_6_API_33
   ```

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Specific Platform

```bash
npm run test:e2e:ios     # iOS only
npm run test:e2e:android  # Android only
```

### Specific Test Flow

```bash
maestro test tests/e2e/flows/auth-flow.yaml
```

### Interactive Mode (Debugging)

```bash
npm run test:e2e:studio
```

## Writing Tests

### Basic Test Structure

```yaml
appId: host.exp.Exponent # For Expo Go
---
- launchApp
- assertVisible: 'Welcome Screen'
- tapOn: 'Sign In'
- inputText: 'user@example.com'
- tapOn: 'Continue'
```

### Using Test IDs

In your React Native component:

```tsx
<TouchableOpacity testID="submit-button">
  <Text>Submit</Text>
</TouchableOpacity>
```

In your test:

```yaml
- tapOn:
    id: 'submit-button'
```

### Common Commands

- `launchApp` - Start the app
- `tapOn` - Tap an element
- `inputText` - Type text
- `assertVisible` - Assert element is visible
- `assertNotVisible` - Assert element is not visible
- `waitForVisible` - Wait for element to appear
- `swipe` - Swipe gesture
- `back` - Go back
- `hideKeyboard` - Hide keyboard

### Best Practices

1. **Use Test IDs**: Add `testID` props to components for reliable selection
2. **Handle Loading States**: Use `waitForVisible` for async operations
3. **Clean State**: Start each test with a clean app state
4. **Descriptive Names**: Use clear, descriptive test flow names
5. **Small Tests**: Keep each test focused on one user flow

## Troubleshooting

### Maestro Not Found

```bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### App Not Launching

- Ensure Expo is running: `npm start`
- Check app ID in test matches your app
- For custom builds: Update `appId` in tests

### Element Not Found

- Add `testID` to the component
- Use `maestro studio` to inspect elements
- Check if element is within viewport

### Slow Tests

- Use `waitForVisible` with shorter timeouts
- Reduce animation durations in test mode
- Run on more powerful hardware

## CI/CD Integration

Tests run automatically on:

- Push to master/main branch
- Pull requests

See `.github/workflows/e2e.yml` for configuration.

## Advanced Usage

### Environment Variables

```yaml
env:
  TEST_USER: 'test@example.com'
  TEST_PASS: 'password123'
---
- inputText: ${TEST_USER}
```

### Conditional Logic

```yaml
- runFlow:
    when:
      visible: 'Update Available'
    file: handle-update.yaml
```

### Reusable Flows

Create in `tests/e2e/helpers/`:

```yaml
# login.yaml
- tapOn: 'Sign In'
- inputText: ${email}
- inputText: ${password}
- tapOn: 'Submit'
```

Use in tests:

```yaml
- runFlow:
    file: ../helpers/login.yaml
    env:
      email: 'test@example.com'
      password: 'password123'
```

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/documentation)
- [YAML Syntax Guide](https://maestro.mobile.dev/syntax/yaml)
- [Best Practices](https://maestro.mobile.dev/best-practices)
- [Example Tests](tests/e2e/flows/)
