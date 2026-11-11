import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {toWorld,toLocal,rayBoundsDistance,boundsCenter,bubblePosition,isClickGesture} from '../scene/math.mjs';
const folder='scene/data',scene=JSON.parse(readFileSync(path.join(folder,'scene.json'),'utf8'));
assert.equal(scene.units,'meter');assert.equal(scene.up_axis,'Y');assert.equal(scene.assets.length,15);
assert.equal(new Set(scene.assets.map(asset=>asset.id)).size,15);
const resources=[scene.background_sog,scene.static_geometry_glb,...scene.assets.flatMap(asset=>Object.values(asset.files)),...Object.values(scene.reference_images)];
for(const resource of resources){assert(!/^(?:[a-z]+:|[/\\])|(?:^|\/)\.\.(?:\/|$)/i.test(resource),`Resource must be relative: ${resource}`);assert(existsSync(path.join(folder,resource)),`Missing: ${resource}`);}
let checksums=0;
for(const line of readFileSync(path.join(folder,'SHA256SUMS'),'utf8').trim().split(/\r?\n/)){
  const [,expected,file]=line.match(/^([\da-f]{64})\s+[* ]?(.+)$/)||[];assert(expected,`Invalid checksum entry: ${line}`);
  assert.equal(createHash('sha256').update(readFileSync(path.join(folder,file))).digest('hex'),expected,`Resource integrity: ${file}`);checksums++;
}
for(const asset of scene.assets){
  assert.equal(asset.position_m.length,3);assert.equal(asset.rotation_xyzw.length,4);
  assert(Math.abs(Math.hypot(...asset.rotation_xyzw)-1)<1e-5,`${asset.id}: quaternion must be normalized`);
  for(const point of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],boundsCenter(asset)]){
    const actual=toWorld(point,asset),matrix=asset.world_from_asset;
    const expected=[0,1,2].map(i=>matrix[i][0]*point[0]+matrix[i][1]*point[1]+matrix[i][2]*point[2]+matrix[i][3]);
    actual.forEach((value,i)=>assert(Math.abs(value-expected[i])<1e-6,`${asset.id}: exported TRS must equal world_from_asset exactly once`));
    toLocal(actual,asset).forEach((value,i)=>assert(Math.abs(value-point[i])<1e-6,`${asset.id}: inverse pose`));
  }
  const center=toWorld(boundsCenter(asset),asset),origin=[center[0],center[1]+2,center[2]];
  assert.notEqual(rayBoundsDistance(origin,[0,-1,0],asset),null,`${asset.id}: ray must hit registered local bounds`);
  assert.equal(rayBoundsDistance(origin,[0,1,0],asset),null,`${asset.id}: reject opposite ray`);
}
assert(isClickGesture({distance:0}));assert(isClickGesture({distance:5.9}));assert(!isClickGesture({distance:6}));assert(!isClickGesture({distance:80}));assert(!isClickGesture({multi:true}));assert(!isClickGesture({cancelled:true}));assert(!isClickGesture({button:2}));
for(const [viewportWidth,viewportHeight] of [[320,365],[793,446],[1600,900]]){
  const width=Math.min(248,viewportWidth-20),height=150;
  for(const [x,y] of [[0,0],[viewportWidth,0],[0,viewportHeight],[viewportWidth,viewportHeight],[viewportWidth/2,viewportHeight/2]]){
    const bubble=bubblePosition(x,y,width,height,viewportWidth,viewportHeight);
    assert(bubble.left>=10&&bubble.top>=10,'Bubble must stay inside the viewport');
    assert(bubble.left+width<=viewportWidth-10&&bubble.top+height<=viewportHeight-10,'Bubble must not clip at viewport edges');
    assert(bubble.arrow>=16&&bubble.arrow<=width-16,'Bubble arrow stays within its card');
  }
}
for(const key of ['operation_site_2','operation_site_3']){assert.equal(scene.view_presets[key].eye.length,3);assert.equal(scene.view_presets[key].target.length,3);}
const walk=folder=>readdirSync(folder).flatMap(name=>{const file=path.join(folder,name);return statSync(file).isDirectory()?walk(file):[file];});
for(const file of walk('scene'))assert(statSync(file).size<32*1024*1024,`Hosting per-file limit: ${file}`);
const viewer=readFileSync('scene/viewer.mjs','utf8');assert(!viewer.includes('https://'), 'Scene resources and engine must be local');
console.log(`Scene verified: ${checksums} SHA256 entries, ${scene.assets.length} unique asset poses, relative resources, ray bounds, camera presets, click/drag classification, and bubble viewport bounds.`);
