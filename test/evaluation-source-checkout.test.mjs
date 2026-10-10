import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assertCleanMainCheckout} from '../src/evaluation/source-checkout.mjs';

const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function fixture(){
 const cwd=await mkdtemp(join(tmpdir(),'c1-source-checkout-'));
 git(cwd,'init','--initial-branch=main');
 git(cwd,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','baseline');
 const head=git(cwd,'rev-parse','HEAD');
 git(cwd,'update-ref','refs/remotes/origin/main',head);
 return {cwd,head};
}
test('official C1 freeze permits clean main only when pinned to origin/main and expected SHA',async()=>{
 const {cwd,head}=await fixture();
 try{assert.equal(assertCleanMainCheckout({cwd,expectedSha:head}),head);}
 finally{await rm(cwd,{recursive:true,force:true});}
});
test('official C1 freeze rejects modified and untracked source content',async()=>{
 const {cwd,head}=await fixture();
 try{
  await writeFile(join(cwd,'source-art.json'),'original');
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:head}),/dirty|uncommitted|untracked|clean/i);
  git(cwd,'add','source-art.json');
  git(cwd,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','source file');
  const next=git(cwd,'rev-parse','HEAD');
  git(cwd,'update-ref','refs/remotes/origin/main',next);
  await writeFile(join(cwd,'source-art.json'),'changed');
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:next}),/dirty|uncommitted|clean/i);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
test('official C1 freeze rejects a feature branch even if HEAD matches expected SHA',async()=>{
 const {cwd,head}=await fixture();
 try{
  git(cwd,'switch','-c','feat-temporary');
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:head}),/main|branch/i);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
test('official C1 freeze rejects diverged or missing origin/main and stale expected SHA',async()=>{
 const {cwd,head}=await fixture();
 try{
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:'f'.repeat(40)}),/SHA|HEAD|source/i);
  git(cwd,'update-ref','-d','refs/remotes/origin/main');
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:head}),/origin\/main|remote|ref/i);
  git(cwd,'update-ref','refs/remotes/origin/main',head);
  git(cwd,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','local divergence');
  const newer=git(cwd,'rev-parse','HEAD');
  assert.throws(()=>assertCleanMainCheckout({cwd,expectedSha:newer}),/origin\/main|remote|diverg/i);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
