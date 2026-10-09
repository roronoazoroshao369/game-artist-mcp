import {PRIMARY_ASSETS,SIZES,BLIND_LABELS,SCORE_KEYS} from './contracts.mjs';
const avg=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
export function calculateDeltas({scores,mapping}){
 const deltas={};for(const asset of PRIMARY_ASSETS){
  deltas[asset]={};for(const scale of SIZES){
   const base=Object.entries(mapping[asset]).find(([,role])=>role==='baseline')?.[0];
   const enhanced=Object.entries(mapping[asset]).find(([,role])=>role==='enhanced')?.[0];
   if(!base||!enhanced)throw new Error('invalid A/B mapping');
   const b=scores[asset]?.[scale]?.[base],e=scores[asset]?.[scale]?.[enhanced];
   if(!b||!e)throw new Error('missing score cell');
   deltas[asset][scale]=Object.fromEntries(SCORE_KEYS.map(k=>[k,e[k]-b[k]]));
  }
 }return deltas;
}
export function scoreVisual({session,lockedReviews,mappingReveal}){
 const pending=(reason)=>({visualStatus:'REVIEW_PENDING',confidence:null,deltas:{},failures:[reason]});
 if(!session||!Array.isArray(lockedReviews)||lockedReviews.length!==session.reviewQuorum||!lockedReviews.length)return pending('quorum: independent scores missing');
 if(!mappingReveal?.verified||!mappingReveal.mapping)return pending('mapping must be verified after review lock');
 const ids=lockedReviews.map(x=>x.reviewerId);if(new Set(ids).size!==ids.length)return pending('duplicate reviewers');
 const scores={};
 const discrepancies=[];
 for(const asset of PRIMARY_ASSETS){
  scores[asset]={};
  for(const scale of SIZES){
   scores[asset][scale]={};
   for(const variant of BLIND_LABELS){
    const records=[];
    for(const review of lockedReviews){
     const matches=review.rows?.filter(x=>x.asset===asset&&x.scale===scale&&x.variant===variant)||[];
     if(matches.length!==1)return pending('missing or duplicated review cell: '+asset+'/'+scale+'/'+variant);
     const record=matches[0];
     if(SCORE_KEYS.some(k=>!Number.isInteger(record[k])||record[k]<1||record[k]>5))return pending('out-of-range score');
     records.push(record);
    }
    for(const k of SCORE_KEYS)if(records.length===2&&Math.abs(records[0][k]-records[1][k])>=2)discrepancies.push(asset+'/'+scale+'/'+variant+'/'+k);
    scores[asset][scale][variant]=Object.fromEntries(SCORE_KEYS.map(k=>[k,avg(records.map(r=>r[k]))]));
   }
  }
 }
 if(discrepancies.length)return {visualStatus:'REVIEW_PENDING',confidence:null,deltas:{},failures:discrepancies.map(x=>'reviewer disagreement '+x)};
 let deltas;try{deltas=calculateDeltas({scores,mapping:mappingReveal.mapping});}catch(e){return pending(e.message);}
 const failures=[];let materialWinningAssets=0;
 for(const asset of PRIMARY_ASSETS){
  let materialAll=true;
  for(const scale of SIZES){
   const roles=mappingReveal.mapping[asset];
   const eLabel=Object.entries(roles).find(([,role])=>role==='enhanced')?.[0];
   const e=scores[asset][scale][eLabel],d=deltas[asset][scale];
   if(!e||!d)return pending('role score missing');
   for(const k of ['silhouette','styleFit']){
    if(e[k]<3)failures.push(asset+'/'+scale+' enhanced '+k+' < 3');
    if(d[k]<-1)failures.push(asset+'/'+scale+' '+k+' regression');
   }
   if(d.material<1)materialAll=false;
  }
  if(materialAll)materialWinningAssets++;
 }
 if(materialWinningAssets<2)failures.push('fewer than two categories gained >=1 material at both scales');
 return {visualStatus:failures.length?'ARTISTIC_NO_GO':'VISUAL_GO',confidence:lockedReviews.length===1?'SINGLE_REVIEWER':'MULTI_REVIEWER',deltas,failures,materialWinningAssets,scores};
}
