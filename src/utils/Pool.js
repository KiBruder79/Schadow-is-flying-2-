// src/utils/Pool.js
// Very small object pool for bullets/particles
// Added optional maxSize to avoid unbounded pool growth
export default class Pool {
  constructor(createFn, size = 32, maxSize = 256){
    this.createFn = createFn;
    this.pool = [];
    this.maxSize = maxSize;
    for(let i=0;i<size;i++) this.pool.push(this.createFn());
  }
  obtain(){
    return this.pool.length ? this.pool.pop() : this.createFn();
  }
  release(obj){
    try{
      if (obj && obj.reset) obj.reset();
    }catch(e){ /* defensive */ }
    if (this.pool.length < this.maxSize) this.pool.push(obj);
  }
}
