import {openSupportingLink,readSupportingView} from '/extension/page-reader.js';
const results=[],check=(name,passed)=>{if(!passed)throw new Error(name);results.push(`PASS · ${name}`);};
const start=location.href,id='11111111-2222-3333-4444-555555555555';
const fixture=document.getElementById('fixture'),before=fixture.innerHTML;
let called=0;
window.showAttachmentsV2=window.showTypingAssistant=window.__doPostBack=()=>{called++;throw new Error('Website handlers must not execute');};
try {
  history.replaceState(null,'',`/OrderOverview.aspx?PublicOrderId=${id}`);
  check('Supplied Attachments wrapper resolves the Manager URL',openSupportingLink('attachments',location.href).url===`${location.origin}/Orders/attachment/Manager/${id}`);
  check('Supplied TA wrapper resolves its text-source URL',openSupportingLink('ta',location.href).url===`${location.origin}/TypingAssistant.aspx?PublicOrderId=${id}`);
  history.replaceState(null,'',`/Orders/attachment/Manager/${id}`);
  const view=readSupportingView('TPS-AD-SYNTHETIC',id,'attachments');
  check('Manager path verifies the current order',view.attachments.length===1);
  check('PDF filename supports download routes without a .pdf suffix',view.attachments[0].url.endsWith('/Download/synthetic'));
  check('Wrong Manager ID is rejected despite matching body label',!!readSupportingView('TPS-AD-SYNTHETIC','wrong','attachments',true).searchFixError);
  history.replaceState(null,'',`/TypingAssistant.aspx?PublicOrderId=${id}`);
  const ta=readSupportingView('TPS-AD-SYNTHETIC',id,'ta');
  check('TA is exactly the report textarea, including newlines',ta.text===document.getElementById('report').value);
  check('Save/category/line-space controls are excluded',!ta.text.includes('Save')&&!ta.text.includes('Internal Comments:'));
  check('No website handler, save, or postback executed',called===0);
  check('Source DOM and textarea remain unchanged',fixture.innerHTML===before);
  document.getElementById('report').value='';
  check('An empty TA does not become evidence from page controls',!!readSupportingView('TPS-AD-SYNTHETIC',id,'ta',true).searchFixError);
  document.getElementById('report').value='VESTING: Synthetic Owner';
  const extra=document.createElement('textarea');extra.value='VESTING: Different Owner';fixture.append(extra);
  check('Ambiguous multiple reports require review',!!readSupportingView('TPS-AD-SYNTHETIC',id,'ta',true).searchFixError);
  extra.remove();
  document.getElementById('results').textContent=results.join('\n')+`\n\n${results.length}/${results.length} passed`;
} catch(error){document.getElementById('results').textContent=results.join('\n')+'\nFAIL · '+error.message;}
finally{history.replaceState(null,'',start);}
