import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditEvidence } from '../src/benchmark/evidence-audit.mjs';

const required = ['run.json','transcript.jsonl','brief.md','initial.png','initial.svg','revised.png','revised.svg','technical-report.json','critique.md'];
const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3,4]);
const sha256 = x => createHash('sha256').update(x).digest('hex');
const brief = '# Original cultivation sword\nA weathered blade with jade inlay; no geometry instructions.\n';
const profileId = 'dark-cultivation-v1';
const tools = [
  ['style_profile_get',{profile_id:profileId},{profile:{id:profileId,version:1}}],
  ['asset_create',{asset_id:'benchmark_sword',width:128,height:128},{revision:0}],
  ['document_apply_ops',{asset_id:'benchmark_sword',expected_revision:0,operations:[{type:'node.add',node:{id:'blade'}},{type:'node.add',node:{id:'guard'}}]},{revision:1}],
  ['render_preview',{asset_id:'benchmark_sword'},{revision:1}],
  ['document_apply_ops',{asset_id:'benchmark_sword',expected_revision:1,operations:[{type:'node.update',id:'guard',patch:{fill:'#211c1a'}}]},{revision:2}],
  ['render_preview',{asset_id:'benchmark_sword'},{revision:2}],
  ['validate_asset',{asset_id:'benchmark_sword'},{revision:2,ok:true}],
  ['style_validate',{asset_id:'benchmark_sword',profile_id:profileId},{revision:2,ok:true,profileId}],
  ['export_asset',{asset_id:'benchmark_sword'},{revision:2}]
];
const baseEvents = tools.map(([tool,arguments_,result],index)=>({id:index+1,tool,arguments:arguments_,result}));
const run = {runId:'synthetic-sword-001',projectSha:'a'.repeat(40),serverVersion:'0.0.3',profileId,profileVersion:1,rendererVersion:'rsvg-2',briefSha256:sha256(brief),toolCalls:9,operationCount:3,renderCount:2,correctionRounds:1,elapsedMs:1200,outcome:'AGENT_PROVENANCE_PENDING',agentProvenance:'UNKNOWN'};

async function fixture() {
  const dir=await mkdtemp(join(tmpdir(),'game-artist-evidence-'));
  await Promise.all([
    writeFile(join(dir,'run.json'),JSON.stringify(run)),
    writeFile(join(dir,'transcript.jsonl'),baseEvents.map(e=>JSON.stringify(e)).join('\n')+'\n'),
    writeFile(join(dir,'brief.md'),brief),
    writeFile(join(dir,'initial.png'),png),
    writeFile(join(dir,'revised.png'),png),
    writeFile(join(dir,'initial.svg'),'<svg xmlns="http://www.w3.org/2000/svg"></svg>\n'),
    writeFile(join(dir,'revised.svg'),'<svg xmlns="http://www.w3.org/2000/svg"></svg>\n'),
    writeFile(join(dir,'technical-report.json'),JSON.stringify({profileId,revision:2,artIr:{ok:true},style:{ok:true},reviewerStatus:'PENDING'})),
    writeFile(join(dir,'critique.md'),'Observed weak hilt contrast in initial preview. Edited guard after inspection. Synthetic: NO visual authorship claim.\n')
  ]);
  return dir;
}
async function modifyJson(dir,file,fn){const p=join(dir,file),data=JSON.parse(await readFile(p,'utf8'));fn(data);await writeFile(p,JSON.stringify(data));}
async function modifyEvents(dir,fn){const p=join(dir,'transcript.jsonl'),events=(await readFile(p,'utf8')).trim().split('\n').map(JSON.parse);fn(events);await writeFile(p,events.map(JSON.stringify).join('\n')+'\n');}
async function checkBad(mutator,pattern){const dir=await fixture();try{await mutator(dir);const r=await auditEvidence(dir);assert.equal(r.ok,false,JSON.stringify(r));if(pattern)assert.match(r.errors.join(' '),pattern);}finally{await rm(dir,{recursive:true,force:true});}}

test('complete synthetic evidence is structurally valid but NEVER autonomous or independently reviewed',async()=>{
 const dir=await fixture();try{
  const r=await auditEvidence(dir);
  assert.equal(r.ok,true,r.errors.join('; '));
  assert.equal(r.autonomyVerified,false);assert.equal(r.visualQualityVerified,false);
  assert.equal(r.metrics.toolCalls,9);assert.equal(r.metrics.operationCount,3);
  assert.equal(r.metrics.renderCount,2);assert.equal(r.metrics.correctionRounds,1);
  const cli=spawnSync(process.execPath,['scripts/audit-poc005a.mjs',dir],{encoding:'utf8'});
  assert.equal(cli.status,0,cli.stderr+cli.stdout);assert.equal(JSON.parse(cli.stdout).ok,true);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('every required evidence file is mandatory',async()=>{
 for(const file of required) await checkBad(async dir=>unlink(join(dir,file)),/missing|read|file/i);
});
test('rejects corrupted PNG signature and empty or unsafe SVG',async()=>{
 await checkBad(dir=>writeFile(join(dir,'initial.png'),'not a png'),/PNG/i);
 await checkBad(dir=>writeFile(join(dir,'revised.svg'),'<svg><script>evil</script></svg>'),/SVG/i);
});
test('detects tampered brief SHA-256',async()=>{
 await checkBad(dir=>writeFile(join(dir,'brief.md'),'different brief'),/brief|hash|SHA/i);
});
test('cannot forge external agent verification or FULL_PASS from local evidence',async()=>{
 await checkBad(dir=>modifyJson(dir,'run.json',r=>{r.agentProvenance='VERIFIED';}),/provenance|VERIFIED/i);
 await checkBad(dir=>modifyJson(dir,'run.json',r=>{r.outcome='FULL_PASS';}),/FULL_PASS|external|provenance/i);
});
test('rejects duplicate/out-of-order request identifiers',async()=>{
 await checkBad(dir=>modifyEvents(dir,e=>{e[3].id=3;}),/id|order|sequence/i);
});
test('rejects skipped or incorrect revision transitions',async()=>{
 await checkBad(dir=>modifyEvents(dir,e=>{e[4].arguments.expected_revision=0;}),/revision/i);
 await checkBad(dir=>modifyEvents(dir,e=>{e[4].result.revision=7;}),/revision/i);
});
test('rejects forged call, operation, render and correction counters',async()=>{
 for(const key of ['toolCalls','operationCount','renderCount','correctionRounds']) {
  await checkBad(dir=>modifyJson(dir,'run.json',r=>{r[key]++;}),new RegExp(key,'i'));
 }
});
test('rejects oversized evidence and path symlinks',async()=>{
 await checkBad(dir=>writeFile(join(dir,'transcript.jsonl'),'x'.repeat(2*1024*1024+1)),/size|limit|large/i);
 await checkBad(async dir=>{await unlink(join(dir,'initial.png'));await symlink(join(dir,'revised.png'),join(dir,'initial.png'));},/symlink|regular|unsafe/i);
});
test('rejects failed art/style technical gates and inconsistent profile report',async()=>{
 await checkBad(dir=>modifyJson(dir,'technical-report.json',r=>{r.profileId='wrong';}),/profile/i);
 await checkBad(dir=>modifyJson(dir,'technical-report.json',r=>{r.style.ok=false;}),/style/i);
});
test('bad bundles produce a nonzero CLI exit code',async()=>{
 const dir=await fixture();try{
  await writeFile(join(dir,'brief.md'),'corrupt');
  const cli=spawnSync(process.execPath,['scripts/audit-poc005a.mjs',dir],{encoding:'utf8'});
  assert.notEqual(cli.status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
