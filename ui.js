// nutzt globale Variablen/Funktionen aus main.js:
// keys, shootPlayer, showOverlay, hideOverlay,
// resetGame, inGame, gameOver, paused, player, c

// Keyboard
document.addEventListener("keydown", e => {
    keys[e.key] = true;

    if (e.key === " " && player && player.alive && inGame && !paused) {
        shootPlayer();
    }

    if (e.key === "p" || e.key === "P") {
        if (inGame && !gameOver) {
            paused = !paused;
            if (paused) {
                showOverlay("PAUSE", "P erneut drücken zum Fortsetzen.", false);
            } else {
                hideOverlay();
            }
        }
    }
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
});

// Start‑Button
startBtn.onclick = () => {
    if (!inGame) {
        hideOverlay();
        resetGame();
        inGame = true;
    } else if (gameOver) {
        hideOverlay();
        resetGame();
        inGame = true;
    }
};

// Mobile Drag + Tap‑Shoot
let touchActive = false;
let lastTouchY  = null;
let lastTouchX  = null;
let lastTouchTime = 0;

// Touchstart
c.addEventListener("touchstart", e => {
    e.preventDefault();
    if (!player || !player.alive || !inGame || paused) return;

    const t = e.touches[0];
    touchActive = true;
    lastTouchY  = t.clientY;
    lastTouchX  = t.clientX;

    // Tap = Schießen
    const now = Date.now();
    if (now - lastTouchTime < 250) {
        shootPlayer();
    }
    lastTouchTime = now;
}, { passive: false });

// Touchmove
c.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!touchActive || !player || !player.alive || !inGame || paused) return;

    const t  = e.touches[0];
    const dy = t.clientY - lastTouchY;
    const dx = t.clientX - lastTouchX;

    // Smooth Bewegung
    player.y += dy * 0.3;
    player.x += dx * 0.3;

    lastTouchY = t.clientY;
    lastTouchX = t.clientX;
}, { passive: false });

// Touchend
c.addEventListener("touchend", e => {
    e.preventDefault();
    touchActive  = false;
    lastTouchY   = null;
    lastTouchX   = null;
}, { passive: false });