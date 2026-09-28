import { geminiService } from "./gemini.service.js";
import { getCommentAnalysisSystemPrompt, getCommentAnalysisUserPrompt } from "../prompts/commentAnalysis.prompt.js";
import { ISSUE_TYPES } from "../config/issueTypes.js";
import { isRVSIUser } from "../config/users.js";
import { referenceContext, referencePrompt } from "./reference.service.js";
import { normalizeCategory } from "../config/referenceCategories.js";
import { trace } from './trace.service.js';

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

            if (parsed?.disposition === "IGNORED" && isRVSIUser(selectedComment.author)
                && Array.isArray(parsed.issues) && parsed.issues.length === 0
                && typeof parsed.ignoreReason === "string" && parsed.ignoreReason.trim()) {
                return { issues: [], ignoreReason: parsed.ignoreReason.trim(), reference };
            }

            if (!parsed || !Array.isArray(parsed.issues) || parsed.issues.length === 0) {
                // Fallback default issue classification
                return { issues: [
                    {
                        issueType: "OTHER",
                        claim: selectedComment.text || "Unspecified SearchFix issue.",
                        category: "Uncategorized", reference
                    }
                ] };
            }

            // Filter & validate returned issue categories
            const validated = parsed.issues.map(item => {
                const issueType = ISSUE_TYPES.includes(item.issueType) ? item.issueType : "OTHER";
                return {
                    issueType,
                    claim: (item.claim || selectedComment.text || "").trim(),
                    category: normalizeCategory(item.category), reference
                };
            });

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
