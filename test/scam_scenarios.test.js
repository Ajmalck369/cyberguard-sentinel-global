import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline_analysis,inspect_indicators,sanitize_public_report} from '../src/core.js';
import {run_agent} from '../src/orchestrator.js';
import {independent_risk} from '../src/verifier.js';

const cases=[
  {name:'bank OTP',message:'URGENT: Your bank account is suspended. Share your OTP immediately to verify.',expected:['credential_request','urgent_pressure']},
  {name:'phishing link',message:'This is your bank. Verify now at https://example.invalid/login or your account will close today.',expected:['phishing_link','sender_impersonation_claim']},
  {name:'rental deposit',message:'Flat for rent below market. Owner abroad. Pay the deposit today before viewing.',expected:['rental_deposit_pressure','no_viewing_pressure']},
  {name:'card compromise claim',message:'Your card was cloned. Call the number in this email immediately to secure your account.',expected:['card_compromise_claim','urgent_pressure']},
  {name:'claimed bank email',message:'This is your bank security team. Click the link to verify your account today.',expected:['sender_impersonation_claim','phishing_link']},
  {name:'ransomware-themed email',message:'Open the attached invoice immediately or your files will be encrypted and a ransom demanded.',expected:['attachment_lure','ransomware_threat']}
];

for(const scenario of cases) test(`synthetic ${scenario.name} stays within verified guidance`,async()=>{
  const indicator_codes=inspect_indicators(scenario.message);
  for(const code of scenario.expected) assert.ok(indicator_codes.includes(code),code);
  const input={message:scenario.message,language:'en',scenario_id:'synthetic_demo',synthetic_confirmed:true};
  const result=await run_agent(input,{assessor:async value=>baseline_analysis(value)});
  assert.equal(independent_risk(indicator_codes),'high_risk');
  assert.equal(result.verification.status,'pending_human_approval');
  assert.equal(result.plan.risk_level,'high_risk');
  assert.equal(JSON.stringify(result).includes(scenario.message),false);
  assert.ok(result.tool_results.every(item=>item.tool==='lookup_approved_playbook'||item.tool==='propose_synthetic_report'));
});

test('a card claim or ransomware mention alone does not prove an incident',()=>{
  assert.equal(independent_risk(inspect_indicators('My card was cloned.')),'suspicious');
  assert.equal(independent_risk(inspect_indicators('This is a ransomware training exercise.')),'suspicious');
  assert.equal(independent_risk(inspect_indicators('This flat is for rent.')),'inconclusive');
});

test('synthetic report exports only known indicator codes',()=>{
  const report=sanitize_public_report({scenario_id:'demo',indicator_codes:['phishing_link','unknown_private_code','ransomware_threat']});
  assert.deepEqual(report.indicator_codes,['phishing_link','ransomware_threat']);
  assert.equal(report.evaluation_version,'v2');
});
