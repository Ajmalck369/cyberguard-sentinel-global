import {baseline_analysis,inspect_indicators,policy,evidence_for_action,verify_plan} from './core.js';
import {independent_risk} from './verifier.js';
import {build_meta_request} from './meta.js';
import {lookup_approved_playbook} from './playbooks.js';

const tool_name='lookup_approved_playbook';
const tool_id=/^[a-z0-9_-]{1,64}$/i;

async function completion(request,key){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch('https://api.meta.ai/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(request)});
    if(!response.ok) throw new Error(`Meta API returned HTTP ${response.status}`);
    return (await response.json()).choices?.[0]?.message;
  } finally {clearTimeout(timer);}
}

function blocked(indicators,scenario_id,language,history){
  return {mode:'meta-tools',scenario_id,language,indicator_codes:indicators,tool_history:history,plan:{summary:'Tool request blocked by independent verifier.',risk_level:independent_risk(indicators),uncertainty:['model_tool_request_not_verified'],actions:[],blocked_tool_request:true}};
}

export async function assess_with_meta_tools({message,language='en',scenario_id='demo'},configuration=process.env){
  if(configuration.AI_MODE!=='meta-tools') return baseline_analysis({message,language,scenario_id});
  if(!configuration.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required for live Meta tool mode');
  const indicators=inspect_indicators(message);
  const model=configuration.META_MODEL||'muse-spark-1.3';
  const allowed=policy.safe_action_codes.filter(code=>code!=='submit_synthetic_report'&&(!evidence_for_action[code]||evidence_for_action[code].some(value=>indicators.includes(value))));
  const grounding=Object.fromEntries(allowed.filter(code=>evidence_for_action[code]).map(code=>[code,evidence_for_action[code].filter(value=>indicators.includes(value))]));
  const tool={
    type:'function',
    function:{
      name:tool_name,
      description:'Read fixed synthetic safety guidance for one grounded action. No external action occurs.',
      parameters:{
        type:'object',additionalProperties:false,required:['code','evidence_codes'],
        properties:{
          code:{type:'string',enum:allowed},
          evidence_codes:{type:'array',items:indicators.length?{type:'string',enum:indicators}:{type:'string'}}
        }
      }
    }
  };
  const messages=[
    {role:'system',content:`You are handling only invented cybercrime examples. The observed indicators are ${JSON.stringify(indicators)}. You may request up to four ${tool_name} calls to inspect fixed, local guidance. Evidence codes must be observed. For actions in this grounding map, cite at least one listed code: ${JSON.stringify(grounding)}. Do not request reporting, network access, account changes, or any real-world action. The independent required risk is ${independent_risk(indicators)}. After guidance, produce a structured final plan.`},
    {role:'user',content:JSON.stringify({language,synthetic_message:message,observed_indicator_codes:indicators})}
  ];
  const history=[];
  const seen=new Set();
  for(let turn=0;turn<2;turn++){
    const response=await completion({model,temperature:0,messages,tools:[tool],tool_choice:'auto'},configuration.MODEL_API_KEY);
    const calls=response?.tool_calls||[];
    if(!Array.isArray(calls)||!calls.length) break;
    if(calls.length+seen.size>4) return blocked(indicators,scenario_id,language,[...history,{code:'invalid',status:'blocked',errors:['tool_limit_exceeded']}]);
    const requests=[];
    for(const call of calls){
      let args;
      try {args=JSON.parse(call.function?.arguments||'null');} catch {args=null;}
      const code=args?.code;
      const checked=verify_plan({actions:[args]},{indicator_codes:indicators});
      if(call.type!=='function'||call.function?.name!==tool_name||!tool_id.test(call.id||'')||!allowed.includes(code)||seen.has(code)||checked.errors.length){
        return blocked(indicators,scenario_id,language,[...history,{code:'invalid',status:'blocked',errors:checked.errors.length?checked.errors:['disallowed_action']}]);
      }
      seen.add(code);
      requests.push({id:call.id,code,evidence_codes:args.evidence_codes});
    }
    messages.push({role:'assistant',content:null,tool_calls:requests.map(item=>({id:item.id,type:'function',function:{name:tool_name,arguments:JSON.stringify({code:item.code,evidence_codes:item.evidence_codes})}}))});
    for(const item of requests){
      const guidance=lookup_approved_playbook(item.code);
      history.push({code:item.code,status:'verified'});
      messages.push({role:'tool',tool_call_id:item.id,content:JSON.stringify(guidance)});
    }
  }
  const final=build_meta_request({message,language},model);
  const answer=await completion({...final,messages:[...final.messages,...messages.slice(2),{role:'user',content:'Return the final structured JSON plan now. Cite only observed evidence codes.'}]},configuration.MODEL_API_KEY);
  let plan;
  try {plan=JSON.parse(answer?.content||'null');} catch {throw new Error('Invalid model output');}
  return {mode:'meta-tools',model,scenario_id,language,indicator_codes:indicators,tool_history:history,plan};
}
