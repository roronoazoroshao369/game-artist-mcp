import {canonicalBytes,sha256Bytes} from './contracts.mjs';
import {writeAtomicFile} from './safe-io.mjs';
import {transitionSession} from './lifecycle.mjs';
const HASH=/^[a-f0-9]{64}$/;
export async function lockReview({session,submissions,verifiedEligibility,evaluatorId,lockedAt,privateRoot}){
 if(session.state!=='COLLECTING')throw new Error('review session must be COLLECTING');
 if(!Array.isArray(submissions)||submissions.length!==session.reviewQuorum)throw new Error('REVIEW_PENDING: quorum not met');
 if(!Array.isArray(verifiedEligibility)||verifiedEligibility.length!==session.reviewQuorum)throw new Error('REVIEW_PENDING: eligible verified reviewers required');
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(evaluatorId)||Number.isNaN(Date.parse(lockedAt)))throw new Error('lock metadata');
 const ids=submissions.map(s=>s.reviewerId);if(new Set(ids).size!==session.reviewQuorum)throw new Error('REVIEW_PENDING: duplicate reviewer');
 for(const s of submissions){
  if(s.sessionId!==session.sessionId||s.packageDigest!==session.packageDigest||s.rows?.length!==12||s.evidenceKind!=='HUMAN_REVIEW')throw new Error('REVIEW_PENDING: invalid human submission');
  if(!verifiedEligibility.some(v=>v.eligible===true&&v.reviewerId===s.reviewerId&&v.sessionId===session.sessionId&&v.packageDigest===session.packageDigest&&v.verificationRef&&v.verifiedBy!==s.reviewerId))throw new Error('REVIEW_PENDING: missing session-bound independent eligibility');
 }
 const refs=verifiedEligibility.map(e=>e.verificationRef);
 if(refs.some(r=>typeof r!=='string'||!r)||new Set(refs).size!==session.reviewQuorum)throw new Error('REVIEW_PENDING: duplicate/invalid verificationRef across reviewers');
 const entries=submissions.map(s=>({reviewerId:s.reviewerId,submissionId:s.submissionId||s.reviewerId,sha256:sha256Bytes(canonicalBytes(s))})).sort((a,b)=>a.reviewerId.localeCompare(b.reviewerId));
 const body={schemaVersion:1,sessionId:session.sessionId,packageDigest:session.packageDigest,reviewQuorum:session.reviewQuorum,submissions:entries,evaluatorId,lockedAt};
 const lockDigest=sha256Bytes(canonicalBytes(body));
 const lock={...body,lockDigest};
 await writeAtomicFile({root:privateRoot,relativePath:'lock.json',content:canonicalBytes(lock)});
 return lock;
}
export async function revealMapping({session,reviewLock,sealedMapping,sourceRoleHashes,actorId,revealedAt}){
 if(!reviewLock||reviewLock.lockDigest!==sha256Bytes(canonicalBytes(Object.fromEntries(Object.entries(reviewLock).filter(([k])=>k!=='lockDigest')))))throw new Error('valid review lock required');
 if(reviewLock.sessionId!==session.sessionId||reviewLock.packageDigest!==session.packageDigest)throw new Error('review lock mismatch');
 if(!sealedMapping||sha256Bytes(canonicalBytes(sealedMapping))!==session.sealedMappingDigest)throw new Error('sealed mapping hash mismatch');
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(actorId)||Number.isNaN(Date.parse(revealedAt)))throw new Error('reveal metadata');
 if(!sourceRoleHashes||typeof sourceRoleHashes!=='object')throw new Error('sourceRoleHashes required');
 for(const f of session.blindedFiles){
  const role=sealedMapping.mapping[f.asset]?.[f.label];
  if(!['baseline','enhanced'].includes(role)||sourceRoleHashes[f.asset]?.[role]?.[f.size]!==f.sha256)throw new Error('source role PNG hash mismatch');
 }
 return {sessionId:session.sessionId,lockDigest:reviewLock.lockDigest,mapping:structuredClone(sealedMapping.mapping),actorId,revealedAt,verified:true,evidenceHash:sha256Bytes(canonicalBytes(sourceRoleHashes))};
}
