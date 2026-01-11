// Canvas & Context
const c = document.getElementById("game");
const x = c.getContext("2d");

// Audio (Musik + Effekte)
const bgMusic = new Audio("assets/audio/music.mp3");
bgMusic.loop = true;

const sShoot      = new Audio("assets/audio/shoot.wav");
const sExplosion  = new Audio("assets/audio/explosion.wav");
const sHit        = new Audio("assets/audio/hit.wav");
const sPowerup    = new Audio("assets/audio/powerup.wav");
const sBossAlert  = new Audio("assets/audio/boss_alert.wav");

function playSound(snd, volume = 0.9) {
    try {
        const a = snd.cloneNode(true);
        a.volume = volume;
        a.play();
    } catch (e) {
        // Audio fail silently
    }
}

// UI‑Elemente
const uiHudLine    = document.getElementById("hudLine");
const overlay      = document.getElementById("centerOverlay");
const overlayTitle = document.getElementById("centerTitle");
const overlayText  = document.getElementById("centerText");
const startBtn     = document.getElementById("startBtn");

// Canvas‑Maße
const W = c.width;
const H = c.height;

// Game‑State
let player, bullets, enemies, enemyBullets, explosions;
let starsFar, starsMid, starsNear, meteors, powerups;
let score, wave, boss, bossActive, tripleShot, shield;
let shieldTimer, tripleTimer;
let gameOver = false;
let paused   = false;
let inGame   = false;
let lastTime = 0;

let highscore = parseInt(localStorage.getItem("kibruder_highscore") || "0", 10);

// Input Keys (Keyboard)
const keys = {};

// Overlay
function showOverlay(title, text, showButton = true) {
    overlayTitle.textContent = title;
    overlayText.innerHTML    = text;
    overlay.style.display    = "block";
    startBtn.style.display   = showButton ? "inline-block" : "none";
}

function hideOverlay() {
    overlay.style.display = "none";
}

// Reset Game
function resetGame() {
    player = {
        x: 50,
        y: H / 2,
        w: 22,
        h: 18,
        speed: 5,
        alive: true,
        hp: 5,
        maxHp: 5
    };

    bullets      = [];
    enemies      = [];
    enemyBullets = [];
    explosions   = [];
    meteors      = [];
    powerups     = [];

    starsFar  = [];
    starsMid  = [];
    starsNear = [];

    score       = 0;
    wave        = 1;
    boss        = null;
    bossActive  = false;
    tripleShot  = false;
    shield      = false;
    shieldTimer = 0;
    tripleTimer = 0;
    gameOver    = false;
    paused      = false;

    for (let i = 0; i < 40; i++) {
        starsFar.push({ x: Math.random()*W, y: Math.random()*H, s:1, spd:0.3 });
    }
    for (let i = 0; i < 30; i++) {
        starsMid.push({ x: Math.random()*W, y: Math.random()*H, s:2, spd:0.7 });
    }
    for (let i = 0; i < 20; i++) {
        starsNear.push({ x: Math.random()*W, y: Math.random()*H, s:3, spd:1.2 });
    }

    uiHudLine.textContent = "Highscore: " + highscore;

    // Musik starten (erst nach User‑Interaktion)
    try { bgMusic.play(); } catch(e) {}
}

// Player Shoot
function shootPlayer() {
    if (!player || !player.alive || !inGame || paused) return;

    if (tripleShot) {
        bullets.push({ x:player.x+player.w, y:player.y+player.h/2-1,  w:10, h:2, s:8 });
        bullets.push({ x:player.x+player.w, y:player.y+player.h/2-6,  w:10, h:2, s:8 });
        bullets.push({ x:player.x+player.w, y:player.y+player.h/2+4,  w:10, h:2, s:8 });
    } else {
        bullets.push({ x:player.x+player.w, y:player.y+player.h/2-1,  w:10, h:2, s:8 });
    }
    playSound(sShoot, 0.7);
}

