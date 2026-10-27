import {randomUUID} from 'node:crypto';
import {sanitize_public_report} from './core.js';

const rule_packages=Object.freeze({
  GLOBAL:{version:'global_synthetic_v1',review_steps:['Confirm this is a fictional example.','Check the proposed metadata before any future sharing.']},
  AE:{version:'ae_synthetic_v1',review_steps:['Confirm the fictional UAE setting.','A human must verify any current official channel separately.']},
  IN:{version:'in_synthetic_v1',review_steps:['Confirm the fictional India setting.','A human must verify any current official channel separately.']}
});

export const country_codes=Object.freeze(Object.keys(rule_packages));

export function prepare_synthetic_referral(report,country_code,{now=()=>new Date(),id=()=>randomUUID()}={}) {
  const selected=rule_packages[country_code];
  if(!selected) throw new Error('unsupported_country_code');
  if(report?.schema_version!==1 || report?.report_kind!=='synthetic_threat_observation' || report?.is_synthetic!==true) throw new Error('synthetic_report_required');
  const sanitized=sanitize_public_report(report);
  return {
    schema_version:1,
    referral_id:id(),
    status:'prepared_locally',
    created_at:now().toISOString(),
    country_code,
    rule_package_version:selected.version,
    destination:'none',
    review_steps:[...selected.review_steps],
    report:sanitized
  };
}
