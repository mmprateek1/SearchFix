import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {openSupportingLink,readSupportingView} from '../extension/page-reader.js';
import {createPageInjector} from '../extension/injection.js';
import {createActivityLog} from '../extension/activity-log.js';
import {guessDocumentType} from '../extension/core.js';

const id='11111111-2222-3333-4444-555555555555';
const origin='https://tv.datatracetitle.com';
test('serialized source reader resolves supplied postback wrappers without calling website code',()=>{
  for(const [kind,suffix,handler,path] of [
    ['attachments','Attachments','showAttachmentsV2',`/Orders/attachment/Manager/${id}`],
    ['ta','TypingAssistant','showTypingAssistant',`/TypingAssistant.aspx?PublicOrderId=${id}`]
  ]) {
    const href=`${origin}/OrderOverview.aspx?PublicOrderId=${id}`;
    const link={id:`test_lnk${suffix}`,className:'',innerText:kind==='ta'?'Typing Assistant':'Attachments',
      getClientRects:()=>[{}],closest:selector=>selector.includes('divOrderLinksDetails')?{}:null,
      getAttribute:name=>name==='onclick'?`return ${handler}();`:name==='href'?"javascript:__doPostBack('blocked','')":null};
    const context={URL,location:new URL(href),document:{querySelectorAll:()=>[link],querySelector:()=>null}};
    const reader=vm.runInNewContext(`(${openSupportingLink.toString()})`,context);
    assert.equal(reader(kind,href,true).url,origin+path);
    link.getAttribute=name=>name==='onclick'?'return claimOrUnlockTask();':null;
    assert.match(reader(kind,href,true).searchFixError,/unverified|locked/);
  }
});

test('manager path identity rejects a different order even when its body contains the expected number',()=>{
  const reader=vm.runInNewContext(`(${readSupportingView.toString()})`,{URL,
    location:new URL(`${origin}/Orders/attachment/Manager/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`),
    document:{body:{innerText:'TPS-AD-TEST'}}});
  assert.match(reader('TPS-AD-TEST',id,'attachments',true).searchFixError,/Cannot confirm/);
});

test('injection preserves returned and browser errors instead of generic page-read failure',async()=>{
  const events=[];
  const inject=createPageInjector({executeScript:async options=>{
    assert.equal(options.args.at(-1),true);
    return [{frameId:0,result:{searchFixError:'Typing Assistant is locked by another user.'}}];
  }},(event)=>events.push(event));
  await assert.rejects(inject(7,openSupportingLink,['ta','test']),/locked by another user/);
  assert.deepEqual(events,['page.read.start','page.read.failed']);
  const empty=createPageInjector({executeScript:async()=>[{frameId:0}]});
  await assert.rejects(empty(7,openSupportingLink,[]),/returned no page data/);
  const rejected=createPageInjector({executeScript:async()=>[{frameId:0,error:{message:'Permission denied'}}]});
  await assert.rejects(rejected(7,openSupportingLink,[]),/Permission denied/);
});

test('activity logs keep metadata but exclude credentials, source text, URLs and error bodies',()=>{
  const activity=createActivityLog();
  activity.log('test',{step:'readSupportingView',tabId:4,apiKey:'SECRET_KEY',comment:'PRIVATE_COMMENT',taText:'PRIVATE_TA',url:'https://host/?token=SECRET',message:'SECRET_ERROR'});
  assert.match(activity.text(),/readSupportingView/);
  assert.doesNotMatch(activity.text(),/SECRET|PRIVATE/);
});

test('filenames visible in Attachment Manager recognize snapshot spelling variants',()=>{
  assert.equal(guessDocumentType('1280806404_PASanp Shot.pdf'),'PA');
  assert.equal(guessDocumentType('1280806404_Index Sanp Shot.pdf'),'INDEX');
});

test('serialized Manager reader resolves attachment IDs independently of row order and rejects unsafe or mismatched rows',()=>{
  const fileId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const secondId='bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const anchor=(name,attachmentId,options={})=>({innerText:name,
    getClientRects:()=>options.hidden?[]:[{}],
    getAttribute:key=>key==='href'?'javascript:void(0);':key==='onclick'?(options.handler || `openAttachment('${attachmentId}');this.style.color='purple';`):null,
    closest:selector=>selector==='tbody'?{id:options.rowId || attachmentId}:selector==='td.filenameCell'||selector==='#tblAttachments, #tblSharedAttachments'?{}:null});
  const links=[anchor('101-10925203_Search Package.pdf',fileId),anchor('AnotherOrder_Pacer.pdf',secondId),
    anchor('Hidden.pdf',fileId,{hidden:true}),anchor('TypingAssistant.txt',fileId),
    anchor('Wrong.pdf',fileId,{rowId:secondId}),anchor('Unsafe.pdf',fileId,{handler:`openAttachment('${fileId}');deleteAttachment(this);`})];
  const reader=vm.runInNewContext(`(${readSupportingView.toString()})`,{URL,
    location:new URL(`${origin}/Orders/attachment/Manager/${id}`),
    document:{title:'Attachment Manager',body:{innerText:'TPS-AD-TEST'},querySelector:()=>null,querySelectorAll:selector=>selector==='a[href]'?links:[]}});
  for(let order=0;order<links.length;order++) {
    const found=reader('TPS-AD-TEST',id,'attachments');
    assert.equal(found.attachments.length,2);
    assert.equal(found.attachments.find(file=>guessDocumentType(file.name)==='SEARCH_PACKAGE').url,`${origin}/AttachmentViewer.aspx?PublicAttachmentId=${fileId}`);
    assert.equal(found.attachments.find(file=>guessDocumentType(file.name)==='PACER').url,`${origin}/AttachmentViewer.aspx?PublicAttachmentId=${secondId}`);
    links.push(links.shift());
  }
});
