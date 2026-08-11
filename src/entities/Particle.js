// src/entities/Particle.js
// simple particle for explosions
export default class Particle{
  constructor(){ this.active=false; this.x=0; this.y=0; this.vx=0; this.vy=0; this.life=0; this.maxLife=0; }
  init(x,y,vx,vy,maxLife=0.6){ this.active=true; this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=0; this.maxLife=maxLife; }
  update(dt){ if(!this.active) return; this.life += dt; this.x += this.vx * dt; this.y += this.vy * dt; if(this.life >= this.maxLife) this.active=false; }
  reset(){ this.active=false; this.x=0; this.y=0; this.vx=0; this.vy=0; this.life=0; this.maxLife=0; }
}