// Enemy Wave
function spawnWave() {
    if (bossActive || !player.alive || !inGame) return;

    for (let i = 0; i < 5 + wave; i++) {
        let y = Math.random()*(H-80) + 40;
        enemies.push({
            x: W+40 + i*40,
            y,
            w: 24,
            h: 18,
            s: 2 + Math.random()*1.5,
            hp: 1 + Math.floor(wave / 3)
        });
    }

    for (let i = 0; i < 2 + Math.floor(wave/2); i++) {
        let y    = Math.random()*(H-60) + 30;
        let size = 18 + Math.random()*20;
        meteors.push({
            x: W + Math.random()*200,
            y,
            r: size,
            s: 1 + Math.random()*1.5,
            hp: 2
        });
    }

    if (wave % 4 === 0) {
        setTimeout(spawnBoss, 3000);
        playSound(sBossAlert, 0.9);
    }

    wave++;
}
setInterval(spawnWave, 5000);

// Enemy Shoot
function enemyShoot() {
    if (!player || !player.alive || !inGame || paused) return;

    enemies.forEach(e => {
        enemyBullets.push({
            x: e.x - 10,
            y: e.y + e.h/2 - 1,
            w: 8,
            h: 2,
            s: -4
        });
    });

    if (bossActive && boss) {
        for (let i = -2; i <= 2; i++) {
            enemyBullets.push({
                x:  boss.x,
                y:  boss.y + boss.h/2 + i*10,
                w:  10,
                h:  3,
                s:  -5,
                vy: i*0.7
            });
        }
    }
}
setInterval(enemyShoot, 1200);

// Boss
function spawnBoss() {
    if (bossActive || !player.alive || !inGame) return;
    bossActive = true;
    boss = {
        x: W+120,
        y: H/2 - 60,
        w: 120,
        h: 80,
        s: 1.5,
        hp: 80,
        maxHp: 80,
        dir: 1
    };
}

// Explosion
function addExplosion(xp, yp, big = false) {
    explosions.push({
        x: xp,
        y: yp,
        r: 2,
        max: big ? 40 : 25
    });
    playSound(sExplosion, big ? 1.0 : 0.8);
}

// Powerups
function spawnPowerup(xp, yp) {
    const types = ["shield", "triple"];
    const t = types[Math.floor(Math.random()*types.length)];
    powerups.push({
        x: xp,
        y: yp,
        w: 16,
        h: 16,
        s: 2,
        type: t
    });
}

