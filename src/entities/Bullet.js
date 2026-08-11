// src/entities/Bullet.js
/**
 * Bullet entity used for player and enemy bullets.
 * - active flag denotes whether the bullet is in use.
 * - vx is used as horizontal velocity (px/s). optionally vy can be set externally.
 */
export default class Bullet{
  constructor(){ this.active=false; this.x=0; this.y=0; this.w=6; this.h=2; this.vx=300; this.vy=0; }
  init(x,y,vx=300){ this.active=true; this.x=x; this.y=y; this.vx=vx; this.vy = 0; }
  update(dt){ if (!this.active) return; this.x += this.vx * dt; if (this.vy) this.y += this.vy * dt; }
  reset(){ this.active=false; this.x=0; this.y=0; this.vx=0; this.vy=0; }
}
