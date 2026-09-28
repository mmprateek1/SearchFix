// Ordered candidates requested for SearchFix. Access depends on the API account.
export const TEXT_FALLBACK_CHAIN = Object.freeze([
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash"
]);

export const DOCUMENT_FALLBACK_CHAIN = Object.freeze([
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash"
]);

export function modelsFor(stage = "comments") {
    return stage === "documents" ? DOCUMENT_FALLBACK_CHAIN : TEXT_FALLBACK_CHAIN;
}
