// src/entities/Player.js
/**
 * Player entity
 * - holds position, size and HP
 * - speed is in px/sec
 */
export default class Player{
  constructor(x=50,y=320){
    this.x = x; this.y = y; this.w = 22; this.h = 18;
    this.speed = 180; // px per second
    this.alive = true; this.hp = 5; this.maxHp = 5;
  }

  /** Reset player to initial state (useful when reusing the player) */
  reset(){ this.x=50; this.y=320; this.alive=true; this.hp=this.maxHp; }
}
