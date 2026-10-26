import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {run_agent} from './orchestrator.js';

const port=Number(process.env.PORT||8099);
const public_dir=fileURLToPath(new URL('../public/',import.meta.url));
const send=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));};
const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/'){
    const html=await readFile(`${public_dir}/index.html`,'utf8');
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",'x-content-type-options':'nosniff'});res.end(html);return;
  }
  if(req.method==='GET'&&(req.url==='/styles.css'||req.url==='/app.js')){
    const is_css=req.url==='/styles.css';
    const asset=await readFile(`${public_dir}/${is_css?'styles.css':'app.js'}`,'utf8');
    res.writeHead(200,{'content-type':is_css?'text/css; charset=utf-8':'text/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'});
    res.end(asset);return;
  }
  if(req.method==='GET'&&req.url==='/health') return send(res,200,{ok:true,ai_mode:process.env.AI_MODE||'fixture',synthetic_only:true});
  if(req.method!=='POST'||req.url!=='/api/v1/synthetic_assessments') return send(res,404,{error:'not_found'});
  try{
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000) return send(res,413,{error:'payload_too_large'});}
    const body=JSON.parse(raw);
    if(body?.synthetic_confirmed!==true || typeof body.message!=='string' || !body.message.trim() || body.message.length>6000) return send(res,400,{error:'synthetic_data_only'});
    const result=await run_agent(body);
    return send(res,200,result);
  }catch(error){return send(res,502,{error:'assessment_failed',detail:String(error.message||error).slice(0,120)});}
});
server.listen(port,()=>console.log(`CyberGuard Sentinel synthetic demo on http://localhost:${port}`));
