/**
 * Centralized Issue Types and File Types Constants for SearchFix AI Backend.
 * Strictly enforced by both the Gemini Prompt and the JavaScript Response Validator.
 */

export const ISSUE_TYPES = [
    "MISSING_DEED",
    "CHAIN_BREAK",
    "PARCEL_MISMATCH",
    "LEGAL_DESCRIPTION_MISMATCH",
    "TYPING_ERROR",
    "TAX_DISCREPANCY",
    "LIEN_DISCREPANCY",
    "COURT_DISCREPANCY",
    "BANKRUPTCY_DISCREPANCY",
    "VESTING_DISCREPANCY",
    "DEED_DISCREPANCY",
    "NAME_SEARCH_MISSING",
    "SEARCH_DEPTH",
    "MISSING_DOCUMENT",
    "WAITING_FOR_CLIENT",
    "WAITING_FOR_FEE_APPROVAL",
    "WAITING_FOR_COPIES",
    "OTHER"
];

export const FILE_TYPES = [
    "SEARCH_PACKAGE",
    "DEED",
    "DOT",
    "TAX",
    "PA",
    "LEGAL_DESCRIPTION",
    "MAP",
    "LIEN",
    "PACER",
    "PATRIOT",
    "TYPED_REPORT",
    "COST_WORKSHEET"
];

/**
 * Recommended issue-to-document mappings provided as contextual guidance to the model.
 * Note: One issue can require multiple documents, and documents should only be requested if relevant.
 */
export const ISSUE_DOCUMENT_GUIDANCE = {
    MISSING_DEED: ["DEED", "SEARCH_PACKAGE", "TYPED_REPORT"],
    CHAIN_BREAK: ["SEARCH_PACKAGE", "DEED", "TYPED_REPORT"],
    PARCEL_MISMATCH: ["TAX", "PA", "SEARCH_PACKAGE"],
    LEGAL_DESCRIPTION_MISMATCH: ["LEGAL_DESCRIPTION", "DEED", "DOT", "PA", "SEARCH_PACKAGE", "MAP"],
    TYPING_ERROR: ["TYPED_REPORT", "SEARCH_PACKAGE", "DEED"],
    TAX_DISCREPANCY: ["TAX", "TYPED_REPORT"],
    LIEN_DISCREPANCY: ["LIEN", "SEARCH_PACKAGE", "TYPED_REPORT"],
    COURT_DISCREPANCY: ["PACER", "TYPED_REPORT", "SEARCH_PACKAGE"],
    BANKRUPTCY_DISCREPANCY: ["PACER", "PATRIOT", "TYPED_REPORT"],
    VESTING_DISCREPANCY: ["SEARCH_PACKAGE", "DEED", "TYPED_REPORT"],
    DEED_DISCREPANCY: ["DEED", "SEARCH_PACKAGE", "TYPED_REPORT"],
    NAME_SEARCH_MISSING: ["SEARCH_PACKAGE", "PACER", "PATRIOT", "TYPED_REPORT"],
    SEARCH_DEPTH: ["SEARCH_PACKAGE"],
    MISSING_DOCUMENT: ["(Select specific relevant file from FILE_TYPES based on comment context)"],
    WAITING_FOR_CLIENT: [],
    WAITING_FOR_FEE_APPROVAL: ["COST_WORKSHEET"],
    WAITING_FOR_COPIES: ["(Select specific requested file from FILE_TYPES)"],
    OTHER: ["(Select relevant file from FILE_TYPES)"]
};
