/** Decide whether the view needs another GPU submission. A frozen replay can
 * still render camera damping, input, changed records and result transitions. */
export class RenderScheduler {
 constructor(){this.dirty=true;this.lastTime=null;this.rendered=0;this.skipped=0;}
 invalidate(){this.dirty=true;}
 shouldRender({time,cameraMoving=false,transitioning=false}={}){
  const needed=this.dirty||time!==this.lastTime||cameraMoving||transitioning;
  if(!needed)this.skipped++;
  return needed;
 }
 didRender(time){this.lastTime=time;this.dirty=false;this.rendered++;}
}
