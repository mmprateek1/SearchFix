import { readOrderPage, readSupportingView, openSupportingLink } from "/extension/page-reader.js";
import { DEFAULT_SETTINGS, validateOrder } from "/extension/core.js";
const results = [];
const check = (name, condition) => {if(!condition) throw new Error(name); results.push(`PASS · ${name}`);};
try {
  const before=document.getElementById("fixture").innerHTML;
  const page=readOrderPage(DEFAULT_SETTINGS);
  check("Only SearchFix Task Name rows selected",page.tasks.length===1);
  check("Uses Order Overview, never task activation",page.tasks[0].url.includes("OrderOverview.aspx?PublicOrderId=synthetic"));
  check("Reads the actual DataTrace comment columns",page.comments.length===2 && page.comments[1].author==="Client");
  check("Splits combined timestamp",page.comments[0].date==="2026-09-24" && page.comments[0].time==="09:15:00");
  check("Reads DataTrace order label",page.orderNumber==="SYNTHETIC-1");
  check("Skips foreign-host and JavaScript attachment links",page.attachments.length===1);
  check("Order passes backend contract",!!validateOrder(page));
  check("Finds active/available queue link",page.queueLinks.length===1);
  const ta=readSupportingView("SYNTHETIC-1","synthetic","ta");
  check("TA fields are readable without editing",ta.text.includes("DO NOT ALTER EXISTING TA"));
  let rejected=false;try{readSupportingView("WRONG-ORDER","wrong","ta");}catch{rejected=true;}
  check("Rejects popup for a different order",rejected);
  let prefixRejected=false;try{readSupportingView("SYNTHETIC","","ta");}catch{prefixRejected=true;}
  check("Order number prefixes do not match another order",prefixRejected);
  check("Attachments source link opens its own tab",openSupportingLink("attachments",location.href).url.includes("Attachments.aspx?PublicOrderId=synthetic"));
  check("Typing Assistant source uses the TA link",openSupportingLink("ta",location.href).url.includes("TypingAssistant.aspx?PublicOrderId=synthetic"));
  const sources=readSupportingView("SYNTHETIC-1","synthetic","attachments");
  check("Popup reader includes only same-site PDFs",sources.attachments.length===1);
  check("DOM unchanged after all reader operations",before===document.getElementById("fixture").innerHTML);
  const sourceLink=document.querySelector('a[href^="Attachments.aspx"]');
  sourceLink.setAttribute("href","javascript:window.open('Attachments.aspx?PublicOrderId=synthetic','attachments')");
  check("Literal popup URL is extracted without executing the handler",openSupportingLink("attachments",location.href).url.includes("Attachments.aspx?PublicOrderId=synthetic"));
  sourceLink.setAttribute("href","javascript:claimOrUnlockTask()");
  let unsafeRejected=false;try{openSupportingLink("attachments",location.href);}catch{unsafeRejected=true;}
  check("Unknown website handlers are never executed",unsafeRejected);
  sourceLink.setAttribute("href","Attachments.aspx?PublicOrderId=synthetic");
  document.getElementById("results").textContent=results.join("\n")+`\n\n${results.length}/${results.length} passed`;
} catch(error) {document.getElementById("results").textContent=results.join("\n")+"\nFAIL · "+error.message; document.getElementById("results").style.background="#ffe0d8";}
