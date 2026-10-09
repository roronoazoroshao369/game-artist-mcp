import test from 'node:test';
import assert from 'node:assert/strict';
import {validSession,validSubmission} from './fixtures/evaluation-fixtures.mjs';
import {canonicalBytes,sha256Bytes} from '../src/evaluation/contracts.mjs';
import {checkEligibility} from '../src/evaluation/reviewers.mjs';
import {validateHumanSubmission,stageSubmission} from '../src/evaluation/submissions.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const session=validSession();const publicManifest={sessionId:session.sessionId,packageDigest:session.packageDigest};
const reviewerRecord={reviewerId:'reviewer-01',reviewerType:'HUMAN',declaration:'NOT_ART_AUTHOR',blindExposure:'NOT_EXPOSED'};
const verified={reviewerId:'reviewer-01',verificationStatus:'VERIFIED_OUT_OF_BAND',verificationMethod:'manual verified external artist',evidenceRef:'private-reference-01',verifiedBy:'evaluation-operator',verifiedAt:'2026-10-09T02:00:00Z',reviewerSignedOrAcknowledgedAt:'2026-10-09T01:59:00Z',realHumanConfirmed:true,notAuthorConfirmed:true};
test('self declaration, AI, and absent independent proof do not count as eligible',()=>{
 assert.equal(checkEligibility({reviewerRecord,session,independentVerification:null}).eligible,false);
 assert.equal(checkEligibility({reviewerRecord:{...reviewerRecord,reviewerType:'AI'},session,independentVerification:verified}).eligible,false);
 assert.equal(checkEligibility({reviewerRecord,session,independentVerification:verified}).eligible,true);
 assert.equal(checkEligibility({reviewerRecord,session,independentVerification:{...verified,notAuthorConfirmed:false}}).eligible,false);
});
test('accepts twelve blinded rows, rejects duplicates, invalid scales, or altered manifest',()=>{
 const x=validSubmission({reviewerId:'reviewer-01',evidenceKind:'HUMAN_REVIEW',sourceManifestDigest:sha256Bytes(canonicalBytes(publicManifest))});
 assert.equal(validateHumanSubmission({rawSubmission:x,session,publicManifest}).rows.length,12);
 assert.throws(()=>validateHumanSubmission({rawSubmission:{...x,sourceManifestDigest:'f'.repeat(64)},session,publicManifest}),/sourceManifestDigest/);
 assert.throws(()=>validateHumanSubmission({rawSubmission:{...x,packageDigest:'f'.repeat(64)},session,publicManifest}),/packageDigest/);
 assert.throws(()=>validateHumanSubmission({rawSubmission:{...x,rows:[x.rows[0],...x.rows.slice(0,11)]},session,publicManifest}),/duplicate/);
});
test('staging requires actual evaluator eligibility, never self claims alone',async()=>{
 const root=await mkdtemp(join(tmpdir(),'staged-review-'));try{
  const input=validSubmission({reviewerId:'reviewer-01',evidenceKind:'HUMAN_REVIEW'});
  await assert.rejects(stageSubmission({submission:input,eligibility:{eligible:false},privateRoot:root}),/eligible/);
  const res=await stageSubmission({submission:input,eligibility:{eligible:true,reviewerId:'reviewer-01'},privateRoot:root});
  assert.match(res.sha256,/^[a-f0-9]{64}$/);
 }finally{await rm(root,{recursive:true,force:true});}
});
