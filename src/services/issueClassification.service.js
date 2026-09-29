import { geminiService } from "./gemini.service.js";
import { getCommentAnalysisSystemPrompt, getCommentAnalysisUserPrompt } from "../prompts/commentAnalysis.prompt.js";
import { ISSUE_TYPES, COMMENT_ONLY_TYPES } from "../config/issueTypes.js";
import { isRVSIUser } from "../config/users.js";
import { referenceContext, referencePrompt } from "./reference.service.js";
import { normalizeCategory } from "../config/referenceCategories.js";
import { trace } from './trace.service.js';
import { commentOnlyDecision, hasSubstantiveClaim } from './commentDecision.service.js';

export class IssueClassificationService {
    /**
     * Classifies SearchFix comment(s) into one or more predefined issue categories.
     * 
     * @param {object} selectedComment Primary comment
     * @param {Array<object>} contextComments Supporting context comments
     * @returns {Promise<{issues: Array<object>, ignoreReason?: string}>} Classified issues or an ignored operational update
     */
    async analyzeComment(selectedComment, contextComments = []) {
        const systemPrompt = getCommentAnalysisSystemPrompt();
        const reference = referenceContext(selectedComment.text);
        const userPrompt = getCommentAnalysisUserPrompt(selectedComment, contextComments) + referencePrompt(reference);

        try {
            const rawResponse = await geminiService.generateJSON(systemPrompt, userPrompt);
            let parsed = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;

            const unmatched = 'No supported issue type matches all parts of this comment. Manual classification is required; no documents were requested.';
            if (parsed?.disposition === 'REVIEW_REQUIRED' || (Array.isArray(parsed?.unmatchedClaims) && parsed.unmatchedClaims.length)) {
                return { issues: [], reviewReason: unmatched, reference };
            }

            if (parsed?.disposition === "IGNORED" && isRVSIUser(selectedComment.author)
                && Array.isArray(parsed.issues) && parsed.issues.length === 0
                && typeof parsed.ignoreReason === "string" && parsed.ignoreReason.trim()
                && !hasSubstantiveClaim(selectedComment.text)) {
                const operational = COMMENT_ONLY_TYPES.find(issueType => commentOnlyDecision({issueType}, selectedComment.text)?.decision);
                if (operational) {
                    parsed = { issues: [{issueType:operational, claim:selectedComment.text,
                        category: {FEE_APPROVAL_REQUEST:'Fee Approval', ABSTRACTOR_STATUS:'Abstractor', NO_REVISION_REQUEST:'No Revision Request'}[operational]}] };
                } else return { issues: [], ignoreReason: parsed.ignoreReason.trim(), reference };
            }

            if (!parsed || !Array.isArray(parsed.issues) || parsed.issues.length === 0) {
                return { issues: [], reviewReason: unmatched, reference };
            }

            // Filter & validate returned issue categories
            if (parsed.issues.some(item => !item || !ISSUE_TYPES.includes(item.issueType) || typeof item.claim !== 'string' || !item.claim.trim())) {
                return { issues: [], reviewReason: unmatched, reference };
            }
            const validated = parsed.issues.map(item => {
                const issueType = item.issueType;
                return {
                    issueType,
                    claim: (item.claim || selectedComment.text || "").trim(),
                    category: normalizeCategory(item.category), reference
                };
            });

            const hasEvidenceIssue = validated.some(issue => !COMMENT_ONLY_TYPES.includes(issue.issueType));
            for (const issue of validated) {
                const early = commentOnlyDecision(issue, hasEvidenceIssue ? issue.claim : selectedComment.text);
                if (early?.reviewReason) return { issues: [], reviewReason: early.reviewReason, reference };
                if (early) Object.assign(issue, early);
            }

            return { issues: validated, reference };
        } catch (error) {
            trace('comments.classification.failed',{code:error.code || 'CLASSIFICATION_ERROR'});
            // A failed AI request must not look like a successful explanation.
            throw error;
        }
    }

    async classifyIssues(selectedComment, contextComments = []) {
        return (await this.analyzeComment(selectedComment, contextComments)).issues;
    }
}

export const issueClassificationService = new IssueClassificationService();
