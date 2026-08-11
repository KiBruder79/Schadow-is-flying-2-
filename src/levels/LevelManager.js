// src/levels/LevelManager.js
// LevelManager with explicit levels 1..5 and scaling params
export default class LevelManager{
  constructor(){
    this.level = 1;
    this.maxLevel = 5;
    this.timeInLevel = 0;
    // define params per level (spawn rate, enemy speed multiplier, targets)
    this.levels = {
      1: { enemyCount: 3, enemySpeed: 0.8, duration: 30 },
      2: { enemyCount: 4, enemySpeed: 1.0, duration: 35 },
      3: { enemyCount: 5, enemySpeed: 1.3, duration: 40 },
      4: { enemyCount: 6, enemySpeed: 1.6, duration: 45 },
      5: { enemyCount: 8, enemySpeed: 2.0, duration: 60 }
    };
  }
  reset(){ this.level = 1; this.timeInLevel = 0; }
  advance(){ if (this.level < this.maxLevel) { this.level++; this.timeInLevel = 0; } }
  update(dt){ this.timeInLevel += dt; if (this.timeInLevel >= this.getParams().duration) { this.advance(); return true; } return false; }
  getParams(){ return this.levels[this.level] || this.levels[5]; }
}
