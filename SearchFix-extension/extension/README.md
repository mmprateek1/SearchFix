# SearchFix Chrome extension

This unpacked Manifest V3 extension adds a private review panel beside DataTrace TitleVision. TA means the website's existing **Typing Assistant text**, which can be supplied as evidence. The extension's review notes remain in its own panel; it never inserts them into website fields.

## Install and run

1. In the project folder, run `node src/server.js`. Existing dependencies are already installed in this workspace. On another machine, install dependencies with `npm install` first and configure `.env` from `.env.example`.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select this `extension` folder (not the project root).
3. Pin SearchFix, sign in to `https://tv.datatracetitle.com/MyQueriesHome.aspx`, and click the extension icon.
4. Choose **Find SearchFix tasks**. It follows the visible **All Active and Available Tasks** queue link and lists rows whose **Task Name** contains SearchFix. Choose an order to open its **Order Overview**. If already on an order, choose **Read current page**.
5. Check the extracted comments. Load any additional comments on the website first, then reread the page. Mark the history check and choose **Explain client request**.
6. Open the website's **Attachments** or existing read-only **Typing Assistant** window. Use **Find open TA / attachment windows**, then choose which source to read. Popup access is restricted to the same DataTrace host and must match the order number or public order ID. TA is never opened or unlocked automatically.
7. If a popup cannot be read or its download links use JavaScript, download the relevant PDFs using the website and add them to the extension. Alternatively, paste the existing TA text into the extension's TA box. Check every selected PDF's document type.
8. Return to the original Order Overview tab and choose **Analyze selected PDFs**. TA text alone can also be analyzed. Review the explanation, evidence, and remaining questions; **Copy notes** copies only to your clipboard.

The system sends comments, selected PDFs, and TA text to your local backend and then Google Gemini when you select an analysis action. The API key stays in the backend's `.env`, never in Chrome. Only connection/page settings are saved in extension storage; order data and source files remain in panel memory and clear when it closes or a different order is loaded.

## What is read-only

- The reader extracts existing DOM text and visible form values without setting values, clicking website controls, dispatching input events, or submitting forms.
- Queue navigation uses each SearchFix row's **Order Overview** URL. It never follows the order-number `CallServer(..., 'IsTaskAvailable')` link, which can activate work.
- Direct PDF downloads use GET requests to the same host, with redirects rejected. Login HTML, unsupported files, over-size files, and changed order pages are rejected.
- There is no save, upload-to-DataTrace, claim-task, unlock-TA, add-comment, complete-task, or delete operation.
- The existing backend's `DISPUTED` routing for internal status comments is retained, but the panel explicitly explains that this is not document verification.

## Scope and limitations

- Verified live: the All Active and Available Tasks queue's Task Name column, row-specific Order Overview links, order label, and four-column comment table. Site inspected on September 24, 2026.
- The live attachment popup did not appear in the connected browser's tab inventory. The generic popup reader and TA import are implemented, but actual attachment-window and TA layouts still need a Chrome smoke test. Manual PDF selection and TA text paste are supported alternatives.
- Only loaded/rendered task rows and comments are included. The extension does not silently paginate or alter website filters. DataTrace's original comment filters remain unchanged.
- Other-origin popups, iframes, JavaScript download actions, non-PDF documents, expired sessions, and locked TA views need manual handling. It does not bypass locks or permissions.
- File-type suggestions use filenames; check them before analysis. Missing supplied evidence does not prove that a file is absent from the order.
- Backend URL is restricted to `http://localhost:3000` or `http://127.0.0.1:3000`. A remote deployment needs reviewed host permissions and backend authentication configuration.
- The panel is a human review aid. It does not automatically send a client reply. Returning to the order after visiting a popup is required before submitting evidence.

## Verification

Run `node --import dotenv/config --test tests/*.test.js` from the project root. Tests use synthetic data and mocked Gemini responses; they do not send real order data to AI.

For rendered DOM checks, run `node tests/browser/server.js`, then open `http://127.0.0.1:4173/tests/browser/fixture.html`. The fixture checks DataTrace column parsing, safe task navigation, same-order source matching, and unchanged DOM. A synthetic UI preview is at `http://127.0.0.1:4173/tests/browser/panel-preview.html`; it is a mock, not an installed Chrome extension.

Chrome release smoke test: load unpacked, open the real queue, select one SearchFix overview, compare the extracted comment count/text, test its attachment popup and TA text, run the backend with an approved model, then check that no website values, task ownership, comments, or files changed.
