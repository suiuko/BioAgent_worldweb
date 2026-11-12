import * as pc from './vendor/playcanvas-2.24.0.min.mjs';
import {boundsCenter,bubblePosition,isClickGesture,rayBoundsDistance,toWorld} from './math.mjs';

const $=id=>document.getElementById(id);
const canvas=$('lab-canvas'),viewport=$('viewport');
const priority=['reagent_rack_black_01','pipette_body','six_well_plate','six_well_plate_cover','capper_01','waterbath_01'];
let language='en';
try{language=localStorage.getItem('bioagent-world-language')==='zh'?'zh':'en';}catch{}
const parameters=new URLSearchParams(location.search),embedded=parameters.get('embedded')==='1'&&window.parent!==window;
if(embedded){document.body.classList.add('is-embedded');if(['en','zh'].includes(parameters.get('lang')))language=parameters.get('lang');}
const text=(en,zh)=>language==='zh'?zh:en;
const state={scene:null,app:null,camera:null,picker:null,groups:new Map(),selected:null,hovered:null,hoverPoint:null,interacting:false,bubbleKey:null,preset:null,ready:false,errors:[],loaded:0,total:0,scanVisible:true,viewRevision:0,pickToken:0,target:new pc.Vec3(),yaw:0,pitch:0,distance:1};
// Presentation copy stays separate from the original, checksummed export.
const equipmentPurpose={
  reagent_rack_black_01:['Holds and positions four reagent tubes','用于放置和定位四支试管'],
  reagent_tube_black_01:['Stores reagents','用于存放试剂'],
  reagent_tube_black_02:['Stores reagents','用于存放试剂'],
  reagent_tube_black_03:['Stores reagents','用于存放试剂'],
  reagent_tube_black_04_uncapped:['Open tube for pipetting','开口试管，用于移液操作'],
  reagent_cap_black_04:['Cap for tube 04','04 号试管的管盖'],
  printed_pipette_stand_01:['Holds the pipette at the workstation','用于放置移液枪'],
  pipette_body:['Aspirates and dispenses liquids','用于吸取和分装液体'],
  six_well_plate:['Holds liquids in six wells','六个孔位，用于盛放液体'],
  six_well_plate_cover:['Covers the six-well plate','用于覆盖六孔板'],
  pipette_tip_01:['Pipette tip for liquid handling','用于移液操作的枪头'],
  waterbath_01:['Heats tubes in a water bath','用于水浴加热试管'],
  tip_box_01:['Stores pipette tips','用于存放移液枪头'],
  waste_container:['Collects discarded pipette tips','用于收集废弃枪头'],
  capper_01:['Caps and uncaps reagent tubes','用于旋紧和旋开试管盖']
};
function nameLabel(spec,lang=language){return spec.id==='pipette_tip_01'?(lang==='zh'?'移液枪头':'Pipette tip'):spec.name[lang];}
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
  for(const [id,record] of state.groups){const button=document.querySelector(`[data-asset-id="${id}"]`);if(button)button.firstElementChild.textContent=nameLabel(record.spec);}
  renderDetails();renderViewLabel();renderLoadStatus();renderBubble();
  $('toggle-background').textContent=text(state.scanVisible?'Scan on':'Scan off',state.scanVisible?'扫描：开':'扫描：关');
}
function renderViewLabel(){
  const key=state.preset;$('view-label').textContent=key?text(`Operation site ${key.endsWith('2')?'2':'3'}`,`操作位 ${key.endsWith('2')?'2':'3'}`):text('Custom view','自由视角');
  ['2','3'].forEach(n=>$(`view-site-${n}`).classList.toggle('active',key===`operation_site_${n}`));
}
function renderLoadStatus(){
  $('asset-count').textContent=text(`${state.groups.size||15} objects`,`${state.groups.size||15} 个物体`);
  $('load-status').textContent=state.ready?text(`${state.loaded}/${state.total} resources loaded`,`${state.loaded}/${state.total} 项资源已加载`):text('Loading scene…','正在加载场景…');
  if(state.errors.length){$('load-warning').hidden=false;$('load-warning').textContent=text('Some resources could not load: ','部分资源加载失败：')+state.errors.join(' · ');}
}
function evidenceLabel(spec){
  if(spec.dimensions_evidence==='user-confirmed STL scale')return text('User-confirmed STL units and scale','用户确认的 STL 单位与尺度');
  if(spec.dimensions_evidence==='preview geometry bounds')return text('Display geometry bounds','显示几何的包围尺寸');
  return spec.dimensions_evidence||text('Not provided','未提供');
}
function dimensionsLabel(spec){return spec.dimensions_source_xyz_m.map(v=>Number(v.toFixed(6))).join(' × ')+' m';}
function purposeLabel(spec){return equipmentPurpose[spec.id]?.[language==='zh'?1:0]||spec.description?.[language]||text('Laboratory equipment','实验室设备');}
function setHover(id,point=null){
  state.hovered=id;state.hoverPoint=point;canvas.dataset.hoveredId=id||'';
  canvas.classList.toggle('is-hovering',!!id);renderBubble();
}
function renderBubble(){
  const bubble=$('asset-bubble'),id=state.hovered||state.selected,record=state.groups.get(id);
  if(!record||!state.camera||state.interacting){bubble.hidden=true;canvas.removeAttribute('aria-describedby');return;}
  const pinned=!state.hovered||id===state.selected,key=`${id}:${language}:${pinned}`;
  if(state.bubbleKey!==key){
    $('bubble-name').textContent=nameLabel(record.spec);$('bubble-dimensions').textContent=dimensionsLabel(record.spec);
    $('bubble-purpose').textContent=purposeLabel(record.spec);
    $('bubble-hint').textContent=pinned?text('Selected · details in the panel','已选中 · 详情见属性面板'):text('Click for details','单击查看详情');
    state.bubbleKey=key;
  }
  let point=state.hoverPoint;
  if(pinned){
    const center=new pc.Vec3(...toWorld(boundsCenter(record.spec),record.spec));
    const depth=state.camera.forward.dot(center.clone().sub(state.camera.getPosition()));
    point=state.camera.camera.worldToScreen(center);
    if(depth<=state.camera.camera.nearClip||point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight){bubble.hidden=true;canvas.removeAttribute('aria-describedby');return;}
  }
  if(!point){bubble.hidden=true;return;}
  bubble.hidden=false;bubble.dataset.assetId=id;bubble.dataset.mode=pinned?'selected':'hover';canvas.setAttribute('aria-describedby','asset-bubble');
  const place=bubblePosition(point.x,point.y,bubble.offsetWidth,bubble.offsetHeight,canvas.clientWidth,canvas.clientHeight);
  bubble.style.left=`${place.left}px`;bubble.style.top=`${place.top}px`;bubble.style.setProperty('--bubble-arrow',`${place.arrow}px`);bubble.dataset.above=String(place.above);
}
function renderDetails(){
  const record=state.groups.get(state.selected),spec=record?.spec;
  $('empty-selection').hidden=!!spec;$('asset-details').hidden=!spec;$('selection-caption').hidden=!spec;
  document.querySelectorAll('[data-asset-id]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.assetId===state.selected)));
  if(!spec)return;
  $('asset-name').textContent=nameLabel(spec);$('asset-other-name').textContent=nameLabel(spec,language==='zh'?'en':'zh');
  $('asset-id').textContent=spec.id;
  $('asset-dimensions').textContent=dimensionsLabel(spec);
  $('asset-evidence').textContent=evidenceLabel(spec);
  $('asset-purpose').textContent=purposeLabel(spec);
  const provenance={
    'User STL, unchanged metric geometry':['Original user-supplied STL','用户提供的原始 STL'],
    'Registered display geometry from the frozen simulation USD':['Simulation display geometry','仿真场景显示几何'],
    'Supplied CAD / existing shape hypothesis':['Supplied CAD / existing shape hypothesis','提供的 CAD / 已有形状假设']
  };
  $('asset-provenance').textContent=provenance[spec.provenance]?.[language==='zh'?1:0]||spec.provenance;
  $('selection-caption').textContent=`${nameLabel(spec)} · ${spec.id}`;
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
  renderDetails();renderBubble();
}
function updateCamera(custom=true){
  if(!state.camera)return;
  const r=state.distance,c=Math.cos(state.pitch);
  state.camera.setPosition(state.target.x+r*Math.sin(state.yaw)*c,state.target.y+r*Math.sin(state.pitch),state.target.z+r*Math.cos(state.yaw)*c);
  state.camera.lookAt(state.target);state.viewRevision++;setHover(null);
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
function pickBoundsAt(x,y){
  const camera=state.camera,origin=camera.getPosition(),far=camera.camera.screenToWorld(x,y,camera.camera.farClip),direction=far.sub(origin).normalize();
  let closest=Infinity,id=null;
  for(const [key,record] of state.groups){if(!record.loaded)continue;const distance=rayBoundsDistance([origin.x,origin.y,origin.z],[direction.x,direction.y,direction.z],record.spec);if(distance!==null&&distance<closest){closest=distance;id=key;}}
  return id;
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
  if(!id)id=pickBoundsAt(x,y);
  if(token!==state.pickToken||revision!==state.viewRevision)return;
  canvas.dataset.lastGesture='click';selectAsset(id,method);
}
function installControls(){
  const pointers=new Map();let gesture=null;
  const local=e=>{const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top};};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(![0,1,2].includes(e.button))return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    state.interacting=true;setHover(null);
    const point=local(e);pointers.set(e.pointerId,point);
    if(!gesture)gesture={button:e.button,start:point,last:point,distance:0,multi:false,cancelled:false};
    if(pointers.size>1)gesture.multi=true;
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture){
      if(state.ready&&!gesture&&e.pointerType!=='touch'){const point=local(e);setHover(pickBoundsAt(point.x,point.y),point);}
      return;
    }
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
    if(pointers.size===0){state.interacting=false;if(isClickGesture(gesture))void pickAt(point.x,point.y);else canvas.dataset.lastGesture=gesture.cancelled?'cancelled':gesture.multi?'touch':canvas.dataset.lastGesture;gesture=null;canvas.classList.remove('dragging');renderBubble();}
    else gesture.multi=true;
  };
  canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));
  canvas.addEventListener('pointerleave',()=>{if(!gesture)setHover(null);});
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(state.camera)zoom(Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.002));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!state.ready)return;
    if(e.key==='2')setPreset('operation_site_2');else if(e.key==='3')setPreset('operation_site_3');else if(e.key.toLowerCase()==='r')setPreset(state.scene.initial_view);else if(e.key==='Escape')selectAsset(null);else if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1.15);else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const dx=e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0,dy=e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0;if(e.shiftKey)pan(dx,dy);else orbit(dx,dy);}else return;e.preventDefault();
  });
  window.addEventListener('blur',()=>{pointers.clear();gesture=null;state.interacting=false;canvas.classList.remove('dragging');setHover(null);});
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
    setPreset(scene.initial_view);app.on('update',()=>{drawSelection();renderBubble();});app.start();installControls();
    state.total=2+scene.assets.reduce((count,asset)=>count+Object.keys(asset.files).length,0);$('loading-progress').max=state.total;
    // Both world resources are already metric Y-up; the root remains identity.
    await safeLoad(text('Room scan','实验室扫描'),'gsplat',scene.background_sog,app.root,null);
    await safeLoad(text('Room geometry','实验室几何'),'container',scene.static_geometry_glb,app.root,null);
    const sorted=[...scene.assets].sort((a,b)=>(priority.indexOf(a.id)<0?99:priority.indexOf(a.id))-(priority.indexOf(b.id)<0?99:priority.indexOf(b.id)));
    for(const spec of sorted){
      const parent=new pc.Entity(spec.id);parent._labAssetId=spec.id;
      // This is the only application of the exported pose. Never also apply
      // world_from_asset, web_from_source, a unit scale, or a child-axis flip.
      parent.setPosition(...spec.position_m);parent.setRotation(new pc.Quat(...spec.rotation_xyzw));app.root.addChild(parent);
      const record={spec,parent,loaded:false,meshes:[],highlights:[]};state.groups.set(spec.id,record);
      const button=document.createElement('button');button.type='button';button.dataset.assetId=spec.id;button.setAttribute('aria-pressed','false');button.disabled=true;
      const name=document.createElement('span');name.textContent=nameLabel(spec);const icon=document.createElement('span');icon.textContent='↗';button.append(name,icon);button.addEventListener('click',()=>selectAsset(spec.id));$('equipment-list').append(button);
    }
    // Bounded concurrency keeps decoded textures and GLB uploads manageable.
    const queue=[...state.groups.values()];
    await Promise.all(Array.from({length:3},async()=>{while(queue.length){const record=queue.shift();await Promise.all(Object.entries(record.spec.files).map(([format,path])=>safeLoad(nameLabel(record.spec),format==='glb'?'container':'gsplat',path,record.parent,record)));document.querySelector(`[data-asset-id="${record.spec.id}"]`).disabled=!record.loaded;}}));
    state.ready=true;canvas.dataset.loadedAssets=String([...state.groups.values()].filter(record=>record.loaded).length);canvas.dataset.loadErrors=String(state.errors.length);canvas.dataset.ready='true';$('loading-panel').hidden=true;renderLoadStatus();
  }catch(error){console.error(error);$('loading-panel').classList.add('failed');$('loading-detail').textContent=text('The scene could not start. WebGL2 and a local web server are required. ','场景未能启动，请确认 WebGL2 可用并通过本地服务器打开。')+error.message;$('loading-progress').hidden=true;canvas.dataset.ready='error';}
}
$('language-toggle').addEventListener('click',()=>setLanguage(language==='en'?'zh':'en'));
$('view-site-2').addEventListener('click',()=>setPreset('operation_site_2'));$('view-site-3').addEventListener('click',()=>setPreset('operation_site_3'));$('reset-view').addEventListener('click',()=>setPreset(state.scene?.initial_view));
$('zoom-in').addEventListener('click',()=>{if(state.camera)zoom(.85);});$('zoom-out').addEventListener('click',()=>{if(state.camera)zoom(1.15);});
$('clear-selection').addEventListener('click',()=>selectAsset(null));$('focus-selection').addEventListener('click',focusSelection);
$('toggle-background').addEventListener('click',()=>{state.scanVisible=!state.scanVisible;if(state.background)state.background.enabled=state.scanVisible;$('toggle-background').setAttribute('aria-pressed',String(state.scanVisible));$('toggle-background').textContent=text(state.scanVisible?'Scan on':'Scan off',state.scanVisible?'扫描：开':'扫描：关');});
window.addEventListener('message',event=>{if(embedded&&event.origin===location.origin&&event.source===window.parent&&event.data?.type==='bioagent:language'&&['en','zh'].includes(event.data.language))setLanguage(event.data.language);});
setLanguage(language);void initialize();
