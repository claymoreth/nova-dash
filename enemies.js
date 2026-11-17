// Enemy planes: one kind per sector. All chase the player and shoot.
// One job: enemy data, spawning, and movement. Hitbox r=16 never changes;
// the visual scale lives in draw.js.
import { W, H, rand } from './util.js';
import { beep } from './audio.js';

export const ENEMY_R = 16;
export const ENEMY_CHASE_ACCEL = 160;
export const ENEMY_MAX_SPEED = 150;
export const ENEMY_BULLET_SPEED = 170;
export const ENEMY_BULLET_DAMAGE = 10;
export const ENEMY_COLLISION_DAMAGE = 20;

export const ENEMY_KINDS = {
  drone: { hp: 2, score: 100, color: '#ff2d55', dark: '#a3122e', glow: '#ff2d55', fireMin: 2.6, fireMax: 3.4 },
  fighter: { hp: 3, score: 150, color: '#a55cff', dark: '#5b2a86', glow: '#a55cff', accent: '#ff9f43', fireMin: 2.0, fireMax: 2.8 },
  elite: { hp: 4, score: 250, color: '#ffd166', dark: '#14141c', glow: '#ffd166', fireMin: 1.8, fireMax: 2.6 },
};

export const SECTORS = {
  1: {
    kind: 'drone',
    queue: ['drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone', 'drone'],
    interval: 0.9,
  },
  2: {
    kind: 'fighter',
    queue: ['fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter'],
    interval: 0.8,
  },
  3: {
    kind: 'elite',
    queue: ['elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite', 'elite'],
    interval: 0.65,
  },
};

export function makeEnemy(x, y, kind) {
  const k = ENEMY_KINDS[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: ENEMY_R,
    hp: k.hp,
    fireCd: rand(k.fireMin, k.fireMax),
    counted: false,
    flash: 0,
    dying: 0,
    dead: false,
  };
}

// Pick a point just outside one edge of the screen.
export function spawnEdgePoint() {
  const side = Math.floor(rand(0, 3));
  if (side === 0) return { x: rand(40, W - 40), y: -30 };
  if (side === 1) return { x: rand(40, W - 40), y: H + 30 };
  if (side === 2) return { x: -30, y: rand(60, H - 60) };
  return { x: W + 30, y: rand(60, H - 60) };
}

// An enemy from an edge, moving INTO the screen (toward a random point
// near the center), never out of it.
export function spawnEnemyFromEdge(kind) {
  const s = spawnEdgePoint();
  const e = makeEnemy(s.x, s.y, kind);
  const tx = rand(W * 0.3, W * 0.7);
  const ty = rand(H * 0.3, H * 0.7);
  const dx = tx - s.x;
  const dy = ty - s.y;
  const d = Math.hypot(dx, dy) || 1;
  const sp = rand(35, 70);
  e.vx = (dx / d) * sp;
  e.vy = (dy / d) * sp;
  return e;
}

// Move one enemy: chase the player, fire when close enough, notice near misses.
// fx carries the game callbacks: onShoot(bullet), onNearMiss(enemy).
// Dying enemies (flashing white before they explode) are frozen by the caller
// and never reach this function.
export function updateEnemy(e, P, dt, fx) {
  e.flash = Math.max(0, (e.flash || 0) - dt);
  const dx = P.x - e.x;
  const dy = P.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx += (dx / d) * ENEMY_CHASE_ACCEL * dt;
  e.vy += (dy / d) * ENEMY_CHASE_ACCEL * dt;
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > ENEMY_MAX_SPEED) {
    e.vx *= ENEMY_MAX_SPEED / sp;
    e.vy *= ENEMY_MAX_SPEED / sp;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const k = ENEMY_KINDS[e.kind];
  e.fireCd -= dt;
  if (e.fireCd <= 0 && d < 560) {
    e.fireCd = rand(k.fireMin, k.fireMax);
    fx.onShoot({
      x: e.x,
      y: e.y,
      vx: (dx / d) * ENEMY_BULLET_SPEED,
      vy: (dy / d) * ENEMY_BULLET_SPEED,
      r: 5,
      counted: false,
    });
    beep(220, 0.08, 'sawtooth', 0.03, 160);
  }
  if (!e.counted) {
    const nd = Math.hypot(P.x - e.x, P.y - e.y);
    if (nd < P.r + 46 && nd > P.r + e.r) {
      e.counted = true;
      fx.onNearMiss(e);
    }
  }
}
