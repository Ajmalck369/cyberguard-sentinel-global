import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {create_postgres_store} from '../src/postgres.js';
import {run_agent} from '../src/orchestrator.js';
import {baseline_analysis} from '../src/core.js';
import {create_server} from '../src/server.js';

test('PostgreSQL stores only sanitized assessment metadata and one approval decision', {skip:!process.env.TEST_DATABASE_URL}, async()=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
  try {
    const store=await create_postgres_store({pool});
    const result=await run_agent({message:'URGENT share OTP now',language:'en',scenario_id:'postgres_demo',synthetic_confirmed:true},{assessor:baseline_analysis});
    const proposal=await store.create(result,'GLOBAL');
    assert.equal(proposal.status,'pending');
    assert.equal((await store.decide(result.run_id,'0'.repeat(64),'approve')).status,'invalid_token');
    const row=(await pool.query('SELECT report::text AS report, approval_token_hash FROM assessments WHERE run_id=$1',[result.run_id])).rows[0];
    assert.equal(row.report.includes('URGENT share OTP now'),false);
    assert.equal(row.report.includes(proposal.token),false);
    assert.notEqual(row.approval_token_hash,proposal.token);

    const restarted=await create_postgres_store({pool});
    const decisions=await Promise.all([restarted.decide(result.run_id,proposal.token,'approve'),restarted.decide(result.run_id,proposal.token,'approve')]);
    assert.deepEqual(new Set(decisions.map(item=>item.status)),new Set(['approved_locally','already_decided']));
    const approved=decisions.find(item=>item.status==='approved_locally');
    assert.equal(approved.status,'approved_locally');
    assert.equal(approved.referral.destination,'none');
    assert.equal((await restarted.decide(result.run_id,proposal.token,'approve')).status,'already_decided');
    const audit=await restarted.verify_audit();
    assert.ok(audit.count>=2);
    assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM audit_events WHERE run_id=$1',[result.run_id])).rows[0].n),2);
  } finally {await pool.end();}
});

test('PostgreSQL approval expires and cannot be replayed', {skip:!process.env.TEST_DATABASE_URL}, async()=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
  let current=new Date();
  try {
    const store=await create_postgres_store({pool,now:()=>current});
    const result=await run_agent({message:'URGENT share OTP now',language:'en',scenario_id:'postgres_expiry',synthetic_confirmed:true},{assessor:baseline_analysis});
    const proposal=await store.create(result,'AE');
    current=new Date(Date.parse(proposal.expires_at));
    assert.equal((await store.decide(result.run_id,proposal.token,'approve')).status,'expired');
    assert.equal((await store.decide(result.run_id,proposal.token,'approve')).status,'expired');
    assert.ok((await store.verify_audit()).count>=2);
    assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM audit_events WHERE run_id=$1',[result.run_id])).rows[0].n),2);
  } finally {await pool.end();}
});

test('HTTP assessment and local approval use the PostgreSQL store when selected', {skip:!process.env.TEST_DATABASE_URL}, async()=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
  const storage=await create_postgres_store({pool});
  const server=create_server({assessor:baseline_analysis,storage});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const headers={'content-type':'application/json',origin};
  try {
    const response=await fetch(`${origin}/api/v1/synthetic_assessments`,{method:'POST',headers,body:JSON.stringify({message:'URGENT share OTP now',language:'en',scenario_id:'postgres_http',synthetic_confirmed:true})});
    assert.equal(response.status,200);
    const assessment=await response.json();
    assert.equal(assessment.approval.status,'pending');
    const approval=await fetch(`${origin}/api/v1/synthetic_assessments/${assessment.run_id}/approval`,{method:'POST',headers,body:JSON.stringify({token:assessment.approval.token,decision:'decline',synthetic_confirmed:true})});
    assert.equal(approval.status,200);
    assert.equal((await approval.json()).status,'declined');
    assert.equal(Number((await pool.query('SELECT COUNT(*) AS n FROM audit_events WHERE run_id=$1',[assessment.run_id])).rows[0].n),2);
  } finally {await new Promise(resolve=>server.close(resolve));await pool.end();}
});
