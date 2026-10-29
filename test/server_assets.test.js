import test from 'node:test';
import assert from 'node:assert/strict';
import {create_server} from '../src/server.js';
import {baseline_analysis} from '../src/core.js';

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
