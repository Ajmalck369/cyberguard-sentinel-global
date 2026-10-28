import { verify_plan } from './core.js';

const risk_levels=new Set(['low_observed_risk','suspicious','high_risk','inconclusive']);
const plan_fields=new Set(['summary','risk_level','uncertainty','actions']);
const action_fields=new Set(['code','evidence_codes']);

export function independent_risk(indicator_codes) {
  const has=code=>indicator_codes.includes(code);
  if(has('credential_request')&&(has('urgent_pressure')||has('phishing_link')) || has('rental_deposit_pressure')&&(has('urgent_pressure')||has('no_viewing_pressure')) || has('ransomware_threat')&&(has('attachment_lure')||has('urgent_pressure')) || has('card_compromise_claim')&&has('urgent_pressure') || has('phishing_link')&&has('sender_impersonation_claim')) return 'high_risk';
  return indicator_codes.length?'suspicious':'inconclusive';
}

export function verify_assessment(assessment, indicator_codes) {
  const plan=assessment?.plan;
  const errors=[];
  if(!plan || typeof plan!=='object' || Array.isArray(plan)) errors.push('invalid_plan');
  else {
    if(Object.keys(plan).some(field=>!plan_fields.has(field))) errors.push('unexpected_plan_field');
    if(typeof plan.summary!=='string' || plan.summary.length>500) errors.push('invalid_summary');
    if(!Array.isArray(plan.uncertainty) || plan.uncertainty.length>8 || plan.uncertainty.some(value=>typeof value!=='string' || value.length>200)) errors.push('invalid_uncertainty');
    if(!risk_levels.has(plan.risk_level)) errors.push('invalid_risk_level');
    if(plan.risk_level!==independent_risk(indicator_codes)) errors.push('risk_mismatch');
    if(!Array.isArray(plan.actions) || plan.actions.length>8 || plan.actions.some(action=>!action || typeof action!=='object' || Array.isArray(action) || Object.keys(action).some(field=>!action_fields.has(field)) || !Array.isArray(action.evidence_codes) || action.evidence_codes.length>12 || action.evidence_codes.some(code=>typeof code!=='string'))) errors.push('invalid_actions');
  }
  const checked=Array.isArray(plan?.actions)?verify_plan(plan,{indicator_codes}):{errors:['missing_actions'],approval_required:[]};
  errors.push(...checked.errors);
  const unique_errors=[...new Set(errors)];
  const status=unique_errors.length?'rejected':checked.status;
  const actions=status==='rejected'?[]:plan.actions.map(action=>({code:action.code,evidence_codes:[...action.evidence_codes]}));
  return {
    plan:{
      summary:status==='rejected'?'Assessment rejected by independent verifier.':'Synthetic assessment based on observed indicators.',
      risk_level:status==='rejected'?'inconclusive':plan.risk_level,
      actions,
      uncertainty:status==='rejected'?['model_plan_not_verified']:['sender_identity_not_verified']
    },
    verification:{status,errors:unique_errors,approval_required:status==='rejected'?[]:checked.approval_required,independent_risk_level:independent_risk(indicator_codes)}
  };
}
