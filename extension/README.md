# SearchFix extension 1.4.7

Start the local backend with START-SearchFix.cmd in the full project. Load or reload this folder in chrome://extensions.

1. Open the DataTrace task queue and the extension. Initially only **Scan the page** is shown.
2. Scan to list the loaded orders. Scanning does not start analysis.
3. Use the green API-key button that appears after scanning to save your key. A missing key is also requested when you press Start.
4. Click **Start the search fix** at the bottom right.
5. Follow the Pending, Processing, Accepted, Disputed, Ignored and Review required badges inside each order row. Open a row for findings, evidence and historical references.

The backend consults the supplied spreadsheets and email category guidance. Historical cases assist interpretation; current evidence determines the result. TA remains text from Typing Assistant and PDFs come from Attachments. Numeric filename prefixes vary; Index Snapshot and Search Package are separate document types.

Keys stay only for the browser session. Reenter after browser restart or extension reload. Saving a key makes no API test calls; Gemini is contacted only when analysis starts; there is no environment-key fallback. Update the extension and backend together.

The extension never claims work, edits statuses or fields, posts comments, uploads to DataTrace or unlocks TA. Keep the panel open. Only loaded rows are scanned; PDF limits and source/order checks remain.

See LOCAL_TESTING.md in the full package for installation and a demo requiring no real key. The extension alone is not the analysis service.
