import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ISSUE_TYPES, COMMENT_ONLY_TYPES } from '../src/config/issueTypes.js';
import { DOCUMENT_TYPES, DOCUMENT_MAPPINGS, getRequiredDocumentTypes } from '../src/config/documentMappings.js';
import { CATEGORY_ISSUE_TYPES } from '../src/config/categoryIssues.js';
import { documentSelectionService } from '../src/services/documentSelection.service.js';
import { geminiService } from '../src/services/gemini.service.js';
import { analyzeCommentsController, analyzeDocumentsController } from '../src/controllers/searchfix.controller.js';
import { commentSelectionService } from '../src/services/commentSelection.service.js';
import { guessDocumentType } from '../extension/core.js';
const history=JSON.parse(fs.readFileSync(new URL('../data/reference/history.json',import.meta.url)));
const comment=(author,text,time='12:00')=>({author,text,time,date:'2026-09-29'});
const response=()=>({status(n){this.code=n;return this;},json(data){this.body=data;return this;}});
const order=(text,author='Client')=>({orderNumber:'SYNTHETIC',comments:[comment(author,text)]});

test('every named workbook category is covered and every issue maps to supported evidence or an explicit operational rule',()=>{
  assert.equal(ISSUE_TYPES.length,59);
  assert.ok(!ISSUE_TYPES.includes('OTHER'));
  for(const category of Object.keys(history.rawCategoryCounts).filter(x=>x!=='Uncategorized')) {
    assert.ok(CATEGORY_ISSUE_TYPES[category],category);
    assert.ok(CATEGORY_ISSUE_TYPES[category].every(x=>ISSUE_TYPES.includes(x)),category);
  }
  for(const issue of ISSUE_TYPES) {
    assert.ok(Object.hasOwn(DOCUMENT_MAPPINGS,issue),issue);
    assert.ok(getRequiredDocumentTypes(issue).every(x=>DOCUMENT_TYPES.includes(x)),issue);
    assert.equal(getRequiredDocumentTypes(issue).length===0,COMMENT_ONLY_TYPES.includes(issue),issue);
  }
  assert.deepEqual(getRequiredDocumentTypes('OTHER'),[]);
  assert.deepEqual(documentSelectionService.selectRequiredDocuments([{issueType:'unknown',category:'Index'}])[0].requiredDocuments,[]);
  assert.deepEqual(history.rawOutcomes,{ACCEPTED:1076,DISPUTED:733});
  assert.equal(Object.values(history.rawCategoryCounts).reduce((n,c)=>n+c.ACCEPTED+c.DISPUTED,0),1809);
  assert.equal(Object.values(history.eligibleCategoryCounts).reduce((n,c)=>n+c.ACCEPTED+c.DISPUTED,0),1794);
  assert.deepEqual(history.rawCategoryCounts.Abstractor,{ACCEPTED:11,DISPUTED:19});
  assert.ok(history.cases.every(r=>r.sources.every(s=>s.file===history.source.file)));
});

test('new attachment families match independent of numeric prefixes and specific names beat generic words',()=>{
  const examples={'Attorney Opinion':'ATTORNEY_OPINION','AO':'ATTORNEY_OPINION','VendorManagement':'VENDOR_INSTRUCTIONS',
    'Original Request':'VENDOR_INSTRUCTIONS','HOA Document':'HOA_DOCUMENT','Mailing List':'MAILING_LIST',
    'Property View Report':'PROPERTY_REPORT','Update Report':'UPDATE_REPORT','Lien Registry':'LIEN_REGISTRY',
    'Court Search':'COURT_SEARCH','Protho':'COURT_SEARCH','Judgment Search':'COURT_SEARCH','Probate':'PROBATE',
    'Survey Map':'SURVEY','Torrens Certificate':'TORRENS','Radian Run Sheet':'COVER_SHEET',
    'No Open Mortgage Checklist':'CHECKLIST','Sunbiz':'SUNBIZ','Mortgage Assignment':'ASSIGNMENT'};
  for(const prefix of ['1280806404_','101-10925203 - '])for(const [name,type] of Object.entries(examples))assert.equal(guessDocumentType(prefix+name+'.pdf'),type,name);
});

