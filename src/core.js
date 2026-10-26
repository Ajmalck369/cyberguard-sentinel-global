import { createHash, randomUUID } from 'node:crypto';

const suspicious_patterns = [
  { id:'credential_request', pattern:/\b(otp|one.time password|password|pin|رمز التحقق|كلمة المرور|पासवर्ड)\b/i },
  { id:'urgent_pressure', pattern:/\b(urgent|immediately|account suspended|verify now|فوراً|عاجل|तुरंत)\b/i },
  { id:'financial_request', pattern:/\b(transfer|wire|payment|bank|تحويل|بنك|भुगतान)\b/i }
];
export const actions = Object.freeze({
  stop_disclosing_secrets:'Do not share passwords, OTPs, PINs or recovery codes.',
  contact_verified_provider:'Contact the organization using a previously verified official channel.',
  preserve_evidence:'Preserve the original message and relevant transaction records securely.',
  review_account_access:'Use the official app or site to review account security and sessions.',
  submit_synthetic_report:'Create a synthetic demonstration report for human review.'
});
export const policy = Object.freeze({
  forbidden_action_codes:['freeze_real_account','contact_real_police','publish_raw_report','identify_suspect','send_victim_data_to_git'],
  human_gated_action_codes:['submit_synthetic_report'],
  safe_action_codes:Object.keys(actions)
});

export function inspect_indicators(input) {
  const text=String(input||'');
  return suspicious_patterns.filter(p=>p.pattern.test(text)).map(p=>p.id);
}
export function sanitize_public_report(report) {
  // Strict projection: never include original text, evidence, names, emails, URLs or phone numbers.
  return {
    schema_version:1,
    report_kind:'synthetic_threat_observation',
    is_synthetic:true,
    language: ['en','ar','hi','fr','es'].includes(report.language)?report.language:'other',
    scenario_id: String(report.scenario_id||'unlabeled').replace(/[^a-z0-9_\-]/gi,'').slice(0,40),
    risk_level:['low_observed_risk','suspicious','high_risk','inconclusive'].includes(report.risk_level)?report.risk_level:'inconclusive',
    indicator_codes:Array.isArray(report.indicator_codes)?report.indicator_codes.filter(x=>/^[a-z_]{1,50}$/.test(x)).slice(0,12):[],
    approved_action_codes:Array.isArray(report.approved_action_codes)?report.approved_action_codes.filter(x=>policy.safe_action_codes.includes(x)).slice(0,10):[],
    evaluation_version:'v1'
  };
}
export function verify_plan(plan, context={}) {
  const errors=[];
  if(!Array.isArray(plan?.actions)) errors.push('missing_actions');
  const observed=new Set(context.indicator_codes||[]);
  for(const item of plan?.actions||[]) {
    if(!item || typeof item.code!=='string' || !policy.safe_action_codes.includes(item.code)) errors.push('disallowed_action');
    if(!Array.isArray(item?.evidence_codes) || item.evidence_codes.some(c=>!observed.has(c))) errors.push('unsupported_evidence_reference');
  }
  const approvals=(plan?.actions||[]).filter(item=>policy.human_gated_action_codes.includes(item?.code)).map(item=>item.code);
  return { status:errors.length?'rejected':approvals.length?'pending_human_approval':'verified', errors:[...new Set(errors)], approval_required:approvals };
}
export function baseline_analysis({message,language='en',scenario_id='demo'}) {
  const indicator_codes=inspect_indicators(message);
  const risk_level=indicator_codes.includes('credential_request')&&indicator_codes.includes('urgent_pressure')?'high_risk':indicator_codes.length?'suspicious':'inconclusive';
  const proposed_codes=risk_level==='inconclusive'?['contact_verified_provider']:['stop_disclosing_secrets','contact_verified_provider','preserve_evidence','submit_synthetic_report'];
  const plan={ summary:'Synthetic demonstration assessment; not a legal determination.',risk_level,actions:proposed_codes.map(code=>({code,evidence_codes:indicator_codes.slice(0,1)})),uncertainty:['sender_identity_not_verified'] };
  return {mode:'fixture',scenario_id,language,indicator_codes,plan};
}
export function event_record(kind, contents) {
  return {id:randomUUID(),kind,at:new Date().toISOString(),hash:createHash('sha256').update(JSON.stringify(contents)).digest('hex')};
}
