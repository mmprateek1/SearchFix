/**
 * Normalizes text for comparison and duplicate detection.
 * Removes extra whitespace, punctuation quirks, and converts to lower case.
 * 
 * @param {string} text Raw text string
 * @returns {string} Normalized string
 */
export function normalizeCommentText(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^\w\s]/gi, "")
        .trim();
}
