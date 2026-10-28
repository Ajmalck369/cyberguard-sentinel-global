import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluate_cases,validate_evaluation_dataset} from '../src/evaluation.js';

const dataset=JSON.parse(await readFile(new URL('../fixtures/evaluation_v1.json',import.meta.url),'utf8'));

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
  assert.ok(report.accuracy>=0.9);
  assert.ok(report.high_risk_recall>=0.9);
  assert.ok(report.benign_false_alarm_rate<=0.1);
  for(const scenario of dataset.cases) assert.equal(JSON.stringify(report).includes(scenario.message),false);
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
