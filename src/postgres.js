import pg from 'pg';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {project_audit_event,hash_audit_value} from './audit.js';
import {sanitize_public_report} from './core.js';
import {prepare_synthetic_referral} from './referral.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lifetime_ms=15*60*1000;
const token_hash=token=>createHash('sha256').update(token).digest('hex');

async function append_audit(client,type,result){
  await client.query('SELECT pg_advisory_xact_lock($1)',[76190422]);
  const latest=await client.query('SELECT sequence, entry_hash FROM audit_events ORDER BY sequence DESC LIMIT 1');
  const sequence=latest.rowCount?Number(latest.rows[0].sequence)+1:1;
  const previous_hash=latest.rowCount?latest.rows[0].entry_hash:'0'.repeat(64);
  const event=project_audit_event(type,result);
  const unsigned={schema_version:1,sequence,previous_hash,event};
  const entry_hash=hash_audit_value(unsigned);
  await client.query('INSERT INTO audit_events(sequence,run_id,event_type,event_json,previous_hash,entry_hash) VALUES ($1,$2,$3,$4,$5,$6)',[sequence,event.run_id,type,JSON.stringify(event),previous_hash,entry_hash]);
  return {sequence,entry_hash};
}

export async function create_postgres_store({connectionString,pool,now=()=>new Date()}={}){
  if(!pool&&!connectionString) throw new Error('database_connection_required');
  const own_pool=!pool;
  const database=pool??new pg.Pool({connectionString,max:5});
  const verify_audit=async()=>{
    const rows=(await database.query('SELECT sequence,event_json,previous_hash,entry_hash FROM audit_events ORDER BY sequence')).rows;
    let previous_hash='0'.repeat(64);
    for(const [index,row] of rows.entries()){
      const event=JSON.parse(row.event_json);
      const sequence=Number(row.sequence);
      const expected=hash_audit_value({schema_version:1,sequence,previous_hash,event});
      if(sequence!==index+1||row.previous_hash!==previous_hash||row.entry_hash!==expected) throw new Error('audit_chain_invalid');
      previous_hash=row.entry_hash;
    }
    return {count:rows.length,head_hash:previous_hash};
  };
  try {await verify_audit();} catch(error){if(own_pool) await database.end();throw error;}

  return {
    async create(result,country_code='GLOBAL'){
      if(!uuid.test(result?.run_id)||!isDeepStrictEqual(result.proposed_git_report,sanitize_public_report(result.proposed_git_report))) throw new Error('sanitized_assessment_required');
      const pending=result.verification?.status==='pending_human_approval'&&result.verification.approval_required?.includes('submit_synthetic_report');
      const token=pending?randomBytes(32).toString('hex'):null;
      const expires_at=pending?new Date(now().getTime()+lifetime_ms):null;
      const client=await database.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO assessments(run_id,scenario_id,language,mode,risk_level,verification_status,indicator_codes,report,country_code,approval_status,approval_token_hash,approval_expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12)',[
          result.run_id,result.scenario_id,result.language,result.mode,result.plan.risk_level,result.verification.status,JSON.stringify(result.indicator_codes),JSON.stringify(result.proposed_git_report),country_code,pending?'pending':'none',token?token_hash(token):null,expires_at
        ]);
        await append_audit(client,'assessment',result);
        await client.query('COMMIT');
        return pending?{status:'pending',token,expires_at:expires_at.toISOString()}:null;
      } catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally {client.release();}
    },
    async decide(run_id,token,decision){
      if(!uuid.test(run_id)) return {status:'not_found'};
      const client=await database.connect();
      try {
        await client.query('BEGIN');
        const found=await client.query('SELECT approval_status,approval_token_hash,approval_expires_at,report,country_code FROM assessments WHERE run_id=$1 FOR UPDATE',[run_id]);
        if(!found.rowCount){await client.query('ROLLBACK');return {status:'not_found'};}
        const row=found.rows[0];
        if(row.approval_status!=='pending'){await client.query('ROLLBACK');return {status:row.approval_status==='expired'?'expired':row.approval_status==='none'?'not_found':'already_decided'};}
        if(now().getTime()>=new Date(row.approval_expires_at).getTime()){
          await client.query("UPDATE assessments SET approval_status='expired',approval_token_hash=NULL,decision_at=$2 WHERE run_id=$1",[run_id,now()]);
          await append_audit(client,'decision',{run_id,status:'expired'});
          await client.query('COMMIT');
          return {status:'expired'};
        }
        if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(token_hash(token),'hex'),Buffer.from(row.approval_token_hash,'hex'))){
          await client.query('ROLLBACK');return {status:'invalid_token'};
        }
        if(decision!=='approve'&&decision!=='decline'){await client.query('ROLLBACK');return {status:'invalid_decision'};}
        const status=decision==='approve'?'approved_locally':'declined';
        const referral=decision==='approve'?prepare_synthetic_referral(row.report,row.country_code,{now}):undefined;
        await client.query('UPDATE assessments SET approval_status=$2,approval_token_hash=NULL,decision_at=$3,referral=$4::jsonb WHERE run_id=$1',[run_id,status,now(),referral?JSON.stringify(referral):null]);
        await append_audit(client,'decision',{run_id,status});
        await client.query('COMMIT');
        return {status,referral,note:'Local synthetic demo decision only. No GitHub, agency, or bank submission occurred.'};
      } catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally {client.release();}
    },
    verify_audit,
    close:()=>own_pool?database.end():Promise.resolve()
  };
}
