#!/bin/bash
# ABOUTME: Helper script to run E2E tests in WSL with Windows Android emulator

set -e

echo "🚀 Starting E2E tests in WSL..."

# Get Windows host IP
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "📍 Windows host IP: $WINDOWS_HOST"

# Try to connect to ADB
echo "🔌 Connecting to Windows ADB server..."
if ! adb connect $WINDOWS_HOST:5555 > /dev/null 2>&1; then
    echo "⚠️  Failed to connect to Windows ADB on port 5555, trying 5554..."
    adb connect $WINDOWS_HOST:5554
fi

# Wait for device
echo "📱 Waiting for Android device..."
adb wait-for-device

# List connected devices
echo "✅ Connected devices:"
adb devices

# Check if Expo is running
if ! curl -s http://localhost:19000 > /dev/null; then
    echo "⚠️  Expo doesn't seem to be running. Starting Expo in tunnel mode..."
    echo "📡 Please scan the QR code in Expo Go app on your device/emulator"
    npx expo start --tunnel &
    EXPO_PID=$!
    sleep 10
fi

# Run Maestro tests
echo "🧪 Running E2E tests..."
if [ -z "$1" ]; then
    # Run all tests
    maestro test tests/e2e/flows
else
    # Run specific test
    maestro test "$1"
fi

# Cleanup
echo "🧹 Cleaning up..."
adb disconnect > /dev/null 2>&1 || true

# Kill Expo if we started it
if [ ! -z "$EXPO_PID" ]; then
    kill $EXPO_PID 2>/dev/null || true
fi

echo "✨ E2E tests completed!"