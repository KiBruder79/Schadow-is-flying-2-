// src/core/AssetManager.js
import Logger from './Logger.js';

// Minimal asset manager: loads small audio buffers and exposes Audio Elements for music
export default class AssetManager{
  constructor(){
    this.sfx = new Map();
    this.music = null; // HTMLAudioElement
  }

  async loadSfx(name, url, audioContext){
    try{
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const buf = await audioContext.decodeAudioData(ab.slice(0));
      this.sfx.set(name, buf);
      Logger.debug('SFX loaded:',name);
    }catch(e){ Logger.warn('Failed SFX',name,url,e); }
  }

  createMusicElement(url){
    try{
      const a = new Audio(url);
      a.loop = true;
      this.music = a;
      return a;
    }catch(e){ Logger.warn('music element failed',e); return null; }
  }
}
