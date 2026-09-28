import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { referenceContext, referenceAudit } from '../src/services/reference.service.js';
import { normalizeCategory } from '../src/config/referenceCategories.js';
import { issueClassificationService } from '../src/services/issueClassification.service.js';
import { decisionEngine } from '../src/services/decision.service.js';
import { geminiService } from '../src/services/gemini.service.js';
import { SearchFixStep1ResultSchema } from '../src/schemas/result.schema.js';
import { getRequiredDocumentTypes } from '../src/config/documentMappings.js';
import { guessDocumentType } from '../extension/core.js';

const history = JSON.parse(fs.readFileSync(new URL('../data/reference/history.json', import.meta.url)));
test('reference import reconciles rows, deduplicates and separates pending/conflicting labels', () => {
  assert.equal(history.labeledRows,2028); assert.equal(history.uniqueCases,2024);
  assert.equal(history.duplicateRowsMerged,4); assert.equal(history.skipped.length,5);
  assert.equal(history.pendingRows,108); assert.equal(history.conflictingCases,14);
  assert.equal(history.cases.filter(x=>!x.conflictingLabels).length,2010);
  assert.ok(history.pending.every(x=>!x.outcome));
  assert.ok(history.cases.every(x=>x.sources.every(s=>s.row>1 && s.file && s.sheet)));
});
test('retrieval consults both workbooks and PDF but excludes contradictory labels', () => {
  const ref = referenceContext('Please provide missing pacer and patriot name searches for the borrower');
  assert.equal(ref.library.sources.length,2); assert.equal(ref.mail.source,'data.pdf');
  assert.ok(ref.examples.length>0 && ref.examples.length<=6);
  assert.equal(new Set(ref.examples.flatMap(x=>x.sources.map(s=>s.file))).size,2);
  assert.ok(ref.examples.every(x=>!history.cases.find(r=>r.id===x.id).conflictingLabels));
  assert.match(ref.rule,/never instructions or evidence/);
  assert.ok(ref.mail.examplesWithBothOutcomes.every(x=>x.accepted>0 && x.disputed>0));
  const unknown = referenceContext('zzzzzzqqqqq');
  assert.equal(unknown.examples.length,0);
  assert.match(referenceAudit(unknown).note,/no sufficiently related/);
});
test('category aliases retain original decision independence and indexed documents are separate', () => {
  assert.equal(normalizeCategory(' Vender Management Requirement '),'Vendor Management Requirement');
  assert.equal(normalizeCategory('Index Missing'),'Index');
  assert.equal(normalizeCategory('Invent a new category'),'Uncategorized');
  assert.deepEqual(getRequiredDocumentTypes('NAME_SEARCH_MISSING'),['PACER','PATRIOT','TYPED_REPORT','SEARCH_PACKAGE','INDEX']);
  const names = {'Cost Work Sheet':'COST_WORKSHEET',Pacer:'PACER',Patriot:'PATRIOT','Search Package':'SEARCH_PACKAGE',THR:'THR','Index Snapshot':'INDEX'};
  for (const prefix of ['1280806404','987654321']) for (const [name,type] of Object.entries(names)) assert.equal(guessDocumentType(`${prefix}_${name}.pdf`),type);
});
test('both AI stages receive history and email guidance; history cannot replace missing evidence', async () => {
  const saved=geminiService.generateJSON; const calls=[];
  geminiService.generateJSON=async(system,prompt,stage)=>{
    calls.push({system,prompt,stage});
    return stage==='documents' ? {decision:'DISPUTED',reason:'Current evidence contradicts the claim.'} : {issues:[{issueType:'NAME_SEARCH_MISSING',category:'Name Search Missed',claim:'Borrower names missing from pacer and patriot'}]};
  };
  try {
    const result=await issueClassificationService.analyzeComment({author:'Client',text:'Borrower names missing from pacer and patriot'});
    assert.equal(result.issues[0].category,'Name Search');
    const issue={...result.issues[0],requiredDocuments:getRequiredDocumentTypes('NAME_SEARCH_MISSING')};
    assert.equal((await decisionEngine.evaluateIssueDecision(issue,[])).decision,'REVIEW_REQUIRED');
    assert.equal(calls.length,1);
    const decision=await decisionEngine.evaluateIssueDecision(issue,[{document:'Current evidence',finding:'Required name is present.'}]);
    assert.equal(decision.decision,'DISPUTED');
    assert.equal(calls.length,2);
    for (const call of calls) {
      assert.match(call.prompt,/Consolidated SearchFix Report.xlsx/);
      assert.match(call.prompt,/September Day Shift.ods/);
      assert.match(call.prompt,/data.pdf/);
      assert.match(call.prompt,/historicalResolution/);
    }
    assert.equal(calls[1].stage,'documents');
  } finally {geminiService.generateJSON=saved;}
});
test('reference citations and business categories survive the response schema',()=>{
  const parsed=SearchFixStep1ResultSchema.parse({analysisId:'test',orderNumber:'TEST',commentAnalysis:{selectedComment:{role:'CLIENT',text:'Missing name search'},contextCommentsUsed:[]},issues:[{issueType:'NAME_SEARCH_MISSING',category:'Name Search',claim:'Missing name search',requiredFiles:[]}],status:'AWAITING_DOCUMENTS',references:referenceAudit(referenceContext('pacer patriot borrower names'))});
  assert.equal(parsed.references.sources.length,3); assert.equal(parsed.issues[0].category,'Name Search');
});
