#!/bin/bash
# Fix ADB connection from WSL to Windows

echo "Fixing ADB connection from WSL to Windows..."

# Kill any existing ADB server in WSL
echo "Stopping ADB server in WSL..."
adb kill-server 2>/dev/null

# Set environment variable to use Windows ADB server
export ADB_SERVER_SOCKET=tcp:192.168.1.13:5037

# Try connecting to the Windows ADB server on the default port
echo "Connecting to Windows ADB server on default port 5037..."
adb devices

# If that doesn't work, try the TCP port
if [ $? -ne 0 ]; then
    echo "Trying TCP port 5555..."
    adb connect 192.168.1.13:5555
fi

echo "Current devices:"
adb devices