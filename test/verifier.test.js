import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline_analysis} from '../src/core.js';
import {run_agent} from '../src/orchestrator.js';
import {independent_risk,verify_assessment} from '../src/verifier.js';

const input={message:'URGENT share OTP now',language:'en',scenario_id:'verification_demo',synthetic_confirmed:true};
const indicators=['credential_request','urgent_pressure'];

test('independent risk follows observed indicators',()=>{
  assert.equal(independent_risk(indicators),'high_risk');
  assert.equal(independent_risk(['financial_request']),'suspicious');
  assert.equal(independent_risk([]),'inconclusive');
});

test('rejects model risk that disagrees with observed indicators',()=>{
  const assessment=baseline_analysis(input);
  assessment.plan.risk_level='low_observed_risk';
  const result=verify_assessment(assessment,indicators);
  assert.equal(result.verification.status,'rejected');
  assert.ok(result.verification.errors.includes('risk_mismatch'));
  assert.deepEqual(result.plan.actions,[]);
});

test('rejects malformed and ungrounded actions without executing tools',async()=>{
  const assessor=async()=>({mode:'meta',plan:{summary:'claim',risk_level:'high_risk',uncertainty:[],actions:[{code:'contact_verified_provider',evidence_codes:['unobserved']}]}});
  const result=await run_agent(input,{assessor});
  assert.equal(result.verification.status,'rejected');
  assert.ok(result.verification.errors.includes('unsupported_evidence_reference'));
  assert.deepEqual(result.tool_results,[]);
  assert.deepEqual(result.proposed_git_report.approved_action_codes,[]);
  assert.equal(verify_assessment({plan:{actions:'invalid'}},indicators).verification.status,'rejected');
});

test('never returns untrusted model prose or extra fields',async()=>{
  const secret='FICTIONAL_SECRET_IN_SYNTHETIC_TEST';
  const assessor=async value=>{
    const assessment=baseline_analysis(value);
    return {...assessment,private_data:secret,plan:{...assessment.plan,summary:secret,uncertainty:[secret]}};
  };
  const result=await run_agent(input,{assessor});
  assert.equal(result.verification.status,'pending_human_approval');
  assert.equal(JSON.stringify(result).includes(secret),false);
});

test('rejects unexpected plan fields and suppresses their content',async()=>{
  const secret='FICTIONAL_SECRET_IN_SYNTHETIC_TEST';
  const assessor=async value=>{
    const assessment=baseline_analysis(value);
    assessment.plan.raw_message=secret;
    return assessment;
  };
  const result=await run_agent(input,{assessor});
  assert.equal(result.verification.status,'rejected');
  assert.ok(result.verification.errors.includes('unexpected_plan_field'));
  assert.equal(JSON.stringify(result).includes(secret),false);
  assert.deepEqual(result.tool_results,[]);
});
