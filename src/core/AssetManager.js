// src/core/AssetManager.js
/**
 * AssetManager: lightweight loader for audio buffers (SFX) and an HTMLAudioElement for music.
 * Note: decodeAudioData is used for small sounds; music is left as an <audio> element to save memory.
 */
import Logger from './Logger.js';

export default class AssetManager{
  constructor(){ this.sfx = new Map(); this.music = null; }
  async loadSfx(name, url, audioContext){ try{ const res = await fetch(url); const ab = await res.arrayBuffer(); const buf = await audioContext.decodeAudioData(ab.slice(0)); this.sfx.set(name, buf); Logger.debug('SFX loaded:',name); }catch(e){ Logger.warn('Failed SFX',name,url,e); } }
  createMusicElement(url){ try{ const a = new Audio(url); a.loop = true; this.music = a; return a; }catch(e){ Logger.warn('music element failed',e); return null; } }
}
