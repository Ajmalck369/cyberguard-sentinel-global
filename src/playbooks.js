// Fixed synthetic guidance. No network or real account action is available here.
const playbooks=Object.freeze({
  stop_disclosing_secrets:{source:'synthetic_playbook_v1',guidance:'Do not share OTPs, PINs, passwords, or recovery codes.'},
  contact_verified_provider:{source:'synthetic_playbook_v1',guidance:'Contact the provider through its independently verified app or website.'},
  preserve_evidence:{source:'synthetic_playbook_v1',guidance:'Keep the original message and relevant records; do not forward private evidence publicly.'},
  review_account_access:{source:'synthetic_playbook_v1',guidance:'Review security activity through the provider’s official application.'},
  avoid_untrusted_links:{source:'synthetic_playbook_v2',guidance:'Do not use the message link. Open a previously verified app or type the known official address.'},
  verify_property_listing:{source:'synthetic_playbook_v2',guidance:'Verify the listing, agent, and property through independent trusted records before paying any deposit.'},
  avoid_untrusted_attachments:{source:'synthetic_playbook_v2',guidance:'Do not open unexpected attachments, download files, or enable macros from the message.'},
  submit_synthetic_report:{source:'synthetic_playbook_v1',guidance:'Draft a demonstration-only report, pending explicit review.'}
});

export const playbook_codes=Object.freeze(Object.keys(playbooks));
export function lookup_approved_playbook(code){
  const item=playbooks[code];
  if(!item) throw new Error('disallowed_playbook');
  return {source:item.source,guidance:item.guidance};
}
