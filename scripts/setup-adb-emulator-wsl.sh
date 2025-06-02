#!/bin/bash
# Setup ADB connection from WSL to Android Emulator running on Windows

echo "Setting up ADB connection from WSL to Android Emulator..."

# Kill any existing ADB server in WSL
echo "Stopping ADB server in WSL..."
adb kill-server 2>/dev/null
sleep 2

# Option 1: Try using localhost (this usually works for emulators)
echo "Attempting to connect to emulator via localhost..."
adb connect localhost:5554

# Check if connection succeeded
if adb devices | grep -q "localhost:5554"; then
    echo "✓ Successfully connected to emulator!"
    adb devices
else
    echo "localhost connection failed, trying alternative method..."
    
    # Option 2: Forward the port from Windows
    echo "Setting up port forwarding..."
    # This requires running from Windows side:
    echo "Please run this command in Windows PowerShell:"
    echo "  adb forward tcp:5555 tcp:5555"
    echo ""
    echo "Then press Enter here to continue..."
    read -r
    
    # Try connecting after port forward
    adb connect localhost:5555
    adb devices
fi

echo ""
echo "To make this permanent, add to your ~/.bashrc:"
echo "  # For emulator access from WSL"
echo "  alias adb-emulator='adb connect localhost:5554'"