// Collision Helpers
function rectHit(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function circleHit(px, py, pr, cx, cy, cw, ch) {
    const rx = cx + cw/2;
    const ry = cy + ch/2;
    const dx = px - rx;
    const dy = py - ry;
    return dx*dx + dy*dy < pr*pr;
}

// Game Loop
function loop(timestamp) {
    requestAnimationFrame(loop);
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    if (!inGame || paused) return;

    // Clear
    x.clearRect(0, 0, W, H);

    // Background
    x.fillStyle = "#02030a";
    x.fillRect(0, 0, W, H);

    // Stars
    starsFar.forEach(s => {
        s.x -= s.spd;
        if (s.x < 0) {
            s.x = W;
            s.y = Math.random()*H;
        }
        x.fillStyle = "#111";
        x.fillRect(s.x, s.y, s.s, s.s);
    });

    starsMid.forEach(s => {
        s.x -= s.spd;
        if (s.x < 0) {
            s.x = W;
            s.y = Math.random()*H;
        }
        x.fillStyle = "#333";
        x.fillRect(s.x, s.y, s.s, s.s);
    });

    starsNear.forEach(s => {
        s.x -= s.spd;
        if (s.x < 0) {
            s.x = W;
            s.y = Math.random()*H;
        }
        x.fillStyle = "#777";
        x.fillRect(s.x, s.y, s.s, s.s);
    });

    // Player Movement (Keyboard)
    if (player.alive) {
        if (keys["ArrowUp"])    player.y -= player.speed;
        if (keys["ArrowDown"])  player.y += player.speed;
        if (keys["ArrowLeft"])  player.x -= player.speed;
        if (keys["ArrowRight"]) player.x += player.speed;

        // Grenzen
        if (player.y < 10) player.y = 10;
        if (player.y > H-player.h-10) player.y = H-player.h-10;
        if (player.x < 10) player.x = 10;
        if (player.x > W/2) player.x = W/2;
    }

    // Player Draw
    x.save();
    x.translate(player.x + player.w/2, player.y + player.h/2);
    if (!player.alive) x.globalAlpha = 0.4;

    x.beginPath();
    x.fillStyle = "#22ff8844";
    x.ellipse(0, 0, 18, 10, 0, 0, Math.PI*2);
    x.fill();

    x.beginPath();
    x.fillStyle = "#0f0";
    x.moveTo(-10, -8);
    x.lineTo(12, 0);
    x.lineTo(-10, 8);
    x.closePath();
    x.fill();

    x.fillStyle = "#b38cff";
    x.fillRect(-8, -10, 4, 6);
    x.fillRect(-8, 4, 4, 6);

    x.restore();

    // Shield
    if (shield) {
        x.beginPath();
        x.strokeStyle = "rgba(0,200,255,0.7)";
        x.lineWidth = 2;
        x.arc(player.x+player.w/2, player.y+player.h/2, 22, 0, Math.PI*2);
        x.stroke();
    }

    // UI Text
    x.fillStyle = "#0f0";
    x.font = "12px Arial";
    x.fillText("HP: " + player.hp + " / " + player.maxHp, 10, 20);
    x.fillText("Score: " + score, 10, 36);
    x.fillText("Wave: " + wave, 10, 52);
    x.fillText("Highscore: " + highscore, 10, 68);

    if (tripleShot) {
        x.fillStyle = "#ff0";
        x.fillText("TRIPLE", 400, 20);
    }
    if (shield) {
        x.fillStyle = "#0ff";
        x.fillText("SHIELD", 400, 36);
    }

    // Bullets
    x.fillStyle = "#0f0";
    bullets.forEach(b => {
        b.x += b.s;
        x.fillRect(b.x, b.y, b.w, b.h);
    });
    bullets = bullets.filter(b => b.x < W + 30);

    // Enemies
    enemies.forEach(e => {
        e.x -= e.s;
        x.fillStyle = "#f33";
        x.fillRect(e.x, e.y, e.w, e.h);
    });
    enemies = enemies.filter(e => e.x > -60);

    // Meteors
    meteors.forEach(m => {
        m.x -= m.s;
        x.beginPath();
        x.fillStyle = "#885533";
        x.arc(m.x, m.y, m.r, 0, Math.PI*2);
        x.fill();
    });
    meteors = meteors.filter(m => m.x > -80);

    // Enemy Bullets
    enemyBullets.forEach(b => {
        b.x += b.s;
        if (b.vy) b.y += b.vy;
        x.fillStyle = "#ff0";
        x.fillRect(b.x, b.y, b.w, b.h);
    });
    enemyBullets = enemyBullets.filter(
        b => b.x > -40 && b.x < W+40 && b.y > -20 && b.y < H+20
    );

    // Boss
    if (bossActive && boss) {
        if (boss.x > W-180) boss.x -= boss.s;
        boss.y += boss.dir * 1.2;
        if (boss.y < 40 || boss.y > H - 140) boss.dir *= -1;

        x.fillStyle = "#550022";
        x.fillRect(boss.x, boss.y, boss.w, boss.h);

        x.fillStyle = "#ff0066";
        x.fillRect(boss.x+10, boss.y+10, boss.w-20, boss.h-20);

        // Boss HP‑Bar
        x.fillStyle = "#444";
        x.fillRect(W/2-100, 10, 200, 8);

        x.fillStyle = "#f06";
        const hpw = (boss.hp / boss.maxHp) * 200;
        x.fillRect(W/2-100, 10, hpw, 8);
    }

    // Powerups
    powerups.forEach(p => {
        p.x -= p.s;
        x.fillStyle = p.type === "shield" ? "#0ff" : "#ff0";
        x.fillRect(p.x, p.y, p.w, p.h);
    });
    powerups = powerups.filter(p => p.x > -40);

    // COLLISIONS: Player Bullets
    bullets.forEach(b => {
        // vs Enemies
        enemies.forEach(e => {
            if (rectHit(b, e)) {
                e.hp -= 1;
                b.x = W + 100;
                if (e.hp <= 0) {
                    addExplosion(e.x+e.w/2, e.y+e.h/2);
                    if (Math.random() < 0.2) spawnPowerup(e.x, e.y);
                    e.x = -100;
                    score += 10;
                }
            }
        });

        // vs Meteors
        meteors.forEach(m => {
            if (circleHit(m.x, m.y, m.r, b.x, b.y, b.w, b.h)) {
                m.hp -= 1;
                b.x = W + 100;
                if (m.hp <= 0) {
                    addExplosion(m.x, m.y, true);
                    if (Math.random() < 0.15) spawnPowerup(m.x, m.y);
                    m.x = -100;
                    score += 15;
                }
            }
        });

        // vs Boss
        if (bossActive && boss && rectHit(b, boss)) {
            boss.hp -= 1;
            b.x = W + 100;
            addExplosion(boss.x+boss.w/2, boss.y+boss.h/2);
            if (boss.hp <= 0) {
                addExplosion(boss.x+boss.w/2, boss.y+boss.h/2, true);
                score += 200;
                bossActive = false;
                boss = null;
            }
        }
    });

    // COLLISIONS: Enemy Bullets vs Player
    if (player.alive) {
        enemyBullets.forEach(b => {
            if (rectHit(b, player)) {
                b.x = -100;
                if (shield) {
                    // Schild schluckt Treffer
                } else {
                    player.hp -= 1;
                    addExplosion(player.x+player.w/2, player.y+player.h/2);
                    playSound(sHit, 0.9);
                    if (player.hp <= 0) {
                        player.alive = false;
                        gameOver = true;
                        endGame();
                    }
                }
            }
        });
    }

    // COLLISIONS: Enemies/Meteors vs Player
    if (player.alive) {
        enemies.forEach(e => {
            if (rectHit(e, player)) {
                e.x = -100;
                if (!shield) {
                    player.hp -= 2;
                    addExplosion(player.x+player.w/2, player.y+player.h/2, true);
                    playSound(sHit, 1.0);
                    if (player.hp <= 0) {
                        player.alive = false;
                        gameOver = true;
                        endGame();
                    }
                }
            }
        });

        meteors.forEach(m => {
            if (circleHit(m.x, m.y, m.r, player.x, player.y, player.w, player.h)) {
                m.x = -100;
                if (!shield) {
                    player.hp -= 2;
                    addExplosion(player.x+player.w/2, player.y+player.h/2, true);
                    playSound(sHit, 1.0);
                    if (player.hp <= 0) {
                        player.alive = false;
                        gameOver = true;
                        endGame();
                    }
                }
            }
        });
    }

    // COLLISIONS: Powerups vs Player
    powerups.forEach(p => {
        if (rectHit(p, player)) {
            if (p.type === "shield") {
                shield      = true;
                shieldTimer = Date.now() + 8000;
            } else if (p.type === "triple") {
                tripleShot  = true;
                tripleTimer = Date.now() + 8000;
            }
            p.x = -100;
            playSound(sPowerup, 0.9);
        }
    });

    // Timers
    const now = Date.now();
    if (shield && now > shieldTimer)     shield = false;
    if (tripleShot && now > tripleTimer) tripleShot = false;

    // Explosions
    explosions.forEach(ex => {
        x.beginPath();
        x.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
        x.fillStyle = "rgba(255,150,0,0.8)";
        x.fill();
        ex.r += 1.8;
    });
    explosions = explosions.filter(ex => ex.r < ex.max);
}

// Game Over
function endGame() {
    if (score > highscore) {
        highscore = score;
        localStorage.setItem("kibruder_highscore", highscore.toString());
    }
    uiHudLine.textContent = "Highscore: " + highscore;

    showOverlay(
        "GAME OVER",
        "Score: " + score +
        "<br>Highscore: " + highscore +
        "<br><br>Click auf START für Neustart.",
        true
    );

    try { bgMusic.pause(); bgMusic.currentTime = 0; } catch(e) {}
}

// Start Loop
requestAnimationFrame(loop);

// Start‑Screen
showOverlay(
    "SHADOW KITSUNE SECTOR",
    "KiBruder driftet durch den Neon‑Sektor.<br>Halte die Linie. Zerstöre alles. Sammle Power‑Ups.",
    true
);