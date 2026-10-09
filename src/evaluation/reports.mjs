export function buildPrivateReport({session,preflight,reviewLock,reveal,verdict,advice,evaluatorId,createdAt,evidenceKind='UNSCORED'}){
 const technicalStatus=preflight.technicalStatus;
 const humanBacked=evidenceKind==='HUMAN_REVIEW'&&reviewLock?.submissions?.length===session.reviewQuorum&&!!reveal?.verified;
 const visualStatus=humanBacked?verdict.visualStatus:'REVIEW_PENDING';
 return {schemaVersion:1,sessionId:session.sessionId,sourceCommitSha:session.sourceCommitSha,rendererVersion:session.rendererVersion,rubricVersion:session.rubricVersion,reviewQuorum:session.reviewQuorum,packageDigest:session.packageDigest,technicalStatus,visualStatus,
  independentReviewerCount:humanBacked?reviewLock.submissions.length:0,
  confidence:humanBacked?verdict.confidence:null,
  liveVisualGoClaim:humanBacked&&visualStatus==='VISUAL_GO',
  evidenceKind,agentProvenance:'AGENT_PROVENANCE_PENDING',
  failures:verdict.failures||[],deltas:humanBacked?(verdict.deltas||{}):{},scores:humanBacked?(verdict.scores||{}):{},
  reviewLockDigest:reviewLock?.lockDigest||null,mappingEvidenceHash:reveal?.evidenceHash||null,
  reviewerIds:humanBacked?reviewLock.submissions.map(x=>x.reviewerId):[],
  advice:advice?.kind==='ADVISORY_ONLY'?advice:{kind:'ADVISORY_ONLY',status:'AI_TRIAGE_UNAVAILABLE'},
  evaluatorId,createdAt};
}
export function redactPublicReport(privateReport){
 const allowed=['schemaVersion','sessionId','sourceCommitSha','rendererVersion','rubricVersion','reviewQuorum','packageDigest','technicalStatus','visualStatus','independentReviewerCount','confidence','liveVisualGoClaim','evidenceKind','agentProvenance','failures','deltas','scores','reviewLockDigest','mappingEvidenceHash','reviewerIds','createdAt'];
 return Object.fromEntries(allowed.filter(k=>Object.hasOwn(privateReport,k)).map(k=>[k,structuredClone(privateReport[k])]));
}
