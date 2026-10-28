import * as T from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';

const CHOICES=['stay','switch','check'];
const HUBS={stay:[-7.4,.35,9.5],switch:[0,.35,9.5],check:[7.4,.35,9.5]};
const SEGMENTS=40;
const V=(x,y,z)=>new T.Vector3(x,y,z);

/** A record-to-result view. Lines encode supplied membership, never social influence. */
export class PopulationLens{
 constructor(parent,{participantIds,colors,responseTime=14}){
  this.allowedIds=new Set(participantIds);this.colors=colors;this.responseTime=responseTime;
  this.group=new T.Group();this.group.name='study-result-lens';this.group.visible=false;parent.add(this.group);
  this.hubs=new Map();this.links=new Map();this.groups=[];this.selectedId=null;this.requestedVisible=false;this.ready=true;this.error=null;
  for(const choice of CHOICES){
   const holder=new T.Group();holder.name='outcome-'+choice;holder.position.fromArray(HUBS[choice]);this.group.add(holder);
   const dot=new T.Mesh(new T.SphereGeometry(.068,12,8),new T.MeshBasicMaterial({color:colors[choice],transparent:true,opacity:.8,depthWrite:false}));holder.add(dot);
   const ring=new T.Mesh(new T.RingGeometry(.2,.215,48),new T.MeshBasicMaterial({color:colors[choice],transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));holder.add(ring);
   this.hubs.set(choice,{holder,ring,dot});
  }
 }
 validate(groups){
  if(!Array.isArray(groups)||groups.length!==CHOICES.length)throw Error('Supply all three outcome groups, including empty groups.');
  const seenChoices=new Set(),seenPeople=new Set();
  const validated=groups.map(group=>{
   if(!CHOICES.includes(group.choice)||seenChoices.has(group.choice))throw Error('Each supplied outcome choice must be unique.');
   if(typeof group.label!=='string'||!group.label.trim()||!Number.isInteger(group.count)||group.count<0||!Array.isArray(group.memberIds)||group.count!==group.memberIds.length)throw Error('Each outcome needs a label, count and matching memberIds.');
   seenChoices.add(group.choice);
   for(const id of group.memberIds){if(!this.allowedIds.has(id)||seenPeople.has(id))throw Error('Each supplied person must be known and belong to one outcome only.');seenPeople.add(id);}
   return {choice:group.choice,label:group.label,count:group.count,memberIds:[...group.memberIds]};
  });
  if(seenPeople.size!==this.allowedIds.size)throw Error('Supply every person exactly once across the outcome groups.');return validated;
 }
 set({visible=false,groups,selectedId=null,highlightedIds=null,ready=true}={}){
  this.requestedVisible=!!visible;this.ready=!!ready;this.highlightedIds=Array.isArray(highlightedIds)?new Set(highlightedIds):null;this.selectedId=this.allowedIds.has(selectedId)?selectedId:null;
  if(groups!==undefined){
   try{const next=this.validate(groups);this.groups=next;this.error=null;this.syncLinks();}
   catch(error){this.error=error.message;this.group.visible=false;}
  }
 }
 syncLinks(){
  const active=new Set(),reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const group of this.groups)for(const personId of group.memberIds){
   active.add(personId);let link=this.links.get(personId);const target=this.hubs.get(group.choice).holder.position;
   if(!link){
    const geometry=new LineGeometry();geometry.setPositions(new Float32Array((SEGMENTS+1)*3));
    const material=new LineMaterial({color:this.colors[group.choice],linewidth:2.5,transparent:true,opacity:.22,depthWrite:false,depthTest:false});
    const line=new Line2(geometry,material);line.name='record-result-'+personId;line.frustumCulled=false;line.renderOrder=2;this.group.add(line);
    link={personId,choice:group.choice,line,from:target.clone(),end:target.clone(),target:target.clone(),fromColor:material.color.clone(),targetColor:material.color.clone(),elapsed:.48};this.links.set(personId,link);
   }else if(link.choice!==group.choice){
    link.choice=group.choice;link.from.copy(link.end);link.target.copy(target);link.fromColor.copy(link.line.material.color);link.targetColor.set(this.colors[group.choice]);link.elapsed=reduced?.48:0;
   }
  }
  for(const[id,link]of this.links)if(!active.has(id)){link.line.removeFromParent();link.line.geometry.dispose();link.line.material.dispose();this.links.delete(id);}
 }
 isVisibleFor(time){return this.requestedVisible&&this.ready&&time>=this.responseTime&&!this.error&&this.groups.length===CHOICES.length;}
 fitPoints(time){if(!this.isVisibleFor(time))return [];return [...this.hubs.values()].flatMap(h=>[h.holder.position.clone().add(V(-1.6,-.2,-.3)),h.holder.position.clone().add(V(1.6,1,.3))]);}
 update({time,dt,camera,anchorFor}){
  this.group.visible=this.isVisibleFor(time);if(!this.group.visible)return;
  for(const group of this.groups){const hub=this.hubs.get(group.choice);hub.ring.quaternion.copy(camera.quaternion);hub.ring.material.opacity=group.count===0?.18:.58;hub.dot.material.opacity=group.count===0?.28:.9;}
  for(const link of this.links.values()){
   const anchor=anchorFor(link.personId);link.line.visible=!!anchor;if(!anchor)continue;
   link.elapsed=Math.min(.48,link.elapsed+Math.max(0,dt));const t=link.elapsed/.48,u=t*t*(3-2*t);link.end.lerpVectors(link.from,link.target,u);link.line.material.color.lerpColors(link.fromColor,link.targetColor,u);
   link.line.material.opacity=this.highlightedIds?(this.highlightedIds.has(link.personId)?.86:.055):this.selectedId?(link.personId===this.selectedId?.9:.17):.42;
   const start=anchor.clone().add(V(0,.2,0)),end=link.end;
   const spread=end.x-start.x,control1=start.clone().add(V(spread*.12,.1,1.5)),control2=end.clone().add(V(-spread*.1,.15,-1));
   link.line.material.linewidth=link.personId===this.selectedId?3.2:2;
   const shapeKey=[start.x,start.y,start.z,end.x,end.y,end.z].join(',');if(link.shapeKey===shapeKey)continue;link.shapeKey=shapeKey;
   const curve=new T.CubicBezierCurve3(start,control1,control2,end),positions=[];
   for(let i=0;i<=SEGMENTS;i++){const point=curve.getPoint(i/SEGMENTS);positions.push(point.x,point.y,point.z);}link.line.geometry.setPositions(positions);
  }
 }
 markerPositions(camera,width,height){
  if(!this.group.visible)return [];
  return this.groups.map(group=>{const point=this.hubs.get(group.choice).holder.position.clone().add(V(0,.23,0)).project(camera);return {choice:group.choice,label:group.label,count:group.count,x:(point.x+1)/2*width,y:(1-point.y)/2*height,visible:point.z>-1&&point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1};});
 }
 state(time){return {visible:this.isVisibleFor(time),requestedVisible:this.requestedVisible,ready:this.ready,responseTimeReached:time>=this.responseTime,selectedId:this.selectedId,error:this.error,groups:this.groups.map(g=>({...g,memberIds:[...g.memberIds]})),links:[...this.links.values()].map(l=>({personId:l.personId,choice:l.choice,selected:l.personId===this.selectedId,highlighted:this.highlightedIds?.has(l.personId)||false,transitioning:l.elapsed<.48})),meaning:'record-to-result membership; not social interactions'};}
}
