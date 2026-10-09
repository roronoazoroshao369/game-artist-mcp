import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {inflateSync} from 'node:zlib';
import {randomBytes} from 'node:crypto';
import {ASSETS,loadRevisedDocument,createMaterialPair} from '../benchmark/real-asset-pairs.mjs';
import {assertSameGeometryPair} from '../benchmark/appearance-pair.mjs';
import {renderSvg} from '../core/render-svg.mjs';
import {renderReviewPng} from '../benchmark/render-review.mjs';
import {sha256Bytes,canonicalBytes,validateSession,validateManifest,PRIMARY_ASSETS} from './contracts.mjs';
import {readBoundedFile,writeAtomicFile} from './safe-io.mjs';
const hex=content=>sha256Bytes(Buffer.isBuffer(content)?content:Buffer.from(content));
function crc32(buffer){let crc=0xffffffff;for(const b of buffer){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function validatePngBytes(bytes,width,height){
 if(!Buffer.isBuffer(bytes)||bytes.length<60||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('PNG signature');
 let offset=8,ihdr=0,idat=[],iend=false,colorType;
 while(offset<bytes.length){
  if(offset+12>bytes.length)throw new Error('truncated PNG');
  const len=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
  if(len>4*1024*1024||len+12>bytes.length-offset)throw new Error('PNG chunk budget');
  const chunk=bytes.subarray(offset+4,offset+8+len);
  if(crc32(chunk)!==bytes.readUInt32BE(offset+8+len))throw new Error('PNG CRC');
  if(type==='IHDR'){
   if(++ihdr!==1||len!==13||offset!==8)throw new Error('PNG IHDR');
   if(bytes.readUInt32BE(offset+8)!==width||bytes.readUInt32BE(offset+12)!==height)throw new Error('PNG dimensions');
   if(bytes[offset+16]!==8||![4,6].includes(bytes[offset+17])||bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]!==0)throw new Error('PNG alpha/format');
   colorType=bytes[offset+17];
  }else if(type==='IDAT'){idat.push(bytes.subarray(offset+8,offset+8+len));}
  else if(type==='IEND'){if(len!==0||offset+12!==bytes.length)throw new Error('PNG IEND');iend=true;break;}
  else if(/^[A-Z]/.test(type)&&!['PLTE'].includes(type))throw new Error('unsupported critical PNG chunk');
  offset+=12+len;
 }
 if(!iend||ihdr!==1||!idat.length)throw new Error('PNG incomplete');
 const channels=colorType===6?4:2;
 const expectedRaw=height*(1+width*channels);
 const raw=inflateSync(Buffer.concat(idat),{maxOutputLength:expectedRaw+1});
 if(raw.length!==expectedRaw)throw new Error('PNG pixel payload length');
 for(let y=0;y<height;y++)if(raw[y*(1+width*channels)]>4)throw new Error('PNG unsupported scanline filter');
 return {width,height,colorType};
}
const canvasFiles=(asset)=>['A','B'].flatMap(label=>[64,128].map(size=>({asset,label,size})));
const fileName=(asset,label,size)=>asset+'/'+label+'-'+size+'.png';
export async function freezeSourceSession({sessionId,sourceCommitSha,reviewQuorum,rendererVersion,styleProfileId,createdAt,frozenAt,outputRoot}){
 if(!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(sessionId||''))throw new Error('sessionId');
 if(!/^[a-f0-9]{40}$/.test(sourceCommitSha||''))throw new Error('sourceCommitSha');
 const root=resolve(outputRoot);
 await mkdir(join(root,'review'),{recursive:true});
 await mkdir(join(root,'internal'),{recursive:true,mode:0o700});
 const sourcePairs=[],files=[],mapping={};
 for(const asset of PRIMARY_ASSETS){
  const {document}=await loadRevisedDocument(asset);
  const {baseline,enhanced}=createMaterialPair(asset,document);
  assertSameGeometryPair(baseline,enhanced);
  const variants={baseline,enhanced};
  const src={asset,sourceHashes:{},svgHashes:{}};
  for(const [role,doc] of Object.entries(variants)){
   const json=Buffer.from(JSON.stringify(doc));
   const svg=Buffer.from(renderSvg(doc));
   src.sourceHashes[role]=hex(json);src.svgHashes[role]=hex(svg);
   await writeAtomicFile({root,relativePath:'internal/'+asset+'-'+role+'.json',content:json});
   await writeAtomicFile({root,relativePath:'internal/'+asset+'-'+role+'.svg',content:svg});
  }
  sourcePairs.push(src);
  const flip=randomBytes(1)[0]%2!==0;
  mapping[asset]=flip?{A:'enhanced',B:'baseline'}:{A:'baseline',B:'enhanced'};
  for(const {label,size} of canvasFiles(asset)){
   const path=fileName(asset,label,size),outputFile=join(root,'review',path);
   await mkdir(join(root,'review',asset),{recursive:true});
   const rendered=await renderReviewPng({document:variants[mapping[asset][label]],limitPx:size,outputFile});
   if(rendererVersion!==rendered.rendererVersion)throw new Error('rendererVersion mismatch');
   const png=await readFile(outputFile);
   validatePngBytes(png,rendered.width,rendered.height);
   files.push({asset,label,size,path,width:rendered.width,height:rendered.height,sha256:hex(png)});
  }
 }
 const sealed={schemaVersion:1,sessionId,mapping,sourceCommitSha};
 const sealedRaw=canonicalBytes(sealed);const sealedMappingDigest=hex(sealedRaw);
 await writeAtomicFile({root,relativePath:'internal/sealed-mapping.json',content:sealedRaw});
 const content={sessionId,sourceCommitSha,rendererVersion,styleProfileId,reviewQuorum,sourcePairs,files,sealedMappingDigest};
 const packageDigest=hex(canonicalBytes(content));
 const session=validateSession({schemaVersion:1,sessionId,sourceCommitSha,rendererName:'rsvg-convert',rendererVersion,styleProfileId,rubricVersion:1,packagerVersion:1,createdAt,frozenAt,reviewQuorum,primaryAssets:[...PRIMARY_ASSETS],packageDigest,sourcePairs,blindedFiles:files,sealedMappingDigest,state:'PREFLIGHT_PASSED',evidenceKind:'UNSCORED'});
 const publicManifest=validateManifest({schemaVersion:1,sessionId,rubricVersion:1,packageDigest,sourceCommitSha,rendererVersion,primaryAssets:[...PRIMARY_ASSETS],frozenAt,files});
 await writeAtomicFile({root,relativePath:'internal/session.json',content:canonicalBytes(session)});
 await writeAtomicFile({root,relativePath:'review/manifest.json',content:canonicalBytes(publicManifest)});
 return {session,publicManifest,privateMapping:sealed,root};
}
export async function preflightSession({session,publicManifest,privateMapping,root,rerender=true}){
 const errors=[];
 try{
  validateSession(session);validateManifest(publicManifest);
  if(session.packageDigest!==publicManifest.packageDigest||session.sessionId!==publicManifest.sessionId)throw new Error('manifest mismatch');
  const sealed=await readBoundedFile({root,relativePath:'internal/sealed-mapping.json',maxBytes:8192});
  if(hex(sealed)!==session.sealedMappingDigest||hex(canonicalBytes(privateMapping))!==session.sealedMappingDigest)throw new Error('sealed mapping hash');
  const expectedContent={sessionId:session.sessionId,sourceCommitSha:session.sourceCommitSha,rendererVersion:session.rendererVersion,styleProfileId:session.styleProfileId,reviewQuorum:session.reviewQuorum,sourcePairs:session.sourcePairs,files:session.blindedFiles,sealedMappingDigest:session.sealedMappingDigest};
  if(hex(canonicalBytes(expectedContent))!==session.packageDigest)throw new Error('session package digest');
  if(JSON.stringify(publicManifest.files)!==JSON.stringify(session.blindedFiles))throw new Error('manifest file set');
  if(publicManifest.files.length!==12||new Set(publicManifest.files.map(f=>f.path)).size!==12)throw new Error('12 files required');
  for(const src of session.sourcePairs){
   const before=JSON.parse((await readBoundedFile({root,relativePath:'internal/'+src.asset+'-baseline.json',maxBytes:524288})).toString());
   const after=JSON.parse((await readBoundedFile({root,relativePath:'internal/'+src.asset+'-enhanced.json',maxBytes:524288})).toString());
   assertSameGeometryPair(before,after);
   for(const [role,doc] of Object.entries({baseline:before,enhanced:after})){
    if(hex(Buffer.from(JSON.stringify(doc)))!==src.sourceHashes[role]||hex(Buffer.from(renderSvg(doc)))!==src.svgHashes[role])throw new Error('source document hash');
   }
  }
  for(const f of publicManifest.files){
   if(!PRIMARY_ASSETS.includes(f.asset)||!['A','B'].includes(f.label)||![64,128].includes(f.size)||f.path!==fileName(f.asset,f.label,f.size)||Math.max(f.width,f.height)!==f.size)throw new Error('file manifest shape');
   const png=await readBoundedFile({root,relativePath:'review/'+f.path,maxBytes:4194304});
   if(hex(png)!==f.sha256)throw new Error('PNG hash mismatch');
   validatePngBytes(png,f.width,f.height);
   if(rerender){
    const role=privateMapping.mapping[f.asset][f.label];
    const doc=JSON.parse((await readBoundedFile({root,relativePath:'internal/'+f.asset+'-'+role+'.json',maxBytes:524288})).toString());
    if(hex(Buffer.from(renderSvg(doc)))!==session.sourcePairs.find(s=>s.asset===f.asset).svgHashes[role])throw new Error('source SVG mismatch');
    const checkRoot=await mkdtemp(join(tmpdir(),'evaluation-png-verify-'));
    try{
     const expected=await renderReviewPng({document:doc,limitPx:f.size,outputFile:join(checkRoot,'verified.png')});
     if(expected.rendererVersion!==session.rendererVersion||expected.sha256!==f.sha256||expected.width!==f.width||expected.height!==f.height)throw new Error('rerendered PNG bytes disagree with frozen manifest');
    }finally{await rm(checkRoot,{recursive:true,force:true});}
   }
  }
 }catch(e){errors.push(e.message);}
 return {technicalStatus:errors.length?'TECHNICAL_NO_GO':'TECHNICAL_PASS',errors};
}
