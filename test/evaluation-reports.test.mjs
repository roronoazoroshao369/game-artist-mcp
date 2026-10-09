import test from 'node:test';import assert from 'node:assert/strict';
import {validSession} from './fixtures/evaluation-fixtures.mjs';
import {normalizeAIAdvice} from '../src/evaluation/advice.mjs';
import {buildPrivateReport,redactPublicReport} from '../src/evaluation/reports.mjs';
test('missing AI critic does not manufacture provider attribution',()=>{
 const x=normalizeAIAdvice({sessionId:'s',status:'AI_TRIAGE_UNAVAILABLE'});
 assert.equal(x.kind,'ADVISORY_ONLY');assert.equal(x.provider,null);
});
test('synthetic review always stays non-live in published reports',()=>{
 const session=validSession();
 const r=buildPrivateReport({session,preflight:{technicalStatus:'TECHNICAL_PASS'},reviewLock:null,reveal:null,verdict:{visualStatus:'VISUAL_GO',confidence:'SINGLE_REVIEWER',deltas:{}},advice:{status:'AI_TRIAGE_UNAVAILABLE',kind:'ADVISORY_ONLY'},evaluatorId:'operator',createdAt:'2026-10-09T02:00:00Z',evidenceKind:'SYNTHETIC_TEST'});
 assert.equal(r.liveVisualGoClaim,false);
 assert.equal(r.visualStatus,'REVIEW_PENDING');
 assert.equal(r.agentProvenance,'AGENT_PROVENANCE_PENDING');
 assert.equal(redactPublicReport({...r,privateVerification:{email:'secret@example.com'}}).privateVerification,undefined);
});
