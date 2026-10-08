import {readFile} from 'node:fs/promises';
import {createAssetState,applyOperations} from '../core/engine.mjs';
import {assertSameGeometryPair} from './appearance-pair.mjs';

export const ASSETS=Object.freeze([
 'cultivation_sword_20261008',
 'medicinal_pouch_20261008',
 'stone_censer_20261008'
]);
const grad=(a,b,c)=>({kind:'linearGradient',start:[0,0],end:[1,1],stops:[
 {at:0,color:a,opacity:1},{at:0.48,color:b,opacity:1},{at:1,color:c,opacity:1}
]});
const mark=(from,to,color,width=2,opacity=0.7)=>({kind:'line',from,to,color,width,opacity});
const appearance=(material,basePaint,surfaceMarks=[],outerGlow)=>({
 material,basePaint,surfaceMarks,...(outerGlow?{outerGlow}:{})
});
// Intentionally hand-directed appearance on EXISTING final POC-005A geometry.
// This is a retrospective material experiment, NOT new agent-origin creative authorship.
const MATERIAL_DESIGNS={
 cultivation_sword_20261008:{
  blade_left_face:appearance('metal',grad('#d8c59d','#a0785f','#725342'),[
   mark([0.22,0.12],[0.3,0.54],'#b28a62',2,0.75),
   mark([0.4,0.62],[0.46,0.88],'#725342',2,0.56)]),
  blade_right_face:appearance('metal',grad('#b28a62','#725342','#332820'),[
   mark([0.68,0.21],[0.64,0.68],'#a0785f',2,0.6)]),
  guard_burnished:appearance('metal',grad('#b28a62','#725342','#4d392f'),[
   mark([0.12,0.5],[0.31,0.58],'#d8c59d',2,0.8)]),
  handle_body:appearance('fabric',grad('#a0785f','#4d392f','#332820'),[
   mark([0.24,0.2],[0.72,0.33],'#b28a62',2,0.55),
   mark([0.22,0.57],[0.72,0.73],'#b28a62',2,0.55)]),
  guard_jade_mount:appearance('spirit',grad('#b9fff4','#438f8d','#183838'),[],
   {color:'#69d7cf',radius:2,opacity:0.3})
 },
 medicinal_pouch_20261008:{
  bag_body:appearance('fabric',grad('#d8c59d','#a0785f','#725342'),[
   mark([0.23,0.13],[0.35,0.71],'#725342',3,0.58),
   mark([0.69,0.14],[0.61,0.77],'#4d392f',3,0.67),
   mark([0.49,0.42],[0.53,0.88],'#b28a62',2,0.56)]),
  left_cloth_shadow:appearance('fabric',grad('#a0785f','#725342','#4d392f'),[
   mark([0.41,0.1],[0.73,0.82],'#332820',2,0.52)]),
  right_fold:appearance('fabric',grad('#725342','#4d392f','#332820'),[
   mark([0.49,0.19],[0.28,0.84],'#211c1a',2,0.62)]),
  pouch_neck:appearance('fabric',grad('#b28a62','#725342','#332820'),[
   mark([0.22,0.3],[0.75,0.43],'#d8c59d',2,0.7)]),
  side_patch:appearance('fabric',grad('#8c332e','#725342','#4d392f'),[
   mark([0.17,0.36],[0.7,0.63],'#a0785f',2,0.5)])
 },
 stone_censer_20261008:{
  lid_stone:appearance('stone',grad('#d8c59d','#725342','#4d392f'),[
   mark([0.22,0.17],[0.36,0.46],'#332820',3,0.78),
   mark([0.7,0.31],[0.8,0.7],'#332820',2,0.7)]),
  stone_bowl:appearance('stone',grad('#a0785f','#725342','#332820'),[
   mark([0.31,0.2],[0.4,0.64],'#4d392f',2,0.68),
   mark([0.71,0.24],[0.62,0.73],'#211c1a',2,0.64)]),
  left_leg:appearance('stone',grad('#a0785f','#4d392f','#332820'),[
   mark([0.35,0.31],[0.6,0.71],'#725342',2,0.6)]),
  right_leg:appearance('stone',grad('#b28a62','#4d392f','#332820'),[
   mark([0.38,0.22],[0.66,0.62],'#725342',2,0.65)]),
  jade_finial:appearance('spirit',grad('#b9fff4','#438f8d','#183838'),[],
   {color:'#69d7cf',radius:2,opacity:0.3})
 }
};

function checkAsset(asset){
 if(!ASSETS.includes(asset))throw new Error('unknown asset: '+asset);
}
export async function loadRevisedDocument(asset){
 checkAsset(asset);
 const url=new URL('../../benchmarks/poc005a/runs/'+asset+'/transcript.jsonl',import.meta.url);
 const source=await readFile(url,'utf8');
 let state=null,sourceCalls=0,createCount=0;
 for(const line of source.trim().split(/\r?\n/)){
  const event=JSON.parse(line);
  if(event.tool==='asset_create'){
   if(createCount++!==0||state)throw new Error('duplicate asset_create');
   if(event.arguments.asset_id!==asset)throw new Error('asset identity mismatch');
   state=createAssetState({version:1,canvas:{width:event.arguments.width,height:event.arguments.height,background:'transparent'},nodes:[]});
  }
  if(event.tool==='document_apply_ops'){
   if(!state)throw new Error('missing asset_create');
   if(event.arguments.asset_id!==asset)throw new Error('operation asset mismatch');
   state=applyOperations(state,{
    expectedRevision:event.arguments.expected_revision,
    idempotencyKey:event.arguments.idempotency_key,
    operations:event.arguments.operations
   });
   sourceCalls++;
   if(state.revision!==event.result?.revision)throw new Error('source revision mismatch');
  }
 }
 if(!state||state.revision!==2||sourceCalls!==2||createCount!==1)throw new Error('invalid POC-005A revision transcript');
 return {document:state.document,revision:state.revision,sourceCalls};
}
export function createMaterialPair(asset,document){
 checkAsset(asset);
 const baseline=structuredClone(document),enhanced=structuredClone(document);
 const design=MATERIAL_DESIGNS[asset], ids=new Set(enhanced.nodes.map(n=>n.id));
 for(const id of Object.keys(design)){
  if(!ids.has(id))throw new Error('missing target node: '+id);
  const node=enhanced.nodes.find(n=>n.id===id);
  if(node.appearance!==undefined)throw new Error('source appearance already exists: '+id);
  node.appearance=structuredClone(design[id]);
 }
 assertSameGeometryPair(baseline,enhanced);
 return {baseline,enhanced,operations:Object.keys(design).length};
}
