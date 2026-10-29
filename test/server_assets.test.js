import test from 'node:test';
import assert from 'node:assert/strict';
import {create_server} from '../src/server.js';
import {baseline_analysis} from '../src/core.js';
import {createHmac} from 'node:crypto';
import {create_intelligence_store} from '../src/intelligence.js';

test('synthetic property context and accessible tour assets are served locally',async()=>{
  const server=create_server({assessor:baseline_analysis});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const data=await (await fetch(`${origin}/api/v1/synthetic_property_context`)).json();
    assert.equal(data.synthetic_only,true);
    assert.equal(data.source_status,'no_external_source_connected');
    assert.equal(data.rental.verified_market_value,false);
    assert.equal(data.calamity_history.verified_event,false);
    for(const path of ['/','/accessibility.js','/property.js','/tour.js']){
      const response=await fetch(origin+path);
      assert.equal(response.status,200);
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
});

test('local webhook endpoint stages only signed same-repository merged PR metadata',async()=>{
  const repository_full_name='demo/synthetic-repository';
  const secret='FICTIONAL_WEBHOOK_SECRET_32_CHARACTERS_LONG';
  const intelligence=create_intelligence_store({repository_full_name,secret});
  const server=create_server({assessor:baseline_analysis,intelligence});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const payload={action:'closed',repository:{full_name:repository_full_name},pull_request:{number:3,merged:true,merge_commit_sha:'b'.repeat(40),base:{ref:'main'},head:{repo:{full_name:repository_full_name}}},note:'fictional café'};
    const raw=Buffer.from(JSON.stringify(payload));
    const signature=`sha256=${createHmac('sha256',secret).update(raw).digest('hex')}`;
    const url=`${origin}/api/v1/intelligence/webhook`;
    const headers={'content-type':'application/json',origin,'x-github-event':'pull_request','x-hub-signature-256':signature};
    const accepted=await fetch(url,{method:'POST',headers,body:raw});
    assert.equal(accepted.status,202);
    assert.equal((await accepted.json()).status,'pending_human_review');
    assert.equal(intelligence.snapshot().pending,1);
    const rejected=await fetch(url,{method:'POST',headers:{...headers,'x-hub-signature-256':'sha256='+'0'.repeat(64)},body:raw});
    assert.equal(rejected.status,403);
    assert.equal(intelligence.snapshot().promoted.length,0);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
