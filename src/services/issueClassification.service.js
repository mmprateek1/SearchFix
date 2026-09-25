import { geminiService } from "./gemini.service.js";
import { getCommentAnalysisSystemPrompt, getCommentAnalysisUserPrompt } from "../prompts/commentAnalysis.prompt.js";
import { ISSUE_TYPES } from "../config/issueTypes.js";

export class IssueClassificationService {
    /**
     * Classifies SearchFix comment(s) into one or more predefined issue categories.
     * 
     * @param {object} selectedComment Primary comment
     * @param {Array<object>} contextComments Supporting context comments
     * @returns {Promise<Array<{issueType: string, claim: string}>>} List of classified issues
     */
    async classifyIssues(selectedComment, contextComments = []) {
        const systemPrompt = getCommentAnalysisSystemPrompt();
        const userPrompt = getCommentAnalysisUserPrompt(selectedComment, contextComments);

        try {
            const rawResponse = await geminiService.generateJSON(systemPrompt, userPrompt);
            let parsed = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;

            if (!parsed || !Array.isArray(parsed.issues) || parsed.issues.length === 0) {
                // Fallback default issue classification
                return [
                    {
                        issueType: "OTHER",
                        claim: selectedComment.text || "Unspecified SearchFix issue."
                    }
                ];
            }

            // Filter & validate returned issue categories
            const validated = parsed.issues.map(item => {
                const issueType = ISSUE_TYPES.includes(item.issueType) ? item.issueType : "OTHER";
                return {
                    issueType,
                    claim: (item.claim || selectedComment.text || "").trim()
                };
            });

            return validated;
        } catch (error) {
            console.error("[IssueClassificationService] Error during issue classification:", error);
            // A failed AI request must not look like a successful explanation.
            throw error;
        }
    }
}

export const issueClassificationService = new IssueClassificationService();
