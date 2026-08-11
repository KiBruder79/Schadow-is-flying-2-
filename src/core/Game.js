// src/core/Game.js
// (updated) Game: Powerups, Boss skeleton, audio options, improved spawn logic
import Logger from './Logger.js';
import AssetManager from './AssetManager.js';
import AudioManager from './AudioManager.js';
import Input from './Input.js';
import RenderSystem from '../systems/RenderSystem.js';
import { rectHit, clamp, broadPhaseByX } from '../systems/PhysicsSystem.js';
import Pool from '../utils/Pool.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import Particle from '../entities/Particle.js';
import Powerup from '../entities/Powerup.js';
import Boss from '../entities/Boss.js';
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

    this.enemyPool = new Pool(()=>new Enemy(), 48);
    this.enemies = [];

    this.particlePool = new Pool(()=>new Particle(), 128);
    this.particles = [];

    this.powerupPool = new Pool(()=>new Powerup(), 24);
    this.powerups = [];

    this.boss = new Boss();

    this.state = STATE.MENU;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3.0;
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('kibruder_highscore')||'0',10);

    this.flags = { triple: false, shield: false, speed: false };
    this.timers = { shield: 0, triple: 0, speed: 0 };

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
      // toggle music on click for quick testing
      this.audio.toggleMusic();
      this.ui.show('OPTIONEN', 'Musik: ' + (this.audio.musicEnabled? 'An':'Aus') + '<br>Schwierigkeit: Normal');
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
    this.score = 0; this.enemies.length = 0; this.bullets.length = 0; this.particles.length = 0; this.powerups.length = 0; this.levels.reset();
    this.player.reset();
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.flags = { triple:false, shield:false, speed:false };
    this.timers = { shield:0, triple:0, speed:0 };
    requestAnimationFrame(this._loop.bind(this));
    this.ui.hide();
  }

  togglePause(){
    if (this.state === STATE.PLAYING){ this.state = STATE.PAUSED; this.ui.show('PAUSE','P erneut drücken zum Fortsetzen.', false); }
    else if (this.state === STATE.PAUSED){ this.state = STATE.PLAYING; this.ui.hide(); this.lastTime = performance.now(); requestAnimationFrame(this._loop.bind(this)); }
  }

  _playerShoot(){
    // handle speed boost affecting fire rate could be added later
    const b = this.bulletPool.obtain();
    b.init(this.player.x + this.player.w, this.player.y + this.player.h/2 - b.h/2, this.flags.speed ? 600 : 400);
    this.bullets.push(b);
    this.audio.playSfx('shoot', 0.7);
  }

  _maybeSpawnPowerup(x,y){
    if (Math.random() < 0.18){ const types = ['shield','triple','speed']; const t = types[Math.floor(Math.random()*types.length)]; const p = this.powerupPool.obtain(); p.init(x,y,t); this.powerups.push(p); }
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
    // meteors/powerups: spawn a powerup sometimes
    if (Math.random() < 0.35){ this._maybeSpawnPowerup(this.W + 40, Math.random()*(this.H-60) + 30); }
    // boss spawn for certain waves
    if (Math.random() < 0.06 && !this.boss.active){ // rare boss
      this.audio.playSfx('boss_alert',0.9);
      this.boss.init(this.W + 160, this.H/2 - 60, 80 + this.levels.level*20);
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

  _updateTimers(dt){
    const now = Date.now();
    if (this.flags.shield && this.timers.shield > 0){ this.timers.shield -= dt; if (this.timers.shield <= 0) this.flags.shield = false; }
    if (this.flags.triple && this.timers.triple > 0){ this.timers.triple -= dt; if (this.timers.triple <= 0) this.flags.triple = false; }
    if (this.flags.speed && this.timers.speed > 0){ this.timers.speed -= dt; if (this.timers.speed <= 0) this.flags.speed = false; }
  }

  _update(dt){
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(0.8, this.spawnInterval - this.levels.level*0.25)){
      this.spawnTimer = 0; this._spawnWave();
    }

    // update bullets
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; b.update(dt); if (b.x > this.W + 50){ this.bulletPool.release(b); this.bullets.splice(i,1); } }

    // update enemies
    for (let i=this.enemies.length-1;i>=0;i--){ const e=this.enemies[i]; e.update(dt); if (e.x < -80){ this.enemyPool.release(e); this.enemies.splice(i,1); } }

    // update powerups
    for (let i=this.powerups.length-1;i>=0;i--){ const p=this.powerups[i]; p.update(dt); if (!p.active){ this.powerupPool.release(p); this.powerups.splice(i,1); } }

    // update particles
    for (let i=this.particles.length-1;i>=0;i--){ const p=this.particles[i]; p.update(dt); if (!p.active){ this.particlePool.release(p); this.particles.splice(i,1); } }

    // update boss
    if (this.boss.active){ this.boss.update(dt); if (this.boss.hp <= 0){ this._spawnParticles(this.boss.x+this.boss.w/2, this.boss.y+this.boss.h/2, 40); this.boss.reset(); this.score += 200; } }

    // bullets vs enemies (broad-phase by x)
    const candidates = broadPhaseByX(this.enemies, 0, this.W+50);
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i];
      for (let j=candidates.length-1;j>=0;j--){ const e=candidates[j]; if (!e || !e.active) continue; if (rectHit(b,e)){
        e.hp -= 1; this.bulletPool.release(b); this.bullets.splice(i,1); this.audio.playSfx('explosion',0.8); this._spawnParticles(e.x+e.w/2, e.y+e.h/2, 12);
        if (e.hp <= 0){ this.enemyPool.release(e); const idx = this.enemies.indexOf(e); if (idx>=0) this.enemies.splice(idx,1); this.score += 10; // chance to spawn powerup
          if (Math.random() < 0.2) this._maybeSpawnPowerup(e.x, e.y);
        }
        break;
      } }
    }

    // bullets vs boss
    if (this.boss.active){ for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; if (rectHit(b,this.boss)){ this.boss.hp -= 1; this.bulletPool.release(b); this.bullets.splice(i,1); this.audio.playSfx('explosion',0.9); this._spawnParticles(this.boss.x+this.boss.w/2, this.boss.y+this.boss.h/2, 8); if (this.boss.hp <= 0){ /* handled above */ } break; } } }

    // player vs enemies
    const enemyCandidates = broadPhaseByX(this.enemies, 0, this.player.x + this.player.w + 40);
    for (let i=enemyCandidates.length-1;i>=0;i--){ const e = enemyCandidates[i]; if (rectHit(e,this.player)){
      // collision
      const idx = this.enemies.indexOf(e); if (idx>=0){ this.enemyPool.release(e); this.enemies.splice(idx,1); }
      if (!this.flags.shield){ this.player.hp -= 2; this.audio.playSfx('hit',0.9); this._spawnParticles(this.player.x+this.player.w/2, this.player.y+this.player.h/2, 18); if (this.player.hp <= 0) this._gameOver(); }
    } }

    // player vs powerups
    for (let i=this.powerups.length-1;i>=0;i--){ const p=this.powerups[i]; if (rectHit(p,this.player)){
      // apply powerup
      if (p.type === 'shield'){ this.flags.shield = true; this.timers.shield = 8.0; }
      else if (p.type === 'triple'){ this.flags.triple = true; this.timers.triple = 8.0; }
      else if (p.type === 'speed'){ this.flags.speed = true; this.timers.speed = 6.0; }
      this.audio.playSfx('powerup',0.9);
      this.powerupPool.release(p); this.powerups.splice(i,1);
    } }

    // timers
    this._updateTimers(dt);
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
    if (this.boss.active){
      const ctx=this.ctx; ctx.fillStyle='#550022'; ctx.fillRect(this.boss.x,this.boss.y,this.boss.w,this.boss.h); ctx.fillStyle='#ff0066'; ctx.fillRect(this.boss.x+10,this.boss.y+10,this.boss.w-20,this.boss.h-20);
      // boss HP bar
      ctx.fillStyle='#444'; ctx.fillRect(this.W/2-100,10,200,8); ctx.fillStyle='#f06'; const hpw = (this.boss.hp/this.boss.maxHp)*200; ctx.fillRect(this.W/2-100,10,hpw,8);
    }
    this.renderer.drawParticles(this.particles);
    this.renderer.drawHUD(this.player,this.score,this.levels.level,this.highscore,this.flags);
    // draw powerups
    this.powerups.forEach(p=>{ if (p.active){ this.ctx.fillStyle = p.type==='shield'?'#0ff':'#ff0'; this.ctx.fillRect(p.x,p.y,p.w,p.h); } });

    // draw shield around player
    if (this.flags.shield){ this.ctx.beginPath(); this.ctx.strokeStyle='rgba(0,200,255,0.7)'; this.ctx.lineWidth=2; this.ctx.arc(this.player.x+this.player.w/2,this.player.y+this.player.h/2,22,0,Math.PI*2); this.ctx.stroke(); }
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
