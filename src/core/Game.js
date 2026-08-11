// src/core/Game.js
// (updated) Game: integrate Enemy class, Particle pool and explosion particles
import Logger from './Logger.js';
import AssetManager from './AssetManager.js';
import AudioManager from './AudioManager.js';
import Input from './Input.js';
import RenderSystem from '../systems/RenderSystem.js';
import { rectHit, clamp } from '../systems/PhysicsSystem.js';
import Pool from '../utils/Pool.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import Particle from '../entities/Particle.js';
import LevelManager from '../levels/LevelManager.js';
import UISystem from '../ui/UISystem.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER', OPTIONS: 'OPTIONS' };

class Game {
  constructor(){
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width; this.H = this.canvas.height;

    this.assets = new AssetManager();
    this.audio = new AudioManager(this.assets);
    this.input = new Input(this.canvas);
    this.renderer = new RenderSystem(this.ctx, this.W, this.H);
    this.ui = new UISystem();
    this.levels = new LevelManager();

    this.player = new Player(50, this.H/2);
    this.bulletPool = new Pool(()=>new Bullet(), 64);
    this.bullets = [];

    this.enemyPool = new Pool(()=>new Enemy(), 32);
    this.enemies = [];

    this.particlePool = new Pool(()=>new Particle(), 128);
    this.particles = [];

    this.state = STATE.MENU;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3.0;
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('kibruder_highscore')||'0',10);

    this.flags = { triple: false, shield: false };

    this._bindUI();
    this._bindInput();

    this.ui.show('SHADOW KITSUNE SECTOR', 'KiBruder driftet durch den Neon‑Sektor.<br>Halte die Linie. Zerstöre alles. Sammle Power‑Ups.');
    this.ui.setHud('Highscore: ' + this.highscore);

    this.assets.createMusicElement('/assets/audio/music.mp3');
  }

  _bindUI(){
    this.ui.startBtn.addEventListener('click', async ()=>{
      await this.audio.initOnUserGesture();
      if (this.audio.ctx){
        await Promise.all([
          this.assets.loadSfx('shoot','/assets/audio/shoot.wav', this.audio.ctx),
          this.assets.loadSfx('explosion','/assets/audio/explosion.wav', this.audio.ctx),
          this.assets.loadSfx('hit','/assets/audio/hit.wav', this.audio.ctx),
          this.assets.loadSfx('powerup','/assets/audio/powerup.wav', this.audio.ctx),
          this.assets.loadSfx('boss_alert','/assets/audio/boss_alert.wav', this.audio.ctx)
        ]);
      }
      this.audio.playMusic();
      this.startGame();
    });

    this.ui.optionsBtn.addEventListener('click', ()=>{
      this.ui.show('OPTIONEN', 'Musik: ' + (this.audio.muted? 'Aus':'An') + '<br>Schwierigkeit: Normal');
    });
  }

  _bindInput(){
    this.input.on('keydown', ({key})=>{
      if (key === ' ' && this.state === STATE.PLAYING) this._playerShoot();
      if ((key === 'p' || key === 'P') && this.state === STATE.PLAYING) this.togglePause();
    });
    this.input.on('tap', ()=>{ if (this.state === STATE.PLAYING) this._playerShoot(); });
    this.input.on('drag', ({dx,dy})=>{ if (this.state === STATE.PLAYING) { this.player.x += dx * 0.3; this.player.y += dy * 0.3; this._clampPlayer(); } });
  }

  startGame(){
    Logger.info('Start Game');
    this.state = STATE.PLAYING;
    this.score = 0; this.enemies.length = 0; this.bullets.length = 0; this.particles.length = 0; this.levels.reset();
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
    this.audio.playSfx('shoot', 0.7);
  }

  _spawnWave(){
    const params = this.levels.getParams();
    const count = params.enemyCount;
    for (let i=0;i<count;i++){
      const y = Math.random()*(this.H-80) + 40;
      const e = this.enemyPool.obtain();
      const speed = 40 + params.enemySpeed * 30 * Math.random();
      const hp = 1 + Math.floor(this.levels.level/2);
      e.init(this.W + 40 + i*40, y, speed, hp);
      this.enemies.push(e);
    }
  }

  _spawnParticles(x,y,amount=10){
    for (let i=0;i<amount;i++){
      const p = this.particlePool.obtain();
      const ang = Math.random()*Math.PI*2; const spd = 30 + Math.random()*160;
      p.init(x, y, Math.cos(ang)*spd, Math.sin(ang)*spd, 0.4 + Math.random()*0.6);
      this.particles.push(p);
    }
  }

  _update(dt){
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(1.0, this.spawnInterval - this.levels.level*0.3)){
      this.spawnTimer = 0; this._spawnWave();
      if (Math.random() < 0.08){ this.audio.playSfx('boss_alert',0.9); }
    }

    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; b.update(dt); if (b.x > this.W + 50){ this.bulletPool.release(b); this.bullets.splice(i,1); } }

    for (let i=this.enemies.length-1;i>=0;i--){ const e=this.enemies[i]; e.update(dt); if (e.x < -80){ this.enemyPool.release(e); this.enemies.splice(i,1); } }

    for (let i=this.particles.length-1;i>=0;i--){ const p=this.particles[i]; p.update(dt); if (!p.active){ this.particlePool.release(p); this.particles.splice(i,1); } }

    // bullets vs enemies
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i];
      for (let j=this.enemies.length-1;j>=0;j--){ const e=this.enemies[j];
        if (rectHit(b,e)){
          e.hp -= 1;
          this.bulletPool.release(b); this.bullets.splice(i,1);
          this.audio.playSfx('explosion',0.8);
          this._spawnParticles(e.x+e.w/2, e.y+e.h/2, 12);
          if (e.hp <= 0){ this.enemyPool.release(e); this.enemies.splice(j,1); this.score += 10; }
          break;
        }
      }
    }

    for (let i=this.enemies.length-1;i>=0;i--){ const e=this.enemies[i]; if (rectHit(e,this.player)){
      this.enemyPool.release(e); this.enemies.splice(i,1);
      this.player.hp -= 2; this.audio.playSfx('hit',0.9);
      this._spawnParticles(this.player.x+this.player.w/2, this.player.y+this.player.h/2, 18);
      if (this.player.hp <= 0) this._gameOver();
    } }
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
    this.renderer.drawParticles(this.particles);
    this.renderer.drawHUD(this.player,this.score,this.levels.level,this.highscore,this.flags);
  }

  _loop(ts){
    if (this.state !== STATE.PLAYING) return;
    const now = ts || performance.now();
    const dt = Math.min(0.1, (now - this.lastTime)/1000);
    this.lastTime = now;

    try{ this._update(dt); this._render(); this.ui.setHud('Highscore: ' + this.highscore); }catch(e){ Logger.error('Game loop error', e); }

    requestAnimationFrame(this._loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', ()=>{ const game = new Game(); window._GAME = game; });
