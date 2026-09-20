import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT=process.env.PORT||8787;
const ROOT=new URL('.',import.meta.url).pathname;
const API_KEY=process.env.OPENAI_API_KEY;
const MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};

function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj))}
async function body(req){let chunks=[];for await(const c of req)chunks.push(c);return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='POST'&&req.url==='/api/ai'){
      if(!API_KEY)return json(res,503,{error:'OPENAI_API_KEY mangler på serveren'});
      const {question,context}=await body(req);
      const prompt=`Du er finansieringsrådgiver for et småbruk i Rauma, Møre og Romsdal som utvikles til kulturarena, kreativ produksjonsgård, festivalområde, frivillig møteplass og mulig landbruksbasert næring. Bruk KUN fakta i konteksten for prosjektspesifikke påstander. Ikke dikt frister eller regler. Marker alt som må verifiseres. Svar på norsk, konkret og søknadsorientert.\n\nKONTEKST:\n${JSON.stringify(context)}\n\nBRUKERSPØRSMÅL:\n${question}`;
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input:prompt})});
      const data=await r.json();
      if(!r.ok)return json(res,r.status,{error:data.error?.message||'API-feil'});
      const text=data.output_text||data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'';
      return json(res,200,{text});
    }
    let url=req.url==='/'?'/index.html':req.url.split('?')[0];
    let safe=normalize(url).replace(/^([.][.][/\\])+/, '');
    let path=join(ROOT,safe);
    await stat(path);let data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(data);
  }catch(e){res.writeHead(404);res.end('Not found')}
});
server.listen(PORT,()=>console.log(`Småbruk Støttehub: http://localhost:${PORT}`));
