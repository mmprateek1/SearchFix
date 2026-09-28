import { getRequiredDocumentTypes } from "../config/documentMappings.js";
import { CATEGORY_DOCUMENTS } from "../config/referenceCategories.js";

export class DocumentSelectionService {
    /**
     * Determines required document types for a list of identified issues.
     * 
     * @param {Array<{issueType: string, claim: string}>} issues List of issues
     * @returns {Array<{issueType: string, claim: string, requiredDocuments: Array<string>}>} Issues with required documents attached
     */
    selectRequiredDocuments(issues) {
        if (!Array.isArray(issues)) return [];

        return issues.map(issue => {
            const requiredDocuments = [...new Set([...getRequiredDocumentTypes(issue.issueType), ...(CATEGORY_DOCUMENTS[issue.category] || [])])];
            return {
                ...issue,
                requiredDocuments
            };
        });
    }
}

export const documentSelectionService = new DocumentSelectionService();
