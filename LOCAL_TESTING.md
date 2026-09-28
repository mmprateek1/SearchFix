# SearchFix 1.4.7: run and test locally

Both parts run on your PC: the Chrome extension reads DataTrace and a local service calls Gemini. Internet is still needed for DataTrace and Gemini. The website remains read-only.

## Start with the demo

1. Keep the project in one permanent folder. If using a ZIP, extract it first.
2. Double-click `TEST-SearchFix.cmd`. It checks the code with simulated AI and does not require an API key.
3. Double-click `PREVIEW-SearchFix.cmd` and keep its window open.
4. Open `http://127.0.0.1:4173/tests/browser/panel-preview.html` in Chrome.
5. You should see only **Scan the page**. Click it. Four synthetic orders appear, each marked Pending.
6. Click **Start the search fix** at the bottom right. If no key is saved, the key input opens.
7. In this demo ONLY, enter `AQ.TEST_ONLY_12345678901234567890`, choose **Use this key**, and then **Start the search fix** again.
8. The four orders finish as Ignored, Accepted, Disputed, and Review required. Open each row to see the explanation. These are simulated results, not evidence that Gemini classified a real order correctly.
9. Close the preview window when finished. If its port is already in use, an existing preview may already be running; open the same URL instead.

## Run with your actual extension

1. Install Node.js 22 or another version supported by this project (22 through 26). In the project folder, run `npm ci` once to install dependencies. If dependencies are already installed, skip this step.
2. Double-click `START-SearchFix.cmd`. Keep this window open. The service is available only on this PC at `http://127.0.0.1:3000`.
3. Open `http://127.0.0.1:3000/health` in Chrome. It should show version `1.4.7` and status `OK`. This checks the local service, not Gemini permissions.
4. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the project's `extension` folder. If SearchFix is already installed from this folder, click **Reload** instead.
5. Sign in to DataTrace normally. Open **All Active and Available Tasks** and load the queue rows you want checked.
6. Open SearchFix. Click **Scan the page**. Scanning does not call Gemini or examine each order yet.
7. After scanning, the green **Add Gemini API key** button appears at the top right. Enter your real key and choose **Use this key**. This saves the key immediately without an API test; Gemini is contacted only after Start. No `.env` key is used.
8. Choose **Start the search fix**. Keep the panel open. Each order moves from Pending to Processing and then its final status.
9. Open a completed order to see its category, current document evidence, explanation, and historical source references. Copy notes only copies to your clipboard.

## What the colors mean

| Status | Color | Meaning |
| --- | --- | --- |
| Pending | Gray | Not examined yet |
| Processing | Blue | This order is being examined |
| Accepted | Green | Current evidence supports the reported error |
| Disputed | Red | Current evidence contradicts the reported error, or the preserved internal routing rule applies |
| Ignored | Muted gray | An existing ignore rule applies |
| Review required | Amber | Required evidence is missing, unreadable, inconclusive, or processing failed |

Historical records guide interpretation but do not substitute for current documents. Some previous records say a file was added later; this never means the extension added a file or corrected the current order.

## Check real results carefully during development

Start with a small loaded queue and compare the extension's category, evidence, and result against the source documents and a search-team review. Record disagreements as examples for the next revision. The reference files contain final comments and labels, but not all original evidence PDFs, so the historical labels alone cannot establish end-to-end model accuracy. Automated checks use simulated Gemini responses; no accuracy percentage is claimed.

For NAME_SEARCH_MISSING, the service requires PACER, PATRIOT, TA text, Search Package, and Index. The numeric prefix is not hard-coded: `1280806404_Pacer.pdf` and another order's numbered Pacer PDF are recognized by document type within that order's verified Attachments view. Cost Work Sheet and THR are collected only when required for the classified issue. TA is never substituted with an attached PDF.

The existing limits remain: loaded queue/comment rows only, no automatic pagination, up to six corresponding PDFs, 20 MB per PDF and 40 MB total. Unsupported links, locked TA, excess files, or required documents that cannot be verified lead to Review required. Closing the panel interrupts processing and clears its results.

## If something does not work

- **Cannot reach the local service:** start `START-SearchFix.cmd`; check `/health` and keep the service window open.
- **Port 3000 is already in use:** close the old SearchFix service window, then start the new version. Do not close unrelated software.
- **Old interface or version:** reload the correct extension folder and restart the service. The release copy is also supplied in `SearchFix-extension/extension`, but use only one installed copy.
- **Key rejected:** copy the full key from Google AI Studio. `AQ.` keys are supported. The displayed error distinguishes bad formatting from actual model-access/quota failures.
- **Reference library missing:** restore the `data/reference` folder from the local setup package, then restart. It is required; the service does not silently continue without your reference data.
- **No orders found:** open the task queue, load the desired rows, then scan again. The extension does not claim work or activate SearchFix tasks.
- **npm launcher error:** use a working Node.js installation with npm. Tests and an already-installed service can be run with the provided CMD files, which call Node directly.

The backend keeps the reference data locally. During real analysis, it sends relevant historical examples and the PDF category guidance with the current request to Gemini. It does not upload the full workbooks or the email PDF for each order, and neither original file is modified.

## Attachment/TA troubleshooting in 1.4.2

