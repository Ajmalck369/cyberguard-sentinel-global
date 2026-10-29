import {createHash} from 'node:crypto';
import {appendFile,readFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

export const hash_audit_value=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=new Set(['approved_locally','declined','expired']);
const risk_levels=new Set(['high_risk','suspicious','inconclusive']);
const verification_statuses=new Set(['verified','pending_human_approval','rejected']);

export function project_audit_event(type,result){
  if(!uuid.test(result?.run_id)) throw new Error('invalid_audit_run_id');
  if(type==='assessment'){
    if(!risk_levels.has(result.plan?.risk_level)||!verification_statuses.has(result.verification?.status)) throw new Error('invalid_audit_assessment');
    return {type,run_id:result.run_id,scenario_id:String(result.scenario_id||'').replace(/[^a-z0-9_-]/gi,'').slice(0,40),risk_level:result.plan?.risk_level,verification_status:result.verification?.status,indicator_codes:Array.isArray(result.indicator_codes)?result.indicator_codes.filter(code=>/^[a-z_]{2,40}$/.test(code)).slice(0,12):[]};
  }
  if(type==='decision'&&statuses.has(result.status)) return {type,run_id:result.run_id,status:result.status};
  throw new Error('invalid_audit_event');
}

export async function create_audit_log(file){
  if(typeof file!=='string'||!file) throw new Error('audit_file_required');
  let rows=[];
  try {const content=await readFile(file,'utf8');rows=content.trim()?content.trim().split('\n').map(line=>JSON.parse(line)):[];}
  catch(error){if(error.code!=='ENOENT') throw error;rows=[];}
  const seen=new Set();
  let previous_hash='0'.repeat(64);
  for(const [index,row] of rows.entries()){
    const {hash:row_hash,...unsigned}=row;
    if(row.sequence!==index+1||row.previous_hash!==previous_hash||row_hash!==hash_audit_value(unsigned)||!['assessment','decision'].includes(row.event?.type)||!uuid.test(row.event?.run_id)) throw new Error('audit_chain_invalid');
    const key=`${row.event.type}:${row.event.run_id}`;
    if(seen.has(key)) throw new Error('audit_duplicate_event');
    seen.add(key);previous_hash=row_hash;
  }
  let pending=Promise.resolve();
  const append=(type,result)=>{
    const event=project_audit_event(type,result);
    const key=`${type}:${event.run_id}`;
    const job=pending.then(async()=>{
      if(seen.has(key)) return {status:'already_recorded'};
      const unsigned={schema_version:1,sequence:rows.length+1,previous_hash,event};
      const row={...unsigned,hash:hash_audit_value(unsigned)};
      await mkdir(dirname(file),{recursive:true});
      await appendFile(file,JSON.stringify(row)+'\n',{encoding:'utf8',mode:0o600});
      rows.push(row);seen.add(key);previous_hash=row.hash;
      return {status:'recorded',sequence:row.sequence,hash:row.hash};
    });
    pending=job.catch(()=>{});
    return job;
  };
  return {append_assessment:result=>append('assessment',result),append_decision:(run_id,status)=>append('decision',{run_id,status}),snapshot:()=>({count:rows.length,head_hash:previous_hash})};
}
