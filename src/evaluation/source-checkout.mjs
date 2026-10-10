import {execFileSync} from 'node:child_process';

const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe']}).trim();

/** Fail closed before freezing a private evaluation package from local source. */
export function assertCleanMainCheckout({cwd=process.cwd(),expectedSha}){
 if(!/^[a-f0-9]{40}$/.test(expectedSha||''))throw new Error('invalid source SHA');
 let branch,head,originMain;
 try{branch=git(cwd,'symbolic-ref','--quiet','--short','HEAD');}
 catch{throw new Error('freeze source must be on main branch (not detached HEAD)');}
 if(branch!=='main')throw new Error('freeze source must be on main branch');
 try{head=git(cwd,'rev-parse','HEAD');}
 catch{throw new Error('cannot verify git HEAD');}
 if(head!==expectedSha)throw new Error('source SHA does not match local HEAD');
 try{originMain=git(cwd,'rev-parse','--verify','refs/remotes/origin/main');}
 catch{throw new Error('origin/main ref is missing; fetch main before freeze');}
 if(head!==originMain)throw new Error('local main diverges from origin/main; fetch and update main before freeze');
 let dirty;
 try{dirty=git(cwd,'status','--porcelain=v1','--untracked-files=all');}
 catch{throw new Error('cannot verify clean git worktree');}
 if(dirty)throw new Error('freeze source checkout is dirty: commit or remove tracked/untracked changes before freeze');
 return head;
}
