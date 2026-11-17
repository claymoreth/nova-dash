// NOVA DASH — entry point.
// One job: wire the modules together. Owns the game state, the loop, the
// collisions, and the flow (sector -> upgrade -> boss -> boss reward -> next
// sector; after Boss 3 -> victory). All text is English.
import { W, H, TAU, rand, clamp, dist2, segDist2 } from './util.js';
import { audioState, ensureAudio, beep, boom, ding } from './audio.js';
import { createPlayer, resetPlayer, tryDash, updatePlayer, playerShots, FIRE_INTERVAL, FIRE_RANGE } from './player.js';
import { ENEMY_KINDS, SECTORS, makeEnemy, spawnEnemyFromEdge, updateEnemy, ENEMY_COLLISION_DAMAGE, ENEMY_BULLET_DAMAGE } from './enemies.js';
import { BOSSES, BOSS_SCORE, makeBoss, updateBoss } from './boss.js';
import { UPGRADES, BOSS_REWARDS, applyUpgrade, applyBossReward } from './upgrades.js';
import { createNebula, makeStars, drawBackground, drawJet, drawEnemy, drawBoss, drawShots, drawBullets, drawParticles, drawFloats } from './draw.js';
import { MUTE_BTN, drawTitle, drawHUD, drawUpgrade, drawBossReward, drawEnd, drawMuteButton } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nebula = createNebula();
const stars = makeStars();

// ---------- game state ----------
const G = {
  state: 'title', // title | playing | upgrade | bossreward | gameover | victory
  score: 0,
  combo: 0,
  comboTimer: 0,
  sector: 1,
  elapsed: 0,
  spawnQueue: [],
  spawnTimer: 0,
  shakeT: 0,
  shakeMag: 0,
  banner: '',
  bannerT: 0,
  hintT: 0,
  firstSpawned: false,
  bossSpawned: false,
  upgraded: false,
  redFlash: 0,
  goldFlash: 0,
  upgradeChoices: [],
  bossRewardChoices: [],
};
const P = createPlayer();
let enemies = [];
let bullets = [];
let shots = [];
let particles = [];
let floats = [];
let boss = null;

// Demo planes for the title screen (attract mode): drifting slowly,
// no collisions, top/bottom bands only so they never cover the title text.
const demoPlanes = [];
for (let i = 0; i < 7; i++) {
  const top = i % 2 === 0;
  const kind = i < 5 ? 'drone' : 'fighter';
  const e = makeEnemy(rand(60, W - 60), top ? rand(40, 250) : rand(500, 680), kind);
  e.vx = rand(-22, 22);
  e.vy = rand(-14, 14);
  e.rot = rand(0, TAU);
  e.vr = rand(-0.6, 0.6);
  e.demo = true;
  demoPlanes.push(e);
}

// ---------- input ----------
const keys = {};
const mouse = { x: W / 2, y: H / 2 - 100 };
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'KeyR') {
    keys[e.code] = true;
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}
canvas.addEventListener('mousemove', (e) => {
  const p = canvasPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
});
canvas.addEventListener('mousedown', (e) => {
  ensureAudio();
  const p = canvasPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  onClick(p.x, p.y);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && (G.state === 'gameover' || G.state === 'victory')) startGame();
});

