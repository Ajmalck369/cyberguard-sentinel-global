import {readFile} from 'node:fs/promises';
import {baseline_analysis} from '../src/core.js';
import {evaluate_cases} from '../src/evaluation.js';
import {assess_with_meta} from '../src/meta.js';

const options=new Map(process.argv.slice(2).map(argument=>{
  const match=argument.match(/^--(mode|ids)=(.+)$/);
  if(!match) throw new Error('Usage: node scripts/evaluate.mjs [--mode=fixture|meta] [--ids=id1,id2]');
  return [match[1],match[2]];
}));
const mode=options.get('mode')||'fixture';
if(mode!=='fixture' && mode!=='meta') throw new Error('unsupported_evaluation_mode');
if(mode==='meta' && !process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required for live evaluation');
const ids=options.has('ids')?options.get('ids').split(','):undefined;
const dataset=JSON.parse(await readFile(new URL('../fixtures/evaluation_v1.json',import.meta.url),'utf8'));
const assessor=mode==='meta'?input=>assess_with_meta(input,{...process.env,AI_MODE:'meta'}):input=>baseline_analysis(input);
const report=await evaluate_cases(dataset,{assessor,ids});
console.log(JSON.stringify({mode,...report},null,2));
if(report.errors) process.exitCode=1;
