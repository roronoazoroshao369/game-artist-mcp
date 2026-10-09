import {validateSubmission,canonicalBytes,sha256Bytes} from './contracts.mjs';
import {writeAtomicFile} from './safe-io.mjs';
export function validateHumanSubmission({rawSubmission,session,publicManifest}){
 const x=validateSubmission(rawSubmission,session);
 if(publicManifest.sessionId!==x.sessionId||publicManifest.packageDigest!==x.packageDigest)throw new Error('sourceManifestDigest / packageDigest mismatch');
 if(x.evidenceKind&&x.evidenceKind!=='HUMAN_REVIEW'&&x.evidenceKind!=='SYNTHETIC_TEST')throw new Error('unrecognized evidenceKind');
 return x;
}
export async function stageSubmission({submission,eligibility,privateRoot}){
 if(!eligibility?.eligible||eligibility.reviewerId!==submission.reviewerId)throw new Error('eligible verified human required');
 if(submission.evidenceKind==='SYNTHETIC_TEST')throw new Error('synthetic fixture cannot be staged as a human review');
 const rawHash=sha256Bytes(canonicalBytes(submission));
 const submissionId=submission.submissionId||submission.reviewerId+'-'+rawHash.slice(0,12);
 const sha256=sha256Bytes(canonicalBytes({...submission,submissionId}));
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(submissionId))throw new Error('submissionId');
 await writeAtomicFile({root:privateRoot,relativePath:'submissions/'+submissionId+'.json',content:canonicalBytes({...submission,submissionId})});
 return {submissionId,sha256,reviewerId:submission.reviewerId};
}
