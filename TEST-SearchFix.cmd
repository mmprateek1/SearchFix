@echo off
cd /d "%~dp0"
echo Running local checks with simulated AI. No Gemini key is needed.
node --test tests/*.test.js
if errorlevel 1 (
  echo Some checks failed. Keep this window open and share the error message.
) else (
  echo All checks passed. Live model accuracy still needs review on real orders.
)
pause
