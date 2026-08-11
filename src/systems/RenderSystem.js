// src/systems/RenderSystem.js
export default class RenderSystem{
  constructor(ctx, width, height){ this.ctx=ctx; this.W=width; this.H=height; }

  clear(){ this.ctx.clearRect(0,0,this.W,this.H); this.ctx.fillStyle='#02030a'; this.ctx.fillRect(0,0,this.W,this.H); }

  drawPlayer(player){
    const ctx=this.ctx; ctx.save(); ctx.translate(player.x+player.w/2, player.y+player.h/2);
    ctx.beginPath(); ctx.fillStyle='#22ff8844'; ctx.ellipse(0,0,18,10,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle='#0f0'; ctx.moveTo(-10,-8); ctx.lineTo(12,0); ctx.lineTo(-10,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#b38cff'; ctx.fillRect(-8,-10,4,6); ctx.fillRect(-8,4,4,6);
    ctx.restore();
  }

  drawBullets(bullets){ this.ctx.fillStyle='#0f0'; bullets.forEach(b=>{ if (b.active) this.ctx.fillRect(b.x,b.y,b.w,b.h); }); }

  drawEnemies(enemies){
    const ctx=this.ctx; enemies.forEach(e=>{ if (e.active!==false) { ctx.fillStyle='#f33'; ctx.fillRect(e.x,e.y,e.w,e.h); } });
  }

  drawParticles(particles){
    const ctx=this.ctx; ctx.save();
    particles.forEach(p=>{ if (p.active) {
      const t = 1 - (p.life / p.maxLife);
      ctx.fillStyle = `rgba(255,150,0,${t})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }});
    ctx.restore();
  }

  drawHUD(player,score,wave,highscore,flags){
    const ctx=this.ctx; ctx.fillStyle='#0f0'; ctx.font='12px Arial'; ctx.fillText('HP: '+player.hp+' / '+player.maxHp,10,20); ctx.fillText('Score: '+score,10,36); ctx.fillText('Wave: '+wave,10,52); ctx.fillText('Highscore: '+highscore,10,68);
    if (flags.triple) { ctx.fillStyle='#ff0'; ctx.fillText('TRIPLE',400,20); }
    if (flags.shield) { ctx.fillStyle='#0ff'; ctx.fillText('SHIELD',400,36); }
  }
}
