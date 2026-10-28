import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build_meta_request,assess_with_meta} from '../src/meta.js';
import {inspect_indicators} from '../src/core.js';
import {independent_risk} from '../src/verifier.js';

const dataset=JSON.parse(await readFile(new URL('../fixtures/evaluation_v1.json',import.meta.url),'utf8'));

test('live request gives Muse the independent risk and grounded action vocabulary',()=>{
  for(const id of ['otp_01','phishing_01','rental_01','card_01','ransomware_01','benign_01']) {
    const scenario=dataset.cases.find(item=>item.id===id);
    const request=build_meta_request(scenario);
    const indicators=inspect_indicators(scenario.message);
    const expected=independent_risk(indicators);
    const schema=request.response_format.json_schema.schema;
    assert.deepEqual(schema.properties.risk_level.enum,[expected]);
    assert.deepEqual(JSON.parse(request.messages[1].content).observed_indicator_codes,indicators);
    const codes=schema.properties.actions.items.properties.code.enum;
    if(id==='benign_01') assert.equal(codes.includes('submit_synthetic_report'),false);
    if(id==='otp_01') assert.equal(codes.includes('verify_property_listing'),false);
    assert.equal(request.messages[0].content.includes('FICTIONAL_SECRET_IN_SYNTHETIC_TEST'),false);
  }
});

test('Meta mode sends the constrained request without logging the token',async()=>{
  const scenario=dataset.cases.find(item=>item.id==='otp_01');
  const original=globalThis.fetch;
  let sent;
  globalThis.fetch=async(url,options)=>{
    sent={url,options};
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({summary:'Synthetic assessment',risk_level:'high_risk',uncertainty:[],actions:[]})}}]})};
  };
  try {
    const result=await assess_with_meta(scenario,{AI_MODE:'meta',MODEL_API_KEY:'FICTIONAL_TEST_TOKEN'});
    assert.equal(result.mode,'meta');
    assert.deepEqual(JSON.parse(sent.options.body).response_format.json_schema.schema.properties.risk_level.enum,['high_risk']);
    assert.equal(sent.options.headers.authorization,'Bearer FICTIONAL_TEST_TOKEN');
    assert.equal(JSON.stringify(result).includes('FICTIONAL_TEST_TOKEN'),false);
    assert.equal(sent.options.body.includes('FICTIONAL_TEST_TOKEN'),false);
  } finally {globalThis.fetch=original;}
});
