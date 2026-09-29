import fs from 'node:fs';
import path from 'node:path';
import { ISSUE_TYPES, COMMENT_ONLY_TYPES } from '../src/config/issueTypes.js';
import { getRequiredDocumentTypes } from '../src/config/documentMappings.js';
import { CATEGORY_ISSUE_TYPES } from '../src/config/categoryIssues.js';
const root=path.resolve(import.meta.dirname,'..');
const history=JSON.parse(fs.readFileSync(path.join(root,'data/reference/history.json'),'utf8'));
const usable=history.cases.filter(x=>!x.conflictingLabels);
const lines=[`# Consolidated workbook review

Reviewed September 29, 2026. Only Consolidated SearchFix Report.xlsx supplied in the 29th September folder is used. Both populated sheets were read. The original workbook was not changed. Its SHA-256 is ${history.source.sha256}.

## Coverage

Consolidated SearchFix!A2:H1810 contains 1,809 labeled entries: 1,076 Accepted and 733 Disputed. Status Summary agrees (Wanted 1,076; Unwanted 733). There is no date column; the rows alone do not establish their date coverage.

One row has no comment, leaving ${history.labeledRows} usable input rows. ${history.duplicateRowsMerged} exact duplicates are merged, preserving their source row locations. ${history.uniqueCases} distinct records remain; ${history.conflictingCases} have conflicting outcomes for the same order/comment and are excluded from retrieval. ${usable.length} records are eligible as examples. Spelling/case variants are normalized without changing source labels or recorded outcomes.

## Decisions and limitations

Abstractor has 19 Disputed and 11 Accepted entries (63.3% Disputed). Accepted examples include wrong book/page references and attorney-opinion errors. Therefore an Abstractor category alone cannot justify skipping evidence. No separate Fee Approval category exists in this workbook; the fee-only rule comes from the user's requested workflow, not a measured fee-approval success rate.

The comment model receives the category catalogue, eligible category counts, and up to six relevant historical examples. The decision model receives those references alongside current evidence. These are reference-guided prompts, not fine-tuning. Historical response text never proves a current order was corrected. Counts describe the sample; they are not confidence scores or guaranteed future probabilities.

Internal authors, including ADSSearchType and ADSSP2, are ignored before any AI call. Explicit fee-only approvals, abstractor status/ETA-only updates and explicit no-revision requests can finish Disputed without downloading documents. Mixed comments still send substantive claims for evidence checks. Unmatched or ambiguous claims finish Review required with an explanation and no arbitrary document request. Missing, unreadable or inconclusive required evidence also needs review.

## Category outcomes

Raw counts below include all 1,809 labeled rows, before removing the blank comment, duplicates or conflicting records. Model prompts use the eligible counts instead. Even a 100% fraction from one or two examples is not a reliable general decision rule.

| Category | Accepted | Disputed | Historical Disputed share |
| --- | ---: | ---: | ---: |`];
for(const [category,c] of Object.entries(history.rawCategoryCounts).sort((a,b)=>a[0].localeCompare(b[0]))) lines.push(`| ${category} | ${c.ACCEPTED} | ${c.DISPUTED} | ${(100*c.DISPUTED/(c.ACCEPTED+c.DISPUTED)).toFixed(1)}% |`);
lines.push('\n## Rows excluded from matching\n\n| Sheet | Row | Reason |\n| --- | ---: | --- |');
for(const row of history.skipped) lines.push(`| ${row.sheet} | ${row.row} | ${row.reason} |`);
lines.push('\n## Conflicting labeled records\n\n| Sheet | Row | Category | Outcome |\n| --- | ---: | --- | --- |');
for(const r of history.cases.filter(x=>x.conflictingLabels)) for(const s of r.sources) lines.push(`| ${s.sheet} | ${s.row} | ${r.category} | ${r.outcome} |`);
lines.push('\n## Rebuild\n\nRun scripts/inspect-reference-data.py with Python and openpyxl, supplying the consolidated workbook path if necessary. Then run node scripts/build-reference-library.mjs and node scripts/report-reference-review.mjs. The local setup package must include data/reference/history.json. No original reference workbook is required on a receiving PC.');
fs.writeFileSync(path.join(root,'REFERENCE_DATA_REVIEW.md'),lines.join('\n')+'\n');
const mapping=[`# Issue and document catalogue

${ISSUE_TYPES.length} explicit issue types cover the workbook's named categories and additional concrete existing claims. Category labels guide classification; the actual claim determines the issue. Broad Abstractor comments can involve any substantive issue, not only attorney opinions.

TA/TYPED_REPORT means text read from the website Typing Assistant. Other types refer to PDF attachments matched by filename regardless of the order-number prefix or row position. A missing required type results in Review required; a historical example does not substitute for it. Non-PDF source attachments are not silently treated as PDFs. These are implementation mappings for team review, not mappings authored by the spreadsheet itself.

| Workbook category | Candidate issue types |
| --- | --- |`];
for(const [category,types] of Object.entries(CATEGORY_ISSUE_TYPES)) mapping.push(`| ${category} | ${types.join(', ')} |`);
mapping.push('\n## Evidence requirements\n\n| Issue type | Required evidence |\n| --- | --- |');
for(const type of ISSUE_TYPES) mapping.push(`| ${type} | ${COMMENT_ONLY_TYPES.includes(type)?'No documents; guarded comment-only decision':getRequiredDocumentTypes(type).join(', ')} |`);
mapping.push('\nUnknown issue types have no default document mapping and return Review required. Category-specific supporting evidence can supplement these requirements (for example assessor data for Tax / Assessor).');
fs.writeFileSync(path.join(root,'ISSUE_DOCUMENT_MAP.md'),mapping.join('\n')+'\n');
console.log(`Reference review and ${ISSUE_TYPES.length}-issue catalogue written.`);
