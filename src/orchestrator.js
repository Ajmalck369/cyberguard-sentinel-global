import {randomUUID, createHash} from 'node:crypto';
import {assess_with_meta} from './meta.js';
import {inspect_indicators, sanitize_public_report} from './core.js';
import {verify_assessment} from './verifier.js';

// Demo-only approved knowledge: not a live government directory.
const playbooks = Object.freeze({
  stop_disclosing_secrets:{source:'synthetic_playbook_v1',guidance:'Do not share OTPs, PINs, passwords, or recovery codes.'},
  contact_verified_provider:{source:'synthetic_playbook_v1',guidance:'Contact the provider through its independently verified app or website.'},
  preserve_evidence:{source:'synthetic_playbook_v1',guidance:'Keep the original message and relevant records; do not forward private evidence publicly.'},
  review_account_access:{source:'synthetic_playbook_v1',guidance:'Review security activity through the provider’s official application.'},
  avoid_untrusted_links:{source:'synthetic_playbook_v2',guidance:'Do not use the message link. Open a previously verified app or type the known official address.'},
  verify_property_listing:{source:'synthetic_playbook_v2',guidance:'Verify the listing, agent, and property through independent trusted records before paying any deposit.'},
  avoid_untrusted_attachments:{source:'synthetic_playbook_v2',guidance:'Do not open unexpected attachments, download files, or enable macros from the message.'},
  submit_synthetic_report:{source:'synthetic_playbook_v1',guidance:'Draft a demonstration-only report, pending explicit review.'}
});
const allowed_languages=new Set(['en','ar','hi','fr','es']);
const allowlist=new Set(Object.keys(playbooks));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function run_agent(input,{assessor=assess_with_meta}={}) {
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
  record('reason','meta_assessment','completed',{provider:result?.mode==='meta'?'meta':'fixture',proposed_action_codes:plan.actions.map(action=>action.code)});
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
        tools.push({action_code:action.code,tool:'lookup_approved_playbook',status:'completed',guidance:playbooks[action.code].guidance,source:playbooks[action.code].source});
        record('act','lookup_approved_playbook','completed',{action_code:action.code,source:playbooks[action.code].source});
      }
    }
  } else record('act','tool_execution','blocked',{reason:'verification_rejected'});
  const verification={...initial,executed_tools:tools.filter(x=>x.status==='completed').length};
  const sanitized=sanitize_public_report({scenario_id,language,risk_level:plan.risk_level,indicator_codes:indicators,approved_action_codes:plan.actions.filter(action=>action.code!=='submit_synthetic_report').map(action=>action.code)});
  const audit_event={id:randomUUID(),kind:'synthetic_agent_run',at:new Date().toISOString(),hash:hash({scenario_id,indicators,verification,trace})};
  return {mode:result?.mode==='meta'?'meta':'fixture',run_id,language,scenario_id,indicator_codes:indicators,plan,verification,tool_results:tools,trace,proposed_git_report:sanitized,audit_event,note:'Synthetic-only. No agency, bank, or GitHub action executed. Approval is simulated and never automatically granted.'};
}
