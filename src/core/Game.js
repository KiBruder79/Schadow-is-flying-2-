// src/core/Game.js
// Einstiegspunkt: Game State Machine, Loop, Init aller Subsysteme
import Logger from './Logger.js';
import AssetManager from './AssetManager.js';
import AudioManager from './AudioManager.js';
import Input from './Input.js';
import RenderSystem from '../systems/RenderSystem.js';
import { rectHit, clamp } from '../systems/PhysicsSystem.js';
import Pool from '../utils/Pool.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import LevelManager from '../levels/LevelManager.js';
import UISystem from '../ui/UISystem.js';

// Game states
const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER', OPTIONS: 'OPTIONS' };

class Game {
  constructor(){
    // Canvas & systems
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width; this.H = this.canvas.height;

    this.assets = new AssetManager();
    this.audio = new AudioManager(this.assets);
    this.input = new Input(this.canvas);
    this.renderer = new RenderSystem(this.ctx, this.W, this.H);
    this.ui = new UISystem();
    this.levels = new LevelManager();

    // Game objects
    this.player = new Player(50, this.H/2);
    this.bulletPool = new Pool(()=>new Bullet(), 48);
    this.bullets = [];
    this.enemies = [];

    // State
    this.state = STATE.MENU;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3.0; // seconds
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('kibruder_highscore')||'0',10);

    // Flags
    this.flags = { triple: false, shield: false };

    this._bindUI();
    this._bindInput();

    // show menu
    this.ui.show('SHADOW KITSUNE SECTOR', 'KiBruder driftet durch den Neon‑Sektor.<br>Halte die Linie. Zerstöre alles. Sammle Power‑Ups.');
    this.ui.setHud('Highscore: ' + this.highscore);

