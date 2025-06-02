# PowerShell script to enable ADB access from WSL
# Run as Administrator

Write-Host "Setting up ADB for WSL access..." -ForegroundColor Green
Write-Host ""

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    pause
    exit
}

# Enable ADB TCP/IP mode
Write-Host "Checking ADB devices..." -ForegroundColor Yellow
adb devices

Write-Host ""
Write-Host "Enabling ADB TCP/IP mode on port 5555..." -ForegroundColor Yellow
adb tcpip 5555

# Add firewall rules
Write-Host ""
Write-Host "Adding Windows Firewall rules for ADB..." -ForegroundColor Yellow

# Remove existing rules if any
Remove-NetFirewallRule -DisplayName "ADB from WSL" -ErrorAction SilentlyContinue

# Add new rules
New-NetFirewallRule -DisplayName "ADB from WSL" -Direction Inbound -Protocol TCP -LocalPort 5555 -Action Allow
New-NetFirewallRule -DisplayName "ADB from WSL" -Direction Inbound -Protocol TCP -LocalPort 5037 -Action Allow

Write-Host ""
Write-Host "Firewall rules added successfully!" -ForegroundColor Green

# Show IP addresses
Write-Host ""
Write-Host "Your IP addresses:" -ForegroundColor Yellow
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Format-Table IPAddress, InterfaceAlias

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "In WSL, run:" -ForegroundColor Cyan
Write-Host "  adb connect 192.168.1.13:5555" -ForegroundColor White
Write-Host ""
pause