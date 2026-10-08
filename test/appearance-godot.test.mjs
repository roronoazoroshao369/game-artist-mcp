import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,stat,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {exportGodotCutout} from '../src/export/godot-cutout.mjs';
test('Godot explicitly rejects new appearance before creating any output directory',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ga-godot-material-'));
 try{
  const dir=join(root,'project');
  const document={version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[{id:'a',type:'ellipse',cx:32,cy:32,rx:10,ry:10,fill:'#211c1a',appearance:{material:'metal'}}]};
  await assert.rejects(exportGodotCutout({document,cutout:{},outputDir:dir}),/UNSUPPORTED_GODOT_APPEARANCE/);
  await assert.rejects(stat(dir),{code:'ENOENT'});
 }finally{await rm(root,{recursive:true,force:true});}
});
