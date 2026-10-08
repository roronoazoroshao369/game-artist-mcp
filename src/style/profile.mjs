import { readFile } from 'node:fs/promises';

const HEX = /^#[0-9a-f]{6}$/;
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const own = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value,key));
const boundedInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const repeated = array => new Set(array).size !== array.length;

export function validateStyleProfile(profile) {
  const errors=[];
  if (!own(profile,['version','id','name','palette','stroke','complexity'])) {
    return {ok:false,errors:['profile must contain only required v1 keys'],warnings:[]};
  }
  if(profile.version!==1) errors.push('profile.version must be 1');
  if(typeof profile.id!=='string'||!ID.test(profile.id)) errors.push('profile.id invalid');
  if(typeof profile.name!=='string'||!profile.name.trim()||profile.name.length>80) errors.push('profile.name invalid');
  const palette=profile.palette;
  if(!own(palette,['allowedHex','maxDistinctColors'])) errors.push('palette structure invalid');
  else {
    if(!Array.isArray(palette.allowedHex)||palette.allowedHex.length<1||palette.allowedHex.length>64||
      palette.allowedHex.some(x=>typeof x!=='string'||!HEX.test(x))||repeated(palette.allowedHex)) errors.push('palette.allowedHex invalid');
    if(!boundedInteger(palette.maxDistinctColors,1,64)) errors.push('palette.maxDistinctColors invalid');
  }
  const stroke=profile.stroke;
  if(!own(stroke,['minWidth','maxWidth','allowedWidths'])) errors.push('stroke structure invalid');
  else {
    if(!boundedInteger(stroke.minWidth,1,64)||!boundedInteger(stroke.maxWidth,1,64)||stroke.minWidth>stroke.maxWidth) errors.push('stroke widths invalid');
    if(!Array.isArray(stroke.allowedWidths)||stroke.allowedWidths.length<1||stroke.allowedWidths.length>32||
      stroke.allowedWidths.some(x=>!boundedInteger(x,stroke.minWidth,stroke.maxWidth))||repeated(stroke.allowedWidths)) errors.push('stroke.allowedWidths invalid');
  }
  if(!own(profile.complexity,['maxNodes']) || !boundedInteger(profile.complexity.maxNodes,1,200)) errors.push('complexity.maxNodes invalid');
  return {ok:errors.length===0,errors,warnings:[]};
}

export async function loadStyleProfile(profileId) {
  if(profileId!=='dark-cultivation-v1') throw new Error('unknown style profile');
  const profile=JSON.parse(await readFile(new URL('../../styles/dark-cultivation-v1.json',import.meta.url),'utf8'));
  const validation=validateStyleProfile(profile);
  if(!validation.ok) throw new Error('invalid bundled profile: '+validation.errors.join('; '));
  return profile;
}
