/**
 * Phase 2 Document Registry and Rule-Based Issue-to-Document Mappings.
 * Ensures Gemini strictly targets relevant document types for evidence extraction.
 */

export const DOCUMENT_TYPES = [
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
    "COST_WORKSHEET",
    "THR"
];

export const DOCUMENT_MAPPINGS = {
    MISSING_DEED: ["DEED", "SEARCH_PACKAGE", "TYPED_REPORT"],
    CHAIN_BREAK: ["SEARCH_PACKAGE", "DEED", "TYPED_REPORT"],
    PARCEL_MISMATCH: ["TAX", "PA", "SEARCH_PACKAGE", "LEGAL_DESCRIPTION", "MAP"],
    LEGAL_DESCRIPTION_MISMATCH: ["LEGAL_DESCRIPTION", "DEED", "DOT", "PA", "SEARCH_PACKAGE", "MAP"],
    TYPING_ERROR: ["TYPED_REPORT", "SEARCH_PACKAGE", "DEED"],
    TAX_DISCREPANCY: ["TAX", "TYPED_REPORT"],
    LIEN_DISCREPANCY: ["LIEN", "SEARCH_PACKAGE", "TYPED_REPORT"],
    COURT_DISCREPANCY: ["PACER", "TYPED_REPORT", "SEARCH_PACKAGE"],
    BANKRUPTCY_DISCREPANCY: ["PACER", "PATRIOT", "TYPED_REPORT"],
    VESTING_DISCREPANCY: ["SEARCH_PACKAGE", "DEED", "TYPED_REPORT"],
    DEED_DISCREPANCY: ["DEED", "SEARCH_PACKAGE", "TYPED_REPORT"],
    NAME_SEARCH_MISSING: ["PACER", "PATRIOT", "TYPED_REPORT", "SEARCH_PACKAGE"],
    SEARCH_DEPTH: ["SEARCH_PACKAGE", "DEED", "TYPED_REPORT"],
    MISSING_DOCUMENT: ["SEARCH_PACKAGE", "DEED", "THR", "TYPED_REPORT"],
    MORTGAGE_DISCREPANCY: ["DOT", "SEARCH_PACKAGE", "TYPED_REPORT", "THR"],
    PROPERTY_IDENTIFICATION: ["TAX", "PA", "LEGAL_DESCRIPTION", "MAP", "SEARCH_PACKAGE"],
    LEASEHOLD_DISCREPANCY: ["DEED", "LEGAL_DESCRIPTION", "SEARCH_PACKAGE", "TYPED_REPORT"],
    OTHER: ["SEARCH_PACKAGE", "TYPED_REPORT"]
};

/**
 * Returns required document types for a given issue type.
 * 
 * @param {string} issueType 
 * @returns {Array<string>} List of required document types
 */
export function getRequiredDocumentTypes(issueType) {
    return DOCUMENT_MAPPINGS[issueType] || ["SEARCH_PACKAGE", "TYPED_REPORT"];
}
