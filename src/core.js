import { createHash, randomUUID } from 'node:crypto';

const suspicious_patterns = [
  { id:'credential_request', pattern:/\b(otp|one.time password|password|pin|cvv|security code|verification code|رمز التحقق|كلمة المرور|पासवर्ड)\b/i },
  { id:'urgent_pressure', pattern:/\b(urgent|immediately|account suspended|verify now|act now|today|فوراً|عاجل|तुरंत)\b/i },
  { id:'financial_request', pattern:/\b(transfer|wire|payment|bank|card|deposit|تحويل|بنك|भुगतान)\b/i },
  { id:'phishing_link', pattern:/\b(click|open|tap|visit|sign in|log in|verify)\b.{0,80}(?:\blink\b|\burl\b|https?:\/\/|\bwebsite\b)/i },
  { id:'sender_impersonation_claim', pattern:/\b(from|this is|on behalf of|official)\s+(?:(?:your|the)\s+)?(bank|card issuer|landlord|property agent|security team|support team)\b/i },
  { id:'rental_deposit_pressure', pattern:/\b(rent|rental|apartment|flat|property|landlord|villa)\b.{0,100}\b(deposit|booking fee|application fee|advance payment)\b/i },
  { id:'no_viewing_pressure', pattern:/\b(no viewing|cannot view|can't view|before viewing|without viewing|owner abroad|below market)\b/i },
  { id:'card_compromise_claim', pattern:/\b(card (?:was |has been )?(?:cloned|duplicated|compromised)|unauthori[sz]ed (?:card )?(?:charge|transaction)|card skimm(?:er|ing))\b/i },
  { id:'ransomware_threat', pattern:/\b(ransomware|files (?:are |were |will be )?encrypted|decrypt (?:your )?files|pay (?:the )?ransom)\b/i },
  { id:'attachment_lure', pattern:/\b(open|download|run)\b.{0,60}\b(attachment|file|invoice|document)\b|\benable macros\b/i }
];
const evidence_for_action=Object.freeze({
  stop_disclosing_secrets:['credential_request'],
  avoid_untrusted_links:['phishing_link'],
  verify_property_listing:['rental_deposit_pressure','no_viewing_pressure'],
  review_account_access:['financial_request','card_compromise_claim'],
  avoid_untrusted_attachments:['attachment_lure','ransomware_threat']
});
export const actions = Object.freeze({
  stop_disclosing_secrets:'Do not share passwords, OTPs, PINs or recovery codes.',
  contact_verified_provider:'Contact the organization using a previously verified official channel.',
  preserve_evidence:'Preserve the original message and relevant transaction records securely.',
  review_account_access:'Use the official app or site to review account security and sessions.',
  avoid_untrusted_links:'Do not open links in the message; use a verified app or address instead.',
  verify_property_listing:'Check the listing and agent through independent official or trusted channels before paying.',
  avoid_untrusted_attachments:'Do not open unexpected attachments or enable macros.',
  submit_synthetic_report:'Create a synthetic demonstration report for human review.'
});
export const policy = Object.freeze({
  forbidden_action_codes:['freeze_real_account','contact_real_police','publish_raw_report','identify_suspect','send_victim_data_to_git'],
  human_gated_action_codes:['submit_synthetic_report'],
  safe_action_codes:Object.keys(actions)
});

export function inspect_indicators(input) {
  const text=String(input||'');
  return suspicious_patterns.filter(p=>p.pattern.test(text)).map(p=>p.id);
}
export function sanitize_public_report(report) {
  // Strict projection: never include original text, evidence, names, emails, URLs or phone numbers.
  return {
    schema_version:1,
    report_kind:'synthetic_threat_observation',
    is_synthetic:true,
    language: ['en','ar','hi','fr','es'].includes(report.language)?report.language:'other',
    scenario_id: String(report.scenario_id||'unlabeled').replace(/[^a-z0-9_\-]/gi,'').slice(0,40),
    risk_level:['low_observed_risk','suspicious','high_risk','inconclusive'].includes(report.risk_level)?report.risk_level:'inconclusive',
    indicator_codes:Array.isArray(report.indicator_codes)?report.indicator_codes.filter(x=>suspicious_patterns.some(pattern=>pattern.id===x)).slice(0,12):[],
    approved_action_codes:Array.isArray(report.approved_action_codes)?report.approved_action_codes.filter(x=>policy.safe_action_codes.includes(x)).slice(0,10):[],
    evaluation_version:'v2'
  };
}
export function verify_plan(plan, context={}) {
  const errors=[];
  if(!Array.isArray(plan?.actions)) errors.push('missing_actions');
  const observed=new Set(context.indicator_codes||[]);
  for(const item of plan?.actions||[]) {
    if(!item || typeof item.code!=='string' || !policy.safe_action_codes.includes(item.code)) errors.push('disallowed_action');
    if(!Array.isArray(item?.evidence_codes) || item.evidence_codes.some(c=>!observed.has(c))) errors.push('unsupported_evidence_reference');
    const required=evidence_for_action[item?.code];
    if(required && (!Array.isArray(item.evidence_codes) || !item.evidence_codes.some(code=>required.includes(code)))) errors.push('action_not_grounded');
  }
  const approvals=(plan?.actions||[]).filter(item=>policy.human_gated_action_codes.includes(item?.code)).map(item=>item.code);
  return { status:errors.length?'rejected':approvals.length?'pending_human_approval':'verified', errors:[...new Set(errors)], approval_required:approvals };
}
export function baseline_analysis({message,language='en',scenario_id='demo'}) {
  const indicator_codes=inspect_indicators(message);
  const has=code=>indicator_codes.includes(code);
  const high_risk=has('credential_request')&&(has('urgent_pressure')||has('phishing_link')) || has('rental_deposit_pressure')&&(has('urgent_pressure')||has('no_viewing_pressure')) || has('ransomware_threat')&&(has('attachment_lure')||has('urgent_pressure')) || has('card_compromise_claim')&&has('urgent_pressure') || has('phishing_link')&&has('sender_impersonation_claim')&&has('urgent_pressure');
  const risk_level=high_risk?'high_risk':indicator_codes.length?'suspicious':'inconclusive';
  const proposed_codes=['contact_verified_provider'];
  if(has('credential_request')) proposed_codes.push('stop_disclosing_secrets');
  if(has('phishing_link')) proposed_codes.push('avoid_untrusted_links');
  if(has('rental_deposit_pressure')||has('no_viewing_pressure')) proposed_codes.push('verify_property_listing');
  if(has('card_compromise_claim')) proposed_codes.push('review_account_access');
  if(has('attachment_lure')||has('ransomware_threat')) proposed_codes.push('avoid_untrusted_attachments');
  if(indicator_codes.length) proposed_codes.push('preserve_evidence','submit_synthetic_report');
  const plan={ summary:'Synthetic demonstration assessment; not a legal determination.',risk_level,actions:proposed_codes.map(code=>({code,evidence_codes:(evidence_for_action[code]||indicator_codes.slice(0,1)).filter(has)})),uncertainty:['sender_identity_not_verified','actual_event_not_verified'] };
  return {mode:'fixture',scenario_id,language,indicator_codes,plan};
}
export function event_record(kind, contents) {
  return {id:randomUUID(),kind,at:new Date().toISOString(),hash:createHash('sha256').update(JSON.stringify(contents)).digest('hex')};
}
