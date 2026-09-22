import { GoogleGenAI } from "@google/genai";
import { getSystemPrompt, getUserPrompt } from "../prompts/searchfix.prompt.js";
import { validateSearchFixResponse } from "../utils/responseValidator.js";

/**
 * Service to interact with Gemini 3.5 Flash using the @google/genai SDK.
 */
export class GeminiService {
    constructor() {
        // Will lazily or dynamically initialize client
    }

    getAIClient() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
            console.warn("[SearchFix AI] Warning: GEMINI_API_KEY is not set or using placeholder value.");
        }
        return new GoogleGenAI({ apiKey: apiKey || "" });
    }

    /**
     * Analyzes SearchFix order comments using Gemini Flash model and returns validated JSON output.
     * 
     * @param {string} orderNumber SearchFix Order Identifier
     * @param {Array<{date?: string, author?: string, text: string}>} comments Chronological comments list
     * @returns {Promise<object>} Validated analysis result
     */
    async analyzeComments(orderNumber, comments) {
        const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";

        console.log(`[SearchFix AI] Request started for Order: ${orderNumber} (${comments.length} comments) using model ${modelName}`);

        const systemInstruction = getSystemPrompt();
        const userPrompt = getUserPrompt(orderNumber, comments);

        try {
            console.log(`[SearchFix AI] Invoking Gemini API...`);

            const ai = this.getAIClient();
            const response = await ai.models.generateContent({
                model: modelName,
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json"
                }
            });

            console.log(`[SearchFix AI] Gemini response received.`);

            const responseText = response.text;
            if (!responseText) {
                throw new Error("Empty response received from Gemini API.");
            }

            // Perform strict deterministic validation using responseValidator
            const validatedResult = validateSearchFixResponse(responseText, orderNumber);

            console.log(`[SearchFix AI] Classification completed successfully for Order: ${orderNumber} (${validatedResult.issues.length} issues identified)`);

            return validatedResult;
        } catch (error) {
            console.error(`[SearchFix AI] Error during Gemini analysis:`, error.message);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();
