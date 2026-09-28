import {readSupportingView,readAttachment} from '/extension/page-reader.js';
import {guessDocumentType} from '/extension/core.js';
const results=[],check=(name,condition)=>{if(!condition)throw new Error(name);results.push(`PASS · ${name}`);};
const start=location.href,orderId='11111111-2222-3333-4444-555555555555';
const fixture=document.getElementById('fixture'),before=fixture.innerHTML;
let calls=0;
window.openAttachment=window.changeShouldBundle=window.saveEdit=()=>{calls++;throw new Error('Must not execute website handlers');};
try {
  history.replaceState(null,'',`/Orders/attachment/Manager/${orderId}`);
  const read=()=>readSupportingView('SYNTHETIC',orderId,'attachments');
  const files=read().attachments;
  check('Finds both visible PDF links with javascript:void(0)',files.length===2);
  check('Excludes hidden shared duplicates, edit rows, and XLSX files',files.every(file=>!file.url.includes('dddddddd')&&file.name.endsWith('.pdf')));
  const selected=files.find(file=>guessDocumentType(file.name)==='SEARCH_PACKAGE');
  check('Matches the Search Package by filename with its own attachment ID',selected.url===`${location.origin}/AttachmentViewer.aspx?PublicAttachmentId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`);
  const downloaded=await readAttachment(selected.url,location.href);
  check('Resolves the viewer entry to attachment.ashp and uses the existing HttpOnly session cookie',atob(downloaded.base64)==='%PDF-1.4\nSynthetic viewer PDF');
  check('No handlers, checkboxes, or source DOM were changed',calls===0&&fixture.innerHTML===before);
  const table=document.getElementById('tblAttachments');
  const rows=[...table.children];for(const row of rows.reverse())table.append(row);
  check('Reordering rows retains the same file ID and document type',read().attachments.find(file=>guessDocumentType(file.name)==='SEARCH_PACKAGE').url===selected.url);
  const link=document.getElementById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff').querySelector('a');const original=link.getAttribute('onclick');
  link.setAttribute('onclick',"openAttachment('99999999-8888-7777-6666-555555555555');this.style.color='purple';");
  check('A handler ID that differs from its row ID is rejected',read().attachments.length===1);
  link.setAttribute('onclick',original+'deleteAttachment(this);');
  check('An unexpected handler suffix is rejected without executing it',read().attachments.length===1&&calls===0);
  document.getElementById('results').textContent=results.join('\n')+`\n\n${results.length}/${results.length} passed`;
} catch(error){document.getElementById('results').textContent=results.join('\n')+'\nFAIL · '+error.message;}
finally{history.replaceState(null,'',start);}
