const HEX=/^#[0-9a-f]{6}$/;
const MATERIALS=new Set(['metal','stone','fabric','spirit']);
const plain=o=>o!==null && typeof o==='object' && !Array.isArray(o) && (Object.getPrototypeOf(o)===Object.prototype || Object.getPrototypeOf(o)===null);
const keys=(o,allowed)=>plain(o)&&Object.keys(o).every(k=>allowed.includes(k));
const unit=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
const vec=x=>Array.isArray(x)&&x.length===2&&x.every(unit);
const color=x=>typeof x==='string'&&HEX.test(x);
const width=x=>Number.isInteger(x)&&x>=1&&x<=12;

export function validateAppearance(node,canvas){
 const errors=[];
 const metrics={marks:0,gradients:0,glows:0};
 const a=node?.appearance;
 const bad=path=>errors.push(path);
 if(a===undefined)return {errors,metrics};
 const root='appearance';
 if(!keys(a,['material','basePaint','surfaceMarks','outerGlow']))return {errors:[root+': unexpected field or non-object'],metrics};
 if('material' in a && !MATERIALS.has(a.material))bad(root+'.material');
 if('basePaint' in a){
  const p=a.basePaint;
  if(!plain(p))bad(root+'.basePaint');
  else if(p.kind==='solid'){
   if(!keys(p,['kind','color'])||!color(p.color)||!Object.hasOwn(p,'color'))bad(root+'.basePaint');
  }else if(p.kind==='linearGradient'){
   metrics.gradients=1;
   if(!keys(p,['kind','start','end','stops'])||!vec(p.start)||!vec(p.end)||!Array.isArray(p.stops)||p.stops.length<2||p.stops.length>5)bad(root+'.basePaint');
   else{
    if(p.start[0]===p.end[0]&&p.start[1]===p.end[1])bad(root+'.basePaint.end');
    let last=-1;
    p.stops.forEach((s,i)=>{
     if(!keys(s,['at','color','opacity'])||!Object.hasOwn(s,'at')||!Object.hasOwn(s,'color')||!Object.hasOwn(s,'opacity')||!unit(s.at)||!color(s.color)||!unit(s.opacity)||!(s.at>last)){bad(root+'.basePaint.stops['+i+']');}
     last=s?.at;
    });
    if(p.stops[0]?.at!==0||p.stops.at(-1)?.at!==1)bad(root+'.basePaint.stops.endpoints');
   }
  }else bad(root+'.basePaint.kind');
 }
 if('surfaceMarks' in a){
  const ms=a.surfaceMarks;
  if(!Array.isArray(ms)||ms.length>12)bad(root+'.surfaceMarks');
  else{
   metrics.marks=ms.length;
   ms.forEach((m,i)=>{
    const prefix=root+'.surfaceMarks['+i+']';
    const allowed=m?.kind==='quadratic'?['kind','from','control','to','color','width','opacity']:['kind','from','to','color','width','opacity'];
    if(!keys(m,allowed)||!['line','quadratic'].includes(m.kind)||!vec(m.from)||!vec(m.to)||!color(m.color)||!width(m.width)||!unit(m.opacity)||(m.kind==='quadratic'&&!vec(m.control)))bad(prefix);
    if(plain(m)&&allowed.some(k=>!Object.hasOwn(m,k)))bad(prefix+'.missingField');
   });
  }
 }
 if('outerGlow' in a){
  metrics.glows=1;
  const g=a.outerGlow;
  if(!keys(g,['color','opacity','radius'])||!color(g.color)||!unit(g.opacity)||typeof g.radius!=='number'||!Number.isFinite(g.radius)||g.radius<0||g.radius>4||['color','opacity','radius'].some(k=>!Object.hasOwn(g,k)))bad(root+'.outerGlow');
 }
 if(!plain(canvas)||canvas.width>4096||canvas.height>4096)bad('canvas.appearanceLimits');
 return {errors,metrics};
}
