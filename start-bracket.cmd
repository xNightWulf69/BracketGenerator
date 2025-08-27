@echo off
title Bracket Generator
cd /d "%~dp0"

:: Define escape sequence for clickable hyperlinks
set "ESC="
set "CP_LINK=%ESC%]8;;http://localhost:3000/BracketControlPanel.html%ESC%\Control Panel%ESC%]8;;%ESC%\"
set "BR_LINK=%ESC%]8;;http://localhost:3000/Bracket.html%ESC%\Bracket%ESC%]8;;%ESC%\"

:: Check if Node.js is installed
node -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Node.js not found. Downloading and installing...
    powershell -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/v20.16.0/node-v20.16.0-x64.msi -OutFile nodejs.msi"
    msiexec /i nodejs.msi /quiet /norestart
    del nodejs.msi
    echo Node.js installed. Please restart this script if it fails to detect Node.
) else (
    for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
    echo Node.js found...
)

:: Install dependencies if missing
if not exist "node_modules" (
    echo Installing required dependencies...
    npm install
)

:: Launch control panel in browser
start http://localhost:3000/BracketControlPanel.html

echo Starting Bracket Generator server...
echo Press Ctrl+C to stop the server.
echo %CP_LINK% http://localhost:3000/BracketControlPanel.html
echo %BR_LINK% http://localhost:3000/Bracket.html
echo.

node server.js
pause