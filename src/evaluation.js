import {baseline_analysis} from './core.js';
import {run_agent} from './orchestrator.js';

const risk_levels=new Set(['high_risk','suspicious','inconclusive']);
const languages=new Set(['en','ar','hi','fr','es']);

export function validate_evaluation_dataset(dataset) {
  if(dataset?.schema_version!==1 || dataset.synthetic_only!==true || !Array.isArray(dataset.cases) || dataset.cases.length<40 || dataset.cases.length>60) throw new Error('invalid_evaluation_dataset');
  const seen=new Set();
  for(const scenario of dataset.cases){
    if(typeof scenario?.id!=='string' || !/^[a-z0-9_]{3,40}$/.test(scenario.id) || seen.has(scenario.id)) throw new Error('invalid_evaluation_id');
    seen.add(scenario.id);
    if(!languages.has(scenario.language) || typeof scenario.category!=='string' || !/^[a-z_]{2,30}$/.test(scenario.category) || !risk_levels.has(scenario.expected_risk) || typeof scenario.message!=='string' || !scenario.message.trim() || scenario.message.length>6000) throw new Error('invalid_evaluation_case');
    for(const match of scenario.message.matchAll(/https?:\/\/[^\s]+/gi)) if(!new URL(match[0]).hostname.endsWith('.invalid')) throw new Error('non_synthetic_url');
  }
  return dataset.cases;
}

export async function evaluate_cases(dataset,{assessor=async input=>baseline_analysis(input),ids}={}) {
  const cases=validate_evaluation_dataset(dataset);
  const selected=ids?ids.map(id=>cases.find(scenario=>scenario.id===id)):cases;
  if(!selected.length || selected.some(scenario=>!scenario)) throw new Error('unknown_evaluation_id');
  const results=[];
  for(const scenario of selected){
    try {
      const result=await run_agent({message:scenario.message,language:scenario.language,scenario_id:scenario.id,synthetic_confirmed:true},{assessor});
      if(JSON.stringify(result).includes(scenario.message)) throw new Error('raw_message_echoed');
      results.push({id:scenario.id,language:scenario.language,category:scenario.category,expected_risk:scenario.expected_risk,predicted_risk:result.verification.status==='rejected'?'rejected':result.plan.risk_level,verification_status:result.verification.status,verification_errors:result.verification.errors,independent_risk_level:result.verification.independent_risk_level,model_tool_calls:result.trace.filter(item=>item.step==='model_tool'&&item.status==='verified').length,indicator_codes:result.indicator_codes});
    }catch(error){
      if(error.message==='raw_message_echoed') throw error;
      results.push({id:scenario.id,language:scenario.language,category:scenario.category,expected_risk:scenario.expected_risk,predicted_risk:'error',verification_status:'error',verification_errors:[],independent_risk_level:null,model_tool_calls:0,indicator_codes:[]});
    }
  }
  const count=(subset,predicate)=>subset.filter(predicate).length;
  const ratio=(numerator,denominator)=>denominator?Number((numerator/denominator).toFixed(3)):null;
  const correct=count(results,row=>row.predicted_risk===row.expected_risk);
  const high=results.filter(row=>row.expected_risk==='high_risk');
  const benign=results.filter(row=>row.expected_risk==='inconclusive');
  const by_language=Object.fromEntries([...new Set(results.map(row=>row.language))].map(language=>{
    const subset=results.filter(row=>row.language===language);
    return [language,{total:subset.length,correct:count(subset,row=>row.predicted_risk===row.expected_risk)}];
  }));
  return {
    total:results.length,
    correct,
    accuracy:ratio(correct,results.length),
    high_risk_recall:ratio(count(high,row=>row.predicted_risk==='high_risk'),high.length),
    benign_false_alarm_rate:ratio(count(benign,row=>row.predicted_risk!=='inconclusive'),benign.length),
    verification_rejected:count(results,row=>row.verification_status==='rejected'),
    errors:count(results,row=>row.verification_status==='error'),
    model_tool_calls:results.reduce((total,row)=>total+row.model_tool_calls,0),
    by_language,
    cases:results
  };
}
