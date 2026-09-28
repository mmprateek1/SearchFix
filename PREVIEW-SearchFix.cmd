@echo off
cd /d "%~dp0"
echo Local demo: http://127.0.0.1:4173/tests/browser/panel-preview.html
echo Open that address in Chrome. Use the fake demo key shown in LOCAL_TESTING.md.
echo This demo uses simulated orders and does not connect to Gemini or DataTrace.
node tests/browser/server.js
pause
