import { classifyUserRole } from "../config/users.js";
import { deduplicateComments } from "../utils/duplicateDetector.js";

/**
 * Vague triggers that indicate a comment needs context from a previous comment.
 */
const VAGUE_PATTERNS = [
    "please advise",
    "please review",
    "recheck",
    "as mentioned",
    "regarding above",
    "continue",
    "proceed"
];

export class CommentSelectionService {
    /**
     * Traverses SearchFix comments chronologically (most recent first) according to
     * the Internal vs Client decision tree rules from the 22-Sep dataset.
     * 
     * @param {Array<object>} rawComments Array of comment objects
     * @returns {object} { selectedComment, contextCommentsUsed, isInternalStatusExplanation, allProcessedComments }
     */
    selectSearchFixComment(rawComments) {
        if (!Array.isArray(rawComments) || rawComments.length === 0) {
            throw new Error("No comments provided for comment selection.");
        }

        // 1. Deduplicate comments while preserving WFID metadata
        const deduplicated = deduplicateComments(rawComments);

        // 2. Classify roles and attach metadata
        const enriched = deduplicated.map(c => ({
            date: c.date || "",
            time: c.time || "",
            author: c.author || "Unknown",
            role: classifyUserRole(c.author),
            text: (c.text || "").trim(),
            wfid: c.wfid || (c.wfids ? c.wfids[0] : undefined)
        }));

        // 3. Sort chronologically by date + time descending (most recent first)
        const sorted = [...enriched].sort((a, b) => {
            const timeA = `${a.date} ${a.time}`.trim();
            const timeB = `${b.date} ${b.time}`.trim();
            return timeB.localeCompare(timeA);
        });

        let selectedComment = null;
        let isInternalStatusExplanation = false;
        const contextCommentsUsed = [];

        // 4. Traverse comments starting from the most recent
        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            const textLower = current.text.toLowerCase();

            const isSystem = current.role === "SYSTEM";
            const isSuspend = textLower.includes("suspend:") || textLower.includes("logged off");

            // CASE 1: Recent comment by INTERNAL USER
            if (current.role === "INTERNAL") {
                if (isSuspend) {
                    // Sub-case 1B: Internal SUSPEND / Logout -> Ignore & trace back
                    contextCommentsUsed.push({
                        date: current.date,
                        time: current.time,
                        author: current.author,
                        role: current.role,
                        text: current.text,
                        purpose: "internal_suspend_context"
                    });
                    continue;
                } else {
                    // Sub-case 1A: Valid meaningful internal comment explaining status
                    selectedComment = current;
                    isInternalStatusExplanation = true;
                    break;
                }
            }

            // CASE 2: Recent comment by CLIENT USER or SYSTEM
            if (isSystem || isSuspend) {
                // Sub-cases 2A & 2B: Client SUSPEND or System event -> Store context & trace back
                contextCommentsUsed.push({
                    date: current.date,
                    time: current.time,
                    author: current.author,
                    role: current.role,
                    text: current.text,
                    purpose: isSystem ? "system_event" : "client_suspend_state"
                });
                continue;
            }

            // Check if comment is vague ("please advise") and lacks independent issue text
            const isVagueOnly = VAGUE_PATTERNS.some(p => textLower.includes(p)) && current.text.length < 45;
            if (isVagueOnly && i < sorted.length - 1) {
                contextCommentsUsed.push({
                    date: current.date,
                    time: current.time,
                    author: current.author,
                    role: current.role,
                    text: current.text,
                    purpose: "vague_request_context"
                });
                continue;
            }

            // Sub-case 2C: Actual Client Issue / Complaint Comment
            selectedComment = current;
            isInternalStatusExplanation = false;
            break;
        }

        // Fallback if all comments were system/suspend
        if (!selectedComment && sorted.length > 0) {
            selectedComment = sorted[0];
            if (selectedComment.role === "INTERNAL") {
                isInternalStatusExplanation = true;
            }
        }

        return {
            selectedComment,
            contextCommentsUsed,
            isInternalStatusExplanation,
            allProcessedComments: sorted
        };
    }
}

export const commentSelectionService = new CommentSelectionService();
