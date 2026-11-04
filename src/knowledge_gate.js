import {isDeepStrictEqual} from 'node:util';
import {sanitize_public_report} from './core.js';

// This gates approved synthetic threat-intelligence publication. It does not train model weights.
const legal_statuses=new Set(['verified','pending_human_approval']);
const safe_id=/^[a-z0-9_-]{3,64}$/i;
export function review_knowledge_candidate({candidate,reviewer,baseline,candidate_result,minimum_cases=40}={}) {
  const errors=[];
  if(candidate?.is_synthetic!==true || candidate?.report_kind!=='synthetic_threat_observation' ||
     !isDeepStrictEqual(candidate,sanitize_public_report(candidate))) errors.push('sanitized_synthetic_candidate_required');
  if(typeof reviewer!=='string'||!safe_id.test(reviewer)) errors.push('human_reviewer_required');
  for(const [name,report] of [['baseline',baseline],['candidate',candidate_result]]) {
    if(!report || !Number.isInteger(report.total) || report.total<minimum_cases ||
       !Number.isInteger(report.correct)||report.correct<0||report.correct>report.total ||
       !Number.isInteger(report.errors)||report.errors<0||
       !Number.isInteger(report.verification_rejected)||report.verification_rejected<0 ||
       typeof report.benign_false_alarm_rate!=='number' ||
       typeof report.high_risk_recall!=='number' ||
       report.benign_false_alarm_rate<0||report.benign_false_alarm_rate>1 ||
       report.high_risk_recall<0||report.high_risk_recall>1) errors.push(name+'_evaluation_invalid');
  }
  if(baseline?.total!==candidate_result?.total) errors.push('evaluation_corpus_mismatch');
  if(Number.isInteger(baseline?.correct)&&Number.isInteger(candidate_result?.correct)&&candidate_result.correct<baseline.correct) errors.push('accuracy_regression');
  if(typeof baseline?.benign_false_alarm_rate==='number'&&typeof candidate_result?.benign_false_alarm_rate==='number'&&
     candidate_result.benign_false_alarm_rate>baseline.benign_false_alarm_rate) errors.push('false_alarm_regression');
  if(typeof baseline?.high_risk_recall==='number'&&typeof candidate_result?.high_risk_recall==='number'&&
     candidate_result.high_risk_recall<baseline.high_risk_recall) errors.push('high_risk_recall_regression');
  if(Number.isInteger(candidate_result?.errors)&&candidate_result.errors>0) errors.push('evaluation_errors');
  if(Number.isInteger(baseline?.verification_rejected)&&Number.isInteger(candidate_result?.verification_rejected)&&
     candidate_result.verification_rejected>baseline.verification_rejected) errors.push('verifier_rejection_regression');
  if(candidate_result?.cases?.some(row=>row?.verification_status && !legal_statuses.has(row.verification_status))) errors.push('unverified_candidate_case');
  return {
    status:errors.length?'blocked':'eligible_for_human_promotion',
    errors:[...new Set(errors)],
    reviewer:errors.length?null:reviewer,
    evaluated_cases:Number.isInteger(candidate_result?.total)?candidate_result.total:0,
    note:'Review of synthetic evaluation evidence only. No automatic merge, production release, or model-weight training.'
  };
}
