import {createHash} from 'node:crypto';
import {parseUniqueKeysJsonLine} from '../mcp/strict-json.mjs';
export const PRIMARY_ASSETS=Object.freeze(['cultivation_sword_20261008','medicinal_pouch_20261008','stone_censer_20261008']);
export const SIZES=Object.freeze([64,128]);
export const BLIND_LABELS=Object.freeze(['A','B']);
export const SCORE_KEYS=Object.freeze(['silhouette','material','hierarchy','styleFit','coherence']);
export const RUBRIC_VERSION=1;
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const SAFE=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ensure=(yes,reason)=>{if(!yes)throw new Error(reason);};
const keys=(v,required,optional=[])=>{
 ensure(object(v),'expected object');
 const accepted=new Set([...required,...optional]);
 for(const key of Object.keys(v))ensure(accepted.has(key),'unknown field '+key);
 for(const key of required)ensure(Object.hasOwn(v,key),'missing '+key);
};
const date=(x,k)=>{ensure(typeof x==='string'&&UTC.test(x)&&!Number.isNaN(Date.parse(x)),k+' requires UTC timestamp');};
const id=(x,k)=>ensure(typeof x==='string'&&SAFE.test(x),k+' invalid identifier');
const sha=(x,k,size=64)=>ensure(typeof x==='string'&&(size===40?HEX40:HEX64).test(x),k+' invalid SHA');
const str=(x,k,n=160)=>ensure(typeof x==='string'&&x.length>0&&x.length<=n,k+' invalid string');
export function parseEvaluationJson(rawUtf8){
 ensure(typeof rawUtf8==='string'&&!rawUtf8.startsWith('\ufeff'),'invalid UTF-8 input');
 return parseUniqueKeysJsonLine(rawUtf8);
}
export function canonicalBytes(v){
 function canon(x){
  if(x===null||typeof x==='string'||typeof x==='boolean')return x;
  if(typeof x==='number'){ensure(Number.isFinite(x),'nonfinite value');return x;}
  if(Array.isArray(x))return x.map(canon);
  ensure(object(x),'unsupported JSON type');
  const out={};for(const k of Object.keys(x).sort())out[k]=canon(x[k]);return out;
 }
 return Buffer.from(JSON.stringify(canon(v)),'utf8');
}
export const sha256Bytes=bytes=>createHash('sha256').update(bytes).digest('hex');
export function safeCsvCell(value){
 const text=String(value??'');
 return /^[=+\-@\t\r]/.test(text)?"'"+text:text;
}
const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
export function validateSession(x){
 keys(x,['schemaVersion','sessionId','sourceCommitSha','rendererName','rendererVersion','styleProfileId','rubricVersion','packagerVersion','createdAt','frozenAt','reviewQuorum','primaryAssets','packageDigest'],['sourcePairs','blindedFiles','sealedMappingDigest','state','evidenceKind']);
 ensure(x.schemaVersion===1,'schemaVersion unsupported');
 id(x.sessionId,'sessionId');sha(x.sourceCommitSha,'sourceCommitSha',40);
 str(x.rendererName,'rendererName');str(x.rendererVersion,'rendererVersion');
 id(x.styleProfileId,'styleProfileId');
 ensure(x.rubricVersion===1&&x.packagerVersion===1,'rubricVersion/packagerVersion unsupported');
 date(x.createdAt,'createdAt');date(x.frozenAt,'frozenAt');
 ensure([1,2].includes(x.reviewQuorum),'reviewQuorum must be 1 or 2');
 ensure(same(x.primaryAssets,PRIMARY_ASSETS),'primaryAssets mismatch');
 sha(x.packageDigest,'packageDigest');
 if(x.sealedMappingDigest!==undefined)sha(x.sealedMappingDigest,'sealedMappingDigest');
 if(x.blindedFiles!==undefined)ensure(Array.isArray(x.blindedFiles)&&x.blindedFiles.length===12,'blindedFiles must contain 12');
 if(x.sourcePairs!==undefined)ensure(Array.isArray(x.sourcePairs)&&x.sourcePairs.length===3,'sourcePairs must contain 3');
 return structuredClone(x);
}
export function validateManifest(x){
 keys(x,['schemaVersion','sessionId','rubricVersion','packageDigest','sourceCommitSha','rendererVersion','files','primaryAssets'],['frozenAt','labels','styleProfileId']);
 ensure(x.schemaVersion===1&&x.rubricVersion===1,'manifest version');
 id(x.sessionId,'sessionId');sha(x.packageDigest,'packageDigest');sha(x.sourceCommitSha,'sourceCommitSha',40);
 str(x.rendererVersion,'rendererVersion');ensure(same(x.primaryAssets,PRIMARY_ASSETS),'primaryAssets');
 ensure(Array.isArray(x.files)&&x.files.length===12,'files must have 12 PNG entries');
 if(x.frozenAt)date(x.frozenAt,'frozenAt');
 return structuredClone(x);
}
export function validateEligibility(x){
 keys(x,['reviewerId','reviewerType','declaration','blindExposure','verificationStatus','verificationMethod','evidenceRef','verifiedBy','verifiedAt','reviewerSignedOrAcknowledgedAt'],['conflictDisclosure']);
 id(x.reviewerId,'reviewerId');id(x.verifiedBy,'verifiedBy');
 ensure(x.reviewerType==='HUMAN','reviewerType');ensure(x.declaration==='NOT_ART_AUTHOR','declaration');
 ensure(x.blindExposure==='NOT_EXPOSED','blindExposure');ensure(x.verificationStatus==='VERIFIED_OUT_OF_BAND','verificationStatus');
 str(x.verificationMethod,'verificationMethod');str(x.evidenceRef,'evidenceRef',256);
 date(x.verifiedAt,'verifiedAt');date(x.reviewerSignedOrAcknowledgedAt,'reviewerSignedOrAcknowledgedAt');
 if(x.conflictDisclosure!==undefined)ensure(typeof x.conflictDisclosure==='string'&&x.conflictDisclosure.length<=600,'conflictDisclosure');
 return structuredClone(x);
}
export function validateSubmission(x,session){
 keys(x,['schemaVersion','sessionId','reviewerId','rubricVersion','packageDigest','submittedAt','rows'],['submissionId','notes','sourceManifestDigest','evidenceKind']);
 ensure(x.schemaVersion===1&&x.rubricVersion===1,'submission version');
 ensure(x.sessionId===session.sessionId,'wrong sessionId');
 ensure(x.packageDigest===session.packageDigest,'wrong packageDigest');
 id(x.reviewerId,'reviewerId');date(x.submittedAt,'submittedAt');
 if(x.submissionId)id(x.submissionId,'submissionId');
 if(x.notes!==undefined)ensure(typeof x.notes==='string'&&x.notes.length<=2000,'notes too long');
 ensure(Array.isArray(x.rows)&&x.rows.length===12,'submission requires exactly 12 rows');
 const seen=new Set();
 for(const row of x.rows){
  keys(row,['asset','scale','variant',...SCORE_KEYS],['notes']);
  ensure(PRIMARY_ASSETS.includes(row.asset)&&SIZES.includes(row.scale)&&BLIND_LABELS.includes(row.variant),'invalid review cell');
  const signature=row.asset+'/'+row.scale+'/'+row.variant;
  ensure(!seen.has(signature),'duplicate review cell');seen.add(signature);
  for(const k of SCORE_KEYS)ensure(Number.isInteger(row[k])&&row[k]>=1&&row[k]<=5,'invalid score '+k);
  if(row.notes!==undefined)ensure(typeof row.notes==='string'&&row.notes.length<=600,'row notes too long');
 }
 return structuredClone(x);
}
