import test from 'node:test';
import assert from 'node:assert/strict';
import {create_approval_store} from '../src/approval.js';
import {baseline_analysis} from '../src/core.js';
import {run_agent} from '../src/orchestrator.js';
import {create_server} from '../src/server.js';

const input={message:'URGENT share OTP now',language:'en',scenario_id:'approval_demo',synthetic_confirmed:true};
const assessor=async value=>baseline_analysis(value);

test('only a pending synthetic report can be approved once',async()=>{
  const store=create_approval_store();
  const result=await run_agent(input,{assessor});
  const proposal=store.create(result);
  assert.equal(proposal.status,'pending');
  assert.equal(store.decide(result.run_id,'0'.repeat(64),'approve').status,'invalid_token');
  const approved=store.decide(result.run_id,proposal.token,'approve');
  assert.equal(approved.status,'approved_locally');
  assert.equal(approved.referral.destination,'none');
  assert.deepEqual(approved.referral.report,result.proposed_git_report);
  assert.equal(store.decide(result.run_id,proposal.token,'approve').status,'already_decided');
  assert.equal(store.create({...result,verification:{...result.verification,status:'rejected'}}),null);
});

test('decline and expiry never produce an approved report',async()=>{
  let current_time=1000;
  const store=create_approval_store({now:()=>current_time});
  const result=await run_agent(input,{assessor});
  const proposal=store.create(result);
  const declined=store.decide(result.run_id,proposal.token,'decline');
  assert.equal(declined.status,'declined');
  assert.equal(declined.referral,undefined);
  assert.equal(store.decide(result.run_id,proposal.token,'approve').status,'already_decided');
  const next=await run_agent(input,{assessor});
  const expiring=store.create(next);
  current_time=Date.parse(expiring.expires_at);
  assert.equal(store.decide(next.run_id,expiring.token,'approve').status,'expired');
});

test('local approval endpoint requires an explicit decision and cannot replay it',async()=>{
  const server=create_server({assessor});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const unsupported=await fetch(`${origin}/api/v1/synthetic_assessments`,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({...input,country_code:'XX'})});
    assert.equal(unsupported.status,400);
    const assessment=await fetch(`${origin}/api/v1/synthetic_assessments`,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({...input,country_code:'AE'})});
    assert.equal(assessment.status,200);
    const result=await assessment.json();
    assert.equal(result.approval.status,'pending');
    const approval_url=`${origin}/api/v1/synthetic_assessments/${result.run_id}/approval`;
    const headers={'content-type':'application/json',origin};
    const invalid=await fetch(approval_url,{method:'POST',headers:{...headers,origin:'https://example.invalid'},body:JSON.stringify({token:result.approval.token,decision:'approve',synthetic_confirmed:true})});
    assert.equal(invalid.status,403);
    const missing_confirmation=await fetch(approval_url,{method:'POST',headers,body:JSON.stringify({token:result.approval.token,decision:'approve'})});
    assert.equal(missing_confirmation.status,400);
    const approval=await fetch(approval_url,{method:'POST',headers,body:JSON.stringify({token:result.approval.token,decision:'approve',synthetic_confirmed:true})});
    assert.equal(approval.status,200);
    const decision=await approval.json();
    assert.equal(decision.status,'approved_locally');
    assert.equal(decision.referral.status,'prepared_locally');
    assert.equal(decision.referral.country_code,'AE');
    assert.equal(decision.referral.destination,'none');
    assert.deepEqual(decision.referral.report,result.proposed_git_report);
    const replay=await fetch(approval_url,{method:'POST',headers,body:JSON.stringify({token:result.approval.token,decision:'approve',synthetic_confirmed:true})});
    assert.equal(replay.status,409);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
