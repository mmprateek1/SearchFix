# Consolidated workbook review

Reviewed September 29, 2026. Only Consolidated SearchFix Report.xlsx supplied in the 29th September folder is used. Both populated sheets were read. The original workbook was not changed. Its SHA-256 is a885feaac422a18d4dc4b9e9d73fcbf776c88044ac50b7d317de233b4a5d6a76.

## Coverage

Consolidated SearchFix!A2:H1810 contains 1,809 labeled entries: 1,076 Accepted and 733 Disputed. Status Summary agrees (Wanted 1,076; Unwanted 733). There is no date column; the rows alone do not establish their date coverage.

One row has no comment, leaving 1808 usable input rows. 4 exact duplicates are merged, preserving their source row locations. 1804 distinct records remain; 10 have conflicting outcomes for the same order/comment and are excluded from retrieval. 1794 records are eligible as examples. Spelling/case variants are normalized without changing source labels or recorded outcomes.

## Decisions and limitations

Abstractor has 19 Disputed and 11 Accepted entries (63.3% Disputed). Accepted examples include wrong book/page references and attorney-opinion errors. Therefore an Abstractor category alone cannot justify skipping evidence. No separate Fee Approval category exists in this workbook; the fee-only rule comes from the user's requested workflow, not a measured fee-approval success rate.

The comment model receives the category catalogue, eligible category counts, and up to six relevant historical examples. The decision model receives those references alongside current evidence. These are reference-guided prompts, not fine-tuning. Historical response text never proves a current order was corrected. Counts describe the sample; they are not confidence scores or guaranteed future probabilities.

Internal authors, including ADSSearchType and ADSSP2, are ignored before any AI call. Explicit fee-only approvals, abstractor status/ETA-only updates and explicit no-revision requests can finish Disputed without downloading documents. Mixed comments still send substantive claims for evidence checks. Unmatched or ambiguous claims finish Review required with an explanation and no arbitrary document request. Missing, unreadable or inconclusive required evidence also needs review.

## Category outcomes

Raw counts below include all 1,809 labeled rows, before removing the blank comment, duplicates or conflicting records. Model prompts use the eligible counts instead. Even a 100% fraction from one or two examples is not a reliable general decision rule.

| Category | Accepted | Disputed | Historical Disputed share |
| --- | ---: | ---: | ---: |
| 24 Month Chain | 0 | 1 | 100.0% |
| Abstractor | 11 | 19 | 63.3% |
| Abstractor / Typing | 1 | 0 | 0.0% |
| Address | 9 | 20 | 69.0% |
| Assignment Chain | 2 | 6 | 75.0% |
| Attorney Opinion | 73 | 11 | 13.1% |
| Chain of Title | 19 | 40 | 67.8% |
| Checklist | 3 | 1 | 25.0% |
| Comment | 55 | 22 | 28.6% |
| Cost Work Sheet | 34 | 8 | 19.0% |
| County Change | 1 | 5 | 83.3% |
| Court Search | 3 | 11 | 78.6% |
| Cover Sheet | 0 | 1 | 100.0% |
| Document | 115 | 81 | 41.3% |
| Document Request | 47 | 96 | 67.1% |
| Effective Date | 39 | 42 | 51.9% |
| Effective Date / Typing | 1 | 0 | 0.0% |
| GIS Map | 0 | 1 | 100.0% |
| HOA | 16 | 4 | 20.0% |
| Index | 15 | 10 | 40.0% |
| Judgment | 1 | 2 | 66.7% |
| Legal Description | 17 | 30 | 63.8% |
| Lender Name | 1 | 0 | 0.0% |
| Lien Registry | 17 | 1 | 5.6% |
| Mailing List | 10 | 1 | 9.1% |
| Marital Status | 0 | 1 | 100.0% |
| Mortgage | 4 | 9 | 69.2% |
| Name Search | 157 | 68 | 30.2% |
| No Revision Request | 0 | 2 | 100.0% |
| Pacer and Patriot | 44 | 7 | 13.7% |
| Pacer Search | 4 | 0 | 0.0% |
| Parcel ID | 11 | 12 | 52.2% |
| Patriot | 6 | 1 | 14.3% |
| Plat Map | 28 | 15 | 34.9% |
| Property Identification | 1 | 0 | 0.0% |
| Property Report | 12 | 1 | 7.7% |
| PUD Comment | 1 | 0 | 0.0% |
| Recording Date | 1 | 1 | 50.0% |
| Search Package | 19 | 13 | 40.6% |
| Sunbiz | 1 | 3 | 75.0% |
| Survey | 0 | 1 | 100.0% |
| Tax / Assessor | 57 | 37 | 39.4% |
| Tax Warrant | 0 | 1 | 100.0% |
| THR Report | 1 | 0 | 0.0% |
| Torrens | 0 | 2 | 100.0% |
| Typing | 121 | 38 | 23.9% |
| Uncategorized | 0 | 1 | 100.0% |
| Unofficial Copies | 1 | 0 | 0.0% |
| Update Report | 7 | 7 | 50.0% |
| Vendor Management Requirement | 56 | 67 | 54.5% |
| Vesting Name | 43 | 30 | 41.1% |
| Water Mark Copies | 1 | 2 | 66.7% |
| Wrong Document | 9 | 1 | 10.0% |
| Wrong Order Number | 1 | 0 | 0.0% |

## Rows excluded from matching

| Sheet | Row | Reason |
| --- | ---: | --- |
| Consolidated SearchFix | 190 | Missing comment |

## Conflicting labeled records

| Sheet | Row | Category | Outcome |
| --- | ---: | --- | --- |
| Consolidated SearchFix | 622 | Tax / Assessor | ACCEPTED |
| Consolidated SearchFix | 639 | Address | DISPUTED |
| Consolidated SearchFix | 817 | Effective Date | DISPUTED |
| Consolidated SearchFix | 826 | Effective Date | ACCEPTED |
| Consolidated SearchFix | 960 | Effective Date | DISPUTED |
| Consolidated SearchFix | 1093 | Effective Date | ACCEPTED |
| Consolidated SearchFix | 1340 | Comment | DISPUTED |
| Consolidated SearchFix | 1361 | Effective Date | ACCEPTED |
| Consolidated SearchFix | 1671 | Attorney Opinion | ACCEPTED |
| Consolidated SearchFix | 1677 | Attorney Opinion | DISPUTED |

## Rebuild

Run scripts/inspect-reference-data.py with Python and openpyxl, supplying the consolidated workbook path if necessary. Then run node scripts/build-reference-library.mjs and node scripts/report-reference-review.mjs. The local setup package must include data/reference/history.json. No original reference workbook is required on a receiving PC.
