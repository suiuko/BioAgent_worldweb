import * as pc from './vendor/playcanvas-2.24.0.min.mjs';
import {boundsCenter,isClickGesture,rayBoundsDistance,toWorld} from './math.mjs';

const $=id=>document.getElementById(id);
const canvas=$('lab-canvas'),viewport=$('viewport');
const priority=['reagent_rack_black_01','pipette_body','six_well_plate','six_well_plate_cover','capper_01','waterbath_01'];
let language='en';
try{language=localStorage.getItem('bioagent-world-language')==='zh'?'zh':'en';}catch{}
const text=(en,zh)=>language==='zh'?zh:en;
const state={scene:null,app:null,camera:null,picker:null,groups:new Map(),selected:null,preset:null,ready:false,errors:[],loaded:0,total:0,scanVisible:true,viewRevision:0,pickToken:0,target:new pc.Vec3(),yaw:0,pitch:0,distance:1};
const fallbackPurpose={
  reagent_tube_black_01:['Separate reagent tube for storage and handling','独立登记的试管，用于存放与拿取'],
  reagent_tube_black_02:['Separate reagent tube for storage and handling','独立登记的试管，用于存放与拿取'],
  reagent_tube_black_03:['Separate reagent tube for storage and handling','独立登记的试管，用于存放与拿取'],
  reagent_tube_black_04_uncapped:['Open reagent tube for pipette access','开口试管，便于移液枪接近'],
  reagent_cap_black_04:['Separate cap belonging to tube 04','04 号试管的独立管盖'],
  pipette_tip_01:['A separately registered pipette tip','独立登记的移液枪头'],
  waste_container:['Receives discarded pipette tips','收集退弃的移液枪头']
};
function setLanguage(next){
  language=next;document.documentElement.lang=next==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-en][data-zh]').forEach(el=>el.textContent=el.dataset[next]);
  $('language-toggle').textContent=text('中文','EN');$('language-toggle').setAttribute('aria-label',text('Switch to Chinese','切换到英文'));
  document.title=text('Explore the 3D Lab — BioAgent-world','浏览 3D 实验室 — BioAgent-world');
  try{localStorage.setItem('bioagent-world-language',next);}catch{}
  canvas.setAttribute('aria-label',text('3D lab. Drag to orbit, right drag to pan, scroll to zoom. Click a device to select it.','3D 实验室。拖动旋转，右键拖动平移，滚轮缩放，单击设备选中。'));
  $('zoom-in').setAttribute('aria-label',text('Zoom in','放大'));
  $('zoom-out').setAttribute('aria-label',text('Zoom out','缩小'));
  $('clear-selection').setAttribute('aria-label',text('Clear selection','取消选择'));
  for(const [id,record] of state.groups){const button=document.querySelector(`[data-asset-id="${id}"]`);if(button)button.firstElementChild.textContent=record.spec.name[language];}
  renderDetails();renderViewLabel();renderLoadStatus();
  $('toggle-background').textContent=text(state.scanVisible?'Scan on':'Scan off',state.scanVisible?'扫描开':'扫描关');
}
function renderViewLabel(){
  const key=state.preset;$('view-label').textContent=key?text(`Operation site ${key.endsWith('2')?'2':'3'}`,`操作位 ${key.endsWith('2')?'2':'3'}`):text('Custom view','自由视角');
  ['2','3'].forEach(n=>$(`view-site-${n}`).classList.toggle('active',key===`operation_site_${n}`));
}
function renderLoadStatus(){
  $('asset-count').textContent=text(`${state.groups.size||15} objects`,`${state.groups.size||15} 个物体`);
  $('load-status').textContent=state.ready?text(`${state.loaded}/${state.total} files loaded · PlayCanvas ${pc.version}`,`${state.loaded}/${state.total} 文件已加载 · PlayCanvas ${pc.version}`):text('Loading scene…','正在加载场景…');
  if(state.errors.length){$('load-warning').hidden=false;$('load-warning').textContent=text('Some resources could not load: ','部分资源加载失败：')+state.errors.join(' · ');}
}
function evidenceLabel(spec){
  if(spec.dimensions_evidence==='user-confirmed STL scale')return text('User-confirmed STL units and scale','用户确认的 STL 单位与尺度');
  if(spec.dimensions_evidence==='preview geometry bounds')return text('Bounds of the exported display geometry','导出显示几何的包围尺寸');
  return spec.dimensions_evidence||text('Not provided','未提供');
}
function renderDetails(){
  const record=state.groups.get(state.selected),spec=record?.spec;
  $('empty-selection').hidden=!!spec;$('asset-details').hidden=!spec;$('selection-caption').hidden=!spec;
  document.querySelectorAll('[data-asset-id]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.assetId===state.selected)));
  if(!spec)return;
  $('asset-name').textContent=spec.name[language];$('asset-other-name').textContent=spec.name[language==='zh'?'en':'zh'];
  $('asset-id').textContent=spec.id;
  $('asset-dimensions').textContent=spec.dimensions_source_xyz_m.map(v=>Number(v.toFixed(6))).join(' × ')+' m';
  $('asset-evidence').textContent=evidenceLabel(spec);
  $('asset-purpose').textContent=spec.description?.[language]||fallbackPurpose[spec.id]?.[language==='zh'?1:0]||text('Independently registered laboratory equipment','独立登记的实验室设备');
  const provenance={
    'User STL, unchanged metric geometry':['User STL; original metric geometry preserved','用户 STL；保留原米制几何'],
    'Registered display geometry from the frozen simulation USD':['Display geometry registered in the frozen simulation scene','冻结仿真场景中登记的显示几何'],
    'Supplied CAD / existing shape hypothesis':['Supplied CAD / existing shape hypothesis','提供的 CAD / 已有形状假设']
  };
  $('asset-provenance').textContent=provenance[spec.provenance]?.[language==='zh'?1:0]||spec.provenance;
  $('selection-caption').textContent=`${spec.name[language]} · ${spec.id}`;
}
function selectAsset(id,method='directory'){
  if(id&&!state.groups.has(id))return;
  const old=state.groups.get(state.selected);
  if(old)for(const material of old.highlights){material.mesh.material=material.original;material.highlight.destroy();}
  if(old)old.highlights=[];
  state.selected=id;canvas.dataset.selectedId=id||'';canvas.dataset.pickMethod=method;
  const current=state.groups.get(id);
  if(current)for(const mesh of current.meshes){
    const original=mesh.material,highlight=original.clone();
    if(highlight.emissive){highlight.emissive.set(.08,.35,.11);highlight.emissiveIntensity=1;highlight.update();mesh.material=highlight;current.highlights.push({mesh,original,highlight});}
  }
  renderDetails();
}
function updateCamera(custom=true){
  if(!state.camera)return;
  const r=state.distance,c=Math.cos(state.pitch);
  state.camera.setPosition(state.target.x+r*Math.sin(state.yaw)*c,state.target.y+r*Math.sin(state.pitch),state.target.z+r*Math.cos(state.yaw)*c);
  state.camera.lookAt(state.target);state.viewRevision++;
  if(custom){state.preset=null;canvas.dataset.view='custom';renderViewLabel();}
}
function setPreset(key){
  if(!state.scene)return;
  const preset=state.scene.view_presets[key],eye=new pc.Vec3(...preset.eye);state.target.set(...preset.target);
  const d=eye.clone().sub(state.target);state.distance=d.length();state.yaw=Math.atan2(d.x,d.z);state.pitch=Math.asin(d.y/state.distance);state.preset=key;state.pickToken++;
  updateCamera(false);renderViewLabel();canvas.dataset.view=key;
}
function orbit(dx,dy){state.yaw-=dx*.006;state.pitch=Math.max(-1.48,Math.min(1.48,state.pitch+dy*.006));updateCamera();canvas.dataset.lastGesture='orbit';}
function pan(dx,dy){
  const scale=2*state.distance*Math.tan(state.camera.camera.fov*Math.PI/360)/canvas.clientHeight;
  state.target.add(state.camera.right.clone().mulScalar(-dx*scale)).add(state.camera.up.clone().mulScalar(dy*scale));updateCamera();canvas.dataset.lastGesture='pan';
}
function zoom(factor){state.distance=Math.max(.08,Math.min(20,state.distance*factor));updateCamera();canvas.dataset.lastGesture='zoom';}
function focusSelection(){
  const record=state.groups.get(state.selected);if(!record)return;
  const center=toWorld(boundsCenter(record.spec),record.spec);state.target.set(...center);
  const box=record.spec.pick_bounds_y_up_m;const size=Math.max(...box[0].map((v,i)=>box[1][i]-v));state.distance=Math.max(.25,size*3.4);updateCamera();
}
async function pickAt(x,y){
  if(!state.ready)return;
  const revision=state.viewRevision,token=++state.pickToken,app=state.app,camera=state.camera;
  let id=null,method='bounds';
  try{
    const scale=Math.min(1,1000/canvas.clientWidth),width=Math.max(1,Math.round(canvas.clientWidth*scale)),height=Math.max(1,Math.round(canvas.clientHeight*scale));
    state.picker.resize(width,height);state.picker.prepare(camera.camera,app.scene,[app.scene.layers.getLayerByName('World')]);
    const hits=await state.picker.getSelectionAsync(Math.round(x*scale),Math.round(y*scale),1,1);
    for(const hit of hits){let entity=hit.entity||hit.node;while(entity&&!entity._labAssetId)entity=entity.parent;if(entity?._labAssetId){id=entity._labAssetId;method='rendered';break;}}
  }catch(error){console.warn('GPU picking unavailable; using registered bounds.',error);}
  if(!id){
    const origin=camera.getPosition(),far=camera.camera.screenToWorld(x,y,camera.camera.farClip),direction=far.sub(origin).normalize();
    let closest=Infinity;
    for(const [key,record] of state.groups){if(!record.loaded)continue;const distance=rayBoundsDistance([origin.x,origin.y,origin.z],[direction.x,direction.y,direction.z],record.spec);if(distance!==null&&distance<closest){closest=distance;id=key;}}
  }
  if(token!==state.pickToken||revision!==state.viewRevision)return;
  canvas.dataset.lastGesture='click';selectAsset(id,method);
}
function installControls(){
  const pointers=new Map();let gesture=null;
  const local=e=>{const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top};};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(![0,1,2].includes(e.button))return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    const point=local(e);pointers.set(e.pointerId,point);
    if(!gesture)gesture={button:e.button,start:point,last:point,distance:0,multi:false,cancelled:false};
    if(pointers.size>1)gesture.multi=true;
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    const before=[...pointers.values()],point=local(e);pointers.set(e.pointerId,point);
    if(pointers.size>1){
      const after=[...pointers.values()];gesture.multi=true;
      const center=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
      const a=center(before),b=center(after),distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      pan(b.x-a.x,b.y-a.y);const old=distance(before),next=distance(after);if(old>0&&next>0)zoom(old/next);
    }else{
      gesture.distance=Math.max(gesture.distance,Math.hypot(point.x-gesture.start.x,point.y-gesture.start.y));
      if(gesture.distance>=6&&!gesture.multi){const dx=point.x-gesture.last.x,dy=point.y-gesture.last.y;if(gesture.button===1||gesture.button===2||e.shiftKey)pan(dx,dy);else orbit(dx,dy);}
    }
    gesture.last=point;canvas.classList.add('dragging');
  });
  const end=(e,cancelled=false)=>{
    if(!gesture||!pointers.has(e.pointerId))return;const point=local(e);
    gesture.distance=Math.max(gesture.distance,Math.hypot(point.x-gesture.start.x,point.y-gesture.start.y));gesture.cancelled||=cancelled;
    pointers.delete(e.pointerId);
    if(pointers.size===0){if(isClickGesture(gesture))void pickAt(point.x,point.y);else canvas.dataset.lastGesture=gesture.cancelled?'cancelled':gesture.multi?'touch':canvas.dataset.lastGesture;gesture=null;canvas.classList.remove('dragging');}
    else gesture.multi=true;
  };
  canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(state.camera)zoom(Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.002));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!state.ready)return;
    if(e.key==='2')setPreset('operation_site_2');else if(e.key==='3')setPreset('operation_site_3');else if(e.key.toLowerCase()==='r')setPreset(state.scene.initial_view);else if(e.key==='Escape')selectAsset(null);else if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1.15);else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const dx=e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0,dy=e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0;if(e.shiftKey)pan(dx,dy);else orbit(dx,dy);}else return;e.preventDefault();
  });
  window.addEventListener('blur',()=>{pointers.clear();gesture=null;canvas.classList.remove('dragging');});
}
function drawSelection(){
  const record=state.groups.get(state.selected);if(!record)return;
  const bounds=record.spec.pick_bounds_y_up_m,padding=.002;
  const corners=Array.from({length:8},(_,i)=>toWorld([0,1,2].map(axis=>bounds[(i>>axis)&1][axis]+(((i>>axis)&1)?padding:-padding)),record.spec));
  const color=new pc.Color(.65,1,.3);
  for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++){const j=i^(1<<axis);if(i<j)state.app.drawLine(new pc.Vec3(...corners[i]),new pc.Vec3(...corners[j]),color,false);}
}
async function loadResource(label,type,path,parent,record){
  $('loading-detail').textContent=label;
  const url=new URL(path,state.manifestUrl).href,asset=new pc.Asset(label,type,{url});state.app.assets.add(asset);
  await new Promise((resolve,reject)=>{asset.once('load',resolve);asset.once('error',reject);state.app.assets.load(asset);});
  if(type==='container'){
    const entity=asset.resource.instantiateRenderEntity();parent.addChild(entity);
    if(record)record.meshes.push(...entity.findComponents('render').flatMap(render=>render.meshInstances));
  }else{const entity=new pc.Entity(label);entity.addComponent('gsplat',{asset});parent.addChild(entity);if(!record)state.background=entity;}
  if(record)record.loaded=true;state.loaded++;$('loading-progress').value=state.loaded;renderLoadStatus();
}
async function safeLoad(...args){try{await loadResource(...args);}catch(error){state.errors.push(args[2]);console.error(`Unable to load ${args[2]}`,error);}}
async function initialize(){
  try{
    state.manifestUrl=new URL('./data/scene.json',import.meta.url);
    const response=await fetch(state.manifestUrl);if(!response.ok)throw new Error(`scene.json: HTTP ${response.status}`);
    const scene=await response.json();state.scene=scene;
    if(scene.units!=='meter'||scene.up_axis!=='Y')throw new Error('This viewer requires a meter / Y-up bundle.');
    const app=new pc.Application(canvas,{graphicsDeviceOptions:{deviceTypes:['webgl2'],antialias:false,alpha:false,powerPreference:'high-performance'}});state.app=app;
    app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio||1,1.5);app.setCanvasFillMode(pc.FILLMODE_NONE);app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.scene.ambientLight=new pc.Color(.75,.78,.72);app.scene.gsplat.enableIds=true;
    const camera=new pc.Entity('LabCamera');camera.addComponent('camera',{clearColor:new pc.Color(.86,.9,.84),nearClip:.01,farClip:100,fov:55});app.root.addChild(camera);state.camera=camera;
    camera.camera.toneMapping=pc.TONEMAP_NONE;
    const light=new pc.Entity('WindowLight');light.addComponent('light',{type:'directional',color:new pc.Color(1,.98,.94),intensity:2,castShadows:false});light.setEulerAngles(45,130,0);app.root.addChild(light);
    const fill=new pc.Entity('FillLight');fill.addComponent('light',{type:'directional',intensity:.8,castShadows:false});fill.setEulerAngles(50,-70,0);app.root.addChild(fill);
    state.picker=new pc.Picker(app,1,1,true);
    const resize=()=>{const rect=viewport.getBoundingClientRect();app.resizeCanvas(rect.width,rect.height);canvas.style.width='100%';canvas.style.height='100%';};new ResizeObserver(resize).observe(viewport);resize();
    setPreset(scene.initial_view);app.on('update',drawSelection);app.start();installControls();
    state.total=2+scene.assets.reduce((count,asset)=>count+Object.keys(asset.files).length,0);$('loading-progress').max=state.total;
    // Both world resources are already metric Y-up; the root remains identity.
    await safeLoad('Room scan','gsplat',scene.background_sog,app.root,null);
    await safeLoad('Static room surfaces','container',scene.static_geometry_glb,app.root,null);
    const sorted=[...scene.assets].sort((a,b)=>(priority.indexOf(a.id)<0?99:priority.indexOf(a.id))-(priority.indexOf(b.id)<0?99:priority.indexOf(b.id)));
    for(const spec of sorted){
      const parent=new pc.Entity(spec.id);parent._labAssetId=spec.id;
      // This is the only application of the exported pose. Never also apply
      // world_from_asset, web_from_source, a unit scale, or a child-axis flip.
      parent.setPosition(...spec.position_m);parent.setRotation(new pc.Quat(...spec.rotation_xyzw));app.root.addChild(parent);
      const record={spec,parent,loaded:false,meshes:[],highlights:[]};state.groups.set(spec.id,record);
      const button=document.createElement('button');button.type='button';button.dataset.assetId=spec.id;button.setAttribute('aria-pressed','false');button.disabled=true;
      const name=document.createElement('span');name.textContent=spec.name[language];const icon=document.createElement('span');icon.textContent='↗';button.append(name,icon);button.addEventListener('click',()=>selectAsset(spec.id));$('equipment-list').append(button);
    }
    // Bounded concurrency keeps decoded textures and GLB uploads manageable.
    const queue=[...state.groups.values()];
    await Promise.all(Array.from({length:3},async()=>{while(queue.length){const record=queue.shift();await Promise.all(Object.entries(record.spec.files).map(([format,path])=>safeLoad(record.spec.name.en,format==='glb'?'container':'gsplat',path,record.parent,record)));document.querySelector(`[data-asset-id="${record.spec.id}"]`).disabled=!record.loaded;}}));
    state.ready=true;canvas.dataset.loadedAssets=String([...state.groups.values()].filter(record=>record.loaded).length);canvas.dataset.loadErrors=String(state.errors.length);canvas.dataset.ready='true';$('loading-panel').hidden=true;renderLoadStatus();
  }catch(error){console.error(error);$('loading-panel').classList.add('failed');$('loading-detail').textContent=text('The scene could not start. WebGL2 and a local web server are required. ','场景未能启动，请确认 WebGL2 可用并通过本地服务器打开。')+error.message;$('loading-progress').hidden=true;canvas.dataset.ready='error';}
}
$('language-toggle').addEventListener('click',()=>setLanguage(language==='en'?'zh':'en'));
$('view-site-2').addEventListener('click',()=>setPreset('operation_site_2'));$('view-site-3').addEventListener('click',()=>setPreset('operation_site_3'));$('reset-view').addEventListener('click',()=>setPreset(state.scene?.initial_view));
$('zoom-in').addEventListener('click',()=>{if(state.camera)zoom(.85);});$('zoom-out').addEventListener('click',()=>{if(state.camera)zoom(1.15);});
$('clear-selection').addEventListener('click',()=>selectAsset(null));$('focus-selection').addEventListener('click',focusSelection);
$('toggle-background').addEventListener('click',()=>{state.scanVisible=!state.scanVisible;if(state.background)state.background.enabled=state.scanVisible;$('toggle-background').setAttribute('aria-pressed',String(state.scanVisible));$('toggle-background').textContent=text(state.scanVisible?'Scan on':'Scan off',state.scanVisible?'扫描开':'扫描关');});
setLanguage(language);void initialize();