// ---------- scoring and feedback ----------
function mult() {
  return Math.min(8, 1 + Math.floor(G.combo / 4));
}
function addFloat(x, y, txt, col) {
  // Floating texts must never stack: keep shifting the new text up until it
  // clears every nearby float by a full line. (A fixed shift fails when two
  // texts start 12px apart — the shift has to be measured from the floats
  // already on screen, not from the requested position.)
  let ny = y;
  let guard = 0;
  // A dense stack (rapid dash kills through a boss) can need many shifts:
  // the cap only guards against an unbounded loop, so keep it far above any
  // stack the 0.9s float lifetime can build.
  while (guard < 20) {
    const hit = floats.some((f) => Math.abs(f.x - x) < 100 && Math.abs(f.y - ny) < 26);
    if (!hit) break;
    ny -= 24;
    guard++;
  }
  floats.push({ x, y: ny, txt, life: 0.9, max: 0.9, col });
}
function addScore(base, x, y) {
  const v = base * mult();
  G.score += v;
  addFloat(x, y, '+' + v, '#ffe066');
}
function addCombo() {
  G.combo++;
  G.comboTimer = 3;
  if (G.combo > 0 && G.combo % 4 === 0) addFloat(P.x, P.y - 30, 'COMBO x' + mult(), '#4df3ff');
}
function resetCombo() {
  G.combo = 0;
  G.comboTimer = 0;
}
function shake(mag, t) {
  G.shakeMag = Math.max(G.shakeMag, mag);
  G.shakeT = Math.max(G.shakeT, t);
}
function burst(x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s = rand(spd * 0.3, spd);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), max: 0.8, col, size: rand(2, 5) });
  }
}
function damagePlayer(n, sx, sy) {
  if (P.invuln > 0 || P.dashTime > 0 || G.state !== 'playing') return;
  P.hull -= n;
  P.invuln = 1;
  resetCombo();
  G.redFlash = 0.25; // red flash on hit
  const dx = P.x - sx;
  const dy = P.y - sy;
  const d = Math.hypot(dx, dy) || 1;
  P.vx += (dx / d) * 260;
  P.vy += (dy / d) * 260;
  burst(P.x, P.y, '#ff5d5d', 14, 220);
  shake(7, 0.25);
  beep(110, 0.2, 'sawtooth', 0.07, 60); // hurt sound
  if (P.hull <= 0) {
    P.hull = 0;
    gameOver();
  }
}
function gameOver() {
  G.state = 'gameover';
  burst(P.x, P.y, '#4df3ff', 40, 320);
  burst(P.x, P.y, '#ff9f43', 30, 260);
  boom();
  shake(12, 0.5);
}
function victory() {
  G.state = 'victory';
  if (boss) {
    burst(boss.x, boss.y, '#ffe066', 60, 380);
    burst(boss.x, boss.y, '#4df3ff', 40, 300);
  }
  boom();
  shake(10, 0.6);
  boss = null;
}
function bossDefeated() {
  const n = G.sector;
  if (boss) {
    burst(boss.x, boss.y, '#ffe066', 50, 360);
    burst(boss.x, boss.y, '#ff5d5d', 30, 280);
  }
  boom();
  shake(10, 0.5);
  boss = null;
  if (n >= 3) {
    victory();
    return;
  }
  G.state = 'bossreward';
  G.bossRewardChoices = BOSS_REWARDS[n].slice();
}
function killEnemy(e, byDash) {
  burst(e.x, e.y, ENEMY_KINDS[e.kind].color, 22, 240);
  boom();
  if (byDash) {
    shake(6, 0.1);
    addFloat(e.x, e.y - 20, 'DASH KILL', '#4df3ff');
  }
  addScore(ENEMY_KINDS[e.kind].score, e.x, e.y);
  addCombo();
}

// ---------- flow ----------
function startSector(n) {
  if (!SECTORS[n]) return;
  G.state = 'playing';
  G.sector = n;
  G.bossSpawned = false;
  G.upgraded = false;
  const s = SECTORS[n];
  G.spawnQueue = s.queue.slice();
  G.spawnTimer = 0.5;
  G.banner = 'SECTOR ' + n;
  G.bannerT = 2.2;
  if (n === 1) {
    G.hintT = 5;
    G.firstSpawned = false;
    // Busy opening: 4 enemies already on screen from the first second.
    for (let i = 0; i < 4 && G.spawnQueue.length; i++) {
      G.spawnQueue.shift();
      enemies.push(spawnEnemyFromEdge(s.kind));
    }
  }
}
function spawnBoss(n) {
  G.state = 'playing';
  G.bossSpawned = true;
  G.banner = 'BOSS: ' + BOSSES[n].name;
  G.bannerT = 2.5;
  boss = makeBoss(n);
  beep(80, 0.6, 'sawtooth', 0.08, 40);
}
function openUpgrade() {
  G.state = 'upgrade';
  G.upgradeChoices = UPGRADES.slice();
}
function startGame() {
  G.score = 0;
  G.combo = 0;
  G.comboTimer = 0;
  G.elapsed = 0;
  enemies = [];
  bullets = [];
  shots = [];
  particles = [];
  floats = [];
  boss = null;
  resetPlayer(P);
  G.state = 'playing';
  startSector(1);
}
function onClick(x, y) {
  // Mute button first: works on every screen, never dashes.
  if (x >= MUTE_BTN.x && x <= MUTE_BTN.x + MUTE_BTN.w && y >= MUTE_BTN.y && y <= MUTE_BTN.y + MUTE_BTN.h) {
    audioState.muted = !audioState.muted;
    return;
  }
  if (G.state === 'title') {
    startGame();
    return;
  }
  if (G.state === 'gameover' || G.state === 'victory') {
    startGame();
    return;
  }
  if (G.state === 'upgrade') {
    for (const c of G.upgradeChoices) {
      if (x >= c.bx && x <= c.bx + 300 && y >= c.by && y <= c.by + 190) {
        applyUpgrade(P, c);
        ding();
        G.upgraded = true;
        spawnBoss(G.sector);
        return;
      }
    }
    return;
  }
  if (G.state === 'bossreward') {
    for (const c of G.bossRewardChoices) {
      if (x >= c.bx && x <= c.bx + 300 && y >= c.by && y <= c.by + 190) {
        applyBossReward(P, c);
        G.goldFlash = 0.6; // gold flash on reward
        ding();
        startSector(G.sector + 1);
        return;
      }
    }
    return;
  }
  if (G.state === 'playing') tryDash(P, mouse);
}

