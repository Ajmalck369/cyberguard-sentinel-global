// Opt-in publisher: public repositories should receive only manually reviewed, synthetic metadata.
import {readFile} from 'node:fs/promises';
import {sanitize_public_report} from '../src/core.js';
const [file]=process.argv.slice(2);
if(!file) throw Error('Usage: node scripts/publish_intelligence.mjs path/to/synthetic_approved.json');
const proposal=JSON.parse(await readFile(file,'utf8'));
if(proposal.synthetic_confirmed!==true || proposal.human_approved!==true) throw Error('Explicit human_approved and synthetic_confirmed required');
const token=process.env.GITHUB_TOKEN, repo=process.env.GITHUB_REPOSITORY;
if(!token||!repo||!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error('Set GITHUB_TOKEN and GITHUB_REPOSITORY');
const sanitized=sanitize_public_report(proposal);
const response=await fetch(`https://api.github.com/repos/${repo}/issues`,{
  method:'POST',headers:{'authorization':`Bearer ${token}`,'accept':'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'},
  body:JSON.stringify({title:`[Synthetic intelligence] ${sanitized.scenario_id}`,body:`Approved synthetic observation (not evidence or an official incident report).\n\n\`\`\`json\n${JSON.stringify(sanitized,null,2)}\n\`\`\``})
});
if(!response.ok)throw Error(`GitHub publish failed HTTP ${response.status}`);
const data=await response.json();console.log(data.html_url);
