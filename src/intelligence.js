import {createHmac,timingSafeEqual} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {sanitize_public_report} from './core.js';

const sha=/^[0-9a-f]{40}$/i;
const repo=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function verify_github_signature(raw,signature,secret){
  if(!Buffer.isBuffer(raw)||typeof secret!=='string'||secret.length<32||typeof signature!=='string'||!/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const expected=createHmac('sha256',secret).update(raw).digest();
  const actual=Buffer.from(signature.slice(7),'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export function create_intelligence_store({repository_full_name,secret}={}){
  if(!repo.test(repository_full_name||'')||typeof secret!=='string'||secret.length<32) throw new Error('intelligence_configuration_required');
  const pending=new Map();
  const promoted=[];
  return {
    stage({raw,signature,event_name}){
      if(!verify_github_signature(raw,signature,secret)) throw new Error('invalid_webhook_signature');
      if(event_name!=='pull_request') throw new Error('unsupported_webhook_event');
      let event;
      try {event=JSON.parse(raw.toString('utf8'));} catch {throw new Error('invalid_webhook_json');}
      const pr=event.pull_request;
      if(event.action!=='closed'||event.repository?.full_name!==repository_full_name||pr?.merged!==true||pr?.base?.ref!=='main'||pr?.head?.repo?.full_name!==repository_full_name||!Number.isSafeInteger(pr.number)||pr.number<1||!sha.test(pr.merge_commit_sha||'')) throw new Error('untrusted_intelligence_provenance');
      const id=pr.merge_commit_sha.toLowerCase();
      if(pending.has(id)||promoted.some(item=>item.source_commit_sha===id)) return {status:'already_staged',id};
      pending.set(id,{id,pr_number:pr.number,source_url:`https://github.com/${repository_full_name}/pull/${pr.number}`});
      return {status:'pending_human_review',id,pr_number:pr.number,source_url:`https://github.com/${repository_full_name}/pull/${pr.number}`};
    },
    promote({id,report,reviewer}){
      const staged=pending.get(id);
      if(!staged) throw new Error('intelligence_not_staged');
      if(typeof reviewer!=='string'||!/^[a-z0-9_-]{3,40}$/i.test(reviewer)) throw new Error('reviewer_required');
      if(report?.schema_version!==1||report?.report_kind!=='synthetic_threat_observation'||report?.is_synthetic!==true||!isDeepStrictEqual(report,sanitize_public_report(report))) throw new Error('sanitized_synthetic_report_required');
      const version=promoted.length+1;
      const record={version,source_commit_sha:id,source_pr_number:staged.pr_number,source_url:staged.source_url,reviewer,report:structuredClone(report)};
      promoted.push(record);pending.delete(id);
      return structuredClone(record);
    },
    reject(id){return pending.delete(id);},
    snapshot(){return {pending:pending.size,promoted:promoted.map(item=>structuredClone(item))};}
  };
}
