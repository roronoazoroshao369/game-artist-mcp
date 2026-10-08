const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const style=(node,fill)=>[
 'fill="'+esc(fill??node.fill??'none')+'"','stroke="'+esc(node.stroke??'none')+'"',
 'stroke-width="'+esc(node.strokeWidth??0)+'"','stroke-linecap="'+esc(node.lineCap??'round')+'"',
 'stroke-linejoin="'+esc(node.lineJoin??'round')+'"','opacity="'+esc(node.opacity??1)+'"',
 ...(node.transform?['transform="'+esc(node.transform)+'"']:[])
].join(' ');
const attrs=node=>{
 if(node.type==='path')return 'd="'+esc(node.d)+'"';
 if(node.type==='ellipse')return ['cx','cy','rx','ry'].map(k=>k+'="'+node[k]+'"').join(' ');
 if(node.type==='polygon')return 'points="'+node.points.map(([x,y])=>x+','+y).join(' ')+'"';
 throw new Error('unsupported node type');
};
function shape(node,fill,extra=''){
 return '  <'+node.type+' id="'+esc(node.id)+'" '+attrs(node)+' '+style(node,fill)+(extra?' '+extra:'')+' />';
}
function unique(ids,prefix){
 let num=0;while(ids.has(prefix+num))num++;
 const id=prefix+num;ids.add(id);return id;
}
function gradient(p,id){
 return '    <linearGradient id="'+id+'" gradientUnits="objectBoundingBox" x1="'+p.start[0]*100+'%" y1="'+p.start[1]*100+'%" x2="'+p.end[0]*100+'%" y2="'+p.end[1]*100+'%">\n'+p.stops.map(s=>
  '      <stop offset="'+s.at*100+'%" stop-color="'+s.color+'" stop-opacity="'+s.opacity+'"/>').join('\n')+'\n    </linearGradient>';
}
function marksSvg(node,marks,ids,canvas,defs){
 if(!marks?.length)return '';
 const id=unique(ids,'ga-clip-');
 const transform=node.transform?' transform="'+esc(node.transform)+'"':'';
 defs.push('    <clipPath id="'+id+'" clipPathUnits="userSpaceOnUse"><'+node.type+' '+attrs(node)+transform+' /></clipPath>');
 const xy=(p)=>[p[0]*canvas.width,p[1]*canvas.height];
 const parts=marks.map(m=>{
  const [x,y]=xy(m.from),[X,Y]=xy(m.to);
  let d='M '+x+' '+y;
  if(m.kind==='line')d+=' L '+X+' '+Y;
  else {const [cx,cy]=xy(m.control);d+=' Q '+cx+' '+cy+' '+X+' '+Y;}
  return '    <path d="'+d+'" fill="none" stroke="'+m.color+'" stroke-width="'+m.width+'" stroke-opacity="'+m.opacity+'" stroke-linecap="round"/>';
 });
 return '  <g clip-path="url(#'+id+')">\n'+parts.join('\n')+'\n  </g>';
}

export function renderStyledDocument(document){
 const ids=new Set(document.nodes.map(n=>n.id));
 const defs=[],body=[];
 for(const node of document.nodes){
  const a=node.appearance??{},paint=a.basePaint;
  let fill=node.fill??'none';
  if(paint?.kind==='solid')fill=paint.color;
  else if(paint?.kind==='linearGradient'){
   const id=unique(ids,'ga-gradient-');
   defs.push(gradient(paint,id));fill='url(#'+id+')';
  }
  body.push(shape(node,fill));
  const m=marksSvg(node,a.surfaceMarks,ids,document.canvas,defs);
  if(m)body.push(m);
 }
 const {width,height}=document.canvas;
 return ['<?xml version="1.0" encoding="UTF-8"?>','<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'">',
 ...(defs.length?['  <defs>',...defs,'  </defs>']:[]),
 ...body,'</svg>',''].join('\n');
}
