import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditEvidence} from '../src/benchmark/evidence-audit.mjs';
import {loadHeldoutCompassPair} from '../src/benchmark/heldout-compass.mjs';
import {assertSameGeometryPair} from '../src/benchmark/appearance-pair.mjs';
import {renderReviewPng} from '../src/benchmark/render-review.mjs';
import {inspectStyle} from '../src/style/inspect.mjs';
import {loadStyleProfile} from '../src/style/profile.mjs';

const DIR=new URL('../benchmarks/poc005a/runs/astral_compass_trial_20261008/',import.meta.url).pathname;
test('new actual MCP held-out trial passes structural audit but NOT external autonomy/visual gates', async()=>{
 const report=await auditEvidence(DIR);
 assert.equal(report.ok,true,JSON.stringify(report.errors));
 assert.equal(report.metrics.toolCalls,9);
 assert.equal(report.metrics.operationCount,35);
 assert.equal(report.metrics.renderCount,2);
 assert.equal(report.metrics.correctionRounds,1);
 assert.equal(report.metrics.finalRevision,2);
 assert.equal(report.autonomyVerified,false);
 assert.equal(report.visualQualityVerified,false);
 const run=JSON.parse(await readFile(join(DIR,'run.json'),'utf8'));
 assert.equal(run.agentProvenance,'UNKNOWN');
 assert.equal(run.outcome,'AGENT_PROVENANCE_PENDING');
});
test('blind A/B variants reconstruct FINAL geometry and differ strictly in appearance',async()=>{
 const {baseline,enhanced,appearanceNodes}=await loadHeldoutCompassPair();
 assert.equal(baseline.nodes.length,28);
 assert.equal(appearanceNodes,6);
 assert.ok(baseline.nodes.every(n=>!Object.hasOwn(n,'appearance')));
 assert.doesNotThrow(()=>assertSameGeometryPair(baseline,enhanced));
 const profile=await loadStyleProfile('dark-cultivation-v1');
 for(const d of [baseline,enhanced])assert.equal(inspectStyle(d,profile).ok,true);
 assert.equal(enhanced.nodes.find(n=>n.id==='rear_cord').d,
  'M117 181 Q144 187 132 203 Q125 213 106 226');
});
test('held-out A/B renders non-identical pixel images with true 64px/128px long axes',async()=>{
 const {baseline,enhanced}=await loadHeldoutCompassPair();
 const dir=await mkdtemp(join(tmpdir(),'compass-ab-'));
 try {
  for (const size of [64,128]){
   const a=await renderReviewPng({document:baseline,limitPx:size,outputFile:join(dir,'a'+size+'.png')});
   const b=await renderReviewPng({document:enhanced,limitPx:size,outputFile:join(dir,'b'+size+'.png')});
   assert.equal(Math.max(a.width,a.height),size);
   assert.equal(Math.max(b.width,b.height),size);
   assert.notEqual(a.sha256,b.sha256,'real pixel differences must exist');
  }
 } finally {await rm(dir,{recursive:true,force:true});}
});