function nearestEnemy() {
  let best = null;
  let bd = FIRE_RANGE * FIRE_RANGE;
  for (const e of enemies) {
    if (e.dying) continue;
    const d = dist2(P.x, P.y, e.x, e.y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  if (boss) {
    const d = dist2(P.x, P.y, boss.x, boss.y);
    if (d < bd) {
      bd = d;
      best = boss;
    }
  }
  return best;
}

// ---------- update ----------
function update(dt) {
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.hintT > 0) G.hintT -= dt;
  if (G.shakeT > 0) {
    G.shakeT -= dt;
    if (G.shakeT <= 0) G.shakeMag = 0;
  }
  if (G.redFlash > 0) G.redFlash -= dt;
  if (G.goldFlash > 0) G.goldFlash -= dt;
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const f of floats) {
    f.y -= 40 * dt;
    f.life -= dt;
  }
  floats = floats.filter((f) => f.life > 0);
  // Title-screen attract mode: demo planes drifting slowly.
  if (G.state === 'title') {
    for (const a of demoPlanes) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.vr * dt;
      if (a.x < -50) a.x = W + 40;
      if (a.x > W + 50) a.x = -40;
      if (a.y < 30 || a.y > H - 30) a.vy *= -1; // bounce vertically, stay in its band
    }
    return;
  }
  if (G.state !== 'playing') return;
  G.elapsed += dt;

  // --- player ---
  const ppx = P.x;
  const ppy = P.y; // position before moving (for the segment collision test)
  updatePlayer(P, keys, mouse, dt);
  if (G.comboTimer > 0) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) resetCombo();
  }

  // --- auto-fire ---
  P.fireCd -= dt;
  if (P.fireCd <= 0 && (enemies.length || boss)) {
    shots.push(...playerShots(P, nearestEnemy()));
    P.fireCd = FIRE_INTERVAL;
  }

  // --- spawning ---
  if (!G.firstSpawned && G.sector === 1 && G.elapsed > 1.2) {
    // First enemy: a slow drone right in front of the player, within 5 seconds.
    G.firstSpawned = true;
    const e = makeEnemy(clamp(P.x + 260, 80, W - 80), clamp(P.y - 90, 80, H - 80), 'drone');
    e.vx = -25;
    e.vy = 15;
    e.fireCd = 6;
    enemies.push(e);
  }
  if (G.spawnQueue.length) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      G.spawnTimer = SECTORS[G.sector].interval;
      const kind = G.spawnQueue.shift();
      enemies.push(spawnEnemyFromEdge(kind));
    }
  } else if (!enemies.length && !G.bossSpawned) {
    if (!G.upgraded) openUpgrade();
    else spawnBoss(G.sector);
  }

  // --- enemies ---
  for (const e of enemies) {
    if (e.dying > 0) {
      // White flash before the explosion, then it blows up.
      e.dying -= dt;
      e.flash = 1;
      if (e.dying <= 0) {
        e.dead = true;
        killEnemy(e, true);
      }
      continue;
    }
    updateEnemy(e, P, dt, {
      onShoot: (b) => bullets.push(b),
      onNearMiss: (en) => {
        addCombo();
        addFloat(en.x, en.y - 18, 'NEAR MISS', '#b8b8ff');
      },
    });
  }

  // --- boss ---
  if (boss) {
    updateBoss(boss, P, dt, G.sector, {
      pushBullet: (b) => bullets.push(b),
      spawnBossDrone: (kind) => {
        const alive = enemies.filter((e) => e.kind === SECTORS[G.sector].kind).length;
        if (alive < 3) enemies.push(makeEnemy(boss.x + rand(-80, 80), boss.y + 70, kind));
      },
    });
  }

  // --- shots ---
  for (const s of shots) {
    s.px = s.x;
    s.py = s.y;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) {
      s.dead = true;
      continue;
    }
    for (const e of enemies) {
      if (!e.dead && !e.dying && segDist2(e.x, e.y, s.px, s.py, s.x, s.y) < (s.r + e.r) * (s.r + e.r)) {
        s.dead = true;
        e.hp--;
        e.flash = 0.12;
        burst(s.x, s.y, '#4df3ff', 5, 140);
        if (e.hp <= 0) {
          e.dead = true;
          killEnemy(e, false);
        }
        break;
      }
    }
    if (!s.dead && boss && segDist2(boss.x, boss.y, s.px, s.py, s.x, s.y) < (s.r + boss.r) * (s.r + boss.r)) {
      s.dead = true;
      boss.hp--;
      boss.flash = 0.1;
      burst(s.x, s.y, '#ffe066', 6, 160);
      if (boss.hp <= 0) {
        addScore(BOSS_SCORE, boss.x, boss.y);
        bossDefeated();
      }
    }
  }
  shots = shots.filter((s) => !s.dead);

  // --- enemy bullets ---
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      b.dead = true;
      continue;
    }
    if (!b.counted) {
      const d = Math.hypot(P.x - b.x, P.y - b.y);
      if (d < P.r + 42 && d > P.r + b.r) {
        b.counted = true;
        addCombo();
      }
    }
    if (P.dashTime > 0 && segDist2(b.x, b.y, ppx, ppy, P.x, P.y) < (b.r + P.r + 8) * (b.r + P.r + 8)) {
      b.dead = true;
      addScore(25, b.x, b.y);
      burst(b.x, b.y, '#ff8fd1', 6, 160);
      continue;
    }
    if (dist2(b.x, b.y, P.x, P.y) < (b.r + P.r) * (b.r + P.r)) {
      b.dead = true;
      damagePlayer(ENEMY_BULLET_DAMAGE, b.x, b.y);
    }
  }
  bullets = bullets.filter((b) => !b.dead);

  // --- enemies vs player (segment test: position before -> after moving) ---
  for (const e of enemies) {
    if (e.dead || e.dying) continue;
    const rr = e.r + P.r;
    if (segDist2(e.x, e.y, ppx, ppy, P.x, P.y) < rr * rr) {
      if (P.dashTime > 0) {
        // Dash kill: white flash first, then the explosion.
        // Base: 1 kill per dash. PIERCING DASH: up to 3 per dash.
        if (P.dashKills < P.dashKillMax) {
          P.dashKills++;
          e.dying = 0.08;
          e.flash = 1;
        }
      } else {
        e.dead = true;
        damagePlayer(ENEMY_COLLISION_DAMAGE, e.x, e.y);
      }
    }
    // Dash through the boss.
    if (boss && P.dashTime > 0 && segDist2(boss.x, boss.y, ppx, ppy, P.x, P.y) < (boss.r + P.r) * (boss.r + P.r) && !boss.dashHit) {
      boss.dashHit = true;
      boss.hp -= P.dashDmg;
      boss.flash = 0.15;
      burst(P.x, P.y, '#ffe066', 16, 260);
      shake(6, 0.2);
      beep(520, 0.12, 'square', 0.05, 200);
      addFloat(boss.x, boss.y - 90, 'DASH HIT -' + P.dashDmg, '#ffe066');
      if (boss.hp <= 0) {
        addScore(BOSS_SCORE, boss.x, boss.y);
        bossDefeated();
      }
    }
    if (boss && P.dashTime <= 0) boss.dashHit = false;
  }
  enemies = enemies.filter((e) => !e.dead);
}

