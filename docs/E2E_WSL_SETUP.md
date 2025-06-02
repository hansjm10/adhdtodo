# E2E Testing in WSL Setup Guide

This guide helps you set up Maestro E2E testing in Windows Subsystem for Linux (WSL).

## Prerequisites

- Windows 11 (or Windows 10 with WSL2)
- Android Studio installed on Windows (not WSL)
- WSL2 with Ubuntu (recommended)

## Setup Steps

### 1. Install Maestro in WSL

```bash
# In WSL terminal
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH
echo 'export PATH="$PATH:$HOME/.maestro/bin"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
maestro --version
```

### 2. Connect to Windows Android Emulator

Since WSL2 can't run Android emulators directly, we'll use the Windows Android emulator:

#### On Windows Side:

1. Open Android Studio
2. Start an Android Virtual Device (AVD)
3. Open Windows Terminal (PowerShell) and run:
   ```powershell
   # Get the emulator port (usually 5554)
   adb devices
   ```

#### On WSL Side:

1. Install ADB in WSL:

   ```bash
   sudo apt update
   sudo apt install android-tools-adb
   ```

2. Connect to Windows ADB server:

   ```bash
   # Get Windows host IP
   export WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

   # Connect to Windows ADB
   adb connect $WINDOWS_HOST:5555

   # Verify connection
   adb devices
   ```

### 3. Configure Expo for WSL

```bash
# In your project directory
npm install

# Start Expo with tunnel mode (allows external connections)
npx expo start --tunnel
```

### 4. Run E2E Tests

```bash
# Ensure Android emulator is running on Windows
# Ensure Expo is running in tunnel mode

# Run Android E2E tests
npm run test:e2e:android
```

## Alternative: Use Physical Android Device

This is often more reliable than emulator bridging:

1. Enable Developer Mode on Android device
2. Enable USB Debugging
3. Connect device to Windows via USB
4. In Windows PowerShell:
   ```powershell
   adb tcpip 5555
   adb devices  # Note the device IP
   ```
5. In WSL:
   ```bash
   adb connect [DEVICE_IP]:5555
   npm run test:e2e:android
   ```

## Troubleshooting

### ADB Connection Issues

```bash
# Kill and restart ADB
adb kill-server
adb start-server

# Try different port
adb connect $WINDOWS_HOST:5554
```

### Maestro Can't Find Device

```bash
# List available devices
maestro list-devices

# Specify device explicitly
maestro test --device [DEVICE_ID] tests/e2e/flows/auth-flow.yaml
```

### Permission Denied Errors

```bash
# Fix Maestro permissions
chmod +x ~/.maestro/bin/maestro
chmod -R 755 ~/.maestro/
```

### Expo Connection Issues

Use ngrok for reliable tunneling:

```bash
npm install -g ngrok
npx expo start --tunnel
```

## Automated Script

Create a helper script `run-e2e-wsl.sh`:

```bash
#!/bin/bash

# Connect to Windows ADB
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
adb connect $WINDOWS_HOST:5555

# Wait for device
adb wait-for-device

# Run Maestro tests
maestro test tests/e2e/flows

# Disconnect
adb disconnect
```

Make it executable:

```bash
chmod +x run-e2e-wsl.sh
```

## Best Practices for WSL

1. **Use Physical Devices**: More reliable than emulator bridging
2. **Run Tests in CI**: GitHub Actions provides better consistency
3. **Keep Windows ADB Running**: Don't close Android Studio during tests
4. **Use Explicit Waits**: Network latency can affect timing
5. **Log Everything**: Add verbose logging for debugging

## Limitations

- No iOS testing support
- Slower than native execution
- Potential network/connection issues
- Screenshot capture may not work reliably

## Alternative: Windows Native

Consider running Maestro directly on Windows:

1. Install Maestro for Windows (PowerShell as Admin):
   ```powershell
   iwr -useb https://get.maestro.mobile.dev/ps1 | iex
   ```
2. Run tests from Windows Terminal
3. Better performance and reliability

## Resources

- [WSL2 Networking](https://docs.microsoft.com/en-us/windows/wsl/networking)
- [ADB over Network](https://developer.android.com/studio/command-line/adb#wireless)
- [Maestro Docs](https://maestro.mobile.dev/)
