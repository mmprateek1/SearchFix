# SearchFix AI — Interactive 2-Step & Decision Tree System

> **Version**: Refined 2-Step Interactive Decision Architecture (Internal vs Client Traversal & Document Routing)  
> **Built with**: Node.js, Express, ES Modules, `@google/genai` (Gemini 3.5 Flash), Multer, Zod

---

## 📌 Refined Comment Selection & Decision Tree

```text
                    Incoming Comments Array (Sorted Descending by Date + Time)
                                        │
                                        ▼
                        Inspect Most Recent Comment
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
    Author is INTERNAL USER                        Author is CLIENT USER / SYSTEM
  (e.g., KishoreK_ADSSearchType)               (e.g., RVSI-Outsource:, OWLServiceUser)
                 │                                             │
      ┌──────────┴──────────┐                       ┌──────────┴──────────┐
      ▼                     ▼                       ▼                     ▼
Comment contains      Valid Meaningful     Comment is SUSPEND /   Actual Client
   SUSPEND:            Comment (ETA /       OWLServiceUser /       Complaint Comment
      │             Abstractor Recheck)    Vague ("please advise") (e.g., "missed name
      │                     │                       │               search in pacer")
      ▼                     ▼                       ▼                     │
Ignore & Trace        Set Selected Comment    Store Context &             ▼
Back to Next           Mark as Internal        Trace Back to         Set Selected
Most Recent           Status Explanation      Next Most Recent          Client Claim
Comment                     │                    Comment                  │
                            ▼                                             ▼
                    Return JSON Response                        Classify Issue(s)
                    decision: "DISPUTED"                        Map Required File Types
                    reason: "Internal work                      Return JSON Response
                    in progress / valid"                        requiredFiles + "AWAITING_DOCUMENTS"
```

---

## 📡 Endpoint Testing Guide

### 🔹 STEP 1: `POST /api/searchfix/analyze-comments`

- **Scenario A (Internal User Valid Status Update - e.g. Order 4 / Order 5)**:
  - When the latest comment is an internal user status explanation (e.g., `KishoreK_ADSSearchType`: *"ETA added... requested abstractor to recheck..."*), backend returns a **`DISPUTED`** JSON response directly, explaining that search work is in-progress and no files are required from the extension.

- **Scenario B (Client Complaint Comment - e.g. Order 1, Order 3, Order 7, Order 8)**:
  - Traces back past system `OWLServiceUser` and `SUSPEND:` comments, selects the primary client complaint, and returns `requiredFiles` (with reasons) and `status: "AWAITING_DOCUMENTS"`.

---

### 🔹 STEP 2: `POST /api/searchfix/analyze-documents`

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `orderData`: JSON string with `orderNumber` & `comments`.
  - `file1`, `file2`, etc.: Uploaded PDF files downloaded by Chrome Extension.
- **Backend Execution**: Analyzes target PDFs via Gemini Files API (`@google/genai`), extracts page-numbered evidence, compares claim vs evidence, and returns `ACCEPTED`, `DISPUTED`, or `REVIEW_REQUIRED`.

---

## 🧪 Running Automated Tests

```bash
npm test
```
