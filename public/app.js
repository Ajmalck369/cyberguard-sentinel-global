const by_id=id=>document.getElementById(id);
const samples={
  otp:'URGENT: Your bank account is suspended. Share your OTP immediately to verify.',
  phishing:'This is your bank. Verify now at https://example.invalid/login or your account will close today.',
  rental:'Flat for rent below market. Owner abroad. Pay the deposit today before viewing.',
  card:'Your card was cloned. Call the number in this email immediately to secure your account.',
  fake_email:'This is your bank security team. Click the link to verify your account today.',
  ransomware:'Open the attached invoice immediately or your files will be encrypted and a ransom demanded.'
};
let pending_approval=null;
let displayed_result=null;

by_id('example').addEventListener('change',()=>{by_id('msg').value=samples[by_id('example').value]||'';});

by_id('run').addEventListener('click',async()=>{
  pending_approval=null;
  displayed_result=null;
  by_id('approval-panel').hidden=true;
  by_id('approval-state').textContent='';
  by_id('referral-preview').textContent='';
  by_id('approve').disabled=false;
  by_id('decline').disabled=false;
  by_id('state').textContent='Analyzing synthetic scenario...';
  by_id('result').textContent='';
  by_id('trace').replaceChildren();
  by_id('guidance-list').replaceChildren();
  by_id('read-guidance').disabled=true;
  by_id('read-guidance').dataset.guidance='';
  try {
    const response=await fetch('/api/v1/synthetic_assessments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:by_id('msg').value,language:by_id('lang').value,country_code:by_id('country').value,scenario_id:'web_demo',synthetic_confirmed:by_id('confirm').checked})});
    const data=await response.json();
    by_id('state').textContent=response.ok?'Assessment complete; no external actions taken.':'Assessment failed.';
    const visible={...data,approval:data.approval?{status:data.approval.status,expires_at:data.approval.expires_at}:null};
    displayed_result=visible;
    by_id('result').textContent=JSON.stringify(visible,null,2);
    const guidance=Array.isArray(data.tool_results)?data.tool_results.filter(item=>item.status==='completed'&&typeof item.guidance==='string').map(item=>item.guidance):[];
    for(const line of guidance){const item=document.createElement('li');item.textContent=line;by_id('guidance-list').append(item);}
    if(!guidance.length){const item=document.createElement('li');item.textContent='No verified guidance was produced.';by_id('guidance-list').append(item);}
    by_id('read-guidance').dataset.guidance=guidance.join(' ');
    by_id('read-guidance').disabled=guidance.length===0||by_id('read-guidance').dataset.speechAvailable!=='true';
    if(response.ok&&Array.isArray(data.trace)){
      const title=document.createElement('h3');title.textContent='Agent execution trace';by_id('trace').append(title);
      for(const item of data.trace){const line=document.createElement('div');line.className='trace-step';line.textContent=`${item.sequence}. ${item.step} / ${item.tool} — ${item.status}`;by_id('trace').append(line);}
    }
    if(response.ok&&data.approval?.status==='pending'){
      pending_approval={run_id:data.run_id,token:data.approval.token};
      by_id('approval-preview').textContent=JSON.stringify(data.proposed_git_report,null,2);
      by_id('approval-panel').hidden=false;
      by_id('approval-state').textContent='Review the metadata, then approve or decline within 15 minutes.';
    }
  }catch(error){by_id('state').textContent='Network error';}
});

async function decide(decision) {
  if(!pending_approval) return;
  if(!by_id('confirm').checked){by_id('approval-state').textContent='Confirm the example is entirely synthetic before deciding.';return;}
  by_id('approve').disabled=true;
  by_id('decline').disabled=true;
  try {
    const response=await fetch(`/api/v1/synthetic_assessments/${pending_approval.run_id}/approval`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:pending_approval.token,decision,synthetic_confirmed:true})});
    const result=await response.json();
    if(!response.ok) throw new Error(result.status||result.error||'decision_failed');
    pending_approval=null;
    displayed_result.approval.status=result.status;
    displayed_result.approval.note=result.note;
    displayed_result.local_referral=result.referral??null;
    by_id('result').textContent=JSON.stringify(displayed_result,null,2);
    by_id('referral-preview').textContent=result.referral?JSON.stringify(result.referral,null,2):'';
    by_id('approval-state').textContent=result.status==='approved_locally'?'Synthetic referral preview prepared locally. Nothing was sent.':'Declined. No referral was prepared.';
  }catch(error){
    by_id('approval-state').textContent=`Decision failed: ${error.message}`;
    by_id('approve').disabled=false;
    by_id('decline').disabled=false;
  }
}

by_id('approve').addEventListener('click',()=>decide('approve'));
by_id('decline').addEventListener('click',()=>decide('decline'));
