import { createHash, randomUUID } from "node:crypto";
import { currentCredentialId } from "./geminiContext.service.js";

// Keep the two stages on the same comment classification and document list.
// These short-lived records never persist comments or credentials to disk.
const sessions = new Map();
const fingerprint = (orderNumber, comments) => createHash("sha256")
    .update(JSON.stringify({ orderNumber, comments, credentialId: currentCredentialId() })).digest("hex");

export function saveAnalysis(orderNumber, comments, route) {
    const now = Date.now();
    for (const [id, record] of sessions) if (record.expires <= now) sessions.delete(id);
    while (sessions.size >= 500) sessions.delete(sessions.keys().next().value);
    const id = `SF-${randomUUID()}`;
    sessions.set(id, { fingerprint: fingerprint(orderNumber, comments), route: structuredClone(route), expires: now + 30 * 60 * 1000 });
    return id;
}

export function loadAnalysis(id, orderNumber, comments) {
    const record = sessions.get(id);
    if (!record || record.expires <= Date.now() || record.fingerprint !== fingerprint(orderNumber, comments)) {
        const error = new Error("The comment analysis expired or the order changed. Analyze comments again before submitting evidence.");
        error.status = 409;
        throw error;
    }
    return structuredClone(record.route);
}
