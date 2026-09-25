export const DOCUMENT_TYPES = ["SEARCH_PACKAGE", "DEED", "DOT", "TAX", "PA", "LEGAL_DESCRIPTION", "MAP", "LIEN", "PACER", "PATRIOT", "TYPED_REPORT", "COST_WORKSHEET", "THR"];

export const DEFAULT_SETTINGS = {
  backend: "http://localhost:3000",
  order: "[id$='_lblServiceProviderOrderNumber'], [data-order-number]",
  comments: "[id$='_OrderCommentControl1_dgComments'], [data-searchfix-comments], #comments, #order-comments",
  commentRow: "[data-comment], tbody tr",
  author: "[data-author], .comment-author",
  date: "[data-date], .comment-date",
  time: "[data-time], .comment-time",
  text: "[data-comment-text], .comment-text",
  attachments: "[data-attachments], #attachments",
  taRead: "[data-typing-assistant], #typing-assistant"
};

export function backendURL(value) {
  const url = new URL(value);
  if (!["http://localhost:3000", "http://127.0.0.1:3000"].includes(url.origin) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Use http://localhost:3000 or http://127.0.0.1:3000. Remote deployment requires explicit host configuration.");
  }
  return url.origin;
}

export function guessDocumentType(name) {
  const words = name.toUpperCase().replace(/[^A-Z0-9]+/g, " ");
  const rules = [
    [/\b(TYPED|REPORT TYPED|TYPING|TA)\b/, "TYPED_REPORT"],
    [/\b(PACER|BANKRUPTCY)\b/, "PACER"], [/\bPATRIOT\b/, "PATRIOT"],
    [/\b(THR|TRANSACTION HISTORY)\b/, "THR"], [/\b(DEED OF TRUST|DOT|MORTGAGE)\b/, "DOT"],
    [/\bDEED\b/, "DEED"], [/\bTAX\b/, "TAX"], [/\b(PA|PROPERTY ASSESSMENT)\b/, "PA"],
    [/\bLEGAL\b/, "LEGAL_DESCRIPTION"], [/\b(MAP|PLAT)\b/, "MAP"],
    [/\bLIEN\b/, "LIEN"], [/\bCOST\b/, "COST_WORKSHEET"],
    [/\b(SEARCH PACKAGE|SEARCH INDEX|SEARCH INDEXES)\b/, "SEARCH_PACKAGE"]
  ];
  return rules.find(([pattern]) => pattern.test(words))?.[1] || "";
}

export function requiredTypes(result) {
  return [...new Set((result.issues || []).flatMap(issue => (issue.requiredFiles || []).map(file => file.fileType)))];
}

export function validateOrder(order) {
  if (!order.orderNumber?.trim()) throw new Error("Order number was not found. Set its page selector or enter it below.");
  if (!Array.isArray(order.comments) || !order.comments.length) throw new Error("No comments found. Open Order Overview and expand comments, or configure the comment selectors.");
  if (order.comments.some(c => !c.text?.trim() || !c.author?.trim())) throw new Error("Every comment needs text and an author. Correct the page selectors before analysis.");
  if (order.comments.some(c => !/^\d{4}-\d{2}-\d{2}$/.test(c.date || "") || !/^\d{2}:\d{2}(:\d{2})?$/.test(c.time || ""))) {
    throw new Error("Comment dates and times are incomplete or ambiguous. The backend needs YYYY-MM-DD and 24-hour times to select the latest comment correctly.");
  }
  return { orderNumber: order.orderNumber.trim(), comments: order.comments };
}

export function buildAssistantText(result) {
  const lines = [`SearchFix review — ${result.orderNumber}`, ""];
  const selected = result.commentAnalysis?.selectedComment;
  if (selected) lines.push(`Comment reviewed (${selected.author || "Unknown"}):`, selected.text, "");
  if (selected?.role === "INTERNAL" && !result.issues?.length) {
    lines.push("The latest selected comment is an internal status update. The backend labels this DISPUTED under its existing routing rule. This is not document verification or proof that the client concern is resolved.", "", "Next step: review the earlier client request and the pending internal follow-up.");
  } else {
    for (const [index, issue] of (result.issues || []).entries()) {
      lines.push(`${index + 1}. What the client needs: ${issue.claim || issue.clientClaim}`);
      if (issue.decision) lines.push(`Assessment: ${issue.decision.replaceAll("_", " ")}`, issue.reason || "");
      if (issue.requiredFiles?.length) lines.push(`Files to check: ${issue.requiredFiles.map(f => f.fileType.replaceAll("_", " ")).join(", ")}`);
      for (const evidence of issue.evidence || []) {
        lines.push(`Evidence — ${evidence.document}${evidence.page ? `, page ${evidence.page}` : " (page not identified)"}: ${evidence.finding}`);
        if (evidence.quotedText) lines.push(`Quote: ${evidence.quotedText}`);
      }
      lines.push("");
    }
    if (result.status === "AWAITING_DOCUMENTS") lines.push("Next step: review the relevant attachments below. The client's request has not yet been verified against documents.");
    else lines.push("Next step: check the cited evidence and any REVIEW REQUIRED items before deciding what to tell the client.");
  }
  lines.push("", "Review notes only. No order fields, files, comments, or website Typing Assistant content have been changed.");
  return lines.join("\n");
}
