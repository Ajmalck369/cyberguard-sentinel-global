import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {create_intelligence_store} from '../src/intelligence.js';
import {sanitize_public_report} from '../src/core.js';

const repository_full_name='Ajmalck369/cyberguard-sentinel-global';
const secret='FICTIONAL_WEBHOOK_SECRET_32_CHARACTERS_LONG';
const payload={action:'closed',repository:{full_name:repository_full_name},pull_request:{number:7,merged:true,merge_commit_sha:'a'.repeat(40),base:{ref:'main'},head:{repo:{full_name:repository_full_name}}}};
const sign=raw=>`sha256=${createHmac('sha256',secret).update(raw).digest('hex')}`;

test('signed merged PR is staged, then explicitly reviewed before synthetic promotion',()=>{
  const store=create_intelligence_store({repository_full_name,secret});
  const raw=Buffer.from(JSON.stringify(payload));
  assert.throws(()=>store.stage({raw,signature:'sha256='+'0'.repeat(64),event_name:'pull_request'}),/invalid_webhook_signature/);
  const staged=store.stage({raw,signature:sign(raw),event_name:'pull_request'});
  assert.equal(staged.status,'pending_human_review');
  assert.equal(store.snapshot().promoted.length,0);
  const report=sanitize_public_report({scenario_id:'synthetic_otp',language:'en',risk_level:'high_risk',indicator_codes:['credential_request','urgent_pressure'],approved_action_codes:['stop_disclosing_secrets']});
  assert.throws(()=>store.promote({id:staged.id,report:{...report,raw_message:'private'},reviewer:'demo_reviewer'}),/sanitized_synthetic_report_required/);
  const promoted=store.promote({id:staged.id,report,reviewer:'demo_reviewer'});
  assert.equal(promoted.version,1);
  assert.equal(promoted.source_pr_number,7);
  assert.equal(store.snapshot().pending,0);
  assert.equal(JSON.stringify(store.snapshot()).includes('private'),false);
});

test('wrong repository, fork, unmerged PR and unsupported event are refused',()=>{
  const store=create_intelligence_store({repository_full_name,secret});
  for(const changed of [
    {...payload,repository:{full_name:'elsewhere/repo'}},
    {...payload,pull_request:{...payload.pull_request,merged:false}},
    {...payload,pull_request:{...payload.pull_request,head:{repo:{full_name:'untrusted/fork'}}}}
  ]){
    const raw=Buffer.from(JSON.stringify(changed));
    assert.throws(()=>store.stage({raw,signature:sign(raw),event_name:'pull_request'}),/untrusted_intelligence_provenance/);
  }
  const raw=Buffer.from(JSON.stringify(payload));
  assert.throws(()=>store.stage({raw,signature:sign(raw),event_name:'push'}),/unsupported_webhook_event/);
});
