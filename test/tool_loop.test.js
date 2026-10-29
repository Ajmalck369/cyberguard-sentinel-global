import test from 'node:test';
import assert from 'node:assert/strict';
import {assess_with_meta_tools} from '../src/tool_loop.js';
import {run_agent} from '../src/orchestrator.js';

const input={message:'URGENT share OTP now',language:'en',scenario_id:'tool_demo',synthetic_confirmed:true};
const config={AI_MODE:'meta-tools',MODEL_API_KEY:'FICTIONAL_TEST_TOKEN'};

test('Muse tool loop verifies a local guidance lookup before final plan',async()=>{
  const original=globalThis.fetch;
  const requests=[];
  const replies=[
    {tool_calls:[{id:'call_1',type:'function',function:{name:'lookup_approved_playbook',arguments:JSON.stringify({code:'stop_disclosing_secrets',evidence_codes:['credential_request']})}}]},
    {content:'Continue to final plan.'},
    {content:JSON.stringify({summary:'Synthetic assessment',risk_level:'high_risk',uncertainty:[],actions:[{code:'stop_disclosing_secrets',evidence_codes:['credential_request']}]})}
  ];
  globalThis.fetch=async(_url,options)=>{
    requests.push(JSON.parse(options.body));
    return {ok:true,json:async()=>({choices:[{message:replies.shift()}]})};
  };
  try {
    const assessment=await assess_with_meta_tools(input,config);
    assert.equal(assessment.mode,'meta-tools');
    assert.deepEqual(assessment.tool_history,[{code:'stop_disclosing_secrets',status:'verified'}]);
    assert.equal(requests.length,3);
    assert.equal(requests[1].messages.some(item=>item.role==='tool'&&item.content.includes('Do not share OTPs')),true);
    assert.equal(requests[2].response_format.json_schema.schema.properties.risk_level.enum[0],'high_risk');
    assert.equal(JSON.stringify(assessment).includes('FICTIONAL_TEST_TOKEN'),false);
    const result=await run_agent(input,{assessor:async()=>assessment});
    assert.equal(result.verification.status,'verified');
    assert.ok(result.trace.some(item=>item.step==='model_tool'&&item.status==='verified'));
  } finally {globalThis.fetch=original;}
});

test('unsafe tool request stops the model loop and all post-verification actions',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{message:{tool_calls:[{id:'call_1',type:'function',function:{name:'lookup_approved_playbook',arguments:JSON.stringify({code:'freeze_real_account',evidence_codes:[]})}}]}}]})};};
  try {
    const assessment=await assess_with_meta_tools(input,config);
    const result=await run_agent(input,{assessor:async()=>assessment});
    assert.equal(calls,1);
    assert.equal(result.verification.status,'rejected');
    assert.ok(result.verification.errors.includes('tool_request_rejected'));
    assert.deepEqual(result.tool_results,[]);
    assert.equal(JSON.stringify(result).includes('freeze_real_account'),false);
  } finally {globalThis.fetch=original;}
});
