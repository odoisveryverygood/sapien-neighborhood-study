import * as T from 'three';

/** The world is framed into the space left by the current caption or person sheet. */
export function safeFrame(width,height,layout={}){
 const left=Math.max(0,Math.min(width*.65,layout.leftInset||0));
 const right=Math.max(0,Math.min(width*.65,layout.rightInset||0));
 const top=Math.max(0,Math.min(height*.35,layout.topInset||0));
 const bottom=Math.max(0,Math.min(height*.65,layout.bottomInset||0));
 return {left,right,top,bottom,width:Math.max(width*.25,width-left-right),height:Math.max(height*.25,height-top-bottom),offsetX:(right-left)/2,offsetY:(bottom-top)/2};
}

/** Fit world-space bounds using camera-space projections rather than a fixed far-away zoom. */
export function fitCamera(points,target,direction,{fov,aspect,width,height,layout={},minDistance=1,maxDistance=100,padding=.9}){
 const frame=safeFrame(width,height,layout),back=direction.clone().normalize();
 const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),back).normalize();
 const up=new T.Vector3().crossVectors(back,right).normalize();
 const tanY=Math.tan(T.MathUtils.degToRad(fov)/2),tanX=tanY*aspect;
 const xLimit=tanX*frame.width/width*padding,yLimit=tanY*frame.height/height*padding;
 let distance=minDistance;
 for(const point of points){const relative=point.clone().sub(target),depth=relative.dot(back);distance=Math.max(distance,depth+Math.abs(relative.dot(right))/xLimit,depth+Math.abs(relative.dot(up))/yLimit);}
 return target.clone().addScaledVector(back,Math.min(distance,maxDistance));
}

export function boxCorners(min,max){
 const points=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])points.push(new T.Vector3(x,y,z));return points;
}
