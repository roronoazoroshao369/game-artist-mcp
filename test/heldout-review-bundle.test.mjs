import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root=new URL('..',import.meta.url).pathname;
const output=join(root,'benchmarks/poc005b/generated/heldout-compass');

test('held-out compass reviewer packet has four real PNGs but no label mapping or quality scores',async()=>{
 const outputLine=execFileSync(process.execPath,['scripts/poc005b-heldout-compass-review.mjs'],{cwd:root,encoding:'utf8'});
 const status=JSON.parse(outputLine.trim().split('\n').at(-1));
 assert.equal(status.ok,true);
 assert.equal(status.independentReviewerCount,0);
 assert.equal(status.agentProvenance,'UNKNOWN');
 const review=join(output,'review');
 const files=await readdir(review);
 for(const x of ['A-64.png','A-128.png','B-64.png','B-128.png','review.html','review-template.csv','metadata.json'])assert.ok(files.includes(x),x);
 assert.ok(!files.includes('sealed-mapping.json'));
 const info=JSON.parse(await readFile(join(review,'metadata.json'),'utf8'));
 assert.equal(info.reviewerStatus,'VISUAL_REVIEW_PENDING');
 assert.equal(info.agentProvenance,'UNKNOWN');
 assert.equal(info.geometryEqual,true);
 assert.equal(info.files.length,4);
 for(const f of info.files){
  assert.equal(Math.max(f.width,f.height),f.longAxis);
  assert.equal(f.alphaTransparent,true);
 }
 assert.notEqual(info.files.find(f=>f.side==='A'&&f.longAxis===64).sha256,info.files.find(f=>f.side==='B'&&f.longAxis===64).sha256);
 const sheet=await readFile(join(review,'review-template.csv'),'utf8');
 const rows=sheet.trim().split('\n');
 assert.equal(rows.length,5);
 for(const row of rows.slice(1))assert.ok(row.endsWith(',,,,,,,,,')||row.endsWith(',,,,,,,,,,'),'no prefilled reviewer data: '+row);
});
test('CI uploads only the public held-out reviewer folder',async()=>{
 const ci=await readFile(join(root,'.github/workflows/ci.yml'),'utf8');
 assert.match(ci,/name: poc-005b-heldout-compass-UNSCORED[\s\S]*?path: benchmarks\/poc005b\/generated\/heldout-compass\/review\//);
 assert.doesNotMatch(ci,/path:\s*benchmarks\/poc005b\/generated\/heldout-compass\s*$/m);
});
