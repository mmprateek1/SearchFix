// Local preview only. This file is never packaged into the extension.
const order={pageUrl:"https://tv.datatracetitle.com/OrderOverview.aspx?PublicOrderId=synthetic",orderNumber:"SYNTHETIC-1",comments:[{author:"Client",date:"2026-09-24",time:"09:14:00",text:"Please confirm the borrower name in TA against the deed and provide the missing deed."}],tasks:[],queueLinks:[],overviewLinks:[],attachments:[],warnings:["Synthetic preview: no live orders or AI requests."],taStatus:"Typing Assistant · Read-only source"};
window.chrome={
  storage:{local:{get:async()=>({}),set:async()=>{}}},
  tabs:{query:async()=>[{id:1,url:order.pageUrl,title:"Synthetic order"}],get:async()=>({id:1,url:order.pageUrl,status:"complete"}),onActivated:{addListener(){}},onUpdated:{addListener(){}}},
  scripting:{executeScript:async()=>[{result:structuredClone(order)}]}
};
window.fetch=async(url,options)=>{
  if(String(url).endsWith("/health"))return new Response(JSON.stringify({status:"OK"}));
  const common={orderNumber:order.orderNumber,analysisId:"SYNTHETIC-ANALYSIS",commentAnalysis:{selectedComment:{...order.comments[0],role:"CLIENT"},contextCommentsUsed:[]}};
  if(String(url).endsWith("analyze-comments"))return new Response(JSON.stringify({...common,status:"AWAITING_DOCUMENTS",issues:[{issueType:"TYPING_ERROR",claim:"Confirm that the borrower name in TA matches the deed, and supply the deed for review.",requiredFiles:[{fileType:"DEED",reason:"Verify borrower name"},{fileType:"TYPED_REPORT",reason:"Compare TA text"}]}]}));
  if(String(url).endsWith("analyze-documents")){
    const data=JSON.parse(options.body.get("orderData"));
    if(!data.taText)throw new Error("Preview expects TA text.");
    return new Response(JSON.stringify({...common,overallDecision:"REVIEW_REQUIRED",issues:[{issueType:"TYPING_ERROR",clientClaim:"Verify borrower name",requiredDocuments:["DEED","TYPED_REPORT"],decision:"REVIEW_REQUIRED",reason:"TA text was supplied, but the deed is still needed for comparison.",evidence:[{document:"Typing Assistant text",page:null,finding:"The supplied TA text lists Synthetic Borrower.",quotedText:"Synthetic Borrower"}]}]}));
  }
  throw new Error("Preview blocked an unexpected network request.");
};
