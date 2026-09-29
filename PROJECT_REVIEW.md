# SearchFix 1.5.0 implementation review

The latest consolidated XLSX is the sole historical reference source. REFERENCE_DATA_REVIEW.md records the source hash, complete row counts, category statistics and excluded records. ISSUE_DOCUMENT_MAP.md lists all 59 issue types and supporting evidence. Historical labels guide interpretation rather than establishing current facts.

Internal authors including ADSSP2 and ADSSearchType terminate before AI calls. Comment classification can finish explicit fee-only, abstractor status-only or no-revision requests as Disputed without evidence collection. Substantive Abstractor claims still require documents: the workbook contains both Accepted and Disputed examples. Unknown/partly unmatched classifications stop with a manual-review explanation, never a generic document mapping. Mixed operational and substantive issues retain separate decisions and request only substantive evidence.

Attachment matching recognizes the additional document families by filename, independent of row position and order prefix. Existing authenticated PDF fetching, order checks, Typing Assistant text capture, sequential queue execution, upload limits, model fallback and quota protection remain. The extension does not change website content.

Validation: 91 automated tests pass with simulated model responses, including category coverage, author skipping, unknown/mixed classifications, operational guards, document filename precedence, queue navigation suppression and PDF upload/evidence flow. These tests do not measure real Gemini classification accuracy. The search team should check a small live sample after restarting the backend and reloading the extension.

Remaining boundaries: loaded rows only, no automatic pagination, PDF attachments only, TA read as text, up to six PDFs with 20 MB each and 40 MB combined. Missing required evidence requires review. Results live in panel memory, and analysis sessions expire after 30 minutes or backend restart. Key saving remains immediate and session-only; fallback models and budget limits are unchanged.
