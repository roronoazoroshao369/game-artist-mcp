import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {validSession,validSubmission} from './fixtures/evaluation-fixtures.mjs';
import {transitionSession} from '../src/evaluation/lifecycle.mjs';
import {lockReview,revealMapping} from '../src/evaluation/locking.mjs';
const session=validSession({state:'COLLECTING',reviewQuorum:2});
const eligible=(id)=>({eligible:true,reviewerId:id,verificationRef:'external-ref-'+id});
const submission=id=>validSubmission({reviewerId:id,evidenceKind:'HUMAN_REVIEW'});
test('lifecycle refuses skipping lock and invalid transitions',()=>{
 assert.throws(()=>transitionSession({session,currentState:'RELEASED',nextState:'REVEALED'}),/transition/i);
 assert.equal(transitionSession({session,currentState:'COLLECTING',nextState:'LOCKED'}).state,'LOCKED');
});
test('two reviewer quorum stays pending when only one eligible human',async()=>{
 const root=await mkdtemp(join(tmpdir(),'evaluation-lock-'));try{
  await assert.rejects(lockReview({session,submissions:[submission('r1')],verifiedEligibility:[eligible('r1')],evaluatorId:'operator',lockedAt:'2026-10-09T02:00:00Z',privateRoot:root}),/quorum|pending/i);
  const lock=await lockReview({session,submissions:[submission('r1'),submission('r2')],verifiedEligibility:[eligible('r1'),eligible('r2')],evaluatorId:'operator',lockedAt:'2026-10-09T02:00:00Z',privateRoot:root});
  assert.equal(lock.submissions.length,2);assert.match(lock.lockDigest,/^[a-f0-9]{64}$/);
  await assert.rejects(revealMapping({session,reviewLock:null,sealedMapping:{},sourceRoleHashes:{},actorId:'operator',revealedAt:'2026-10-09T02:01:00Z'}),/lock/i);
 }finally{await rm(root,{recursive:true,force:true});}
});