    // create music element early (but don't play)
    this.assets.createMusicElement('/assets/audio/music.mp3');
  }

  _bindUI(){
    this.ui.startBtn.addEventListener('click', async ()=>{
      // first user gesture -> initialize audio
      await this.audio.initOnUserGesture();
      // preload sfx into AudioContext
      if (this.audio.ctx){
        await Promise.all([
          this.assets.loadSfx('shoot','/assets/audio/shoot.wav', this.audio.ctx),
          this.assets.loadSfx('explosion','/assets/audio/explosion.wav', this.audio.ctx),
          this.assets.loadSfx('hit','/assets/audio/hit.wav', this.audio.ctx),
          this.assets.loadSfx('powerup','/assets/audio/powerup.wav', this.audio.ctx),
          this.assets.loadSfx('boss_alert','/assets/audio/boss_alert.wav', this.audio.ctx)
        ]);
      }

      // play music if available
      this.audio.playMusic();

      this.startGame();
    });

    this.ui.optionsBtn.addEventListener('click', ()=>{
      // simple options placeholder
      this.ui.show('OPTIONEN', 'Musik: ' + (this.audio.muted? 'Aus':'An') + '<br>Schwierigkeit: Normal');
    });
  }

  _bindInput(){
    // keyboard fire
    this.input.on('keydown', ({key})=>{
      if (key === ' ' && this.state === STATE.PLAYING) this._playerShoot();
      if ((key === 'p' || key === 'P') && this.state === STATE.PLAYING) this.togglePause();
    });
    // tap -> shoot
    this.input.on('tap', ()=>{ if (this.state === STATE.PLAYING) this._playerShoot(); });
    // drag -> move player
    this.input.on('drag', ({dx,dy})=>{ if (this.state === STATE.PLAYING) { this.player.x += dx * 0.3; this.player.y += dy * 0.3; this._clampPlayer(); } });
  }

  startGame(){
    Logger.info('Start Game');
    this.state = STATE.PLAYING;
    this.score = 0; this.enemies.length = 0; this.bullets.length = 0; this.levels.reset();
    this.player.reset();
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    requestAnimationFrame(this._loop.bind(this));
    this.ui.hide();
  }

  togglePause(){
    if (this.state === STATE.PLAYING){ this.state = STATE.PAUSED; this.ui.show('PAUSE','P erneut drücken zum Fortsetzen.', false); }
    else if (this.state === STATE.PAUSED){ this.state = STATE.PLAYING; this.ui.hide(); this.lastTime = performance.now(); requestAnimationFrame(this._loop.bind(this)); }
  }

  _playerShoot(){
    const b = this.bulletPool.obtain();
    b.init(this.player.x + this.player.w, this.player.y + this.player.h/2 - b.h/2, 400);
    this.bullets.push(b);
    // play sfx
    this.audio.playSfx('shoot', 0.7);
  }

  _spawnWave(){
    const params = this.levels.getParams();
    const count = params.enemyCount;
    for (let i=0;i<count;i++){
      const y = Math.random()*(this.H-80) + 40;
      this.enemies.push({ x: this.W + 40 + i*40, y, w:24, h:18, s: 60 + params.enemySpeed*40 * Math.random(), hp: 1 + Math.floor(this.levels.level/2) });
    }
  }

  _update(dt){
    // spawn logic
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(1.0, this.spawnInterval - this.levels.level*0.3)){
      this.spawnTimer = 0; this._spawnWave();
      // boss alert every few waves (simple)
      if (Math.random() < 0.08){ this.audio.playSfx('boss_alert',0.9); }
    }

    // update bullets
    for (let i=this.bullets.length-1;i>=0;i--){
      const b = this.bullets[i]; b.update(dt);
      if (b.x > this.W + 50){ this.bulletPool.release(b); this.bullets.splice(i,1); }
    }

    // update enemies
    for (let i=this.enemies.length-1;i>=0;i--){
      const e = this.enemies[i]; e.x -= e.s * dt;
      if (e.x < -80) this.enemies.splice(i,1);
    }

    // collisions: bullets vs enemies
    for (let i=this.bullets.length-1;i>=0;i--){
      const b = this.bullets[i];
      for (let j=this.enemies.length-1;j>=0;j--){ const e=this.enemies[j];
        if (rectHit(b,e)){
          e.hp -= 1;
          this.bulletPool.release(b); this.bullets.splice(i,1);
          this.audio.playSfx('explosion',0.8);
          if (e.hp <= 0){ this.enemies.splice(j,1); this.score += 10; }
          break;
        }
      }
    }

    // simple enemy -> player collision
    for (let i=this.enemies.length-1;i>=0;i--){ const e=this.enemies[i];
      if (rectHit(e,this.player)){
        this.enemies.splice(i,1);
        this.player.hp -= 2; this.audio.playSfx('hit',0.9);
        if (this.player.hp <= 0) this._gameOver();
      }
    }
  }

  _clampPlayer(){ this.player.y = clamp(this.player.y, 10, this.H - this.player.h - 10); this.player.x = clamp(this.player.x, 10, this.W/2); }

  _gameOver(){
    Logger.info('Game Over. Score:', this.score);
    if (this.score > this.highscore){ this.highscore = this.score; localStorage.setItem('kibruder_highscore', String(this.highscore)); }
    this.state = STATE.GAMEOVER;
    this.ui.show('GAME OVER', 'Score: ' + this.score + '<br>Highscore: ' + this.highscore + '<br><br>Click auf START für Neustart.', true);
    this.audio.stopMusic();
  }

  _render(){
    this.renderer.clear();
    this.renderer.drawPlayer(this.player);
    this.renderer.drawBullets(this.bullets);
    this.renderer.drawEnemies(this.enemies);
    this.renderer.drawHUD(this.player,this.score,this.levels.level,this.highscore,this.flags);
  }

  _loop(ts){
    if (this.state !== STATE.PLAYING) return;
    const now = ts || performance.now();
    const dt = Math.min(0.1, (now - this.lastTime)/1000); // cap dt
    this.lastTime = now;

    try{
      this._update(dt);
      this._render();
      // update HUD line
      this.ui.setHud('Highscore: ' + this.highscore);
    }catch(e){ Logger.error('Game loop error', e); }

    requestAnimationFrame(this._loop.bind(this));
  }
}

// boot
window.addEventListener('DOMContentLoaded', ()=>{
  // small delay to ensure DOM elements from index.html exist
  const game = new Game();
  // expose for debugging
  window._GAME = game;
});

