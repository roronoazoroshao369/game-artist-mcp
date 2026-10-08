import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStyleProfile, loadStyleProfile } from '../src/style/profile.mjs';

const good = {version:1,id:'dark-cultivation-v1',name:'Dark Cultivation',palette:{allowedHex:['#211c1a','#72f5ec'],maxDistinctColors:2},stroke:{minWidth:1,maxWidth:12,allowedWidths:[1,2,3,12]},complexity:{maxNodes:200}};
const copy = x => JSON.parse(JSON.stringify(x));

test('validates strict and bounded profile',()=>{
  assert.deepEqual(validateStyleProfile(good).errors,[]);
  assert.equal(validateStyleProfile(good).ok,true);
});

test('rejects unsupported version, unexpected keys, malformed or duplicate colors, and unsafe numeric ranges',()=>{
  for(const mutate of [
    x=>x.version=2,
    x=>x.sneaky=true,
    x=>x.palette.allowedHex[0]='red',
    x=>x.palette.allowedHex.push('#211c1a'),
    x=>x.stroke.maxWidth=Number.NaN,
    x=>x.stroke.minWidth=13,
    x=>x.stroke.allowedWidths=[1,2,2],
    x=>x.id='../secret',
    x=>x.palette.maxDistinctColors=0,
    x=>x.complexity.maxNodes=201,
    x=>x.palette.allowedHex=Array(65).fill('#123456'),
    x=>x.stroke.allowedWidths=Array(33).fill(1)
  ]) {const obj=copy(good); mutate(obj); assert.equal(validateStyleProfile(obj).ok,false,JSON.stringify(obj));}
});

test('loads only allowlisted immutable profile by exact id',async()=>{
  const one=await loadStyleProfile('dark-cultivation-v1');
  assert.equal(one.version,1);
  assert.equal(validateStyleProfile(one).ok,true);
  one.palette.allowedHex.push('#ffffff');
  const two=await loadStyleProfile('dark-cultivation-v1');
  assert.ok(!two.palette.allowedHex.includes('#ffffff'));
  await assert.rejects(loadStyleProfile('../secret'),/unknown style profile/);
  await assert.rejects(loadStyleProfile('arbitrary'),/unknown style profile/);
});
