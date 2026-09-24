import fs from "fs";
import { commentSelectionService } from "../services/commentSelection.service.js";
import { issueClassificationService } from "../services/issueClassification.service.js";
import { documentSelectionService } from "../services/documentSelection.service.js";
import { documentAnalysisService } from "../services/documentAnalysis.service.js";
import { evidenceService } from "../services/evidence.service.js";
import { decisionEngine } from "../services/decision.service.js";
import { SearchFixStep1ResultSchema, SearchFixStep2ResultSchema } from "../schemas/result.schema.js";
import { geminiService } from "../services/gemini.service.js";

/**
 * STEP 1 ENDPOINT CONTROLLER:
 * Receives order comments from Chrome Extension, executes the Internal vs Client decision tree.
 * - If Internal User Status Update -> returns DISPUTED immediately.
 * - If Client Complaint -> returns required document list with status: "AWAITING_DOCUMENTS".
 */
export async function analyzeCommentsController(req, res) {
    try {
        const { orderNumber, comments } = req.body || {};

        if (!orderNumber || typeof orderNumber !== "string" || orderNumber.trim() === "") {
            return res.status(400).json({ error: "orderNumber is required and must be a non-empty string." });
        }

        if (!comments || !Array.isArray(comments) || comments.length === 0) {
            return res.status(400).json({ error: "comments array must contain at least one comment." });
        }

        const cleanOrderNumber = orderNumber.trim();
        console.log(`[SearchFix Step 1] Analyzing comments for Order ${cleanOrderNumber} (${comments.length} comments)`);

        // 1. Comment Selection & Timeline Traversal
        const { selectedComment, contextCommentsUsed, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        const analysisId = `SF-${cleanOrderNumber}-${Date.now()}`;

        // CASE 1A: Internal User Valid Comment explaining status (e.g. "ETA added... requested abstractor to re-check")
        if (isInternalStatusExplanation) {
            console.log(`[SearchFix Step 1] Order ${cleanOrderNumber}: Selected internal user comment (${selectedComment.author}). Returning DISPUTED.`);
            
            return res.status(200).json({
                analysisId,
                orderNumber: cleanOrderNumber,
                commentAnalysis: {
                    selectedComment: {
                        date: selectedComment.date,
                        time: selectedComment.time,
                        author: selectedComment.author,
                        role: selectedComment.role,
                        text: selectedComment.text
                    },
                    contextCommentsUsed: contextCommentsUsed.map(c => ({
                        date: c.date,
                        time: c.time,
                        author: c.author,
                        role: c.role,
                        text: c.text,
                        purpose: c.purpose
                    }))
                },
                issues: [],
                overallDecision: "DISPUTED",
                reason: `Internal company comment by ${selectedComment.author} ("${selectedComment.text}") confirms order is actively being handled. No unaddressed client error detected.`,
                status: "DISPUTED"
            });
        }

        // CASE 2C: Client Complaint Comment
        // 2. Issue Classification
        const rawIssues = await issueClassificationService.classifyIssues(selectedComment, contextCommentsUsed);

        // 3. Rule-Based Document Selection
        const issuesWithDocs = documentSelectionService.selectRequiredDocuments(rawIssues);

        const formattedIssues = issuesWithDocs.map(issue => ({
            issueType: issue.issueType,
            claim: issue.claim,
            requiredFiles: issue.requiredDocuments.map(docType => ({
                fileType: docType,
                reason: `Required to investigate ${issue.issueType.toLowerCase().replace(/_/g, " ")} claim.`
            }))
        }));

        const step1Payload = {
            analysisId,
            orderNumber: cleanOrderNumber,
            commentAnalysis: {
                selectedComment: {
                    date: selectedComment.date,
                    time: selectedComment.time,
                    author: selectedComment.author,
                    role: selectedComment.role,
                    text: selectedComment.text
                },
                contextCommentsUsed: contextCommentsUsed.map(c => ({
                    date: c.date,
                    time: c.time,
                    author: c.author,
                    role: c.role,
                    text: c.text,
                    purpose: c.purpose
                }))
            },
            issues: formattedIssues,
            status: "AWAITING_DOCUMENTS"
        };

        const validatedResult = SearchFixStep1ResultSchema.parse(step1Payload);

        console.log(`[SearchFix Step 1] Complete for Order ${cleanOrderNumber}: ${validatedResult.issues.length} client issue(s) identified.`);
        return res.status(200).json(validatedResult);

    } catch (error) {
        console.error("[SearchFix Controller] Step 1 analysis failed:", error);
        return res.status(500).json({ error: "SearchFix comment analysis failed." });
    }
}

/**
 * STEP 2 ENDPOINT CONTROLLER:
 * Receives uploaded PDF files downloaded by Chrome Extension, extracts evidence, compares claim vs evidence,
 * and returns ACCEPTED, DISPUTED, or REVIEW_REQUIRED decisions.
 */
export async function analyzeDocumentsController(req, res) {
    const uploadedLocalPaths = [];

    try {
        let bodyData = req.body;

        if (typeof req.body.orderData === "string") {
            try {
                bodyData = JSON.parse(req.body.orderData);
            } catch (e) {
                return res.status(400).json({ error: "Invalid JSON in 'orderData' field." });
            }
        }

        const orderNumber = bodyData.orderNumber || req.body.orderNumber;
        const comments = bodyData.comments || req.body.comments;
        const analysisId = bodyData.analysisId || req.body.analysisId;

        if (!orderNumber || typeof orderNumber !== "string" || orderNumber.trim() === "") {
            return res.status(400).json({ error: "orderNumber is required." });
        }

        if (!comments || !Array.isArray(comments) || comments.length === 0) {
            return res.status(400).json({ error: "comments array must contain at least one comment." });
        }

        const uploadedFiles = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                uploadedLocalPaths.push(file.path);

                let fileType = "SEARCH_PACKAGE";
                if (req.body[`fileType_${file.fieldname}`]) {
                    fileType = req.body[`fileType_${file.fieldname}`];
                } else if (file.originalname.toUpperCase().includes("DEED")) {
                    fileType = "DEED";
                } else if (file.originalname.toUpperCase().includes("TAX")) {
                    fileType = "TAX";
                } else if (file.originalname.toUpperCase().includes("PACER")) {
                    fileType = "PACER";
                } else if (file.originalname.toUpperCase().includes("PATRIOT")) {
                    fileType = "PATRIOT";
                } else if (file.originalname.toUpperCase().includes("REPORT") || file.originalname.toUpperCase().includes("TYPED")) {
                    fileType = "TYPED_REPORT";
                } else if (file.originalname.toUpperCase().includes("THR")) {
                    fileType = "THR";
                } else if (file.originalname.toUpperCase().includes("DOT")) {
                    fileType = "DOT";
                }

                uploadedFiles.push({
                    fileName: file.originalname,
                    fileType,
                    path: file.path
                });
            }
        }

        const cleanOrderNumber = orderNumber.trim();
        console.log(`[SearchFix Step 2] Analyzing PDF evidence for Order ${cleanOrderNumber} (${uploadedFiles.length} files attached)`);

        // Stage 1: Comment Selection & Timeline Traversal
        const { selectedComment, contextCommentsUsed, isInternalStatusExplanation } = commentSelectionService.selectSearchFixComment(comments);

        if (isInternalStatusExplanation) {
            return res.status(200).json({
                analysisId: analysisId || `SF-${cleanOrderNumber}-${Date.now()}`,
                orderNumber: cleanOrderNumber,
                commentAnalysis: {
                    selectedComment: {
                        date: selectedComment.date,
                        time: selectedComment.time,
                        author: selectedComment.author,
                        role: selectedComment.role,
                        text: selectedComment.text
                    },
                    contextCommentsUsed: contextCommentsUsed.map(c => ({
                        date: c.date,
                        time: c.time,
                        author: c.author,
                        role: c.role,
                        text: c.text,
                        purpose: c.purpose
                    }))
                },
                issues: [],
                overallDecision: "DISPUTED"
            });
        }

        // Stage 2: Issue Classification
        const rawIssues = await issueClassificationService.classifyIssues(selectedComment, contextCommentsUsed);

        // Stage 3: Document Selection Mapping
        const issuesWithDocs = documentSelectionService.selectRequiredDocuments(rawIssues);

        // Stage 4-6: PDF Document Analysis, Evidence Extraction & Decision Engine
        const processedIssues = [];

        for (const issue of issuesWithDocs) {
            const rawEvidence = await documentAnalysisService.analyzeDocumentsForIssue(issue, uploadedFiles);
            const formattedEvidence = evidenceService.formatEvidence(rawEvidence);
            const { decision, reason } = await decisionEngine.evaluateIssueDecision(issue, formattedEvidence);

            processedIssues.push({
                issueType: issue.issueType,
                clientClaim: issue.claim,
                requiredDocuments: issue.requiredDocuments,
                evidence: formattedEvidence,
                decision,
                reason
            });
        }

        // Stage 7: Overall Decision Aggregation
        const overallDecision = decisionEngine.calculateOverallDecision(processedIssues);

        const step2Payload = {
            analysisId: analysisId || `SF-${cleanOrderNumber}-${Date.now()}`,
            orderNumber: cleanOrderNumber,
            commentAnalysis: {
                selectedComment: {
                    date: selectedComment.date,
                    time: selectedComment.time,
                    author: selectedComment.author,
                    role: selectedComment.role,
                    text: selectedComment.text
                },
                contextCommentsUsed: contextCommentsUsed.map(c => ({
                    date: c.date,
                    time: c.time,
                    author: c.author,
                    role: c.role,
                    text: c.text,
                    purpose: c.purpose
                }))
            },
            issues: processedIssues,
            overallDecision
        };

        const validatedResult = SearchFixStep2ResultSchema.parse(step2Payload);

        console.log(`[SearchFix Step 2] Complete for Order ${cleanOrderNumber}. Overall Decision: ${overallDecision}`);
        return res.status(200).json(validatedResult);

    } catch (error) {
        console.error("[SearchFix Controller] Step 2 document analysis failed:", error);
        return res.status(500).json({ error: "SearchFix document analysis failed." });
    } finally {
        for (const localPath of uploadedLocalPaths) {
            try {
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            } catch (err) {
                console.warn(`[SearchFix Controller] Temp file cleanup warning (${localPath}):`, err.message);
            }
        }
    }
}

/**
 * Legacy / Phase 1 compatibility wrapper
 */
export async function analyzeSearchFix(req, res) {
    return analyzeCommentsController(req, res);
}

/**
 * Unified Controller Endpoint
 */
export async function analyzeFullOrder(req, res) {
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        return analyzeDocumentsController(req, res);
    }
    return analyzeCommentsController(req, res);
}
