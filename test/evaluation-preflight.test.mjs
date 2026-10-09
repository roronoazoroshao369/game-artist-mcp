import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {freezeSourceSession,preflightSession} from '../src/evaluation/preflight.mjs';
const sha='93cba70542ad7d7855429b58d61c250d2ae57b7d';
const args=root=>({sessionId:'freeze-example',sourceCommitSha:sha,reviewQuorum:1,rendererVersion:'rsvg-convert version 2.58.0',styleProfileId:'dark-cultivation-v1',createdAt:'2026-10-09T01:00:00Z',frozenAt:'2026-10-09T01:01:00Z',outputRoot:root});
test('three real asset sources produce exactly 12 native alpha files and a valid frozen manifest',async()=>{
 const root=await mkdtemp(join(tmpdir(),'poc005c1-freeze-'));try{
  const {session,publicManifest,privateMapping}=await freezeSourceSession(args(root));
  assert.equal(session.blindedFiles.length,12);
  assert.equal(publicManifest.files.length,12);
  assert.equal(session.sourcePairs.length,3);
  assert.equal(session.reviewQuorum,1);
  assert.equal(publicManifest.packageDigest,session.packageDigest);
  assert.equal(Object.keys(privateMapping.mapping).length,3);
  for(const f of publicManifest.files)assert.ok([64,128].includes(Math.max(f.width,f.height)));
  const report=await preflightSession({session,publicManifest,privateMapping,root,rerender:true});
  assert.equal(report.technicalStatus,'TECHNICAL_PASS',JSON.stringify(report.errors));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('tampering a PNG after freeze fails closed',async()=>{
 const root=await mkdtemp(join(tmpdir(),'poc005c1-tamper-'));try{
  const state=await freezeSourceSession(args(root));
  const f=state.publicManifest.files[0];
  const path=join(root,'review',f.path);
  const original=await readFile(path);const broken=Buffer.from(original);broken[broken.length-3]^=0x40;
  await writeFile(path,broken);
  const r=await preflightSession({...state,root,rerender:false});
  assert.equal(r.technicalStatus,'TECHNICAL_NO_GO');
 }finally{await rm(root,{recursive:true,force:true});}
});
