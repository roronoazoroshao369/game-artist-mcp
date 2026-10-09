import {validateEligibility} from './contracts.mjs';
export function checkEligibility({reviewerRecord,session,independentVerification}){
 const reviewerId=reviewerRecord?.reviewerId;
 if(!reviewerId||reviewerRecord.reviewerType!=='HUMAN'||reviewerRecord.declaration!=='NOT_ART_AUTHOR'||reviewerRecord.blindExposure!=='NOT_EXPOSED')return {eligible:false,reviewerId,reason:'reviewer not eligible or blindness compromised'};
 if(!independentVerification||independentVerification.reviewerId!==reviewerId||independentVerification.realHumanConfirmed!==true||independentVerification.notAuthorConfirmed!==true)return {eligible:false,reviewerId,reason:'verified external human evidence required'};
 if(!session||independentVerification.sessionId!==session.sessionId||independentVerification.packageDigest!==session.packageDigest)return {eligible:false,reviewerId,reason:'independent verification belongs to a different session/package'};
 if(independentVerification.verifiedBy===reviewerId)return {eligible:false,reviewerId,reason:'reviewer cannot attest own independent verification'};
 if(typeof reviewerRecord.acknowledgedAt!=='string'||reviewerRecord.acknowledgedAt!==independentVerification.reviewerSignedOrAcknowledgedAt)return {eligible:false,reviewerId,reason:'signed declaration timestamp mismatch'};
 const signedAt=Date.parse(reviewerRecord.acknowledgedAt),verifiedAt=Date.parse(independentVerification.verifiedAt),frozenAt=Date.parse(session.frozenAt);
 if(!Number.isFinite(signedAt)||!Number.isFinite(verifiedAt)||!Number.isFinite(frozenAt)||signedAt<frozenAt||verifiedAt<signedAt)return {eligible:false,reviewerId,reason:'verification/declaration must be after session freeze'};
 try{
  validateEligibility({reviewerId,reviewerType:reviewerRecord.reviewerType,declaration:reviewerRecord.declaration,blindExposure:reviewerRecord.blindExposure, ...Object.fromEntries(['verificationStatus','verificationMethod','evidenceRef','verifiedBy','verifiedAt','reviewerSignedOrAcknowledgedAt'].map(k=>[k,independentVerification[k]]))});
  return {eligible:true,reviewerId,sessionId:session.sessionId,packageDigest:session.packageDigest,verificationRef:independentVerification.evidenceRef,verifiedBy:independentVerification.verifiedBy};
 }catch(error){return {eligible:false,reviewerId,reason:error.message};}
}
