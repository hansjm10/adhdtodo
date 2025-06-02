@echo off
echo Enabling ADB over TCP/IP for WSL...
echo.

REM Check if emulator is running
adb devices
echo.

REM Enable TCP/IP mode on port 5555
echo Enabling TCP/IP mode...
adb tcpip 5555
echo.

REM Get Windows IP address
echo Your Windows IP addresses:
ipconfig | findstr /i "ipv4"
echo.

echo ADB TCP/IP mode enabled on port 5555
echo.
echo In WSL, run:
echo   adb connect [YOUR-WINDOWS-IP]:5555
echo.
echo Or try:
echo   adb connect localhost:5555
echo.
pause