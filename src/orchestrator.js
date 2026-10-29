import {randomUUID, createHash} from 'node:crypto';
import {assess_with_meta} from './meta.js';
import {inspect_indicators, sanitize_public_report} from './core.js';
import {verify_assessment} from './verifier.js';
import {lookup_approved_playbook,playbook_codes} from './playbooks.js';
import {assess_with_meta_tools} from './tool_loop.js';

const allowed_languages=new Set(['en','ar','hi','fr','es']);
const allowlist=new Set(playbook_codes);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function run_agent(input,{assessor=process.env.AI_MODE==='meta-tools'?assess_with_meta_tools:assess_with_meta}={}) {
  if(input?.synthetic_confirmed!==true || typeof input.message!=='string' || !input.message.trim() || input.message.length>6000) throw new Error('synthetic_data_only');
  const run_id=randomUUID();
  const trace=[];
  const record=(step,tool,status,details={})=>trace.push({sequence:trace.length+1,step,tool,status,details});
  const language=allowed_languages.has(input.language)?input.language:'en';
  const scenario_id=String(input.scenario_id||'web_demo').replace(/[^a-z0-9_-]/gi,'').slice(0,40);
  const indicators=inspect_indicators(input.message);
  record('observe','inspect_indicators','completed',{indicator_codes:indicators});
  const result=await assessor({...input,language,scenario_id});
  const {plan,verification:initial}=verify_assessment(result,indicators);
  const safe_tool_errors=new Set(['tool_limit_exceeded','disallowed_action','unsupported_evidence_reference','action_not_grounded']);
  for(const item of Array.isArray(result?.tool_history)?result.tool_history.slice(0,4):[]){
    const code=allowlist.has(item?.code)?item.code:'invalid';
    const status=['verified','blocked'].includes(item?.status)?item.status:'blocked';
    const errors=Array.isArray(item?.errors)?item.errors.filter(error=>safe_tool_errors.has(error)).slice(0,4):[];
    record('model_tool','lookup_approved_playbook',status,{action_code:code,errors});
  }
  record('reason','meta_assessment','completed',{provider:result?.mode==='meta-tools'?'meta-tools':result?.mode==='meta'?'meta':'fixture',proposed_action_codes:plan.actions.map(action=>action.code)});
  record('verify','verify_plan',initial.status,{errors:initial.errors,approval_required:initial.approval_required});
  const tools=[];
  if(initial.status!=='rejected'){
    for(const action of plan.actions){
      // The model selects from the closed action vocabulary; each call is independently checked.
      if(!allowlist.has(action.code)) continue;
      if(action.code==='submit_synthetic_report'){
        tools.push({action_code:action.code,tool:'propose_synthetic_report',status:'pending_human_approval'});
        record('act','propose_synthetic_report','pending_human_approval',{action_code:action.code});
      } else {
        const guide=lookup_approved_playbook(action.code);
        tools.push({action_code:action.code,tool:'lookup_approved_playbook',status:'completed',guidance:guide.guidance,source:guide.source});
        record('act','lookup_approved_playbook','completed',{action_code:action.code,source:guide.source});
      }
    }
  } else record('act','tool_execution','blocked',{reason:'verification_rejected'});
  const verification={...initial,executed_tools:tools.filter(x=>x.status==='completed').length};
  const sanitized=sanitize_public_report({scenario_id,language,risk_level:plan.risk_level,indicator_codes:indicators,approved_action_codes:plan.actions.filter(action=>action.code!=='submit_synthetic_report').map(action=>action.code)});
  const audit_event={id:randomUUID(),kind:'synthetic_agent_run',at:new Date().toISOString(),hash:hash({scenario_id,indicators,verification,trace})};
  return {mode:result?.mode==='meta-tools'?'meta-tools':result?.mode==='meta'?'meta':'fixture',run_id,language,scenario_id,indicator_codes:indicators,plan,verification,tool_results:tools,trace,proposed_git_report:sanitized,audit_event,note:'Synthetic-only. No agency, bank, or GitHub action executed. Approval is simulated and never automatically granted.'};
}
