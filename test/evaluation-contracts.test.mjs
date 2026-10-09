import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEvaluationJson,validateSession,validateSubmission,canonicalBytes,sha256Bytes,safeCsvCell} from '../src/evaluation/contracts.mjs';
import {readBoundedFile,writeAtomicFile} from '../src/evaluation/safe-io.mjs';
import {mkdtemp,mkdir,readFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const assetIds=['cultivation_sword_20261008','medicinal_pouch_20261008','stone_censer_20261008'];
const session=()=>({schemaVersion:1,sessionId:'session-001',sourceCommitSha:'a'.repeat(40),rendererName:'rsvg-convert',rendererVersion:'rsvg-convert version 2.58.0',styleProfileId:'dark-cultivation-v1',rubricVersion:1,packagerVersion:1,createdAt:'2026-10-09T00:00:00Z',frozenAt:'2026-10-09T00:01:00Z',reviewQuorum:2,primaryAssets:assetIds,packageDigest:'a'.repeat(64)});
test('strict unique JSON keys and deterministic canonical hashes',()=>{
 assert.throws(()=>parseEvaluationJson('{"a":1,"a":2}'),/duplicate/i);
 assert.deepEqual(canonicalBytes({b:2,a:1}),canonicalBytes({a:1,b:2}));
 assert.equal(sha256Bytes(Buffer.from('a')), 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
});
test('quorum and version are frozen and strict',()=>{
 assert.equal(validateSession(session()).reviewQuorum,2);
 for(const quorum of [0,3,1.5])assert.throws(()=>validateSession({...session(),reviewQuorum:quorum}),/reviewQuorum/i);
 assert.throws(()=>validateSession({...session(),other:true}),/unknown/i);
 assert.throws(()=>validateSession({...session(),sourceCommitSha:'bad'}),/sourceCommitSha/i);
});
test('CSV injection and input notes guarded',()=>{
 for(const v of ['=1+1','+cmd','-cmd','@sum','\tcmd','\rcmd'])assert.ok(safeCsvCell(v).startsWith("'"));
 assert.equal(safeCsvCell('okay'),'okay');
});
test('submission exactly twelve valid blinded cells',()=>{
 const rows=assetIds.flatMap(asset=>[64,128].flatMap(scale=>['A','B'].map(variant=>({asset,scale,variant,silhouette:3,material:4,hierarchy:3,styleFit:3,coherence:3}))));
 const good={schemaVersion:1,sessionId:'session-001',reviewerId:'reviewer1',rubricVersion:1,packageDigest:'a'.repeat(64),submittedAt:'2026-10-09T01:00:00Z',rows};
 assert.equal(validateSubmission(good,session()).rows.length,12);
 assert.throws(()=>validateSubmission({...good,rows:rows.slice(1)},session()),/12/);
 assert.throws(()=>validateSubmission({...good,rows:[...rows.slice(0,11),{...rows[11],material:5.5}]},session()),/score|material/i);
});
test('bounded file reader rejects traversal and symlink',async()=>{
 const root=await mkdtemp(join(tmpdir(),'eval-contract-'));try{
  await mkdir(join(root,'sub'));await writeAtomicFile({root,relativePath:'sub/a.json',content:Buffer.from('abc')});
  assert.equal((await readBoundedFile({root,relativePath:'sub/a.json',maxBytes:10})).toString(),'abc');
  await assert.rejects(readBoundedFile({root,relativePath:'../escape',maxBytes:10}),/path|traversal/i);
  await symlink(join(root,'sub','a.json'),join(root,'alias'));
  await assert.rejects(readBoundedFile({root,relativePath:'alias',maxBytes:10}),/symlink|link/i);
  await assert.rejects(writeAtomicFile({root,relativePath:'sub/a.json',content:'other'}),/exist|sealed/i);
 }finally{await rm(root,{recursive:true,force:true});}
});
