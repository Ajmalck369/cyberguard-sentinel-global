import {randomBytes, timingSafeEqual} from 'node:crypto';
import {prepare_synthetic_referral} from './referral.js';

const lifetime_ms=15*60*1000;

export function create_approval_store({now=()=>Date.now()}={}) {
  const proposals=new Map();

  return {
    create(result,country_code='GLOBAL') {
      if(result.verification.status!=='pending_human_approval' || !result.verification.approval_required.includes('submit_synthetic_report')) return null;
      for(const [run_id,proposal] of proposals) if(now()>=proposal.expires_at) proposals.delete(run_id);
      const token=randomBytes(32).toString('hex');
      const expires_at=now()+lifetime_ms;
      proposals.set(result.run_id,{token,expires_at,report:result.proposed_git_report,country_code,status:'pending'});
      return {status:'pending',token,expires_at:new Date(expires_at).toISOString()};
    },
    decide(run_id,token,decision) {
      const proposal=proposals.get(run_id);
      if(!proposal) return {status:'not_found'};
      if(now()>=proposal.expires_at) {
        proposals.delete(run_id);
        return {status:'expired'};
      }
      if(proposal.status!=='pending') return {status:'already_decided'};
      if(typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token),Buffer.from(proposal.token))) return {status:'invalid_token'};
      if(decision!=='approve' && decision!=='decline') return {status:'invalid_decision'};
      const referral=decision==='approve'?prepare_synthetic_referral(proposal.report,proposal.country_code):undefined;
      proposal.status=decision==='approve'?'approved_locally':'declined';
      proposal.token=null;
      return {
        status:proposal.status,
        referral,
        note:'Local synthetic demo decision only. No GitHub, agency, or bank submission occurred.'
      };
    }
  };
}
