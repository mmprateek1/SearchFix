import { normalizeCommentText } from "./normalizeComment.js";

/**
 * Deduplicates comments that have matching date, time, author, and normalized text.
 * Preserves original WFIDs and metadata where available.
 * 
 * @param {Array<object>} comments Raw comments array
 * @returns {Array<object>} Deduplicated comments array
 */
export function deduplicateComments(comments) {
    if (!Array.isArray(comments)) return [];

    const seen = new Map();
    const deduplicated = [];

    for (const comment of comments) {
        const date = comment.date || "";
        const time = comment.time || "";
        const author = comment.author || "";
        const normText = normalizeCommentText(comment.text);

        const key = `${date}|${time}|${author.toLowerCase()}|${normText}`;

        if (!seen.has(key)) {
            const entry = {
                ...comment,
                wfids: comment.wfid ? [comment.wfid] : (comment.wfids || [])
            };
            seen.set(key, entry);
            deduplicated.push(entry);
        } else {
            // Merge WFIDs if present
            const existing = seen.get(key);
            if (comment.wfid && !existing.wfids.includes(comment.wfid)) {
                existing.wfids.push(comment.wfid);
            }
        }
    }

    return deduplicated;
}
