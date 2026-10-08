import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRevisedDocument, createMaterialPair, ASSETS} from '../src/benchmark/real-asset-pairs.mjs';
import {validateDocument} from '../src/core/validate.mjs';
import {inspectStyle} from '../src/style/inspect.mjs';
import {loadStyleProfile} from '../src/style/profile.mjs';
import {assertSameGeometryPair} from '../src/benchmark/appearance-pair.mjs';

const EXPECTED={cultivation_sword_20261008:35,medicinal_pouch_20261008:37,stone_censer_20261008:44};
test('all three POC-005A baselines are reconstructed from actual final local MCP operations',async()=>{
 assert.deepEqual([...ASSETS],Object.keys(EXPECTED));
 for(const asset of ASSETS){
  const {document,revision,sourceCalls}=await loadRevisedDocument(asset);
  assert.equal(revision,2,asset);
  assert.equal(sourceCalls,2,asset);
  assert.equal(document.nodes.length,EXPECTED[asset],asset);
  assert.equal(validateDocument(document).ok,true,asset);
  assert.ok(document.nodes.every(n=>!('appearance' in n)),asset);
 }
});
test('original geometry, stroke and z order are byte-for-byte identical in material A/B',async()=>{
 const profile=await loadStyleProfile('dark-cultivation-v1');
 for(const asset of ASSETS){
  const {document}=await loadRevisedDocument(asset);
  const {baseline,enhanced,operations}=createMaterialPair(asset,document);
  assert.deepEqual(baseline,document);
  assert.doesNotThrow(()=>assertSameGeometryPair(baseline,enhanced),asset);
  assert.deepEqual(baseline.nodes.map(n=>n.id),enhanced.nodes.map(n=>n.id));
  assert.equal(enhanced.nodes.length,EXPECTED[asset]);
  assert.ok(operations>=4 && operations<=12,asset+' appearance nodes '+operations);
  assert.equal(validateDocument(enhanced).ok,true,asset);
  const inspected=inspectStyle(enhanced,profile);
  assert.equal(inspected.ok,true,asset+' '+inspected.errors.join('; '));
  assert.ok(inspected.metrics.appearance.gradients>=2,asset);
  assert.ok(inspected.metrics.appearance.marks>=2,asset);
  assert.equal(document.nodes.some(n=>n.appearance!==undefined),false,asset);
 }
});
test('unknown asset or missing authored anchor must fail closed',async()=>{
 assert.rejects(loadRevisedDocument('../other'),/unknown asset/);
 const {document}=await loadRevisedDocument(ASSETS[0]);
 const broken=structuredClone(document);broken.nodes=broken.nodes.filter(n=>n.id!=='blade_left_face');
 assert.throws(()=>createMaterialPair(ASSETS[0],broken),/missing target node/);
 assert.throws(()=>createMaterialPair('unknown',document),/unknown asset/);
});
