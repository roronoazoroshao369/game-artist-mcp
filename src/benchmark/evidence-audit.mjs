import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const FILES = ['run.json','transcript.jsonl','brief.md','initial.png','initial.svg','revised.png','revised.svg','technical-report.json','critique.md'];
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TRACE = 2 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([137,80,78,71,13,10,26,10]);
const SHA = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const TOOLS = new Set(['health','style_profile_get','asset_create','asset_get','document_query','document_apply_ops','render_preview','validate_asset','style_validate','export_asset','export_godot_cutout']);
const OUTCOMES = new Set(['TECHNICAL_PASS','AGENT_PROVENANCE_PENDING','VISUAL_REVIEW_PENDING','FULL_PASS','NEEDS_REDESIGN','INCOMPLETE']);
const utf8 = new TextDecoder('utf-8',{fatal:true});

async function readLimited(directory,name,limit) {
  const path=join(directory,name);
  const mode=constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let handle;
  try {
    handle=await open(path,mode);
    const stat=await handle.stat();
    if(!stat.isFile()) throw new Error('not a regular file');
    if(stat.size>limit) throw new Error('size limit exceeded');
    const parts=[],chunk=Buffer.allocUnsafe(65536);
    let total=0;
    for (;;) {
      const {bytesRead}=await handle.read(chunk,0,Math.min(chunk.length,limit+1-total),null);
      if(bytesRead===0)break;
      total+=bytesRead;
      if(total>limit)throw new Error('size limit exceeded');
      parts.push(Buffer.from(chunk.subarray(0,bytesRead)));
    }
    return Buffer.concat(parts);
  } catch(error) {
    throw new Error(name+': '+(error?.code==='ELOOP'?'symlink refused':error.message));
  } finally {
    await handle?.close();
  }
}

function decode(buffer,name) {
  try {return utf8.decode(buffer);}
  catch {throw new Error(name+': malformed UTF-8');}
}
function json(buffer,name) {
  try {return JSON.parse(decode(buffer,name));}
  catch(error) {throw new Error(name+': '+error.message);}
}
function integer(value){return Number.isSafeInteger(value)&&value>=0;}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function validSvg(data){
 const text=decode(data,'SVG').trim();
 return /^<svg(?:\s|>)[\s\S]*<\/svg>$/.test(text)
   && !/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon[a-z]+\s*=|javascript:/i.test(text);
}
function validateRun(run,errors) {
 if(!object(run)){errors.push('run.json must be an object');return false;}
 for(const key of ['runId','serverVersion','profileId','rendererVersion']){
  if(typeof run[key]!=='string'||run[key].length<1||run[key].length>120)errors.push('invalid '+key);
 }
 if(!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(run.runId??''))errors.push('invalid runId');
 if(!/^[a-z][a-z0-9-]{0,63}$/.test(run.profileId??''))errors.push('invalid profileId');
 if(!SHA.test(run.projectSha??''))errors.push('invalid projectSha');
 if(!HASH.test(run.briefSha256??''))errors.push('invalid briefSha256');
 if(!integer(run.profileVersion)||run.profileVersion!==1)errors.push('invalid profileVersion');
 for(const key of ['toolCalls','operationCount','renderCount','correctionRounds','elapsedMs']){
  if(!integer(run[key]))errors.push('invalid '+key);
 }
 if(!OUTCOMES.has(run.outcome))errors.push('invalid outcome');
 if(run.outcome==='FULL_PASS')errors.push('FULL_PASS requires independently verified external agent provenance and visual review; a local audit cannot grant it');
 if(run.agentProvenance!==undefined && run.agentProvenance!=='UNKNOWN' && run.agentProvenance!=='UNVERIFIED'){
  errors.push('agentProvenance VERIFIED is not independently attested by a local evidence bundle');
 }
 return true;
}

