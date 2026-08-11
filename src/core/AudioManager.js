// src/core/AudioManager.js
import Logger from './Logger.js';

// Uses WebAudio for SFX and HTMLAudioElement for music (to keep memory sane)
export default class AudioManager{
  constructor(assetManager){
    this.assets = assetManager;
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicElem = null;
    this.muted = false;
    this.sfxVolume = 0.9;
  }

  async initOnUserGesture(){
    if (this.ctx) return;
    try{
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      Logger.info('AudioContext initialized');

      // create music element (if provided by assets)
      if (this.assets && this.assets.music){
        this.musicElem = this.assets.music;
      } else if (this.assets){
        this.musicElem = this.assets.createMusicElement('/assets/audio/music.mp3');
      }
    }catch(e){ Logger.warn('Audio init failed',e); }
  }

  playMusic(){
    if (!this.musicElem) return;
    try{ this.musicElem.play(); }catch(e){ Logger.warn('music play failed',e); }
  }
  stopMusic(){ if (this.musicElem){ this.musicElem.pause(); this.musicElem.currentTime = 0; } }

  toggleMute(){ this.muted = !this.muted; if (this.musicElem) this.musicElem.muted = this.muted; if (this.masterGain) this.masterGain.gain.value = this.muted?0:1; }

  playSfx(name, volume=1.0){
    if (!this.ctx) return; // not ready
    const buf = this.assets.sfx.get(name);
    if (!buf) return;
    try{
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = volume;
      s.connect(g);
      g.connect(this.sfxGain);
      s.start(0);
    }catch(e){ Logger.warn('SFX play failed',name,e); }
  }
}
