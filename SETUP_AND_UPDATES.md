# Local installation and updates

Use [LOCAL_TESTING.md](LOCAL_TESTING.md) for the full procedure. Current release: 1.5.0.

For another PC, extract SearchFix-local-setup.zip into a permanent folder, install Node.js, and run `npm ci` once. Start START-SearchFix.cmd and load the extracted extension folder in Chrome. Keep data/reference beside src; it contains the reference library required by the backend.

For an update, finish the current batch and close the panel and old local service. Back up the installation, replace the application files with the new package, run `npm ci` if dependencies changed, restart START-SearchFix.cmd and click Reload in chrome://extensions. Enter your own key again. Check /health for the current version.

Unpacked extensions do not automatically install a new ZIP. Replace files and reload on each PC. The package excludes keys and .env, and includes internal reference records for the authorized local team workflow.

Preserve `data/runtime/gemini-usage.json` when updating an existing installation; it keeps the project's daily/minute counters. Live counters are excluded from distribution archives. Model limits are in `config/gemini-rate-limits.json`; see RATE_LIMITS.md before sharing one Gemini project across PCs. Independent backends do not share usage counters.
