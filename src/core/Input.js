// src/core/Input.js
// Centralized input handler: keyboard + touch -> events
export default class Input{
  constructor(canvas){
    this.keys = new Map();
    this.listeners = new Map();
    this.canvas = canvas;
    this._bind();
  }
  on(key, cb){ if (!this.listeners.has(key)) this.listeners.set(key,[]); this.listeners.get(key).push(cb); }
  emit(key, data){ (this.listeners.get(key)||[]).forEach(cb=>cb(data)); }

  _bind(){
    window.addEventListener('keydown', e=>{
      this.keys.set(e.key,true);
      this.emit('keydown',{key:e.key});
    });
    window.addEventListener('keyup', e=>{ this.keys.set(e.key,false); this.emit('keyup',{key:e.key}); });

    // simple touch handling: tap to shoot, drag to move
    let touchActive=false, lastX=0, lastY=0, lastTap=0;
    this.canvas.addEventListener('touchstart', e=>{
      e.preventDefault(); if (!e.touches||!e.touches[0]) return;
      const t = e.touches[0];
      const now = Date.now();
      if (now - lastTap < 250) this.emit('tap',{});
      lastTap = now;
      touchActive=true; lastX = t.clientX; lastY = t.clientY;
    },{passive:false});
    this.canvas.addEventListener('touchmove', e=>{
      e.preventDefault(); if (!touchActive) return; const t=e.touches[0]; this.emit('drag',{dx:t.clientX-lastX,dy:t.clientY-lastY}); lastX=t.clientX; lastY=t.clientY; },{passive:false});
    this.canvas.addEventListener('touchend', e=>{ touchActive=false; },{passive:false});
  }
}
