import {readFile} from 'node:fs/promises';
import {createAssetState,applyOperations} from '../core/engine.mjs';
import {assertSameGeometryPair} from './appearance-pair.mjs';

const RUN_ID='astral_compass_trial_20261008';
// This helper replays actual local MCP tool calls. It does NOT generate a
// preset object or prove provider-authenticated agent origin.
export async function loadHeldoutCompassPair(){
 const text=await readFile(new URL('../../benchmarks/poc005a/runs/'+RUN_ID+'/transcript.jsonl',import.meta.url),'utf8');
 const events=text.trim().split(/\r?\n/).map(x=>JSON.parse(x));
 const creations=events.filter(x=>x.tool==='asset_create'&&!x.result?.isError);
 const edits=events.filter(x=>x.tool==='document_apply_ops'&&!x.result?.isError);
 if(creations.length!==1||edits.length!==2)throw new Error('expected one creation and two actual MCP revisions');
 const created=creations[0];
 if(created.arguments?.asset_id!==RUN_ID||created.result?.revision!==0)throw new Error('invalid source creation');
 let state=createAssetState({version:1,canvas:{width:created.arguments.width,height:created.arguments.height,background:'transparent'},nodes:[]});
 for(const e of edits){
  if(e.arguments.asset_id!==RUN_ID||e.arguments.expected_revision!==state.revision)throw new Error('unexpected source revision');
  state=applyOperations(state,{expectedRevision:e.arguments.expected_revision,
   idempotencyKey:e.arguments.idempotency_key,operations:e.arguments.operations});
  if(state.revision!==e.result?.revision)throw new Error('source MCP result does not match replay');
 }
 if(state.revision!==2||state.document.nodes.length!==28)throw new Error('unexpected final source geometry');
 const enhanced=structuredClone(state.document);
 const baseline=structuredClone(enhanced);
 let appearanceNodes=0;
 for(const node of baseline.nodes){
  if(node.appearance!==undefined){delete node.appearance;appearanceNodes++;}
 }
 if(appearanceNodes!==6)throw new Error('unexpected material authored node count');
 assertSameGeometryPair(baseline,enhanced);
 return {baseline,enhanced,appearanceNodes,runId:RUN_ID,sourceRevision:state.revision};
}
