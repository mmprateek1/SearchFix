import { ISSUE_TYPES, FILE_TYPES } from "./issueTypes.js";

/**
 * Validates and sanitizes Gemini output against strict predefined criteria.
 * Enforces deterministic protection layer before returning data to the Chrome Extension.
 * 
 * @param {object|string} rawOutput Raw string or object from Gemini
 * @param {string} expectedOrderNumber Order number for fallback validation
 * @returns {object} Validated SearchFix analysis response
 */
export function validateSearchFixResponse(rawOutput, expectedOrderNumber) {
    let data = rawOutput;

    // Parse string if needed
    if (typeof rawOutput === "string") {
        try {
            // Strip potential markdown fence wrappers if any remain
            const cleaned = rawOutput.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            data = JSON.parse(cleaned);
        } catch (err) {
            throw new Error(`Failed to parse Gemini output as JSON: ${err.message}`);
        }
    }

    if (!data || typeof data !== "object") {
        throw new Error("Invalid response format: output is not a JSON object.");
    }

    // Ensure orderNumber exists and matches
    const orderNumber = data.orderNumber || expectedOrderNumber;
    if (!orderNumber || typeof orderNumber !== "string") {
        throw new Error("Missing or invalid orderNumber in Gemini response.");
    }

    // Ensure issues is an array
    if (!Array.isArray(data.issues)) {
        throw new Error("Invalid response format: 'issues' must be an array.");
    }

    // Validate each issue entry
    const validatedIssues = data.issues.map((issue, index) => {
        if (!issue || typeof issue !== "object") {
            throw new Error(`Issue at index ${index} is not an object.`);
        }

        if (!issue.issueType || typeof issue.issueType !== "string") {
            throw new Error(`Issue at index ${index} missing 'issueType'.`);
        }

        // Strict category validation
        if (!ISSUE_TYPES.includes(issue.issueType)) {
            throw new Error(`Invalid issue type returned by Gemini: '${issue.issueType}'`);
        }

        if (!issue.claim || typeof issue.claim !== "string") {
            throw new Error(`Issue at index ${index} missing 'claim' description.`);
        }

        if (!Array.isArray(issue.requiredFiles)) {
            throw new Error(`Issue '${issue.issueType}' missing 'requiredFiles' array.`);
        }

        // Validate each file entry inside requiredFiles
        const validatedFiles = issue.requiredFiles.map((file, fileIndex) => {
            if (!file || typeof file !== "object") {
                throw new Error(`Required file at index ${fileIndex} in issue '${issue.issueType}' is not an object.`);
            }

            if (!file.fileType || typeof file.fileType !== "string") {
                throw new Error(`Required file at index ${fileIndex} in issue '${issue.issueType}' missing 'fileType'.`);
            }

            // Strict file type validation
            if (!FILE_TYPES.includes(file.fileType)) {
                throw new Error(`Invalid file type returned by Gemini: '${file.fileType}' in issue '${issue.issueType}'`);
            }

            if (!file.reason || typeof file.reason !== "string") {
                throw new Error(`Required file '${file.fileType}' in issue '${issue.issueType}' missing 'reason'.`);
            }

            return {
                fileType: file.fileType,
                reason: file.reason.trim()
            };
        });

        return {
            issueType: issue.issueType,
            claim: issue.claim.trim(),
            requiredFiles: validatedFiles
        };
    });

    return {
        orderNumber: orderNumber.trim(),
        issues: validatedIssues
    };
}
