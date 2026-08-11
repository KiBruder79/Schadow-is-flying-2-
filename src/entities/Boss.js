// src/entities/Boss.js
// Simple Boss skeleton with phases and timers
export default class Boss{
  constructor(){ this.active = false; this.x = 0; this.y = 0; this.w = 120; this.h = 80; this.s = 30; this.hp = 0; this.maxHp = 0; this.phase = 0; this.phaseTimer = 0; this.attackTimer = 0; }
  init(x,y,hp=100){ this.active = true; this.x = x; this.y = y; this.hp = hp; this.maxHp = hp; this.s = 40; this.phase = 0; this.phaseTimer = 0; this.attackTimer = 0; }
  update(dt){ if(!this.active) return; // move into screen
    if (this.x > 360) this.x -= this.s * dt; // approach
    // simple bobbing
    this.y += Math.sin(performance.now()/500 + this.phase) * 8 * dt;
    this.phaseTimer += dt; this.attackTimer += dt;
    // phase switch
    if (this.phaseTimer > 6){ this.phase = (this.phase + 1) % 3; this.phaseTimer = 0; }
  }
  reset(){ this.active = false; this.x = 0; this.y = 0; this.hp = 0; this.maxHp = 0; this.phase = 0; }
}
