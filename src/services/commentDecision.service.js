import { COMMENT_ONLY_TYPES } from '../config/issueTypes.js';

// The current comment must explicitly support a no-document operational decision.
// Historical majorities or the word "abstractor" alone cannot establish that.
const substantive = /\b(missing|missed|mismatch\w*|incorrect|wrong|omitt\w*|discrepan\w*|amend\w*|correct\w*|error|defect|break|broken|not\s+(?:run|keyed|included|attached|available|matching|found)|does\s+not\s+match|should\s+be|please\s+(?:provide|send|attach).{0,60}(?:copy|deed|document|search|report))\b/i;
const evidenceRequest = /\b(?:provide|send|attach|upload|supply|obtain|run|perform)\b.{0,80}\b(?:cop(?:y|ies)|deeds?|documents?|search(?:es)?|reports?|probate|judgments?|indexes?|pacer|patriot)\b/is;
export const hasSubstantiveClaim = text => {
    const claim = String(text).replace(/\bno\s+(?:revision|correction|change|amendment)\s+(?:is\s+)?(?:required|needed|requested)\b/gi, '');
    return substantive.test(claim) || evidenceRequest.test(claim) || /\b(?:issues?|problems?|errors?)\b/i.test(claim);
};

export function commentOnlyDecision(issue, text) {
    if (!COMMENT_ONLY_TYPES.includes(issue.issueType)) return null;
    if (hasSubstantiveClaim(text)) return { reviewReason: 'The comment includes a substantive error or evidence request and cannot be decided as an operational update. Review and classify the specific claim before requesting documents.' };
    const indicators = {
        FEE_APPROVAL_REQUEST: /(?:\bfee\b.{0,80}\bapprov\w*|\bapprov\w*.{0,80}\bfee\b|\bquote\b.{0,60}\bapprov\w*)/is,
        ABSTRACTOR_STATUS: /\babstractor\b/i,
        NO_REVISION_REQUEST: /\bno\s+(?:revision|correction|change|amendment)\s+(?:is\s+)?(?:required|needed|requested)|\bno\s+revision\s+request\b/i
    };
    const operationalStatus = /\b(status|eta|awaiting|pending|rush|response|follow[- ]?up)\b/i;
    if (!indicators[issue.issueType].test(text) || (issue.issueType === 'ABSTRACTOR_STATUS' && !operationalStatus.test(text))) {
        return { reviewReason: 'The current comment does not establish a supported comment-only decision. Manual classification is required; no documents were requested.' };
    }
    return { decision: 'DISPUTED', reason: {
        FEE_APPROVAL_REQUEST: 'Fee/quote approval request only; no search or document error is alleged. Disputed under the comment-only operational rule. No documents were analyzed.',
        ABSTRACTOR_STATUS: 'Abstractor status/ETA follow-up only; no search or document error is alleged. Disputed under the comment-only operational rule. No documents were analyzed.',
        NO_REVISION_REQUEST: 'The current comment explicitly states that no revision is requested. Disputed under the comment-only operational rule. No documents were analyzed.'
    }[issue.issueType] };
}
