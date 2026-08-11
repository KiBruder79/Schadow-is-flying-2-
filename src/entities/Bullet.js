// src/entities/Bullet.js
export default class Bullet{
  constructor(){ this.active=false; this.x=0; this.y=0; this.w=6; this.h=2; this.vx=300; }
  init(x,y,vx=300){ this.active=true; this.x=x; this.y=y; this.vx=vx; }
  update(dt){ if (!this.active) return; this.x += this.vx * dt; }
  reset(){ this.active=false; this.x=0; this.y=0; }
}
