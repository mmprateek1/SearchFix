import { z } from "zod";
import { ISSUE_TYPES } from "../config/issueTypes.js";
import { DOCUMENT_TYPES } from "../config/documentMappings.js";

export const RequiredFileItemSchema = z.object({
    fileType: z.enum(DOCUMENT_TYPES),
    reason: z.string()
});

export const Step1IssueSchema = z.object({
    issueType: z.enum(ISSUE_TYPES),
    claim: z.string(),
    requiredFiles: z.array(RequiredFileItemSchema)
});

/**
 * Zod Schema for Step 1 Response Payload:
 * Returned to Chrome Extension so it knows which specific files to download.
 */
export const SearchFixStep1ResultSchema = z.object({
    analysisId: z.string(),
    orderNumber: z.string(),
    commentAnalysis: z.object({
        selectedComment: z.object({
            date: z.string().optional(),
            time: z.string().optional(),
            author: z.string().optional(),
            role: z.enum(["INTERNAL", "CLIENT", "SYSTEM"]),
            text: z.string()
        }),
        contextCommentsUsed: z.array(z.object({
            date: z.string().optional(),
            time: z.string().optional(),
            author: z.string().optional(),
            role: z.enum(["INTERNAL", "CLIENT", "SYSTEM"]).optional(),
            text: z.string().optional(),
            purpose: z.string().optional()
        }))
    }),
    issues: z.array(Step1IssueSchema),
    status: z.literal("AWAITING_DOCUMENTS")
});

export const EvidenceItemSchema = z.object({
    document: z.string(),
    page: z.number().nullable().optional(),
    field: z.string().optional(),
    value: z.string().optional(),
    finding: z.string(),
    quotedText: z.string().optional(),
    confidence: z.number().optional()
});

export const Step2IssueDecisionSchema = z.object({
    issueType: z.enum(ISSUE_TYPES),
    clientClaim: z.string(),
    requiredDocuments: z.array(z.enum(DOCUMENT_TYPES)),
    evidence: z.array(EvidenceItemSchema),
    decision: z.enum(["ACCEPTED", "DISPUTED", "REVIEW_REQUIRED"]),
    reason: z.string()
});

/**
 * Zod Schema for Step 2 Response Payload:
 * Returned to Chrome Extension after PDF evidence analysis.
 */
export const SearchFixStep2ResultSchema = z.object({
    analysisId: z.string().optional(),
    orderNumber: z.string(),
    commentAnalysis: z.object({
        selectedComment: z.object({
            date: z.string().optional(),
            time: z.string().optional(),
            author: z.string().optional(),
            role: z.enum(["INTERNAL", "CLIENT", "SYSTEM"]),
            text: z.string()
        }),
        contextCommentsUsed: z.array(z.object({
            date: z.string().optional(),
            time: z.string().optional(),
            author: z.string().optional(),
            role: z.enum(["INTERNAL", "CLIENT", "SYSTEM"]).optional(),
            text: z.string().optional(),
            purpose: z.string().optional()
        }))
    }),
    issues: z.array(Step2IssueDecisionSchema),
    overallDecision: z.enum(["ACCEPTED", "DISPUTED", "REVIEW_REQUIRED"])
});
