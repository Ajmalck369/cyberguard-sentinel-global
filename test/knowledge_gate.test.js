import test from 'node:test';
import assert from 'node:assert/strict';
import {review_knowledge_candidate} from '../src/knowledge_gate.js';
import {sanitize_public_report} from '../src/core.js';

const candidate=sanitize_public_report({
  scenario_id:'synthetic_otp', language:'en', risk_level:'high_risk',
  indicator_codes:['credential_request'],approved_action_codes:['stop_disclosing_secrets']
});
const baseline={total:60,correct:56,errors:0,verification_rejected:0,benign_false_alarm_rate:0.1,high_risk_recall:0.9};
const improved={...baseline,correct:57,benign_false_alarm_rate:0.05};
const review=(overrides={})=>review_knowledge_candidate({
  candidate,reviewer:'human_reviewer',baseline,candidate_result:improved,...overrides
});

test('eligible candidate requires sanitized synthetic data and human reviewer',()=>{
  assert.equal(review().status,'eligible_for_human_promotion');
  assert.equal(review({candidate:{...candidate,message:'private'}}).status,'blocked');
  assert.equal(review({reviewer:''}).status,'blocked');
  assert.equal(review({candidate:{...candidate,is_synthetic:false}}).status,'blocked');
});
test('block degraded accuracy, recall and increased false alarms',()=>{
  assert.ok(review({candidate_result:{...improved,correct:55}}).errors.includes('accuracy_regression'));
  assert.ok(review({candidate_result:{...improved,high_risk_recall:0.8}}).errors.includes('high_risk_recall_regression'));
  assert.ok(review({candidate_result:{...improved,benign_false_alarm_rate:0.2}}).errors.includes('false_alarm_regression'));
});
test('require comparable complete evaluations without verifier errors',()=>{
  assert.ok(review({candidate_result:{...improved,total:39}}).errors.includes('candidate_evaluation_invalid'));
  assert.ok(review({candidate_result:{...improved,errors:1}}).errors.includes('evaluation_errors'));
  assert.ok(review({candidate_result:{...improved,total:59}}).errors.includes('evaluation_corpus_mismatch'));
  assert.ok(review({candidate_result:{...improved,verification_rejected:1}}).errors.includes('verifier_rejection_regression'));
});
test('deny unverified case status and unsupported content',()=>{
  const result=review({candidate_result:{...improved,cases:[{verification_status:'rejected'}]}});
  assert.ok(result.errors.includes('unverified_candidate_case'));
  assert.equal(result.status,'blocked');
});
