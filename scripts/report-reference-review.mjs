import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const history=JSON.parse(fs.readFileSync(path.join(root,'data/reference/history.json'),'utf8'));
const usable=history.cases.filter(x=>!x.conflictingLabels);
const outcomes=usable.reduce((r,c)=>(r[c.outcome]=(r[c.outcome]||0)+1,r),{});
const mixed=Object.values(history.categoryCounts).filter(x=>x.ACCEPTED&&x.DISPUTED).length;
const lines=[`# Review of the supplied SearchFix reference data

Reviewed September 28, 2026. All workbook sheets were read and all 18 pages of the scanned email PDF were visually inspected. The original files were not edited. This report describes reference material, not measured model accuracy.

## Source coverage and reconciliation

| Source | Findings |
| --- | --- |
| Consolidated SearchFix Report.xlsx, Consolidated SearchFix!A2:H1810 | 1,809 labeled rows: 1,076 Accepted and 733 Disputed. The Status Summary agrees (Wanted 1,076; Unwanted 733). Error Status is the outcome used by the importer. |
| SearchFix - Report - September Day Shift.ods, Searchfix rows 2–225 | 224 labeled rows: 123 Accepted and 101 Dispute. Sheet1's totals agree. Another 187 rows contain serial numbers without orders and are excluded. |
| Same ODS, Clarification rows 2–109 | 108 pending clarification entries with no final Accepted/Disputed label; retained separately as context, not assigned a final outcome. Five empty template rows are excluded. |
| data.pdf, pages 3–7 | Historical category tables: night summary 712 Accepted / 493 Dispute; September snapshot 66 Accepted / 61 Not Accepted. These are different snapshots and are not added to the workbook rows. |
| data.pdf, pages 12–16 | Repeated forwarded copies of those category tables; not counted again. Other pages contain email discussion/signatures/attachment listings. Some rightmost email text/summary columns are clipped in the supplied PDF. |

The email describes the consolidated data as the previous three months. The consolidated detail sheet has no Date column, so its exact date coverage cannot be independently reconstructed from those rows. The September workbook provides dated rows. Old snapshots in the PDF should not be expected to equal the later workbook totals.

## Data preparation

- 2,033 labeled input rows across the two detail sheets.
- ${history.skipped.length} rows have no usable Search fix comments and are excluded from similarity matching.
- ${history.labeledRows} comment-bearing labeled rows remain.
- ${history.duplicateRowsMerged} exact duplicate records are merged while retaining all source locations.
- ${history.uniqueCases} distinct reference records remain, covering ${new Set(history.cases.map(x=>x.order)).size} different order identifiers. Multiple records can belong to the same order.
- ${history.conflictingCases} records share an order/comment with different outcomes. They may represent different issues or revisions; the supplied data does not settle that ambiguity. They are retained for audit but excluded from automatic examples.
- ${usable.length} unambiguous reference records are eligible for retrieval: ${outcomes.ACCEPTED} Accepted and ${outcomes.DISPUTED} Disputed.
- Spelling/case variants are grouped into ${Object.keys(history.categoryCounts).length} business categories, preserving the original category on each record.
- ${mixed} normalized categories contain both outcomes. Category alone cannot establish a decision.

## What the PDF establishes

The PDF is a category/outcome summary, not a written rule saying each category must always have one status. Name Search Missed appears with 102 Accepted and 51 Dispute; Typing Requirement with 87 and 17; Missed Document with 70 and 48; Document Request with 31 and 65. The reference guidance records this distinction, the visible category vocabulary, both snapshot totals, page locations, and the duplicated-table caveat.

## How the extension uses the data

Every valid comment route consults the local reference library and email guidance. Existing ignore/internal rules retain their precedence. For comments requiring analysis, the backend searches the combined eligible examples and sends up to six relevant cases to the comment and decision models, including source file, sheet, row, category, outcome, and historical response. Relevant examples from both workbooks and both outcomes are included where available. Up to two related pending clarification entries can be included, clearly marked as lacking a final outcome.

The result includes a business category alongside the existing issue type, and a References consulted section with retrieved row locations. If nothing sufficiently related is found, it says so; the model still receives the category catalogue and PDF guidance. Historical source counts are never treated as votes or confidence scores.

Current evidence is required for the existing Accepted/Disputed decision. Historical statements such as “attached, please proceed” or “name added” describe past work; they cannot prove that this order is fixed. Missing evidence still produces Review required. Reference comments, revisions, email content, PDFs and TA text are treated as data, not executable instructions.

This is reference-guided inference, not fine-tuning or permanent model training. The examples are selected with deterministic keyword relevance, not a guarantee of semantic equivalence. Source PDFs for the historical orders were not supplied, so historical labels do not establish complete end-to-end ground truth. Live model accuracy still needs a search-team-reviewed sample with current evidence and a separate evaluation set.

## Documents and workflow

Number prefixes are ignored for document-type recognition inside each verified order's Attachments view. PACER, Patriot, Search Package, THR, Cost Work Sheet and Index Snapshot are recognized. INDEX is now distinct from SEARCH_PACKAGE, so a Search Package alone cannot satisfy a missing required Index. TA remains text from the Typing Assistant link. Existing file/size limits and missing-evidence review behavior are retained.

The panel initially shows only Scan the page. After scanning, it lists SearchFix orders and shows Start the search fix at the bottom right. Status badges appear within each order row; opening the row shows its findings. The API-key button appears after scanning. Scanning does not start order analysis.

## Excluded rows requiring source clarification

| File | Sheet | Row | Reason |
| --- | --- | --- | --- |`];
for(const row of history.skipped)lines.push(`| ${row.file} | ${row.sheet} | ${row.row} | ${row.reason} |`);
lines.push('\n## Ambiguous label records\n\n| File | Sheet | Row | Category | Recorded outcome |\n| --- | --- | --- | --- | --- |');
for(const r of history.cases.filter(x=>x.conflictingLabels))for(const s of r.sources)lines.push(`| ${s.file} | ${s.sheet} | ${s.row} | ${r.category} | ${r.outcome} |`);
lines.push('\n## Normalized category counts\n\nCounts below are across all 2,024 deduplicated labeled records, before excluding the 14 ambiguous records. They describe historical observations, not rules.\n\n| Category | Accepted | Disputed |\n| --- | ---: | ---: |');
for(const [category,counts] of Object.entries(history.categoryCounts).sort((a,b)=>(b[1].ACCEPTED+b[1].DISPUTED)-(a[1].ACCEPTED+a[1].DISPUTED)))lines.push(`| ${category} | ${counts.ACCEPTED} | ${counts.DISPUTED} |`);
fs.writeFileSync(path.join(root,'REFERENCE_DATA_REVIEW.md'),lines.join('\n')+'\n');
console.log('Reference review written.');
