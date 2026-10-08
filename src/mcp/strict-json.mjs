const LIMIT=262144;
export function parseUniqueKeysJsonLine(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>LIMIT)throw new Error('JSON-RPC size limit exceeded');
 // Let native JSON.parse validate lexical grammar. Then inspect raw keys, which JSON.parse discards.
 const parsed=JSON.parse(raw);
 let i=0;
 const white=()=>{while(/\s/.test(raw[i]??'') && i<raw.length)i++;};
 const string=()=>{
  const begin=i++;
  while(i<raw.length){
   const c=raw[i++];
   if(c==='\\'){i++;continue;}
   if(c==='"')return JSON.parse(raw.slice(begin,i));
  }
  throw new Error('unterminated JSON string');
 };
 const walk=(depth)=>{
  if(depth>64)throw new Error('JSON depth budget exceeded');
  white();
  const c=raw[i];
  if(c==='{'){
   i++;white();const keys=new Set();
   while(raw[i]!=='}'){
    white();const key=string();white();
    if(keys.has(key))throw new Error('duplicate JSON object key');
    keys.add(key);if(raw[i++]!==':')throw new Error('malformed JSON key');
    walk(depth+1);white();if(raw[i]===','){i++;continue;}break;
   }
   i++;return;
  }
  if(c==='['){
   i++;white();while(raw[i]!==']'){
    walk(depth+1);white();if(raw[i]===','){i++;continue;}break;
   }
   i++;return;
  }
  if(c==='"'){string();return;}
  while(i<raw.length && !/[\s,}\]]/.test(raw[i]))i++;
 };
 walk(0);white();
 if(i!==raw.length)throw new Error('malformed JSON trailer');
 return parsed;
}
