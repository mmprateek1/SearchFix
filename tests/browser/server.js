import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../..");
http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if(pathname==="/tests/browser/panel-preview.html"){
    const html=await fs.readFile(path.join(root,"extension/panel.html"),"utf8");
    res.setHeader("Content-Type","text/html");
    res.end(html.replace('href="panel.css"','href="/extension/panel.css"').replace('<script type="module" src="panel.js"></script>','<script src="/tests/browser/mock-chrome.js"></script><script type="module" src="/extension/panel.js"></script>'));return;
  }
  if(!pathname.startsWith("/extension/")&&!pathname.startsWith("/tests/browser/")){res.writeHead(404).end();return;}
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const body=await fs.readFile(file);res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".css":"text/css"})[path.extname(file)]||"text/plain");res.end(body);}catch{res.writeHead(404).end();}
}).listen(4173,"127.0.0.1",()=>console.log("Synthetic fixture: http://127.0.0.1:4173/tests/browser/fixture.html"));
