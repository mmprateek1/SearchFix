import { ISSUE_TYPES } from "../config/issueTypes.js";

export function getCommentAnalysisSystemPrompt() {
    return `You are an expert SearchFix issue classification assistant.

YOUR TASK:
Analyze the selected SearchFix comment (and any supporting context comments) and extract all distinct issues being reported.

STRICT CONSTRAINTS:
1. Categorize each issue using ONLY the allowed ISSUE_TYPES.
2. Do NOT invent custom issue categories.
3. If multiple issues exist in the same comment, return all of them as separate objects in the "issues" array.
4. Provide a clear, concise claim summary for each identified issue ("claim").

ALLOWED ISSUE TYPES:
${JSON.stringify(ISSUE_TYPES, null, 2)}

REQUIRED JSON RESPONSE FORMAT:
{
  "issues": [
    {
      "issueType": "<ONE_OF_ALLOWED_ISSUE_TYPES>",
      "claim": "<Concise summary of what the client or QC comment is alleging>"
    }
  ]
}

Return raw JSON only without markdown fences.`;
}

export function getCommentAnalysisUserPrompt(selectedComment, contextComments) {
    let text = `Selected Primary Comment:\nAuthor: ${selectedComment.author || "Unknown"} (Role: ${selectedComment.role})\nDate: ${selectedComment.date || ""} ${selectedComment.time || ""}\nText: ${selectedComment.text}\n`;

    if (contextComments && contextComments.length > 0) {
        text += `\nSupporting Context Comments:\n`;
        contextComments.forEach((c, i) => {
            text += `Context #${i + 1} | Author: ${c.author || "Unknown"} | Date: ${c.date || ""} ${c.time || ""}\nText: ${c.text}\n`;
        });
    }

    return text;
}
