import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {renderSvg} from '../core/render-svg.mjs';
import {checkRenderBudget} from '../mcp/render-budget.mjs';
const exec=promisify(execFile);
export async function renderReviewPng({document,limitPx,rendererPath='rsvg-convert',outputFile}){
 if(![64,128].includes(limitPx))throw new Error('limitPx must be 64 or 128');
 const {width,height}=document.canvas;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('invalid canvas');
 const scale=limitPx/Math.max(width,height);
 const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
 const svg=renderSvg(document);
 checkRenderBudget(svg);
 const tmp=await mkdtemp(join(tmpdir(),'game-artist-poc005b-'));
 try{
  const input=join(tmp,'source.svg');
  await writeFile(input,svg,'utf8');
  await exec(rendererPath,['--format=png','--width='+w,'--height='+h,'--output='+outputFile,input],{timeout:8000,maxBuffer:1048576});
  const png=await readFile(outputFile);
  checkRenderBudget(svg,png);
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==w||png.readUInt32BE(20)!==h)throw new Error('unexpected rendered PNG dimensions');
  const version=(await exec(rendererPath,['--version'],{timeout:8000})).stdout.trim();
  return {width:w,height:h,sha256:createHash('sha256').update(png).digest('hex'),rendererVersion:version};
 }finally{await rm(tmp,{recursive:true,force:true});}
}
