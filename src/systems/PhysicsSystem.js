// src/systems/PhysicsSystem.js
// collision helpers & simple updates
export function rectHit(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function circleHit(px,py,pr,cx,cy,cw,ch){ const rx = cx + cw/2; const ry = cy + ch/2; const dx = px - rx; const dy = py - ry; return dx*dx + dy*dy < pr*pr; }
export function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// broad-phase filter: quick X-range culling to reduce checks
export function broadPhaseByX(list, xmin, xmax){ const out = []; for (let i=0;i<list.length;i++){ const it = list[i]; if (!it) continue; if (it.x + (it.w||0) < xmin) continue; if (it.x > xmax) continue; out.push(it); } return out; }
