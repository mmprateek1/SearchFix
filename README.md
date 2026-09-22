# SearchFix AI — Issue Classification & Document Routing System

> **Version**: Phase 1 — Comment Understanding and Required Document Selection  
> **Built with**: Node.js, Express, ES Modules, `@google/genai` (Gemini 3.5 Flash)

---

## 📌 Project Overview

**SearchFix AI** is a backend AI service designed to automate issue classification and document routing for real estate title search orders.

When real estate title search orders are reviewed, client comments report various discrepancies or missing items (such as missing deeds, parcel mismatches, bankruptcy issues, court record differences, etc.). 

Rather than downloading and analyzing large volumes of documents indiscriminately, **Phase 1** receives order comments from a Chrome Extension, processes the full chronological context using **Gemini 3.5 Flash**, categorizes the issue(s), determines which specific document types are required for investigation, and returns a structured JSON payload to the Chrome Extension.

---

## 🏗 High-Level Architecture

```
┌──────────────────────────┐
│      DataTrace           │
│                          │
│ SearchFix Order          │
│ Comments                 │
└────────────┬─────────────┘
             │
             │
             ↓
┌──────────────────────────┐
│    Chrome Extension      │
│                          │
│ Extract order/comments   │
└────────────┬─────────────┘
             │
             │ POST JSON (orderNumber, comments)
             ↓
┌─────────────────────────────────────┐
│         SearchFix AI Server         │
│                                     │
│         Express Server              │
│               ↓                     │
│      Request Body Validation         │
│               ↓                     │
│       Comment Preparation           │
│               ↓                     │
│      Gemini 3.5 Flash SDK           │
│               ↓                     │
│     Issue Classification            │
│               ↓                     │
│    Required File Selection          │
│               ↓                     │
│    JS Response Validation Layer     │
└─────────────────┬───────────────────┘
                  │
                  │ Validated JSON Response
                  ↓
┌──────────────────────────┐
│    Chrome Extension      │
│                          │
│ Receives issue types &   │
│ required document list   │
└──────────────────────────┘
```

---

## 🛠 Technology Stack

- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js (ES Modules `"type": "module"`)
- **AI SDK**: `@google/genai` (Official Google Gen AI SDK)
- **Model**: `gemini-2.5-flash` / `gemini-1.5-flash` (configurable via env)
- **Utilities**: `dotenv`, `cors`

---

## 📁 Project Directory Structure

```
searchfix-ai/
│
├── src/
│   ├── server.js                        # Express server entry point & configuration
│   ├── routes/
│   │   └── searchfix.routes.js          # API route definitions (/api/searchfix)
│   ├── controllers/
│   │   └── searchfix.controller.js      # Input validation & HTTP controller
│   ├── services/
│   │   └── gemini.service.js            # Gemini API client & prompt execution
│   ├── prompts/
│   │   └── searchfix.prompt.js          # System prompt & prompt templates
│   └── utils/
│       ├── issueTypes.js                # Allowed ISSUE_TYPES and FILE_TYPES constants
│       └── responseValidator.js         # Deterministic validation of AI JSON output
│
├── tests/
│   └── searchfix.test.js                # Unit tests & live API scenario runner
│
├── .env                                 # Environment variables (git-ignored)
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore definitions
├── package.json                         # Node package configuration & scripts
└── README.md                            # Comprehensive documentation
```

---

## 🔒 Security Principles

1. **API Key Isolation**: The `GEMINI_API_KEY` is strictly maintained on the backend server. It is never transmitted to or embedded inside the Chrome Extension.
2. **Deterministic Response Guard**: Raw AI model responses are intercepted and validated by pure JavaScript (`responseValidator.js`). Unknown issue categories or unrecognized file types are rejected before reaching the Chrome Extension.
3. **Clean Errors**: Server error responses return generic 500 error objects without exposing stack traces, API keys, or system internals.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm (Node Package Manager)

### 2. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 3. Environment Variables Configuration
Copy the `.env.example` file to create a `.env` file:
```bash
cp .env.example .env
```

