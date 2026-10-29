import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {create_audit_log} from '../src/audit.js';
import {run_agent} from '../src/orchestrator.js';
import {baseline_analysis} from '../src/core.js';

test('durable audit records only bounded metadata, survives restart and detects tampering',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'cyberguard-audit-'));
  const file=join(directory,'private','audit.jsonl');
  try {
    const result=await run_agent({message:'URGENT share OTP now',language:'en',scenario_id:'audit_demo',synthetic_confirmed:true},{assessor:baseline_analysis});
    const audit=await create_audit_log(file);
    const [first,duplicate]=await Promise.all([audit.append_assessment(result),audit.append_assessment(result)]);
    assert.deepEqual(new Set([first.status,duplicate.status]),new Set(['recorded','already_recorded']));
    await audit.append_decision(result.run_id,'approved_locally');
    assert.equal(audit.snapshot().count,2);
    const contents=await readFile(file,'utf8');
    assert.equal(contents.includes('URGENT share OTP now'),false);
    assert.equal(contents.includes('MODEL_API_KEY'),false);
    const restarted=await create_audit_log(file);
    assert.deepEqual(restarted.snapshot(),audit.snapshot());
    await writeFile(file,contents.replace('high_risk','inconclusive'));
    await assert.rejects(create_audit_log(file),/audit_chain_invalid/);
  } finally {await rm(directory,{recursive:true,force:true});}
});
