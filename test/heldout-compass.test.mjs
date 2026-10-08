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
test('new self-selected original MCP trial passes structural audit but NOT external autonomy/visual gates', async()=>{
 const report=await auditEvidence(DIR);
 assert.equal(report.ok,true,JSON.stringify(report.errors));
 assert.equal(report.metrics.toolCalls,14);
 assert.equal(report.metrics.operationCount,36);
 assert.equal(report.metrics.renderCount,3);
 assert.equal(report.metrics.correctionRounds,2);
 assert.equal(report.metrics.finalRevision,3);
 const r2=await readFile(join(DIR,'intermediate-r2.png'));
 const r3=await readFile(join(DIR,'revised.png'));
 assert.notDeepEqual(r2,r3,'earlier faulty render is preserved as evidence');
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
 const loop=enhanced.nodes.find(n=>n.id==='suspension_loop_metal');
 assert.equal(loop.fill,'none');
 assert.equal(loop.appearance.material,'metal');
 assert.equal(loop.appearance.basePaint,undefined,'open stroke-only loop must not get implicit fill');
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
