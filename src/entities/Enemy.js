// src/entities/Enemy.js
/**
 * Enemy entity — lightweight and poolable.
 * Methods: init(x,y,speed,hp), update(dt), reset()
 */
export default class Enemy{
  constructor(x=0,y=0,s=60,hp=1){
    this.x = x; this.y = y; this.w = 24; this.h = 18; this.s = s; this.hp = hp; this.active = true;
  }
  init(x,y,s,hp){ this.x=x; this.y=y; this.s=s; this.hp=hp; this.active=true; }
  update(dt){ this.x -= this.s * dt; }
  reset(){ this.active=false; this.x=0; this.y=0; this.s=0; this.hp=0; }
}
