import "dotenv/config";
import { validateSearchFixResponse } from "../src/utils/responseValidator.js";
import { geminiService } from "../src/services/gemini.service.js";
import { ISSUE_TYPES, FILE_TYPES } from "../src/utils/issueTypes.js";

/**
 * SearchFix AI Test Suite
 * Covers PRD Section 27 test scenarios and validator checks.
 */

const TEST_CASES = [
    {
        id: "Test 1 — Missing Deed",
        orderNumber: "TEST-ORD-001",
        comments: [
            { date: "2026-09-19", author: "QC", text: "Provide missing 1979 deed Book 7324/Page 494." }
        ],
        expectedIssueType: "MISSING_DEED",
        expectedFiles: ["DEED", "SEARCH_PACKAGE"]
    },
    {
        id: "Test 2 — Parcel Mismatch",
        orderNumber: "TEST-ORD-002",
        comments: [
            { date: "2026-09-19", author: "QC", text: "The parcel number on the tax sheet does not match the subject parcel." }
        ],
        expectedIssueType: "PARCEL_MISMATCH",
        expectedFiles: ["TAX", "PA", "SEARCH_PACKAGE"]
    },
    {
        id: "Test 3 — Bankruptcy",
        orderNumber: "TEST-ORD-003",
        comments: [
            { date: "2026-09-19", author: "QC", text: "Bankruptcy case was found but was not included in the report." }
        ],
        expectedIssueType: "BANKRUPTCY_DISCREPANCY",
        expectedFiles: ["PACER", "PATRIOT", "TYPED_REPORT"]
    },
    {
        id: "Test 4 — Court Issue",
        orderNumber: "TEST-ORD-004",
        comments: [
            { date: "2026-09-19", author: "QC", text: "The court case is showing Open but the typed report states Judgment." }
        ],
        expectedIssueType: "COURT_DISCREPANCY",
        expectedFiles: ["PACER", "TYPED_REPORT"]
    },
    {
        id: "Test 5 — Legal Description",
        orderNumber: "TEST-ORD-005",
        comments: [
            { date: "2026-09-19", author: "QC", text: "There is a discrepancy between the deed legal description and DOT." }
        ],
        expectedIssueType: "LEGAL_DESCRIPTION_MISMATCH",
        expectedFiles: ["DEED", "DOT", "LEGAL_DESCRIPTION"]
    },
    {
        id: "Test 6 — Fee Approval",
        orderNumber: "TEST-ORD-006",
        comments: [
            { date: "2026-09-19", author: "QC", text: "Please provide fee approval before proceeding." }
        ],
        expectedIssueType: "WAITING_FOR_FEE_APPROVAL",
        expectedFiles: ["COST_WORKSHEET"]
    },
    {
        id: "Test 7 — Waiting for Client",
        orderNumber: "TEST-ORD-007",
        comments: [
            { date: "2026-09-19", author: "QC", text: "Waiting for client instructions." }
        ],
        expectedIssueType: "WAITING_FOR_CLIENT",
        expectedFiles: []
    },
    {
        id: "Test 8 — Multiple Issues",
        orderNumber: "TEST-ORD-008",
        comments: [
            { date: "2026-09-18", author: "Searcher", text: "Tax parcel number differs from subject parcel on record." },
            { date: "2026-09-19", author: "QC", text: "Also, missing 1985 deed Book 4100 Page 123 is required." }
        ],
        isMultiple: true
    }
];

function runValidatorUnitTests() {
    console.log("\n==========================================");
    console.log("RUNNING VALIDATOR UNIT TESTS");
    console.log("==========================================");

    let passed = 0;
    let total = 0;

    // Test Valid Object Parsing
    total++;
    try {
        const validMock = {
            orderNumber: "ORD-123",
            issues: [
                {
                    issueType: "MISSING_DEED",
                    claim: "Missing deed reported.",
                    requiredFiles: [{ fileType: "DEED", reason: "Need deed." }]
                }
            ]
        };
        const res = validateSearchFixResponse(validMock, "ORD-123");
        if (res.issues[0].issueType === "MISSING_DEED") {
            console.log("✓ Valid response parsing test passed.");
            passed++;
        }
    } catch (e) {
        console.error("✗ Valid response parsing test failed:", e.message);
    }

    // Test Invalid Issue Category Rejection
    total++;
    try {
        const invalidMock = {
            orderNumber: "ORD-123",
            issues: [
                {
                    issueType: "INVALID_UNKNOWN_ISSUE",
                    claim: "Bad issue type.",
                    requiredFiles: []
                }
            ]
        };
        validateSearchFixResponse(invalidMock, "ORD-123");
        console.error("✗ Reject invalid issue type test failed (should have thrown error).");
    } catch (e) {
        if (e.message.includes("Invalid issue type")) {
            console.log("✓ Reject invalid issue type test passed.");
            passed++;
        } else {
            console.error("✗ Reject invalid issue type failed with unexpected error:", e.message);
        }
    }

    // Test Invalid File Category Rejection
    total++;
    try {
        const invalidFileMock = {
            orderNumber: "ORD-123",
            issues: [
                {
                    issueType: "MISSING_DEED",
                    claim: "Missing deed.",
                    requiredFiles: [{ fileType: "HALLUCINATED_MORTGAGE_FILE", reason: "Bad file type." }]
                }
            ]
        };
        validateSearchFixResponse(invalidFileMock, "ORD-123");
        console.error("✗ Reject invalid file type test failed (should have thrown error).");
    } catch (e) {
        if (e.message.includes("Invalid file type")) {
            console.log("✓ Reject invalid file type test passed.");
            passed++;
        } else {
            console.error("✗ Reject invalid file type failed with unexpected error:", e.message);
        }
    }

    console.log(`Validator Unit Tests Complete: ${passed}/${total} passed.\n`);
}

async function runLiveGeminiTests() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
        console.log("--------------------------------------------------");
        console.log("Skipping Live Gemini API Tests: GEMINI_API_KEY is missing or placeholder in .env.");
        console.log("Add a valid key to .env to execute live Gemini test scenarios.");
        console.log("--------------------------------------------------\n");
        return;
    }

    console.log("==========================================");
    console.log("RUNNING LIVE GEMINI API SCENARIO TESTS");
    console.log("==========================================");

    for (const test of TEST_CASES) {
        console.log(`\nTesting: ${test.id}...`);
        try {
            const result = await geminiService.analyzeComments(test.orderNumber, test.comments);

            console.log(` -> Received Result for Order ${result.orderNumber}:`);
            console.log(JSON.stringify(result, null, 2));

            if (test.isMultiple) {
                if (result.issues.length > 1) {
                    console.log(` ✓ PASSED: Correctly identified multiple issues (${result.issues.length} issues).`);
                } else {
                    console.warn(` ! WARNING: Expected multiple issues, received ${result.issues.length}.`);
                }
            } else {
                const matchIssue = result.issues.find(i => i.issueType === test.expectedIssueType);
                if (matchIssue) {
                    console.log(` ✓ PASSED: Primary issue matches '${test.expectedIssueType}'.`);
                } else {
                    console.warn(` ! WARNING: Expected issue '${test.expectedIssueType}', received:`, result.issues.map(i => i.issueType));
                }
            }
        } catch (err) {
            console.error(` ✗ FAILED: ${test.id} - ${err.message}`);
        }
    }

    console.log("\nLive Gemini Scenario Tests Complete.\n");
}

async function main() {
    runValidatorUnitTests();
    await runLiveGeminiTests();
}

main();
