// src/core/Game.js
// (updated) Commit E: Level progression, Boss attack patterns, enemy bullets, options UI
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

    this.enemyBulletPool = new Pool(()=>new Bullet(), 64);
    this.enemyBullets = [];

    this.boss = new Boss();

    this.state = STATE.MENU;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3.0;
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('kibruder_highscore')||'0',10);

    this.flags = { triple: false, shield: false, speed: false };
    this.timers = { shield: 0, triple: 0, speed: 0 };

    this.levelTimer = 0;

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
      // show options UI with toggles
      const html = `
        Musik: <button id="toggleMusic" class="button">${this.audio.musicEnabled? 'Aus':'An'}</button><br>
        SFX: <button id="toggleSfx" class="button">${this.audio.sfxEnabled? 'Aus':'An'}</button><br>
        Schwierigkeit: <select id="difficultySelect"><option value="easy">Leicht</option><option value="normal" selected>Normal</option><option value="hard">Schwer</option></select>
      `;
      this.ui.show('OPTIONEN', html, true);
      // bind dynamic controls after render
      setTimeout(()=>{
        const m = document.getElementById('toggleMusic'); const s = document.getElementById('toggleSfx'); const d = document.getElementById('difficultySelect');
        if (m) m.addEventListener('click', ()=>{ this.audio.toggleMusic(); m.textContent = this.audio.musicEnabled? 'Aus':'An'; });
        if (s) s.addEventListener('click', ()=>{ this.audio.toggleSfx(); s.textContent = this.audio.sfxEnabled? 'Aus':'An'; });
        if (d) d.addEventListener('change', ()=>{ const v=d.value; if (v==='easy'){ this.levels.levels[1].enemyCount = 2; } else if (v==='hard'){ this.levels.levels[1].enemyCount = 5; } });
      },50);
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
    this.score = 0; this.enemies.length = 0; this.bullets.length = 0; this.particles.length = 0; this.powerups.length = 0; this.enemyBullets.length = 0; this.levels.reset();
    this.player.reset();
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.flags = { triple:false, shield:false, speed:false };
    this.timers = { shield:0, triple:0, speed:0 };
    this.levelTimer = 0;
    requestAnimationFrame(this._loop.bind(this));
    this.ui.hide();
  }

  togglePause(){
    if (this.state === STATE.PLAYING){ this.state = STATE.PAUSED; this.ui.show('PAUSE','P erneut drücken zum Fortsetzen.', false); }
    else if (this.state === STATE.PAUSED){ this.state = STATE.PLAYING; this.ui.hide(); this.lastTime = performance.now(); requestAnimationFrame(this._loop.bind(this)); }
  }

  _playerShoot(){
    if (!this.player.alive) return;
    if (this.flags.triple){
      const offsets = [-6, 0, 6];
      offsets.forEach(off => {
        const b = this.bulletPool.obtain(); b.init(this.player.x + this.player.w, this.player.y + this.player.h/2 + off - 1, this.flags.speed ? 600 : 420); this.bullets.push(b);
      });
    } else {
      const b = this.bulletPool.obtain(); b.init(this.player.x + this.player.w, this.player.y + this.player.h/2 - b.h/2, this.flags.speed ? 600 : 420); this.bullets.push(b);
    }
    this.audio.playSfx('shoot', 0.7);
  }

  _maybeSpawnPowerup(x,y){ if (Math.random() < 0.18){ const types = ['shield','triple','speed']; const t = types[Math.floor(Math.random()*types.length)]; const p = this.powerupPool.obtain(); p.init(x,y,t); this.powerups.push(p); } }

  _spawnWave(){
    const params = this.levels.getParams(); const count = params.enemyCount;
    for (let i=0;i<count;i++){
      const y = Math.random()*(this.H-80) + 40;
      const e = this.enemyPool.obtain();
      const speed = 40 + params.enemySpeed * 30 * Math.random();
      const hp = 1 + Math.floor(this.levels.level/2);
      e.init(this.W + 40 + i*40, y, speed, hp);
      this.enemies.push(e);
    }
    if (Math.random() < 0.35){ this._maybeSpawnPowerup(this.W + 40, Math.random()*(this.H-60) + 30); }
    if (Math.random() < 0.06 && !this.boss.active){ this.audio.playSfx('boss_alert',0.9); this.boss.init(this.W + 160, this.H/2 - 60, 80 + this.levels.level*30); }
  }

  _spawnParticles(x,y,amount=10){ for (let i=0;i<amount;i++){ const p = this.particlePool.obtain(); const ang = Math.random()*Math.PI*2; const spd = 30 + Math.random()*160; p.init(x, y, Math.cos(ang)*spd, Math.sin(ang)*spd, 0.4 + Math.random()*0.6); this.particles.push(p); } }

  _spawnEnemyBullet(x,y,vx,vy){ const b = this.enemyBulletPool.obtain(); b.init(x,y,vx); b.vy = vy || 0; b.w = 8; b.h = 2; this.enemyBullets.push(b); }

  _bossLogic(dt){ if (!this.boss.active) return; // simple patterns based on phase
    // phase 0: aimed shots
    if (this.boss.attackTimer > 0.8 && this.boss.phase === 0){
      // fire 3 aimed shots
      for (let i=0;i<3;i++){ const dirY = (this.player.y + this.player.h/2) - (this.boss.y + this.boss.h/2) + (i-1)*20; const ang = Math.atan2(dirY, - (this.boss.x - (this.player.x))); const speed = 220; this._spawnEnemyBullet(this.boss.x, this.boss.y + this.boss.h/2, -Math.cos(ang)*speed, Math.sin(ang)*speed); }
      this.boss.attackTimer = 0; }
    // phase 1: sweeping spread
    if (this.boss.attackTimer > 1.2 && this.boss.phase === 1){
      for (let a=-3;a<=3;a++){ const ang = (a/6) * Math.PI/3; const speed = 200; this._spawnEnemyBullet(this.boss.x, this.boss.y + this.boss.h/2 + a*6, -Math.cos(ang)*speed, Math.sin(ang)*speed); }
      this.boss.attackTimer = 0; }
    // phase 2: charge then burst
    if (this.boss.phase === 2){
      if (this.boss.attackTimer > 2.5){ // big burst
        for (let a=0;a<12;a++){ const ang = (a/12) * Math.PI*2; const speed = 160; this._spawnEnemyBullet(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, Math.cos(ang)*speed, Math.sin(ang)*speed); }
        this.boss.attackTimer = 0; }
    }
  }

  _updateTimers(dt){ if (this.flags.shield && this.timers.shield > 0){ this.timers.shield -= dt; if (this.timers.shield <= 0) this.flags.shield = false; } if (this.flags.triple && this.timers.triple > 0){ this.timers.triple -= dt; if (this.timers.triple <= 0) this.flags.triple = false; } if (this.flags.speed && this.timers.speed > 0){ this.timers.speed -= dt; if (this.timers.speed <= 0) this.flags.speed = false; } }

  _update(dt){
    // level progression timer
    const advanced = this.levels.update(dt); if (advanced){ this.ui.show('LEVEL UP', 'Level ' + this.levels.level, false); setTimeout(()=>{ this.ui.hide(); }, 1200); }

    this.spawnTimer += dt; if (this.spawnTimer > Math.max(0.6, this.spawnInterval - this.levels.level*0.2)){ this.spawnTimer = 0; this._spawnWave(); }

    // bullets
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; b.update(dt); if (b.x > this.W + 50){ this.bulletPool.release(b); this.bullets.splice(i,1); } }

    // enemy bullets
    for (let i=this.enemyBullets.length-1;i>=0;i--){ const b=this.enemyBullets[i]; b.update(dt); if (b.x < -60 || b.x > this.W+60 || b.y < -60 || b.y > this.H+60){ this.enemyBulletPool.release(b); this.enemyBullets.splice(i,1); continue; } // hit player
      if (rectHit(b,this.player)){
        this.enemyBulletPool.release(b); this.enemyBullets.splice(i,1);
        if (!this.flags.shield){ this.player.hp -= 1; this.audio.playSfx('hit',0.9); this._spawnParticles(this.player.x+this.player.w/2, this.player.y+this.player.h/2, 10); if (this.player.hp <= 0) this._gameOver(); }
      }
    }

    // enemies
    for (let i=this.enemies.length-1;i>=0;i--){ const e=this.enemies[i]; e.update(dt); if (e.x < -80){ this.enemyPool.release(e); this.enemies.splice(i,1); } }

    // powerups
    for (let i=this.powerups.length-1;i>=0;i--){ const p=this.powerups[i]; p.update(dt); if (!p.active){ this.powerupPool.release(p); this.powerups.splice(i,1); } }

    // particles
    for (let i=this.particles.length-1;i>=0;i--){ const p=this.particles[i]; p.update(dt); if (!p.active){ this.particlePool.release(p); this.particles.splice(i,1); } }

    // boss
    if (this.boss.active){ this.boss.update(dt); this._bossLogic(dt); if (this.boss.hp <= 0){ this._spawnParticles(this.boss.x+this.boss.w/2, this.boss.y+this.boss.h/2, 40); this.boss.reset(); this.score += 200; } }

    // collisions bullets vs enemies (broad-phase)
    const candidates = broadPhaseByX(this.enemies, 0, this.W+50);
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; for (let j=candidates.length-1;j>=0;j--){ const e=candidates[j]; if (!e || !e.active) continue; if (rectHit(b,e)){
          e.hp -= 1; this.bulletPool.release(b); this.bullets.splice(i,1); this.audio.playSfx('explosion',0.8); this._spawnParticles(e.x+e.w/2, e.y+e.h/2, 12); if (e.hp <= 0){ this.enemyPool.release(e); const idx = this.enemies.indexOf(e); if (idx>=0) this.enemies.splice(idx,1); this.score += 10; if (Math.random() < 0.2) this._maybeSpawnPowerup(e.x, e.y); } break; } } }

    // bullets vs boss
    if (this.boss.active){ for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; if (rectHit(b,this.boss)){ this.boss.hp -= 1; this.bulletPool.release(b); this.bullets.splice(i,1); this.audio.playSfx('explosion',0.9); this._spawnParticles(this.boss.x+this.boss.w/2, this.boss.y+this.boss.h/2, 8); break; } } }

    // enemies vs player
    const enemyCandidates = broadPhaseByX(this.enemies, 0, this.player.x + this.player.w + 40);
    for (let i=enemyCandidates.length-1;i>=0;i--){ const e = enemyCandidates[i]; if (rectHit(e,this.player)){
      const idx = this.enemies.indexOf(e); if (idx>=0){ this.enemyPool.release(e); this.enemies.splice(idx,1); }
      if (!this.flags.shield){ this.player.hp -= 2; this.audio.playSfx('hit',0.9); this._spawnParticles(this.player.x+this.player.w/2, this.player.y+this.player.h/2, 18); if (this.player.hp <= 0) this._gameOver(); }
    } }

    // player vs powerups
    for (let i=this.powerups.length-1;i>=0;i--){ const p=this.powerups[i]; if (rectHit(p,this.player)){
      if (p.type === 'shield'){ this.flags.shield = true; this.timers.shield = 8.0; }
      else if (p.type === 'triple'){ this.flags.triple = true; this.timers.triple = 8.0; }
      else if (p.type === 'speed'){ this.flags.speed = true; this.timers.speed = 6.0; }
      this.audio.playSfx('powerup',0.9);
      this.powerupPool.release(p); this.powerups.splice(i,1);
    } }

    this._updateTimers(dt);
  }

  _clampPlayer(){ this.player.y = clamp(this.player.y, 10, this.H - this.player.h - 10); this.player.x = clamp(this.player.x, 10, this.W/2); }

  _gameOver(){ Logger.info('Game Over. Score:', this.score); if (this.score > this.highscore){ this.highscore = this.score; localStorage.setItem('kibruder_highscore', String(this.highscore)); } this.state = STATE.GAMEOVER; this.ui.show('GAME OVER', 'Score: ' + this.score + '<br>Highscore: ' + this.highscore + '<br><br>Click auf START für Neustart.', true); this.audio.stopMusic(); }

  _render(){ this.renderer.clear(); this.renderer.drawPlayer(this.player); this.renderer.drawBullets(this.bullets); this.renderer.drawEnemies(this.enemies); this.renderer.drawEnemyBullets(this.enemyBullets); if (this.boss.active){ const ctx=this.ctx; ctx.fillStyle='#550022'; ctx.fillRect(this.boss.x,this.boss.y,this.boss.w,this.boss.h); ctx.fillStyle='#ff0066'; ctx.fillRect(this.boss.x+10,this.boss.y+10,this.boss.w-20,this.boss.h-20); ctx.fillStyle='#444'; ctx.fillRect(this.W/2-100,10,200,8); ctx.fillStyle='#f06'; const hpw = (this.boss.hp/this.boss.maxHp)*200; ctx.fillRect(this.W/2-100,10,hpw,8); } this.renderer.drawParticles(this.particles); this.renderer.drawHUD(this.player,this.score,this.levels.level,this.highscore,this.flags); this.powerups.forEach(p=>{ if (p.active){ this.ctx.fillStyle = p.type==='shield'?'#0ff':'#ff0'; this.ctx.fillRect(p.x,p.y,p.w,p.h); } }); if (this.flags.shield){ this.ctx.beginPath(); this.ctx.strokeStyle='rgba(0,200,255,0.7)'; this.ctx.lineWidth=2; this.ctx.arc(this.player.x+this.player.w/2,this.player.y+this.player.h/2,22,0,Math.PI*2); this.ctx.stroke(); } }

  _loop(ts){ if (this.state !== STATE.PLAYING) return; const now = ts || performance.now(); const dt = Math.min(0.1, (now - this.lastTime)/1000); this.lastTime = now; try{ this._update(dt); this._render(); this.ui.setHud('Highscore: ' + this.highscore + ' · Level '+this.levels.level); }catch(e){ Logger.error('Game loop error', e); } requestAnimationFrame(this._loop.bind(this)); }
}

window.addEventListener('DOMContentLoaded', ()=>{ const game = new Game(); window._GAME = game; });
