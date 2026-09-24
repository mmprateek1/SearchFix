import dotenv from "dotenv";
import { commentSelectionService } from "../src/services/commentSelection.service.js";
import { decisionEngine } from "../src/services/decision.service.js";
import { documentSelectionService } from "../src/services/documentSelection.service.js";
import fs from "fs";

dotenv.config();

console.log("==========================================");
console.log("SEARCHFIX AI REFINED DECISION TREE TEST SUITE");
console.log("==========================================\n");

function runStep1RoutingUnitTests() {
    console.log("--- 1. STEP 1 DOCUMENT ROUTING TESTS ---");
    let passed = 0;
    let total = 0;

    total++;
    try {
        const issues = [{ issueType: "NAME_SEARCH_MISSING", claim: "Missed name search in PACER." }];
        const result = documentSelectionService.selectRequiredDocuments(issues);
        const docs = result[0].requiredDocuments;

        if (docs.includes("PACER") && docs.includes("PATRIOT") && docs.includes("TYPED_REPORT")) {
            console.log("✓ Rule-based document routing for NAME_SEARCH_MISSING passed.");
            passed++;
        }
    } catch (e) {
        console.error("✗ Document routing test failed:", e.message);
    }

    console.log(`Step 1 Routing Tests: ${passed}/${total} passed.\n`);
}

function runStep2DecisionEngineUnitTests() {
    console.log("--- 2. STEP 2 DECISION ENGINE TESTS ---");
    let passed = 0;
    let total = 0;

    total++;
    try {
        const overall = decisionEngine.calculateOverallDecision([{ decision: "ACCEPTED" }, { decision: "REVIEW_REQUIRED" }]);
        if (overall === "ACCEPTED") {
            console.log("✓ Step 2 overall decision aggregation test passed.");
            passed++;
        }
    } catch (e) {
        console.error("✗ Decision aggregation test failed:", e.message);
    }

    console.log(`Step 2 Decision Engine Tests: ${passed}/${total} passed.\n`);
}

async function runRegressionDataTests() {
    console.log("--- 3. REGRESSION DATASET TESTS (Orders 1-8 Timeline & Decision Tree) ---");
    if (!fs.existsSync("./sample-data/orders.json")) {
        console.log("No sample-data/orders.json found.");
        return;
    }

    const sampleOrders = JSON.parse(fs.readFileSync("./sample-data/orders.json", "utf-8"));
    let passed = 0;

    for (const order of sampleOrders) {
        const { selectedComment, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(order.comments);
        
        const authorMatch = selectedComment && selectedComment.author === order.expectedSelectedAuthor;
        const statusMatch = isInternalStatusExplanation === order.expectedIsInternalStatus;

        if (authorMatch && statusMatch) {
            console.log(`✓ ${order.id}: Author '${selectedComment.author}' matched. (InternalStatus: ${isInternalStatusExplanation})`);
            passed++;
        } else {
            console.warn(`! ${order.id}: Failed. Expected author '${order.expectedSelectedAuthor}' (Status: ${order.expectedIsInternalStatus}), got '${selectedComment?.author}' (Status: ${isInternalStatusExplanation})`);
        }
    }

    console.log(`Regression Dataset Tests: ${passed}/${sampleOrders.length} passed.\n`);
}

async function main() {
    runStep1RoutingUnitTests();
    runStep2DecisionEngineUnitTests();
    await runRegressionDataTests();
}

main();
