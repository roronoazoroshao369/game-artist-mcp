export function normalizeAIAdvice({sessionId,status,provider=null,model=null,tool=null,pixelHashes=[],observations=[],generatedAt=null}){
 if(status!=='AVAILABLE')return {sessionId,status:'AI_TRIAGE_UNAVAILABLE',kind:'ADVISORY_ONLY',provider:null,model:null,tool:null,pixelHashes:[],observations:[],generatedAt:null};
 if(!Array.isArray(pixelHashes)||!Array.isArray(observations)||observations.some(x=>typeof x!=='string'||x.length>1600))throw new Error('invalid AI advice');
 return {sessionId,status:'AVAILABLE',kind:'ADVISORY_ONLY',provider,model,tool,pixelHashes,observations,generatedAt};
}
