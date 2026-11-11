export const DRAG_THRESHOLD_PX = 6;
export function isClickGesture({button=0,distance=0,multi=false,cancelled=false}) {
  return button===0 && distance<DRAG_THRESHOLD_PX && !multi && !cancelled;
}
export function rotatePoint([x,y,z],[qx,qy,qz,qw]) {
  const tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
  return [x+qw*tx+qy*tz-qz*ty,y+qw*ty+qz*tx-qx*tz,z+qw*tz+qx*ty-qy*tx];
}
export function toWorld(point, asset) {
  return rotatePoint(point,asset.rotation_xyzw).map((v,i)=>v+asset.position_m[i]);
}
export function toLocal(point, asset) {
  const [x,y,z,w]=asset.rotation_xyzw;
  return rotatePoint(point.map((v,i)=>v-asset.position_m[i]),[-x,-y,-z,w]);
}
export function boundsCenter(asset) {return asset.pick_bounds_y_up_m[0].map((v,i)=>(v+asset.pick_bounds_y_up_m[1][i])/2);}
export function bubblePosition(x,y,width,height,viewportWidth,viewportHeight) {
  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(Math.max(lo,hi),value));
  const left=clamp(x+16,10,viewportWidth-width-10);
  const top=clamp(y-height-18>=10?y-height-18:y+18,10,viewportHeight-height-10);
  return {left,top,above:top+height<=y,arrow:clamp(x-left,16,width-16)};
}
export function rayBoundsDistance(origin,direction,asset) {
  const localOrigin=toLocal(origin,asset),[x,y,z,w]=asset.rotation_xyzw;
  const localDirection=rotatePoint(direction,[-x,-y,-z,w]);
  let near=-Infinity,far=Infinity;
  for(let i=0;i<3;i++) {
    const lo=asset.pick_bounds_y_up_m[0][i],hi=asset.pick_bounds_y_up_m[1][i],d=localDirection[i],o=localOrigin[i];
    if(Math.abs(d)<1e-10){if(o<lo||o>hi)return null;continue;}
    const a=(lo-o)/d,b=(hi-o)/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return null;
  }
  return far<0?null:Math.max(near,0);
}