function inspectTranscript(raw,run,errors) {
 const rows=decode(raw,'transcript.jsonl').trim().split('\n');
 if(rows.length>5000)throw new Error('transcript.jsonl: line limit exceeded');
 if(rows.length===1&&!rows[0])throw new Error('transcript.jsonl: empty trace');
 const events=rows.map((line,index)=>{
  try{return JSON.parse(line);}
  catch{throw new Error('transcript.jsonl: malformed JSON at line '+(index+1));}
 });
 let revision=null,asset=null,createCount=0,ops=0,renders=0,corrections=0,firstRenderRev=null,revisionAtLastRender=null;
 let pendingCorrection=false,lastStyleRev=null,lastValidationRev=null,lastExportRev=null;
 let errorsInCalls=0;
 const observed=new Set();
 events.forEach((e,index)=>{
  if(!object(e)||e.id!==index+1) {errors.push('transcript request id sequence invalid at line '+(index+1));return;}
  if(!TOOLS.has(e.tool)||!object(e.arguments)||!object(e.result)) {errors.push('transcript tool, arguments or matched result invalid at id '+e.id);return;}
  observed.add(e.tool);
  if(e.result.isError===true || e.result.error){errorsInCalls++;return;}
  const arg=e.arguments,result=e.result;
  if(e.tool==='style_profile_get' && (arg.profile_id!==run.profileId || result.profile?.id!==run.profileId)){
   errors.push('style profile lookup inconsistent at id '+e.id);
  }
  if(e.tool==='asset_create') {
   createCount++;
   if(createCount!==1 || revision!==null || !arg.asset_id || result.revision!==0){errors.push('invalid asset_create order/revision');return;}
   asset=arg.asset_id;revision=0;
  }
  const affectsAsset=new Set(['asset_get','document_query','document_apply_ops','render_preview','validate_asset','style_validate','export_asset','export_godot_cutout']);
  if(affectsAsset.has(e.tool)&&(!asset||arg.asset_id!==asset)){errors.push('asset id mismatch or call before create at id '+e.id);return;}
  if(e.tool==='document_apply_ops'){
   const batch=arg.operations;
   if(!Array.isArray(batch)||batch.length<1||batch.length>50 || batch.some(op=>!object(op)||typeof op.type!=='string'))errors.push('invalid art operations at id '+e.id);
   else ops+=batch.length;
   if(arg.expected_revision!==revision || result.revision!==revision+1){errors.push('revision transition invalid at id '+e.id);return;}
   revision=result.revision;
   if(renders>0 && !pendingCorrection){corrections++;pendingCorrection=true;}
  }
  if(e.tool==='render_preview') {
   if(revision===null||revision===0||result.revision!==revision){errors.push('render revision invalid at id '+e.id);return;}
   if(renders===1 && (!pendingCorrection||revision<=firstRenderRev))errors.push('missing image-inspection-to-edit-to-render revision');
   if(renders===0)firstRenderRev=revision;
   renders++;revisionAtLastRender=revision;pendingCorrection=false;
  }
  if(e.tool==='validate_asset'){
   if(result.revision!==revision||result.ok!==true)errors.push('Art IR validation not passing at current revision');
   else lastValidationRev=revision;
  }
  if(e.tool==='style_validate'){
   if(arg.profile_id!==run.profileId||result.revision!==revision||result.ok!==true||result.profileId!==run.profileId)errors.push('style validation not passing at current revision');
   else lastStyleRev=revision;
  }
  if(e.tool==='export_asset'){
   if(result.revision!==revision)errors.push('export revision mismatch');
   else lastExportRev=revision;
  }
 });
 if(createCount!==1)errors.push('expected exactly one asset_create');
 if(renders<2||firstRenderRev===null||revisionAtLastRender!==revision)errors.push('requires initial and revised PNG renders at final revision');
 if(corrections<1)errors.push('at least one correction round required');
 if(lastStyleRev!==revision||lastValidationRev!==revision||lastExportRev!==revision)errors.push('current revision requires validate_asset, style_validate and export_asset');
 if(!observed.has('style_profile_get'))errors.push('missing style_profile_get call');
 const metrics={toolCalls:events.length,operationCount:ops,renderCount:renders,correctionRounds:corrections,errorCount:errorsInCalls,finalRevision:revision};
 for(const key of ['toolCalls','operationCount','renderCount','correctionRounds']){
  if(metrics[key]!==run[key])errors.push(key+' counter mismatch');
 }
 return metrics;
}

/**
 * Structural checker only. No local file bundle can prove an agent authored
 * the geometry, saw the image, or passed independent aesthetic review.
 */
export async function auditEvidence(directory) {
 const errors=[],warnings=[];
 const metrics={toolCalls:0,operationCount:0,renderCount:0,correctionRounds:0,errorCount:0,finalRevision:null};
 const report=()=>({ok:errors.length===0,errors,warnings,metrics,autonomyVerified:false,visualQualityVerified:false});
 try {
  const root=resolve(directory);
  const st=await lstat(root);
  if(!st.isDirectory()||st.isSymbolicLink())throw new Error('evidence directory must be a real directory');
  const files={};
  for(const name of FILES){
   try{files[name]=await readLimited(root,name,name==='transcript.jsonl'?MAX_TRACE:MAX_FILE);}
   catch(error){errors.push(error.message);}
  }
  if(errors.length)return report();
  const run=json(files['run.json'],'run.json');
  if(!validateRun(run,errors))return report();
  const actualHash=createHash('sha256').update(files['brief.md']).digest('hex');
  if(actualHash!==run.briefSha256)errors.push('brief SHA-256 hash mismatch');
  for(const name of ['initial.png','revised.png']){
   if(files[name].length<=PNG_MAGIC.length || !files[name].subarray(0,PNG_MAGIC.length).equals(PNG_MAGIC))errors.push(name+': PNG signature invalid');
  }
  for(const name of ['initial.svg','revised.svg']){
   if(!validSvg(files[name]))errors.push(name+': malformed or unsafe SVG');
  }
  if(!decode(files['brief.md'],'brief.md').trim())errors.push('brief.md empty');
  if(decode(files['critique.md'],'critique.md').trim().length<30)errors.push('critique.md must describe visual findings and edits');
  const technical=json(files['technical-report.json'],'technical-report.json');
  try{Object.assign(metrics,inspectTranscript(files['transcript.jsonl'],run,errors));}
  catch(error){errors.push(error.message);}
  if(!object(technical)||technical.profileId!==run.profileId)errors.push('technical report profileId mismatch');
  if(technical?.revision!==metrics.finalRevision)errors.push('technical report revision mismatch');
  if(technical?.artIr?.ok!==true)errors.push('technical report Art IR validation failed');
  if(technical?.style?.ok!==true)errors.push('technical report style validation failed');
  if(!['PENDING','SELF_REVIEW','INDEPENDENT_REVIEW_PENDING','INDEPENDENT_REVIEWED'].includes(technical?.reviewerStatus))errors.push('technical report reviewerStatus invalid');
  if(run.toolCalls>50)warnings.push('art MCP tool call budget exceeded (50)');
  if(run.correctionRounds>5)warnings.push('visual correction budget exceeded (5)');
  warnings.push('STRUCTURAL ONLY: agent authorship and independent visual review require external attestation');
 }catch(error){errors.push(error.message);}
 return report();
}
