import {open,mkdir,lstat,rename,rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve,relative,sep,dirname,parse} from 'node:path';
import {randomBytes} from 'node:crypto';
const token=/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,120}$/;
function allowedPath(root,rel){
 if(typeof root!=='string'||typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\')||rel.includes('%'))throw new Error('unsafe path');
 const parts=rel.split('/');if(parts.some(x=>!token.test(x)||x==='.'||x==='..'))throw new Error('path traversal');
 const target=resolve(root,...parts);
 if(!target.startsWith(resolve(root)+sep))throw new Error('path traversal');
 return {target,parts};
}
async function checkChain(root,parts){
 let cursor=resolve(root);
 for(const part of parts){cursor=join(cursor,part);try{const s=await lstat(cursor);if(s.isSymbolicLink())throw new Error('symlink refused');}catch(e){if(e.code==='ENOENT')continue;throw e;}}
}
export async function readBoundedFile({root,relativePath,maxBytes=262144}){
 const {target,parts}=allowedPath(root,relativePath);await checkChain(root,parts);
 const f=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{
  const s=await f.stat();if(!s.isFile()||s.size>maxBytes)throw new Error('size limit / not regular file');
  const data=await f.readFile();if(data.length>maxBytes)throw new Error('size limit');return data;
 }finally{await f.close();}
}
export async function writeAtomicFile({root,relativePath,content}){
 const {target,parts}=allowedPath(root,relativePath);await checkChain(root,parts);
 const bytes=Buffer.isBuffer(content)?content:Buffer.from(content);
 if(bytes.length>8*1024*1024)throw new Error('size limit');
 await mkdir(dirname(target),{recursive:true});
 const temp=target+'.'+randomBytes(8).toString('hex')+'.tmp';
 let f;
 try{
  f=await open(temp,'wx',0o600);await f.writeFile(bytes);await f.sync();await f.close();f=null;
  const final=await open(target,'wx',0o600);await final.close();
  await rename(temp,target);
 }catch(err){await f?.close();await rm(temp,{force:true});throw err;}
}
