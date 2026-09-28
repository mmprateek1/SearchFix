import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../..");
http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if (pathname === '/AttachmentViewer.aspx' && new URL(req.url,'http://localhost').searchParams.get('PublicAttachmentId') === 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') {
    res.writeHead(302,{Location:'/attachment.ashp?publicAttachmentId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}).end();return;
  }
  if (pathname === '/attachment.ashp' && new URL(req.url,'http://localhost').searchParams.get('publicAttachmentId') === 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') {
    if (!req.headers.cookie?.split(';').some(cookie=>cookie.trim()==='searchfix_fixture_session=demo')) {res.writeHead(401).end('Synthetic sign-in required');return;}
    res.setHeader('Content-Type','application/pdf');res.end('%PDF-1.4\nSynthetic viewer PDF');return;
  }
  if(pathname==='/tests/browser/manager-fixture.html')res.setHeader('Set-Cookie','searchfix_fixture_session=demo; Path=/; HttpOnly; SameSite=Strict');
  if(pathname==="/tests/browser/panel-preview.html"){
    const html=await fs.readFile(path.join(root,"extension/panel.html"),"utf8");
    res.setHeader("Content-Type","text/html");
    res.end(html.replace('href="panel.css"','href="/extension/panel.css"').replace('<script type="module" src="panel.js"></script>','<script type="module" src="/tests/browser/mock-chrome.js"></script>'));return;
  }
  if(!pathname.startsWith("/extension/")&&!pathname.startsWith("/tests/browser/")){res.writeHead(404).end();return;}
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const body=await fs.readFile(file);res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".css":"text/css"})[path.extname(file)]||"text/plain");res.end(body);}catch{res.writeHead(404).end();}
}).listen(4173,"127.0.0.1",()=>console.log("Synthetic fixture: http://127.0.0.1:4173/tests/browser/fixture.html"));
