@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js with npm, then open this file again.
  pause
  exit /b 1
)
if not exist "node_modules\express\package.json" (
  echo One-time setup required: open a terminal in this folder and run npm ci.
  pause
  exit /b 1
)
echo SearchFix local analysis service. Keep this window open while using the extension.
echo Website access remains read-only. Close this window to stop the service.
node src/local.js
pause
