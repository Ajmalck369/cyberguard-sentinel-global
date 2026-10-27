import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {create_approval_store} from './approval.js';
import {run_agent} from './orchestrator.js';
import {country_codes} from './referral.js';

const public_dir=fileURLToPath(new URL('../public/',import.meta.url));
const approval_path=/^\/api\/v1\/synthetic_assessments\/([0-9a-f-]{36})\/approval$/;
const send=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));};

export function create_server({assessor}={}) {
  const approvals=create_approval_store();
  return http.createServer(async(req,res)=>{
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
    const approval_match=req.url?.match(approval_path);
    if(req.method!=='POST'||(req.url!=='/api/v1/synthetic_assessments'&&!approval_match)) return send(res,404,{error:'not_found'});
    const host=req.headers.host;
    if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host||'') || (req.headers.origin && req.headers.origin!==`http://${host}`)) return send(res,403,{error:'local_origin_required'});
    if(!req.headers['content-type']?.startsWith('application/json')) return send(res,415,{error:'json_required'});
    try {
      let raw='';
      for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000) return send(res,413,{error:'payload_too_large'});}
      const body=JSON.parse(raw);
      if(approval_match){
        if(body?.synthetic_confirmed!==true || body?.decision!=='approve'&&body?.decision!=='decline') return send(res,400,{error:'explicit_decision_required'});
        const decision=approvals.decide(approval_match[1],body.token,body.decision);
        const status=decision.status==='not_found'?404:decision.status==='expired'||decision.status==='already_decided'?409:decision.status==='invalid_token'?403:200;
        return send(res,status,decision);
      }
      if(body?.synthetic_confirmed!==true || typeof body.message!=='string' || !body.message.trim() || body.message.length>6000) return send(res,400,{error:'synthetic_data_only'});
      const country_code=body.country_code??'GLOBAL';
      if(!country_codes.includes(country_code)) return send(res,400,{error:'unsupported_country_code'});
      const result=await run_agent(body,{assessor});
      const approval=approvals.create(result,country_code);
      return send(res,200,{...result,approval});
    }catch(error){return send(res,502,{error:'assessment_failed',detail:String(error.message||error).slice(0,120)});}
  });
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||8099);
  create_server().listen(port,'127.0.0.1',()=>console.log(`CyberGuard Sentinel synthetic demo on http://127.0.0.1:${port}`));
}
