import { geminiService } from "./gemini.service.js";
import { getDocumentAnalysisSystemPrompt, getDocumentAnalysisUserPrompt } from "../prompts/documentAnalysis.prompt.js";

export class DocumentAnalysisService {
    /**
     * Analyzes uploaded PDF documents relevant to an issue using Gemini inline parts or Files API.
     * 
     * @param {object} issue { issueType, claim, requiredDocuments }
     * @param {Array<{fileName: string, fileType: string, path: string}>} uploadedFiles Uploaded files list
     * @returns {Promise<Array<object>>} List of extracted evidence objects
     */
    async analyzeDocumentsForIssue(issue, uploadedFiles = []) {
        if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
            console.log(`[DocumentAnalysisService] No uploaded files provided for issue '${issue.issueType}'.`);
            return [];
        }

        // Filter uploaded files to ONLY include relevant required document types
        const relevantFiles = uploadedFiles.filter(file => {
            if (!file || !file.fileType) return false;
            return issue.requiredDocuments.includes(file.fileType);
        });

        if (relevantFiles.length === 0) {
            console.log(`[DocumentAnalysisService] None of the uploaded files match required types [${issue.requiredDocuments.join(", ")}] for issue '${issue.issueType}'.`);
            return [];
        }

        console.log(`[DocumentAnalysisService] Analyzing ${relevantFiles.length} relevant document(s) for issue '${issue.issueType}'`);

        const systemPrompt = getDocumentAnalysisSystemPrompt();
        const evidenceList = [];
        const uploadedHandles = [];

        try {
            // Option A: Fast & robust inline base64 parts (zero external file upload dependency)
            const fileParts = [];
            for (const file of relevantFiles) {
                if (file.path) {
                    try {
                        const inlinePart = geminiService.createInlinePdfPart(file.path);
                        fileParts.push(inlinePart);
                    } catch (err) {
                        console.warn(`[DocumentAnalysisService] Base64 inline fallback for ${file.fileName}, trying Files API:`, err.message);
                        const handle = await geminiService.uploadFile(file.path, "application/pdf");
                        uploadedHandles.push({ handle, file });
                        fileParts.push(handle);
                    }
                }
            }

            if (fileParts.length === 0) {
                return [];
            }

            // Perform document analysis with Gemini (with automatic 503 retry and fallback models)
            const userPrompt = getDocumentAnalysisUserPrompt(issue.issueType, issue.claim, relevantFiles.map(f => f.fileType).join(", "));

            const rawText = await geminiService.generateContentWithFiles(systemPrompt, userPrompt, fileParts);
            const parsed = typeof rawText === "string" ? JSON.parse(rawText) : rawText;

            if (parsed && Array.isArray(parsed.evidence)) {
                parsed.evidence.forEach(item => {
                    evidenceList.push({
                        document: item.document || relevantFiles[0].fileName,
                        page: item.page ?? null,
                        field: item.field || "",
                        value: item.value || "",
                        finding: item.finding || "Extracted document finding.",
                        quotedText: item.quotedText || "",
                        confidence: item.confidence ?? 0.9
                    });
                });
            }

            return evidenceList;

        } catch (error) {
            console.error(`[DocumentAnalysisService] Error analyzing documents for issue '${issue.issueType}':`, error.message);
            // Return clean finding reporting that file was received but model encountered temporary error
            return [
                {
                    document: relevantFiles[0]?.fileName || "Uploaded PDF",
                    page: 1,
                    field: "documentAnalysisStatus",
                    value: "Processing Error",
                    finding: `Document '${relevantFiles[0]?.fileName}' was supplied, but AI model encountered a temporary processing error (${error.message}).`,
                    quotedText: "",
                    confidence: 0.5
                }
            ];
        } finally {
            // Clean up any temporary Files API handles if used
            for (const item of uploadedHandles) {
                if (item.handle && item.handle.name) {
                    await geminiService.deleteFile(item.handle.name);
                }
            }
        }
    }
}

export const documentAnalysisService = new DocumentAnalysisService();
