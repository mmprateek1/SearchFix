import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { validateSearchFixResponse } from "../utils/responseValidator.js";
import { getSystemPrompt, getUserPrompt } from "../prompts/searchfix.prompt.js";

/**
 * Fallback models list if primary model experiences temporary 503 high-demand spike.
 */
const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.8-flash"];

export class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
            console.warn("[SearchFix AI] Warning: GEMINI_API_KEY is not set or using placeholder value.");
        }
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }

    /**
     * Executes an API call function with automatic retry and exponential backoff.
     * Retries on 503 (UNAVAILABLE), 429 (RATE_LIMIT), or temporary network errors.
     */
    async retryWithBackoff(fn, maxRetries = 3) {
        let delay = 1000; // start with 1s delay
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const isRetryable = error.status === 503 ||
                    error.status === 429 ||
                    (error.message && (
                        error.message.includes("503") ||
                        error.message.includes("high demand") ||
                        error.message.includes("UNAVAILABLE") ||
                        error.message.includes("RATE_LIMIT") ||
                        error.message.includes("ECONNRESET")
                    ));

                if (isRetryable && attempt < maxRetries) {
                    console.warn(`[GeminiService] API call failed (Attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // exponential backoff
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Creates an inline base64 part for a local PDF file.
     * Fast, local, and requires zero external upload calls.
     */
    createInlinePdfPart(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return {
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: "application/pdf"
            }
        };
    }

    /**
     * Executes standard generateContent call returning raw text or JSON.
     * Includes automatic 503 retry and model fallback.
     */
    async generateJSON(systemInstruction, userPrompt) {
        const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                return await this.retryWithBackoff(async () => {
                    const response = await this.ai.models.generateContent({
                        model: modelName,
                        contents: userPrompt,
                        config: {
                            systemInstruction,
                            responseMimeType: "application/json"
                        }
                    });
                    return response.text;
                });
            } catch (error) {
                lastError = error;
                console.warn(`[GeminiService] Model '${modelName}' failed with error: ${error.message}. Trying next fallback model if available...`);
            }
        }

        throw lastError || new Error("Gemini generateJSON failed on all models.");
    }

    /**
     * Uploads a file via @google/genai Files API using ai.files.upload().
     */
    async uploadFile(filePath, mimeType = "application/pdf") {
        console.log(`[GeminiService] Uploading file to Gemini Files API: ${filePath}`);

        const uploadResult = await this.retryWithBackoff(async () => {
            return await this.ai.files.upload({
                file: filePath,
                mimeType
            });
        });

        const uriOrName = uploadResult.uri || uploadResult.name || "uploaded";
        console.log(`[GeminiService] Upload complete. File identifier: ${uriOrName}`);
        return uploadResult;
    }

    /**
     * Deletes an uploaded file from Gemini Files API using ai.files.delete().
     */
    async deleteFile(fileName) {
        if (!fileName) return;
        try {
            console.log(`[GeminiService] Deleting file from Gemini Files API: ${fileName}`);
            await this.retryWithBackoff(async () => {
                await this.ai.files.delete({ name: fileName });
            });
        } catch (err) {
            console.warn(`[GeminiService] File deletion warning (${fileName}):`, err.message);
        }
    }

    /**
     * Executes generateContent with attached File handles or Inline Base64 PDF parts.
     */
    async generateContentWithFiles(systemInstruction, userPrompt, fileObjects = []) {
        const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
        const contents = [...fileObjects, userPrompt];

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                return await this.retryWithBackoff(async () => {
                    const response = await this.ai.models.generateContent({
                        model: modelName,
                        contents,
                        config: {
                            systemInstruction,
                            responseMimeType: "application/json"
                        }
                    });
                    return response.text;
                });
            } catch (error) {
                lastError = error;
                console.warn(`[GeminiService] generateContentWithFiles failed on model '${modelName}': ${error.message}. Trying next fallback...`);
            }
        }

        throw lastError || new Error("Gemini generateContentWithFiles failed on all models.");
    }

    /**
     * Legacy Phase 1 analysis method for backwards compatibility.
     */
    async analyzeComments(orderNumber, comments) {
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        console.log(`[SearchFix AI] Request started for Order: ${orderNumber} (${comments.length} comments) using model ${modelName}`);

        const systemInstruction = getSystemPrompt();
        const userPrompt = getUserPrompt(orderNumber, comments);

        try {
            const responseText = await this.generateJSON(systemInstruction, userPrompt);
            const validatedResult = validateSearchFixResponse(responseText, orderNumber);
            return validatedResult;
        } catch (error) {
            console.error(`[SearchFix AI] Error during Gemini analysis:`, error.message);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();
