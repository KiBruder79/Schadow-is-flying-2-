// src/entities/Powerup.js
export default class Powerup{
  constructor(){
    this.active = false; this.x = 0; this.y = 0; this.w = 16; this.h = 16; this.type = null; this.s = 60;
  }
  init(x,y,type){ this.active = true; this.x = x; this.y = y; this.type = type; this.s = 60; }
  update(dt){ if(!this.active) return; this.x -= this.s * dt; if (this.x < -40) this.active = false; }
  reset(){ this.active = false; this.x = 0; this.y = 0; this.type = null; }
}