Open `.env` and set your actual Gemini API key:
```env
GEMINI_API_KEY=AIzaSy...YourActualGeminiApiKey
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

---

## 🚀 Running the Server

### Development Mode (with auto-reload on file save)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

When started, the console will display:
```
SearchFix AI Server running on port 3000
```

---

## 🧪 Testing the API

### 1. Server Status Check (`GET /`)
```bash
curl http://localhost:3000/
```
**Response:**
```json
{
  "message": "SearchFix AI Server is running."
}
```

### 2. Health Check (`GET /health`)
```bash
curl http://localhost:3000/health
```
**Response:**
```json
{
  "status": "OK"
}
```

### 3. Analyze Order Comments (`POST /api/searchfix/analyze`)

#### Example Request (Missing Deed Scenario):
```bash
curl -X POST http://localhost:3000/api/searchfix/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TPS-AD-101-10925216",
    "comments": [
      {
        "date": "2026-09-19",
        "author": "QC_Reviewer",
        "text": "Provide missing 1979 deed Book 7324/Page 494 or add the appropriate search-depth."
      }
    ]
  }'
```

#### Example Response:
```json
{
  "orderNumber": "TPS-AD-101-10925216",
  "issues": [
    {
      "issueType": "MISSING_DEED",
      "claim": "A 1979 deed recorded in Book 7324 Page 494 is missing.",
      "requiredFiles": [
        {
          "fileType": "DEED",
          "reason": "The specific missing 1979 deed must be retrieved for review."
        },
        {
          "fileType": "SEARCH_PACKAGE",
          "reason": "Required to check search depth and deed references."
        }
      ]
    }
  ]
}
```

### 4. Running the Test Suite
Run the included test script to verify validator logic and test representative scenarios:
```bash
npm test
```

---

## 🔌 Chrome Extension Integration Example

In your Chrome Extension `background.js` or content script:

```javascript
async function analyzeSearchFixOrder(orderData) {
    try {
        const response = await fetch("http://localhost:3000/api/searchfix/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orderNumber: orderData.orderNumber,
                comments: orderData.comments // Array of { date, author, text }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Analysis failed");
        }

        const result = await response.json();
        console.log("SearchFix AI Result:", result);
        
        // Use result.issues and result.requiredFiles to download relevant documents
        return result;
    } catch (error) {
        console.error("Chrome Extension API Call Error:", error);
    }
}
```

---

## 🌐 Deploying to Render

1. Push your repository to GitHub (ensure `.env` is ignored by `.gitignore`).
2. Log into [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: `your-actual-api-key`
   - `GEMINI_MODEL`: `gemini-2.5-flash`
6. Click **Create Web Service**.

Render will automatically bind to `0.0.0.0` and use `process.env.PORT`.

---

## 📋 Allowed Issue & File Types Reference

### Allowed ISSUE_TYPES (18):
`MISSING_DEED`, `CHAIN_BREAK`, `PARCEL_MISMATCH`, `LEGAL_DESCRIPTION_MISMATCH`, `TYPING_ERROR`, `TAX_DISCREPANCY`, `LIEN_DISCREPANCY`, `COURT_DISCREPANCY`, `BANKRUPTCY_DISCREPANCY`, `VESTING_DISCREPANCY`, `DEED_DISCREPANCY`, `NAME_SEARCH_MISSING`, `SEARCH_DEPTH`, `MISSING_DOCUMENT`, `WAITING_FOR_CLIENT`, `WAITING_FOR_FEE_APPROVAL`, `WAITING_FOR_COPIES`, `OTHER`

### Allowed FILE_TYPES (12):
`SEARCH_PACKAGE`, `DEED`, `DOT`, `TAX`, `PA`, `LEGAL_DESCRIPTION`, `MAP`, `LIEN`, `PACER`, `PATRIOT`, `TYPED_REPORT`, `COST_WORKSHEET`

---

## 🚀 Scope: Phase 1 vs Phase 2

### ✅ Phase 1 Scope (Implemented):
- Comment reception via HTTP JSON API
- Chronological timeline natural-language processing with Gemini 3.5 Flash
- Multi-issue detection & categorization
- Determination of required file types with reasons
- Deterministic output validation layer

### 🚫 Phase 2 Scope (Out of Scope for Phase 1):
- Document downloading/uploading
- PDF parsing & OCR
- Document evidence verification
- ACCEPTED / REJECTED / REVIEW decision generation
- DataTrace UI automation