test('ADSSP2 variants ignore before AI on both endpoints while older internal authors do not hide a newer client',async()=>{
  const saved=geminiService.generateJSON;
  let calls=0;
  geminiService.generateJSON=async()=>{calls++;throw Error('Must not call AI');};
  try {
    for(const author of ['Searcher_ADSSP2','Jane_adssp2','RVSI-Outsource: Jane_ADSSP2','Jane_ADSSearchType'])for(const controller of [analyzeCommentsController,analyzeDocumentsController]){
      const res=response();await controller({body:order('SUSPEND: waiting for recheck',author),files:[]},res);
      assert.equal(res.code,200);assert.equal(res.body.status,'IGNORED');assert.deepEqual(res.body.issues,[]);
    }
    assert.equal(calls,0);
    assert.equal(commentSelectionService.selectSearchFixComment([comment('Jane_ADSSP2','Missing deed','11:00'),comment('Client','The deed name is incorrect')]).selectedComment.author,'Client');
  } finally {geminiService.generateJSON=saved;}
});

test('unknown, empty, partly unmatched and malformed classifications request review with no documents',async()=>{
  const saved=geminiService.generateJSON;
  try {
    for(const parsed of [{issues:[]},{issues:[{issueType:'OTHER',claim:'Unsupported concern'}]},
      {issues:[{issueType:'MISSING_DEED',claim:'Deed missing'},{issueType:'new-type',claim:'New concern'}]},
      {issues:[{issueType:'MISSING_DEED',claim:''}]},
      {disposition:'REVIEW_REQUIRED',unmatchedClaims:['Novel concern'],issues:[{issueType:'MISSING_DEED',claim:'Deed missing'}]},
      {disposition:'IGNORED',ignoreReason:'ETA',issues:[]}]) {
      geminiService.generateJSON=async()=>parsed;
      for(const controller of [analyzeCommentsController,analyzeDocumentsController]){
        const res=response();await controller({body:order('ETA pending, but deed missing','RVSI-Outsource: Client'),files:[]},res);
        assert.equal(res.code,200);assert.equal(res.body.status,'REVIEW_REQUIRED');assert.deepEqual(res.body.issues,[]);
        assert.match(res.body.reason,/Manual classification/);
      }
    }
  } finally {geminiService.generateJSON=saved;}
});

test('only explicit operational comments can finish Disputed without evidence; mislabeled substantive claims require review',async()=>{
  const saved=geminiService.generateJSON,savedFiles=geminiService.generateContentWithFiles;
  let documentCalls=0;
  geminiService.generateContentWithFiles=async()=>{documentCalls++;throw Error('No evidence call allowed');};
  try {
    const examples=[['FEE_APPROVAL_REQUEST','Please approve the additional fee.'],['ABSTRACTOR_STATUS','Awaiting status and ETA from the abstractor.'],['NO_REVISION_REQUEST','No correction is required.']];
    for(const [issueType,text] of examples)for(const suffix of ['', ' The deed has the wrong name.', ' Provide probate copies.', ' There is a vesting issue.']){
      geminiService.generateJSON=async()=>({issues:[{issueType,claim:text}]});
      for(const controller of [analyzeCommentsController,analyzeDocumentsController]){
        const res=response();await controller({body:order(text+suffix),files:[]},res);
        assert.equal(res.code,200);assert.equal(res.body.status,suffix?'REVIEW_REQUIRED':'DISPUTED');
        if(!suffix){assert.equal(res.body.issues[0].decision,'DISPUTED');assert.equal((res.body.issues[0].requiredFiles||res.body.issues[0].requiredDocuments).length,0);}
      }
    }
    assert.equal(documentCalls,0);
  } finally {geminiService.generateJSON=saved;geminiService.generateContentWithFiles=savedFiles;}
});

test('Abstractor historical majority does not suppress a current attorney-opinion error',async()=>{
  const saved=geminiService.generateJSON;
  geminiService.generateJSON=async()=>({issues:[{issueType:'ATTORNEY_OPINION_DISCREPANCY',category:'Abstractor',claim:'Incorrect deed book/page in the attorney opinion.'}]});
  try{
    const res=response();await analyzeCommentsController({body:order('The abstractor provided an incorrect deed book/page in the attorney opinion.')},res);
    assert.equal(res.code,200);assert.equal(res.body.status,'AWAITING_DOCUMENTS');
    assert.ok(res.body.issues[0].requiredFiles.some(x=>x.fileType==='ATTORNEY_OPINION'));
  }finally{geminiService.generateJSON=saved;}
});
