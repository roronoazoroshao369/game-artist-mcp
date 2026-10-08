import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('CI never uploads the hidden A/B mapping within the legacy technical artifact',async()=>{
 const yaml=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 const section=yaml.split('name: poc-005b-technical-ab')[1]?.split('name: poc-005b-real-assets-blind-review-UNSCORED')[0];
 assert.ok(section,'technical artifact exists');
 assert.doesNotMatch(section,/path:\s*benchmarks\/poc005b\/generated\/\s*(?:\n|$)/,
  'uploading all generated files would leak hidden A/B mapping and invalidate blindness');
 assert.match(yaml,/name: poc-005b-real-assets-blind-review-UNSCORED[\s\S]*?path: benchmarks\/poc005b\/generated\/real-asset-ab\/review\//);
});
