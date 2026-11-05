import {createHmac} from 'node:crypto';
import {create_intelligence_store} from '../src/intelligence.js';
import {sanitize_public_report} from '../src/core.js';

const repository_full_name='demo/synthetic-repository';
const secret='FICTIONAL_DEMO_SECRET_NEVER_USE_IN_PRODUCTION';
const event={action:'closed',repository:{full_name:repository_full_name},pull_request:{number:1,merged:true,merge_commit_sha:'a'.repeat(40),base:{ref:'main'},head:{repo:{full_name:repository_full_name}}}};
const raw=Buffer.from(JSON.stringify(event));
const signature=`sha256=${createHmac('sha256',secret).update(raw).digest('hex')}`;
const store=create_intelligence_store({repository_full_name,secret});
const staged=store.stage({raw,signature,event_name:'pull_request'});
const report=sanitize_public_report({scenario_id:'synthetic_otp',language:'en',risk_level:'high_risk',indicator_codes:['credential_request','urgent_pressure'],approved_action_codes:['stop_disclosing_secrets']});
const promoted=store.promote({id:staged.id,report,reviewer:'demo_reviewer'});
console.log(JSON.stringify({staged:staged.status,promoted_version:promoted.version,source_pr_number:promoted.source_pr_number,synthetic_only:promoted.report.is_synthetic,external_actions:0},null,2));
