/**
 * Configurable User Classification Rules for SearchFix AI.
 * Categorizes comment authors into INTERNAL, CLIENT, or SYSTEM roles based on 22-Sep dataset patterns.
 */

export const USER_CONFIG = {
    internalPatterns: [
        "_ADSSearchType",
        "ADSSearchType",
        "ADSSP2",
        "KishoreK",
        "RaghuP",
        "AshokaA",
        "HarryS",
        "GurumurthyM",
        "NagendraK",
        "SukruthiS",
        "AnushreeU",
        "SuriyakumarS",
        "DhanushG",
        "ArchanaG",
        "Searcher",
        "QC"
    ],
    clientPatterns: [
        "RVSI-Outsource:"
    ],
    systemPatterns: [
        "OWLServiceUser",
        "AUTO_PLUser",
        "TV Auto Suspend",
        "User Logged off system",
        "SYSTEM"
    ]
};

/**
 * Classifies a comment author into INTERNAL, CLIENT, or SYSTEM.
 * 
 * @param {string} author Comment author name
 * @returns {"INTERNAL" | "CLIENT" | "SYSTEM"} User role category
 */
export function classifyUserRole(author) {
    if (!author || typeof author !== "string") {
        return "SYSTEM";
    }

    const trimmed = author.trim();

    if (isADSSearchType(trimmed) || isADSSP2(trimmed)) return "INTERNAL";
    if (isRVSIUser(trimmed)) return "CLIENT";

    for (const pattern of USER_CONFIG.systemPatterns) {
        if (trimmed.includes(pattern)) return "SYSTEM";
    }

    for (const pattern of USER_CONFIG.clientPatterns) {
        if (trimmed.includes(pattern)) return "CLIENT";
    }

    for (const pattern of USER_CONFIG.internalPatterns) {
        if (trimmed.includes(pattern)) return "INTERNAL";
    }

    // Default fallback heuristics
    if (trimmed.includes("User") || trimmed.includes("AUTO")) {
        return "SYSTEM";
    }

    return "CLIENT";
}

export function isADSSearchType(author = "") {
    return /adssearchtype/i.test(author);
}

export function isRVSIUser(author = "") {
    return /rvsi[-_\s]*outsource\b/i.test(author);
}

export function isADSSP2(author = "") {
    return /adssp2\b/i.test(author);
}
