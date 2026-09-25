import { commentSelectionService } from "../src/services/commentSelection.service.js";
import { classifyUserRole } from "../src/config/users.js";

function runCommentSelectionTests() {
    console.log("==========================================");
    console.log("RUNNING REFINED COMMENT SELECTION SERVICE TESTS");
    console.log("==========================================");

    let passed = 0;
    let total = 0;

    // Test 1: User Role Classification
    total++;
    try {
        const r1 = classifyUserRole("KishoreK_ADSSearchType");
        const r2 = classifyUserRole("RaghuP_ADSSearchType");
        const r3 = classifyUserRole("RVSI-Outsource: Pjayaram_FAI");
        const r4 = classifyUserRole("OWLServiceUser");

        if (r1 === "INTERNAL" && r2 === "INTERNAL" && r3 === "CLIENT" && r4 === "SYSTEM") {
            console.log("✓ User role classification test passed.");
            passed++;
        } else {
            console.error(`✗ User role classification failed: r1=${r1}, r2=${r2}, r3=${r3}, r4=${r4}`);
        }
    } catch (e) {
        console.error("✗ User role classification test threw error:", e.message);
    }

    // Test 2: Order 1 System Suspend Traversal -> Select Client Complaint
    total++;
    try {
        const comments = [
            { date: "2026-09-21", time: "05:20", author: "OWLServiceUser", text: "SUSPEND: Product [Full Title]" },
            { date: "2026-09-21", time: "05:20", author: "RVSI-Outsource: Pjayaram_FAI", text: "In mtg borrower showing as Michelle E McCutcheon missed to run name search in pacer." }
        ];

        const { selectedComment, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        if (selectedComment.author === "RVSI-Outsource: Pjayaram_FAI" && !isInternalStatusExplanation) {
            console.log("✓ Order 1 System suspend traversal passed (selected client complaint).");
            passed++;
        } else {
            console.error("✗ Order 1 traversal failed:", selectedComment);
        }
    } catch (e) {
        console.error("✗ Order 1 traversal test threw error:", e.message);
    }

    // Test 3: Order 3 Internal Suspend Traversal -> Select Client Court Complaint
    total++;
    try {
        const comments = [
            { date: "2026-09-18", time: "18:31", author: "HarryS_ADSSearchType", text: "SUSPEND: Product [Quality Control Rejection] [Int] - TV Auto Suspend" },
            { date: "2026-09-18", time: "17:24", author: "RVSI-Outsource: BrianBarbre", text: "SUSPEND: Product [Full Title] [Int] - Hold for final review" },
            { date: "2026-09-18", time: "14:49", author: "OWLServiceUser", text: "SUSPEND: Product [Full Title]" },
            { date: "2026-09-18", time: "14:49", author: "RVSI-Outsource: RakshithaMS_FAI", text: "Please review Carolina Carbajal court results. D-01-CV-26-027465 reflects status Open..." }
        ];

        const { selectedComment, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        if (selectedComment.author === "RVSI-Outsource: RakshithaMS_FAI" && !isInternalStatusExplanation) {
            console.log("✓ Order 3 Internal suspend traversal passed (selected client court complaint).");
            passed++;
        } else {
            console.error("✗ Order 3 traversal failed:", selectedComment);
        }
    } catch (e) {
        console.error("✗ Order 3 traversal test threw error:", e.message);
    }

    // Test 4: Order 4 Internal Meaningful Comment -> Returns isInternalStatusExplanation = true
    total++;
    try {
        const comments = [
            { date: "2026-09-21", time: "03:36", author: "KishoreK_ADSSearchType", text: "ETA added by KishoreK_ADSSearchType: Hello Team, Please be informed that we requested the abstractor to re-check on this order once we get response we will complete ASAP." },
            { date: "2026-09-21", time: "03:31", author: "KishoreK_ADSSearchType", text: "SUSPEND: Product" },
            { date: "2026-09-21", time: "03:14", author: "RVSI-Outsource: PVinay_FAI", text: "Break in chain prior deed vests title in Virginia S. Goodman..." }
        ];

        const { selectedComment, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        if (selectedComment.author === "KishoreK_ADSSearchType" && isInternalStatusExplanation) {
            console.log("✓ Order 4 Internal valid status comment test passed (isInternalStatusExplanation = true).");
            passed++;
        } else {
            console.error("✗ Order 4 internal status test failed:", selectedComment);
        }
    } catch (e) {
        console.error("✗ Order 4 internal status test threw error:", e.message);
    }

    // Test 5: Order 8 Internal Logout Suspend Traversal -> Select Client THR Request
    total++;
    try {
        const comments = [
            { date: "2026-09-21", time: "23:50", author: "KishoreK_ADSSearchType", text: "SUSPEND: Product [Quality Control Rejection] [Int] - TV Auto Logout - User Logged off system" },
            { date: "2026-09-21", time: "09:23", author: "OWLServiceUser", text: "SUSPEND: Product [Current Owner]" },
            { date: "2026-09-21", time: "09:23", author: "RVSI-Outsource: jyakshith_FAI", text: "Please provide the required No Open Mortgage Checklist documentation... upload marked-up search indexes and Transaction History Report (THR)..." }
        ];

        const { selectedComment, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        if (selectedComment.author === "RVSI-Outsource: jyakshith_FAI" && !isInternalStatusExplanation) {
            console.log("✓ Order 8 Internal logout suspend traversal passed (selected client THR request).");
            passed++;
        } else {
            console.error("✗ Order 8 traversal failed:", selectedComment);
        }
    } catch (e) {
        console.error("✗ Order 8 traversal test threw error:", e.message);
    }

    console.log(`Refined Comment Selection Tests Complete: ${passed}/${total} passed.\n`);
    if (passed !== total) process.exitCode = 1;
}

runCommentSelectionTests();
