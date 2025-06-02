# Windows Android Emulator Setup for WSL E2E Testing

This guide helps you set up Android emulator on Windows for E2E testing from WSL.

## Quick Setup Steps

### 1. On Windows Side

#### Option A: Using Android Studio (Recommended)

1. **Open Android Studio**
2. **Start AVD Manager**: Tools → AVD Manager
3. **Create/Start an emulator** (if you don't have one):

   - Click "Create Virtual Device"
   - Choose: Pixel 6, API 33 (Android 13)
   - Start the emulator

4. **Enable ADB over TCP/IP**:
   Open Windows PowerShell or Command Prompt and run:

   ```powershell
   # Check if emulator is running
   adb devices

   # Enable TCP/IP mode
   adb tcpip 5555

   # Get your Windows IP (note the IPv4 address)
   ipconfig
   ```

#### Option B: Using Physical Android Device

1. **Enable Developer Options** on your Android device:

   - Settings → About Phone → Tap "Build Number" 7 times

2. **Enable USB Debugging**:

   - Settings → Developer Options → USB Debugging (ON)

3. **Connect device via USB** to Windows

4. **Enable ADB over WiFi**:

   ```powershell
   # In Windows PowerShell
   adb tcpip 5555

   # Get device IP
   adb shell ip addr show wlan0
   ```

### 2. On WSL Side

Run the setup script we created:

```bash
cd /mnt/c/users/jorda/documents/github/adhdtodo
./scripts/run-e2e-wsl.sh
```

Or manually:

```bash
# Connect to Windows emulator
adb connect [WINDOWS_IP]:5555

# Or connect to physical device
adb connect [DEVICE_IP]:5555

# Verify connection
adb devices
```

## Troubleshooting

### "Connection Refused" Error

1. **Check Windows Firewall**:

   - Windows Security → Firewall & network protection
   - Allow an app → Add adb.exe

2. **Try different ports**:

   ```bash
   adb connect [WINDOWS_IP]:5554  # Default emulator port
   adb connect [WINDOWS_IP]:5037  # ADB server port
   ```

3. **Restart ADB on Windows**:
   ```powershell
   adb kill-server
   adb start-server
   adb tcpip 5555
   ```

### Can't Find Windows IP

In WSL, the Windows host IP changes. Get it with:

```bash
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
```

Or use the localhost forwarding:

```bash
adb connect localhost:5555
```

## Verifying Setup

Once connected, you should see:

```bash
$ adb devices
List of devices attached
emulator-5554  device  # or similar
```

Then you can run E2E tests:

```bash
npm run test:e2e:android
```

## Alternative: Expo Go App

1. Install Expo Go on your Android device/emulator
2. Start Expo in tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
3. Scan QR code with Expo Go app

## Tips

- Keep Android Studio open during testing
- Use a physical device for more reliable connection
- Consider using GitHub Actions for CI/CD instead
- Install scrcpy for screen mirroring: `sudo apt install scrcpy`