The supplied TitleVision page uses `showAttachmentsV2()` and `showTypingAssistant()` wrappers. SearchFix now resolves their known read-only destinations directly from the current order's PublicOrderId. It never executes those handlers, their ASP.NET postbacks, Save, Clear, Upload, or delivery checkboxes. Attachment Manager order IDs in URL paths are verified before reading. TA comes from the report textarea, preserving line breaks; an empty or ambiguous report requires review. Attachment rows may populate after page load, so the reader briefly waits for them.

After scanning, expand **Activity log** below the order list. It shows navigation, page-reader calls, required file types, selected documents, download sizes, TA character counts, backend requests, results, and tab cleanup. Use **Copy activity log** after the run to share diagnostics. The most recent 1,500 entries stay in panel memory until it closes. Review notes retain the specific source error; logs identify the failing stage. API keys, comment bodies, TA text, PDF bytes, and source URLs are not recorded in this activity log.

The backend terminal now shows structured events with `requestId`. The extension's `api.response` entry shows the same request ID, allowing you to find its backend stages: comment selection, reference matching, classification, file preparation, Gemini calls/retries, evidence extraction, decisions, and cleanup. Browser-side source failures happen before evidence reaches the backend, so inspect the extension log as well as the terminal.

To apply this update, stop the old backend window and double-click START-SearchFix.cmd. Reload SearchFix from `brave://extensions` (Brave) or `chrome://extensions` (Chrome). Verify version 1.4.7. Open DataTrace, scan, enter your key again, and start a small queue. If an order still requires review, copy both its review notes and Activity log. Unsupported file-download handlers, login redirects, and unavailable/locked documents still require review rather than an invented result.

Additional local browser check: while PREVIEW-SearchFix.cmd is running, open `http://127.0.0.1:4173/tests/browser/popup-fixture.html`. It reproduces the supplied navigation structure with synthetic data. No production order is accessed.

## Collecting one log in 1.4.2

After each order, extension processing steps are copied automatically to the backend terminal as `extension.activity` entries. The `stage` identifies the browser step, and `client` contains counts, selected document types, or a status. You can now send the START-SearchFix.cmd output to diagnose both browser collection and backend analysis. If the backend connection is unavailable, the extension still retains its Activity log and the order result is preserved.

Restart the backend and reload the extension before the next run; use version 1.4.7 for this update. A Gemini 503 causes a switch to the next candidate; the final candidate has up to three attempts with backoff. Key saving no longer verifies model access. Any provider error is reported during analysis. Missing files still require review.

## Filename-link fix in 1.4.3

SearchFix now recognizes the JavaScript-backed filename links shown in your Attachment Manager HTML. It extracts each file ID and requests the site's AttachmentViewer URL directly, without clicking the link or executing its handler. Files may appear in any order; document selection uses filenames and types. Hidden shared copies and edit rows are excluded.

Restart START-SearchFix.cmd and reload the correct extension folder, then rerun the affected order. Look for `attachments.selected` with SEARCH_PACKAGE, followed by `pdf.download.start` and `pdf.download.complete`. Backend `evidence.received` should then report a positive file count and byte count. These are the success indicators to confirm on the real site; local tests used simulated PDF responses.

## PDF-stream fix in 1.4.4

The download now uses the observed `attachment.ashp` URL with each selected attachment's ID and your existing DataTrace browser session. Keep DataTrace signed in in the same browser as the extension. No Ctrl+S or PDF toolbar interaction is required. Restart START-SearchFix.cmd and reload the extension before retrying.

Successful access is visible as `pdf.download.complete` and positive file/byte counts in `evidence.received`. A later Review required result can still mean that another required document is missing or the model could not establish the evidence. The activity log now includes `errorCode` on PDF failures: PDF_HTTP_ERROR, PDF_CONTENT_INVALID, PDF_NETWORK_OR_REDIRECT, PDF_TIMEOUT, or PDF_SIZE_LIMIT. These distinguish file-access problems from the final assessment without logging URLs, session cookies, or PDF contents.

## Model fallback in 1.4.5

Restart START-SearchFix.cmd and reload the extension to apply this update. The chains in README.md are tried in order, using your entered key throughout. Saved keys are used directly for analysis; the extension does not call the key-verification endpoint. Backend logs show `gemini.model-fallback`, the actual model in `gemini.generate.complete`, and `gemini.chain-exhausted` if all candidates fail. Unavailable model IDs are skipped; adding a name does not grant access to it or guarantee separate quotas. No live account access is established by the automated tests.

## Proactive rate protection in 1.4.6

The supplied account limits now apply automatically. Read [RATE_LIMITS.md](RATE_LIMITS.md) for the configured values and counting policy. SearchFix checks remaining requests and input tokens before generation, switches to an eligible fallback, and preserves usage across service restarts. A model may be skipped without contacting Google. The optional legacy key-test endpoint consumes budget if explicitly called; the extension never calls it. If every model is full, retry once its window clears; daily limits reset at midnight Pacific. Other apps or separate backend installations are outside this local tracker.

## Immediate key saving in 1.4.7

Use this key saves the supplied key in browser-session storage immediately, with no Gemini verification request. Start also skips verification and begins the real order workflow. Basic local input/HTTP-header format checks remain; actual authentication errors appear only when analysis calls Gemini. Closing and reopening the panel keeps the key for the same browser session. Restarting the browser or reloading the extension requires entry again.
