import { validateDocument } from '../core/validate.mjs';
import { validateStyleProfile } from './profile.mjs';
const HEX=/^#[0-9a-fA-F]{6}$/;

export function inspectStyle(document,profile){
 const errors=[], warnings=[];
 const metrics={nodeCount:Array.isArray(document?.nodes)?document.nodes.length:0,distinctColors:0,observedColors:[],outOfPaletteColors:[],missingStrokeWidthIds:[],invalidStrokeWidthIds:[]};
 const p=validateStyleProfile(profile);
 const d=validateDocument(document);
 if(!p.ok)errors.push(...p.errors.map(x=>'profile: '+x));
 if(!d.ok)errors.push(...d.errors.map(x=>'document: '+x));
 if(!p.ok || !d.ok)return {ok:false,errors,warnings,profileId:typeof profile?.id==='string'?profile.id:null,metrics};
 const observed=new Set(),outOfPalette=new Set();
 const hasAppearance=document.nodes.some(n=>n.appearance!==undefined);
 const appearanceMetrics={marks:0,gradients:0,glows:0};
 const palette=new Set(profile.palette.allowedHex);
 for(const node of document.nodes){
  for(const key of ['fill','stroke']){
   const raw=(key==='fill' && node.appearance?.basePaint)?'none':(node[key]??'none');
   if(raw==='none')continue;
   if(typeof raw!=='string'||!HEX.test(raw)){
    errors.push(`node ${node.id}: invalid ${key} paint`);continue;
   }
   const color=raw.toLowerCase();observed.add(color);
   if(!palette.has(color))outOfPalette.add(color);
  }
  const a=node.appearance;
  if(a){
   const appearanceColors=[];
   if(a.basePaint?.kind==='solid')appearanceColors.push(a.basePaint.color);
   if(a.basePaint?.kind==='linearGradient'){
    appearanceMetrics.gradients++;
    appearanceColors.push(...a.basePaint.stops.map(s=>s.color));
   }
   if(a.surfaceMarks){
    appearanceMetrics.marks+=a.surfaceMarks.length;
    for(const mark of a.surfaceMarks){
     appearanceColors.push(mark.color);
     if(!profile.stroke.allowedWidths.includes(mark.width)){
      errors.push('node '+node.id+': mark stroke width not allowed');
     }
    }
   }
   if(a.outerGlow){
    appearanceMetrics.glows++;appearanceColors.push(a.outerGlow.color);
   }
   for(const c of appearanceColors){
    const color=c.toLowerCase();
    observed.add(color);
    if(!palette.has(color))outOfPalette.add(color);
   }
  }
  if(node.stroke!==undefined && node.stroke!==null && node.stroke!=='none'){
   if(node.strokeWidth===undefined || node.strokeWidth===null){metrics.missingStrokeWidthIds.push(node.id);errors.push(`node ${node.id}: missing stroke width`);}
   else if(!Number.isInteger(node.strokeWidth)||node.strokeWidth<profile.stroke.minWidth||node.strokeWidth>profile.stroke.maxWidth||!profile.stroke.allowedWidths.includes(node.strokeWidth)){
    metrics.invalidStrokeWidthIds.push(node.id);errors.push(`node ${node.id}: invalid stroke width`);
   }
  }
 }
 metrics.observedColors=[...observed].sort();metrics.distinctColors=observed.size;
 if(hasAppearance)metrics.appearance=appearanceMetrics;
 metrics.outOfPaletteColors=[...outOfPalette].sort();
 metrics.missingStrokeWidthIds.sort();metrics.invalidStrokeWidthIds.sort();
 if(outOfPalette.size)errors.push('out-of-palette colors: '+metrics.outOfPaletteColors.join(', '));
 if(observed.size>profile.palette.maxDistinctColors)errors.push('distinct color budget exceeded');
 if(document.nodes.length>profile.complexity.maxNodes)errors.push('node budget exceeded');
 return {ok:errors.length===0,errors,warnings,profileId:profile.id,metrics};
}
