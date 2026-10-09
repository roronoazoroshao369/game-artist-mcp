import {validateEligibility} from './contracts.mjs';
export function checkEligibility({reviewerRecord,session,independentVerification}){
 const reviewerId=reviewerRecord?.reviewerId;
 if(!reviewerId||reviewerRecord.reviewerType!=='HUMAN'||reviewerRecord.declaration!=='NOT_ART_AUTHOR'||reviewerRecord.blindExposure!=='NOT_EXPOSED')return {eligible:false,reviewerId,reason:'reviewer not eligible or blindness compromised'};
 if(!independentVerification||independentVerification.reviewerId!==reviewerId||independentVerification.realHumanConfirmed!==true||independentVerification.notAuthorConfirmed!==true)return {eligible:false,reviewerId,reason:'verified external human evidence required'};
 try{
  validateEligibility({...reviewerRecord, ...Object.fromEntries(['verificationStatus','verificationMethod','evidenceRef','verifiedBy','verifiedAt','reviewerSignedOrAcknowledgedAt'].map(k=>[k,independentVerification[k]]))});
  return {eligible:true,reviewerId,verificationRef:independentVerification.evidenceRef,verifiedBy:independentVerification.verifiedBy};
 }catch(error){return {eligible:false,reviewerId,reason:error.message};}
}
