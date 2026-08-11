// src/utils/Pool.js
// Very small object pool for bullets/particles
export default class Pool {
  constructor(createFn, size = 32){
    this.createFn = createFn;
    this.pool = [];
    for(let i=0;i<size;i++) this.pool.push(this.createFn());
  }
  obtain(){
    return this.pool.length ? this.pool.pop() : this.createFn();
  }
  release(obj){
    if (obj.reset) obj.reset();
    this.pool.push(obj);
  }
}
