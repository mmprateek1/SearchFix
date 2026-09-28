# Review of the supplied SearchFix reference data

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
- 5 rows have no usable Search fix comments and are excluded from similarity matching.
- 2028 comment-bearing labeled rows remain.
- 4 exact duplicate records are merged while retaining all source locations.
- 2024 distinct reference records remain, covering 1829 different order identifiers. Multiple records can belong to the same order.
- 14 records share an order/comment with different outcomes. They may represent different issues or revisions; the supplied data does not settle that ambiguity. They are retained for audit but excluded from automatic examples.
- 2010 unambiguous reference records are eligible for retrieval: 1188 Accepted and 822 Disputed.
- Spelling/case variants are grouped into 59 business categories, preserving the original category on each record.
- 41 normalized categories contain both outcomes. Category alone cannot establish a decision.

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
| --- | --- | --- | --- |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 190 | Missing comment |
| SearchFix - Report - September Day Shift.ods | Searchfix | 39 | Missing comment |
| SearchFix - Report - September Day Shift.ods | Searchfix | 44 | Missing comment |
| SearchFix - Report - September Day Shift.ods | Searchfix | 144 | Missing comment |
| SearchFix - Report - September Day Shift.ods | Searchfix | 223 | Missing comment |

## Ambiguous label records

| File | Sheet | Row | Category | Recorded outcome |
| --- | --- | --- | --- | --- |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 622 | Tax / Assessor | ACCEPTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 639 | Address | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 817 | Effective Date | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 826 | Effective Date | ACCEPTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 960 | Effective Date | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1093 | Effective Date | ACCEPTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1340 | Comment | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1361 | Effective Date | ACCEPTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1671 | Attorney Opinion | ACCEPTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1677 | Attorney Opinion | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1735 | Comment | DISPUTED |
| Consolidated SearchFix Report.xlsx | Consolidated SearchFix | 1751 | Document | ACCEPTED |
| SearchFix - Report - September Day Shift.ods | Searchfix | 107 | HOA | ACCEPTED |
| SearchFix - Report - September Day Shift.ods | Searchfix | 111 | Document | DISPUTED |

## Normalized category counts

Counts below are across all 2,024 deduplicated labeled records, before excluding the 14 ambiguous records. They describe historical observations, not rules.

| Category | Accepted | Disputed |
| --- | ---: | ---: |
| Name Search | 188 | 73 |
| Document | 132 | 103 |
| Typing | 123 | 39 |
| Document Request | 47 | 97 |
| Vendor Management Requirement | 56 | 67 |
| Tax / Assessor | 57 | 37 |
| Attorney Opinion | 83 | 11 |
| Effective Date | 44 | 45 |
| Comment | 62 | 26 |
| Vesting Name | 44 | 33 |
| Chain of Title | 19 | 49 |
| Legal Description | 17 | 37 |
| Pacer and Patriot | 44 | 7 |
| Plat Map | 29 | 19 |
| Cost Work Sheet | 38 | 9 |
| Address | 10 | 25 |
| Search Package | 20 | 15 |
| Abstractor | 11 | 19 |
| Parcel ID | 14 | 15 |
| HOA | 20 | 7 |
| Index | 15 | 11 |
| Court Search | 6 | 16 |
| Lien Registry | 17 | 2 |
| Pacer Search | 17 | 1 |
| Property Report | 12 | 6 |
| Update Report | 7 | 7 |
| Mailing List | 10 | 3 |
| Mortgage | 4 | 9 |
| Wrong Document | 9 | 1 |
| County Change | 2 | 7 |
| Judgment | 3 | 6 |
| Assignment Chain | 2 | 6 |
| Patriot | 6 | 1 |
| Checklist | 6 | 1 |
| Sunbiz | 1 | 3 |
| Parcel Search | 4 | 0 |
| Water Mark Copies | 1 | 2 |
| Recording Date | 1 | 1 |
| Torrens | 0 | 2 |
| GIS Map | 1 | 1 |
| 24 Month Chain | 1 | 1 |
| PUD Comment | 2 | 0 |
| THR Report | 1 | 1 |
| Probate Copy | 1 | 1 |
| Effective Date / Typing | 1 | 0 |
| Abstractor / Typing | 1 | 0 |
| Wrong Order Number | 1 | 0 |
| Property Identification | 1 | 0 |
| Unofficial Copies | 1 | 0 |
| Uncategorized | 0 | 1 |
| Survey | 0 | 1 |
| Cover Sheet | 0 | 1 |
| Tax Warrant | 0 | 1 |
| Lender Name | 1 | 0 |
| Marital Status | 0 | 1 |
| No Revision Request | 0 | 1 |
| Page Sequence | 0 | 1 |
| Date Discrepancy | 1 | 0 |
| Search Note | 1 | 0 |
