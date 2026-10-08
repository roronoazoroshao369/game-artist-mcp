import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
export function assertSameGeometryPair(before,after){
 const strip=d=>({version:d.version,canvas:structuredClone(d.canvas),nodes:d.nodes.map(n=>{
  const copy=structuredClone(n);delete copy.appearance;return copy;
 })});
 if(!isDeepStrictEqual(strip(before),strip(after)))throw new Error('A/B geometry changed beyond appearance');
}
export function prepareBlindPairMetadata({baseline,enhanced,seed}){
 if(typeof baseline!=='string'||typeof enhanced!=='string'||baseline===enhanced||typeof seed!=='string'||!seed)throw new Error('invalid pair metadata');
 const flip=(createHash('sha256').update(seed).digest()[0]&1)===1;
 const sealedMapping=flip?{A:'enhanced',B:'baseline'}:{A:'baseline',B:'enhanced'};
 return {reviewerVisible:flip?{A:enhanced,B:baseline}:{A:baseline,B:enhanced},sealedMapping};
}
