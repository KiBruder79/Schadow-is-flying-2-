// src/core/AudioManager.js
import Logger from './Logger.js';

export default class AudioManager{
  constructor(assetManager){
    this.assets = assetManager;
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicElem = null;
    this.muted = false;
    this.sfxVolume = 0.9;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this._loadSettings();
  }

  _loadSettings(){
    try{
      const s = localStorage.getItem('kibruder_audio_settings');
      if (s){ const obj = JSON.parse(s); this.sfxEnabled = obj.sfxEnabled ?? true; this.musicEnabled = obj.musicEnabled ?? true; }
    }catch(e){ Logger.warn('Audio settings read failed',e); }
  }
  _saveSettings(){ try{ localStorage.setItem('kibruder_audio_settings', JSON.stringify({ sfxEnabled: this.sfxEnabled, musicEnabled: this.musicEnabled })); }catch(e){} }

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
      if (this.assets && this.assets.music){ this.musicElem = this.assets.music; }
      else if (this.assets){ this.musicElem = this.assets.createMusicElement('/assets/audio/music.mp3'); }
      if (this.musicElem) this.musicElem.muted = !this.musicEnabled;
    }catch(e){ Logger.warn('Audio init failed',e); }
  }

  playMusic(){ if (!this.musicElem) return; if (!this.musicEnabled) return; try{ this.musicElem.play(); }catch(e){ Logger.warn('music play failed',e); } }
  stopMusic(){ if (this.musicElem){ this.musicElem.pause(); this.musicElem.currentTime = 0; } }
  toggleMusic(){ this.musicEnabled = !this.musicEnabled; if (this.musicElem) this.musicElem.muted = !this.musicEnabled; this._saveSettings(); }
  toggleSfx(){ this.sfxEnabled = !this.sfxEnabled; this._saveSettings(); }

  playSfx(name, volume=1.0){ if (!this.sfxEnabled) return; if (!this.ctx) return; const buf = this.assets.sfx.get(name); if (!buf) return; try{ const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = volume; s.connect(g); g.connect(this.sfxGain); s.start(0); }catch(e){ Logger.warn('SFX play failed',name,e); } }
}
