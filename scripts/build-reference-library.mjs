import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normalizeCategory } from '../src/config/referenceCategories.js';
const root = path.resolve(import.meta.dirname, '..');
const sheets = JSON.parse(fs.readFileSync(path.join(root, 'tmp/reference-review/workbooks.json'), 'utf8'));
if (sheets.some(sheet => sheet.file !== 'Consolidated SearchFix Report.xlsx')) throw new Error('Only the consolidated XLSX may enter the reference library.');
const source = JSON.parse(fs.readFileSync(path.join(root, 'tmp/reference-review/source.json'), 'utf8'));
const records = [], pending = [], skipped = [], stats = [];
const rawCategoryCounts = {}, rawOutcomes = {ACCEPTED:0, DISPUTED:0};
const clean = v => String(v || '').trim().replace(/\r\n/g, '\n');
for (const sheet of sheets) {
  if (sheet.sheet !== 'Consolidated SearchFix') continue;
  const headers = sheet.rows[0].cells.map(v => v.trim().toLowerCase());
  const get = (row, name) => clean(row.cells[headers.indexOf(name)]);
  let count = 0, empty = 0;
  for (const row of sheet.rows.slice(1)) {
    const order = get(row, 'order number');
    if (!order) { empty++; continue; }
    const status = get(row, 'error status');
    const comment = get(row, 'search fix comments');
    const outcome = /^(accepted)$/i.test(status) ? 'ACCEPTED' : /^(dispute|disputed|not accepted)$/i.test(status) ? 'DISPUTED' : null;
    const source = {file:sheet.file, sheet:sheet.sheet, row:row.row};
    if (!outcome) { pending.push({order, comment, category:get(row,'category'), status:get(row,'status') || status, source}); continue; }
    rawOutcomes[outcome]++;
    const rawCounts = rawCategoryCounts[normalizeCategory(get(row,'category'))] ||= {ACCEPTED:0, DISPUTED:0};
    rawCounts[outcome]++;
    if (!comment) { skipped.push({...source, reason:'Missing comment'}); continue; }
    records.push({ order, comment, response:get(row,'revision comment') || get(row,'partner comments'), outcome,
      category:normalizeCategory(get(row,'category')), originalCategory:get(row,'category'), sources:[source] }); count++;
  }
  stats.push({file:sheet.file, sheet:sheet.sheet, labeledRows:count, emptyTemplateRows:empty});
}
const unique = new Map();
for (const record of records) {
  const sig = JSON.stringify([record.order, record.comment, record.response, record.outcome, record.category]);
  if (unique.has(sig)) unique.get(sig).sources.push(...record.sources);
  else unique.set(sig, {...record, id:'H-'+createHash('sha256').update(sig).digest('hex').slice(0,16)});
}
const cases = [...unique.values()];
const outcomes = new Map();
for (const r of cases) {const k=JSON.stringify([r.order,r.comment.toLowerCase().replace(/\s+/g,' ')]); if(!outcomes.has(k))outcomes.set(k,new Set()); outcomes.get(k).add(r.outcome);}
for (const r of cases) r.conflictingLabels = outcomes.get(JSON.stringify([r.order,r.comment.toLowerCase().replace(/\s+/g,' ')])).size > 1;
const categoryCounts = {};
for (const r of cases) {const c=categoryCounts[r.category] ||= {ACCEPTED:0,DISPUTED:0};c[r.outcome]++;}
const eligibleCategoryCounts = {};
for (const r of cases.filter(record=>!record.conflictingLabels)) {const counts=eligibleCategoryCounts[r.category] ||= {ACCEPTED:0,DISPUTED:0}; counts[r.outcome]++;}
const output = {version:'2026-09-29', source, rawOutcomes, rawCategoryCounts, eligibleCategoryCounts, stats, labeledRows:records.length, uniqueCases:cases.length,
  duplicateRowsMerged:records.length-cases.length, conflictingCases:cases.filter(r=>r.conflictingLabels).length,
  pendingRows:pending.length, skipped, categoryCounts, cases, pending};
fs.mkdirSync(path.join(root,'data/reference'),{recursive:true});
fs.writeFileSync(path.join(root,'data/reference/history.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,cases:undefined,pending:undefined},null,2));
