import {validateSubmission,canonicalBytes,sha256Bytes} from './contracts.mjs';
import {writeAtomicFile} from './safe-io.mjs';
export function validateHumanSubmission({rawSubmission,session,publicManifest}){
 const x=validateSubmission(rawSubmission,session);
 if(x.evidenceKind!=='HUMAN_REVIEW')throw new Error('evidenceKind must be HUMAN_REVIEW');
 if(!x.reviewerDeclaration)throw new Error('reviewerDeclaration required for independent human review');
 if(Date.parse(x.reviewerDeclaration.acknowledgedAt)<Date.parse(session.frozenAt)||Date.parse(x.reviewerDeclaration.acknowledgedAt)>Date.parse(x.submittedAt))throw new Error('reviewerDeclaration acknowledgment outside evaluation window');
 if(publicManifest.sessionId!==x.sessionId||publicManifest.packageDigest!==x.packageDigest)throw new Error('packageDigest mismatch');
 if(x.evidenceKind==='HUMAN_REVIEW'&&x.sourceManifestDigest!==sha256Bytes(canonicalBytes(publicManifest)))throw new Error('sourceManifestDigest mismatch');
 if(x.evidenceKind&&x.evidenceKind!=='HUMAN_REVIEW'&&x.evidenceKind!=='SYNTHETIC_TEST')throw new Error('unrecognized evidenceKind');
 return x;
}
export async function stageSubmission({submission,eligibility,privateRoot}){
 if(!eligibility?.eligible||eligibility.reviewerId!==submission.reviewerId)throw new Error('eligible verified human required');
 if(eligibility.sessionId!==submission.sessionId||eligibility.packageDigest!==submission.packageDigest)throw new Error('independent verification session/package mismatch');
 if(!/^[a-f0-9]{64}$/.test(submission.sourceManifestDigest||''))throw new Error('sourceManifestDigest required');
 if(submission.evidenceKind!=='HUMAN_REVIEW')throw new Error('HUMAN_REVIEW evidenceKind required');
 if(!submission.reviewerDeclaration||submission.reviewerDeclaration.declaration!=='NOT_ART_AUTHOR'||submission.reviewerDeclaration.reviewerType!=='HUMAN'||submission.reviewerDeclaration.blindExposure!=='NOT_EXPOSED')throw new Error('reviewerDeclaration required');
 if(submission.evidenceKind==='SYNTHETIC_TEST')throw new Error('synthetic fixture cannot be staged as a human review');
 const rawHash=sha256Bytes(canonicalBytes(submission));
 const submissionId=submission.submissionId||submission.reviewerId+'-'+rawHash.slice(0,12);
 const sha256=sha256Bytes(canonicalBytes({...submission,submissionId}));
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(submissionId))throw new Error('submissionId');
 await writeAtomicFile({root:privateRoot,relativePath:'submissions/'+submissionId+'.json',content:canonicalBytes({...submission,submissionId})});
 return {submissionId,sha256,reviewerId:submission.reviewerId};
}
