// src/levels/LevelManager.js
// Controls level progression and difficulty
export default class LevelManager{
  constructor(){ this.level=1; this.maxLevel=5; }
  advance(){ if (this.level < this.maxLevel) this.level++; }
  reset(){ this.level=1; }
  getParams(){
    // Example params scaling with level
    return {
      enemyCount: 3 + this.level * 2,
      enemySpeed: 1 + this.level * 0.4,
      meteorCount: Math.min(5,1+Math.floor(this.level/2))
    };
  }
}
