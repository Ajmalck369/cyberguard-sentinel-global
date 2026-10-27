import test from 'node:test';
import assert from 'node:assert/strict';
import {prepare_synthetic_referral,country_codes} from '../src/referral.js';
import {sanitize_public_report} from '../src/core.js';

const report=sanitize_public_report({scenario_id:'fictional_case',language:'en',risk_level:'high_risk',indicator_codes:['credential_request'],approved_action_codes:['stop_disclosing_secrets']});

test('country packs create local-only synthetic referral previews',()=>{
  assert.deepEqual(country_codes,['GLOBAL','AE','IN']);
  for(const country_code of country_codes){
    const referral=prepare_synthetic_referral(report,country_code,{id:()=>`fixture-${country_code}`,now:()=>new Date('2026-10-27T00:00:00Z')});
    assert.equal(referral.country_code,country_code);
    assert.equal(referral.destination,'none');
    assert.equal(referral.status,'prepared_locally');
    assert.deepEqual(referral.report,report);
    assert.ok(referral.rule_package_version.includes('synthetic'));
  }
});

test('referral preview rejects unsupported country and non-synthetic input',()=>{
  assert.throws(()=>prepare_synthetic_referral(report,'XX'),/unsupported_country_code/);
  assert.throws(()=>prepare_synthetic_referral({...report,is_synthetic:false},'GLOBAL'),/synthetic_report_required/);
});

test('referral preview excludes unexpected free-text fields',()=>{
  const referral=prepare_synthetic_referral({...report,message:'FICTIONAL_SECRET',private_name:'Example Person'},'AE');
  assert.equal(JSON.stringify(referral).includes('FICTIONAL_SECRET'),false);
  assert.equal(JSON.stringify(referral).includes('Example Person'),false);
});
