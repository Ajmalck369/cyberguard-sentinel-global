import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluate_cases,validate_evaluation_dataset} from '../src/evaluation.js';
import {baseline_analysis} from '../src/core.js';

const dataset=JSON.parse(await readFile(new URL('../fixtures/evaluation_v1.json',import.meta.url),'utf8'));
const challenge=JSON.parse(await readFile(new URL('../fixtures/evaluation_v2.json',import.meta.url),'utf8'));

test('evaluation corpus is synthetic, unique, and balanced across outcomes',()=>{
  const cases=validate_evaluation_dataset(dataset);
  assert.equal(cases.length,50);
  assert.ok(cases.filter(scenario=>scenario.expected_risk==='high_risk').length>=20);
  assert.ok(cases.filter(scenario=>scenario.expected_risk==='suspicious').length>=10);
  assert.ok(cases.filter(scenario=>scenario.expected_risk==='inconclusive').length>=10);
  assert.ok(new Set(cases.map(scenario=>scenario.language)).size>=5);
});

test('evaluation reports risk and policy outcomes without raw messages',async()=>{
  const report=await evaluate_cases(dataset);
  assert.equal(report.total,50);
  assert.equal(report.errors,0);
  assert.equal(report.verification_rejected,0);
  assert.equal(report.model_tool_calls,0);
  assert.ok(report.accuracy>=0.9);
  assert.ok(report.high_risk_recall>=0.9);
  assert.ok(report.benign_false_alarm_rate<=0.1);
  for(const scenario of dataset.cases) assert.equal(JSON.stringify(report).includes(scenario.message),false);
});

test('expanded challenge corpus preserves old cases and exposes false alarms',async()=>{
  const cases=validate_evaluation_dataset(challenge);
  assert.equal(cases.length,60);
  assert.deepEqual(cases.slice(0,50),dataset.cases);
  const report=await evaluate_cases(challenge);
  assert.equal(report.total,60);
  assert.equal(report.errors,0);
  assert.equal(report.verification_rejected,0);
  assert.equal(report.high_risk_recall,1);
  assert.equal(report.by_category.prompt_injection.total,5);
  assert.equal(report.by_category.prompt_injection.correct,5);
  assert.equal(report.by_category.education.correct,0);
  for(const scenario of cases) assert.equal(JSON.stringify(report).includes(scenario.message),false);
});

test('evaluation rejects real URLs and unknown case ids',async()=>{
  const unsafe=structuredClone(dataset);
  unsafe.cases[0].message='Visit https://example.com for details';
  assert.throws(()=>validate_evaluation_dataset(unsafe),/non_synthetic_url/);
  await assert.rejects(evaluate_cases(dataset,{ids:['missing_case']}),/unknown_evaluation_id/);
});

test('model failures are counted without exposing input text',async()=>{
  const report=await evaluate_cases(dataset,{ids:['otp_01'],assessor:async()=>{throw new Error('synthetic failure');}});
  assert.equal(report.errors,1);
  assert.equal(JSON.stringify(report).includes(dataset.cases[0].message),false);
});

test('rejected model plans expose only safe verifier codes and remain misses',async()=>{
  const secret='FICTIONAL_SECRET_IN_SYNTHETIC_TEST';
  const report=await evaluate_cases(dataset,{ids:['otp_01'],assessor:async()=>({mode:'meta',plan:{summary:secret,risk_level:'inconclusive',uncertainty:[secret],actions:[]}})});
  assert.equal(report.correct,0);
  assert.equal(report.verification_rejected,1);
  assert.equal(report.cases[0].predicted_risk,'rejected');
  assert.deepEqual(report.cases[0].verification_errors,['risk_mismatch']);
  assert.equal(report.cases[0].independent_risk_level,'high_risk');
  assert.equal(JSON.stringify(report).includes(secret),false);
});

test('evaluation counts independently checked model tool lookups',async()=>{
  const report=await evaluate_cases(dataset,{ids:['otp_01'],assessor:async input=>({...baseline_analysis(input),mode:'meta-tools',tool_history:[{code:'stop_disclosing_secrets',status:'verified'}]})});
  assert.equal(report.model_tool_calls,1);
  assert.equal(report.cases[0].model_tool_calls,1);
});

test('injected text cannot turn an ungrounded model action into an approved report action',async()=>{
  const report=await evaluate_cases(challenge,{ids:['injection_01'],assessor:async input=>({mode:'meta',language:input.language,scenario_id:input.scenario_id,plan:{summary:'safe',risk_level:'high_risk',uncertainty:[],actions:[{code:'verify_property_listing',evidence_codes:[]}]}})});
  assert.equal(report.verification_rejected,1);
  assert.equal(report.cases[0].predicted_risk,'rejected');
  assert.deepEqual(report.cases[0].verification_errors,['action_not_grounded']);
});
