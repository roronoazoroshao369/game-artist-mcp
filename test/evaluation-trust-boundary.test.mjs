import test from 'node:test';
import assert from 'node:assert/strict';
import {validSession,validSubmission} from './fixtures/evaluation-fixtures.mjs';
import {checkEligibility} from '../src/evaluation/reviewers.mjs';
import {validateHumanSubmission,stageSubmission} from '../src/evaluation/submissions.mjs';
import {canonicalBytes,sha256Bytes} from '../src/evaluation/contracts.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const session=validSession();
const manifest={sessionId:session.sessionId,packageDigest:session.packageDigest};
const attestation={reviewerType:'HUMAN',declaration:'NOT_ART_AUTHOR',blindExposure:'NOT_EXPOSED',acknowledgedAt:'2026-10-09T00:59:00Z'};
const record={reviewerId:'independent-person',...attestation};
const evidence={reviewerId:record.reviewerId,sessionId:session.sessionId,packageDigest:session.packageDigest,verificationStatus:'VERIFIED_OUT_OF_BAND',verificationMethod:'out-of-band contact',evidenceRef:'offline-verified-001',verifiedBy:'external-operator',verifiedAt:'2026-10-09T01:30:00Z',reviewerSignedOrAcknowledgedAt:attestation.acknowledgedAt,realHumanConfirmed:true,notAuthorConfirmed:true};
const human=(overrides={})=>validSubmission({reviewerId:record.reviewerId,evidenceKind:'HUMAN_REVIEW',reviewerDeclaration:attestation,sourceManifestDigest:sha256Bytes(canonicalBytes(manifest)),...overrides});
test('out-of-band eligibility must bind exactly to frozen session and package, never replay across sessions',()=>{
 assert.equal(checkEligibility({reviewerRecord:record,session,independentVerification:evidence}).eligible,true);
 for(const changed of [{sessionId:'another-review'},{packageDigest:'b'.repeat(64)},{verifiedBy:record.reviewerId},{verifiedAt:'2026-10-08T00:00:00Z'}]){
  assert.equal(checkEligibility({reviewerRecord:record,session,independentVerification:{...evidence,...changed}}).eligible,false,JSON.stringify(changed));
 }
 assert.equal(checkEligibility({reviewerRecord:{...record,acknowledgedAt:'2026-10-09T01:02:00Z'},session,independentVerification:evidence}).eligible,false);
});
test('a human submission must contain explicit reviewer-authored declaration and honest HUMAN_REVIEW classification',()=>{
 assert.equal(validateHumanSubmission({rawSubmission:human(),session,publicManifest:manifest}).evidenceKind,'HUMAN_REVIEW');
 assert.throws(()=>validateHumanSubmission({rawSubmission:human({reviewerDeclaration:undefined}),session,publicManifest:manifest}),/reviewerDeclaration/i);
 assert.throws(()=>validateHumanSubmission({rawSubmission:human({reviewerDeclaration:{...attestation,declaration:'ART_AUTHOR'}}),session,publicManifest:manifest}),/declaration|author/i);
 assert.throws(()=>validateHumanSubmission({rawSubmission:human({evidenceKind:undefined}),session,publicManifest:manifest}),/evidenceKind/i);
 assert.throws(()=>validateHumanSubmission({rawSubmission:human({evidenceKind:'SYNTHETIC_TEST'}),session,publicManifest:manifest}),/HUMAN_REVIEW/i);
});
test('staging cannot silently elevate an unknown/synthetic submission into a human review',async()=>{
 const root=await mkdtemp(join(tmpdir(),'game-artist-trust-'));try{
  const eligibility={eligible:true,reviewerId:record.reviewerId,sessionId:session.sessionId,packageDigest:session.packageDigest,verificationRef:evidence.evidenceRef};
  await assert.rejects(stageSubmission({submission:human({evidenceKind:undefined}),eligibility,privateRoot:root}),/HUMAN_REVIEW/i);
  await assert.rejects(stageSubmission({submission:human({reviewerDeclaration:undefined}),eligibility,privateRoot:root}),/reviewerDeclaration/i);
  await assert.rejects(stageSubmission({submission:human(),eligibility:{...eligibility,sessionId:'wrong-session',packageDigest:session.packageDigest},privateRoot:root}),/session|package/i);
  const receipt=await stageSubmission({submission:human(),eligibility:{...eligibility,sessionId:session.sessionId,packageDigest:session.packageDigest},privateRoot:root});
  assert.match(receipt.sha256,/^[a-f0-9]{64}$/);
 }finally{await rm(root,{recursive:true,force:true});}
});