// ---------- draw ----------
function draw(now) {
  ctx.save();
  if (G.shakeMag > 0) ctx.translate(rand(-G.shakeMag, G.shakeMag), rand(-G.shakeMag, G.shakeMag));
  drawBackground(ctx, nebula, stars, 1 / 60);

  if (G.state === 'title') {
    drawTitle(ctx, demoPlanes, now);
    drawMuteButton(ctx, audioState.muted);
    ctx.restore();
    return;
  }

  // Dash trail.
  for (const t of P.trail) {
    ctx.globalAlpha = (t.life / 0.25) * 0.5;
    ctx.fillStyle = '#4df3ff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const e of enemies) drawEnemy(ctx, e, P);
  if (boss) drawBoss(ctx, boss, now);
  drawShots(ctx, shots);
  drawBullets(ctx, bullets);
  drawParticles(ctx, particles);

  // Player jet (blinks while invulnerable), visual 1.5x, hitbox unchanged.
  if (!(P.invuln > 0 && Math.floor(now / 90) % 2 === 0)) {
    drawJet(ctx, P.x, P.y, P.angle, 1.5, P.dashTime, now);
  }
  drawFloats(ctx, floats);

  drawHUD(ctx, G, P, boss);
  if (G.bannerT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, G.bannerT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8f6ff';
    ctx.shadowColor = '#4df3ff';
    ctx.shadowBlur = 18;
    ctx.font = 'bold 44px monospace';
    ctx.fillText(G.banner, W / 2, 120);
    ctx.restore();
  }
  if (G.hintT > 0 && G.state === 'playing' && G.sector === 1) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 22px monospace';
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK TO DASH — destroy that drone!', W / 2, H - 90);
    ctx.restore();
  }
  if (G.state === 'upgrade') drawUpgrade(ctx, G);
  if (G.state === 'bossreward') drawBossReward(ctx, G.bossRewardChoices);
  if (G.state === 'gameover') drawEnd(ctx, 'GAME OVER', '#ff5d5d', G);
  if (G.state === 'victory') drawEnd(ctx, 'VICTORY', '#37e08b', G);
  // Red flash on hit / gold flash on boss reward (drawn above the game).
  if (G.redFlash > 0) {
    ctx.fillStyle = 'rgba(255,40,60,' + ((G.redFlash / 0.25) * 0.3).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.goldFlash > 0) {
    ctx.fillStyle = 'rgba(255,209,102,' + ((G.goldFlash / 0.6) * 0.35).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  drawMuteButton(ctx, audioState.muted);
  ctx.restore();
}

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- testing hooks ----------
window.__game = {
  get state() {
    return G.state;
  },
  get score() {
    return G.score;
  },
  get sector() {
    return G.sector;
  },
  get combo() {
    return G.combo;
  },
  get hull() {
    return P.hull;
  },
  get maxHull() {
    return P.maxHull;
  },
  get dashCd() {
    return P.dashCd;
  },
  get dashCharges() {
    return P.dashCharges;
  },
  get dashMax() {
    return P.dashMax;
  },
  get dashKillMax() {
    return P.dashKillMax;
  },
  get dashDmg() {
    return P.dashDmg;
  },
  get invuln() {
    return P.invuln;
  },
  get redFlash() {
    return G.redFlash;
  },
  get goldFlash() {
    return G.goldFlash;
  },
  get muted() {
    return audioState.muted;
  },
  get enemies() {
    return enemies.length;
  },
  get bossHp() {
    return boss ? boss.hp : null;
  },
  get bossName() {
    return boss ? boss.name : null;
  },
  get player() {
    return { x: P.x, y: P.y };
  },
  get elapsed() {
    return G.elapsed;
  },
  start: startGame,
  dash: () => tryDash(P, mouse),
  toggleMute: () => {
    audioState.muted = !audioState.muted;
  },
  skipSector: () => {
    G.spawnQueue = [];
    enemies = [];
    bullets = [];
  },
  warp: (x, y) => {
    P.x = clamp(x, 20, W - 20);
    P.y = clamp(y, 20, H - 20);
    P.vx = 0;
    P.vy = 0;
  },
  hurt: (n) => damagePlayer(n, P.x + 50, P.y),
  hurtBoss: (n) => {
    if (boss) {
      boss.hp -= n;
      if (boss.hp <= 0) {
        addScore(BOSS_SCORE, boss.x, boss.y);
        bossDefeated();
      }
    }
  },
  spawnBossNow: () => {
    G.spawnQueue = [];
    enemies = [];
    spawnBoss(G.sector);
  },
  get firstEnemy() {
    return enemies[0] ? { x: enemies[0].x, y: enemies[0].y, kind: enemies[0].kind } : null;
  },
  get enemiesList() {
    return enemies.map((e) => ({ x: e.x, y: e.y, kind: e.kind }));
  },
  get floats() {
    return floats.map((f) => ({ x: f.x, y: f.y, txt: f.txt }));
  },
};
