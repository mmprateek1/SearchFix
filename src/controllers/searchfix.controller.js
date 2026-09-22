import { geminiService } from "../services/gemini.service.js";

/**
 * Controller handling SearchFix analysis requests.
 */
export async function analyzeSearchFix(req, res) {
    try {
        const { orderNumber, comments } = req.body || {};

        // 1. Validate orderNumber
        if (!orderNumber || typeof orderNumber !== "string" || orderNumber.trim() === "") {
            return res.status(400).json({
                error: "orderNumber is required and must be a non-empty string."
            });
        }

        // 2. Validate comments array
        if (!comments || !Array.isArray(comments)) {
            return res.status(400).json({
                error: "comments must be an array."
            });
        }

        if (comments.length === 0) {
            return res.status(400).json({
                error: "comments array cannot be empty."
            });
        }

        // 3. Validate each comment structure
        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];
            if (!comment || typeof comment !== "object" || typeof comment.text !== "string" || comment.text.trim() === "") {
                return res.status(400).json({
                    error: `Invalid comment at index ${i}: 'text' field is required and must be a non-empty string.`
                });
            }
        }

        // 4. Delegate to Gemini Service
        const result = await geminiService.analyzeComments(orderNumber.trim(), comments);

        // 5. Return success 200 OK response
        return res.status(200).json(result);

    } catch (error) {
        // Log detailed error internally for server console debugging
        console.error("[SearchFix Controller] Analysis failed:", error);

        // Return clean generic 500 error response to Chrome Extension without exposing internal details
        return res.status(500).json({
            error: "SearchFix analysis failed."
        });
    }
}
