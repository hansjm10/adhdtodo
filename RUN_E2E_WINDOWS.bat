@echo off
REM Run e2e tests from Windows and output to a file accessible from WSL

echo Running e2e tests from Windows...
echo.

REM Set output file path
set OUTPUT_FILE=C:\users\jorda\documents\github\adhdtodo\e2e_output.log

REM Clear previous output
echo E2E Test Results > "%OUTPUT_FILE%"
echo ================ >> "%OUTPUT_FILE%"
echo Started at: %date% %time% >> "%OUTPUT_FILE%"
echo. >> "%OUTPUT_FILE%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: node_modules not found. Run npm install first. >> "%OUTPUT_FILE%"
    echo ERROR: node_modules not found. Run npm install first.
    pause
    exit /b 1
)

REM Run the e2e tests and capture output
echo Running npm run test:e2e... >> "%OUTPUT_FILE%"
echo. >> "%OUTPUT_FILE%"

REM Run e2e tests with output to both console and file
call npm run test:e2e >> "%OUTPUT_FILE%" 2>&1
type "%OUTPUT_FILE%"

REM Capture exit code
set EXIT_CODE=%ERRORLEVEL%

echo. >> "%OUTPUT_FILE%"
echo Finished at: %date% %time% >> "%OUTPUT_FILE%"
echo Exit code: %EXIT_CODE% >> "%OUTPUT_FILE%"

echo.
echo Test output saved to: %OUTPUT_FILE%
echo You can read it from WSL using: cat /mnt/c/users/jorda/documents/github/adhdtodo/e2e_output.log
echo.

pause
exit /b %EXIT_CODE%