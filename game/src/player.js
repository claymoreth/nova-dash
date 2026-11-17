// The player fighter jet: state, movement, dash, auto-fire.
// One job: everything the player's ship does. Hitbox r=14 never changes;
// the visual scale lives in draw.js.
import { W, H, clamp } from './util.js';
import { beep } from './audio.js';

export const PLAYER_R = 14;
export const MOVE_MAX_SPEED = 340;
export const MOVE_ACCEL = 2400;
export const DASH_SPEED = 950;
export const DASH_TIME = 0.18;
export const DASH_INVULN = 1.0;
export const FIRE_INTERVAL = 0.32;
export const FIRE_RANGE = 520;

export function createPlayer() {
  return {
    x: W / 2,
    y: H / 2 + 120,
    vx: 0,
    vy: 0,
    r: PLAYER_R,
    angle: -Math.PI / 2,
    hull: 100,
    maxHull: 100,
    dashCd: 0,
    dashCdMax: 1.5,
    dashTime: 0,
    dashDirX: 0,
    dashDirY: -1,
    dashDmg: 5,
    dashMax: 1,
    dashCharges: 1,
    dashKills: 0,
    dashKillMax: 1,
    invuln: 0,
    fireCd: 0,
    spread: 1,
    trail: [],
  };
}

export function resetPlayer(P) {
  const fresh = createPlayer();
  for (const k of Object.keys(fresh)) P[k] = fresh[k];
}

// Dash toward the mouse. Returns true when a dash actually started.
// A dash spends one charge; when the last charge is spent the cooldown starts,
// and the charges refill when the cooldown ends.
export function tryDash(P, mouse) {
  if (P.dashCharges <= 0) return false;
  const dx = mouse.x - P.x;
  const dy = mouse.y - P.y;
  const d = Math.hypot(dx, dy) || 1;
  P.dashDirX = dx / d;
  P.dashDirY = dy / d;
  P.dashTime = DASH_TIME;
  P.dashKills = 0;
  P.dashCharges--;
  if (P.dashCharges <= 0) P.dashCd = P.dashCdMax;
  P.invuln = Math.max(P.invuln, DASH_INVULN);
  P.vx = P.dashDirX * DASH_SPEED;
  P.vy = P.dashDirY * DASH_SPEED;
  beep(500, 0.12, 'square', 0.04, 1200); // short rising pew
  return true;
}

// WASD movement with acceleration and friction, dash override while dashing,
// cooldown refill, invulnerability decay, dash trail.
export function updatePlayer(P, keys, mouse, dt) {
  if (P.dashTime > 0) {
    P.dashTime -= dt;
    P.vx = P.dashDirX * DASH_SPEED;
    P.vy = P.dashDirY * DASH_SPEED;
    P.trail.push({ x: P.x, y: P.y, life: 0.25 });
  } else {
    let ax = 0;
    let ay = 0;
    if (keys.KeyW) ay -= 1;
    if (keys.KeyS) ay += 1;
    if (keys.KeyA) ax -= 1;
    if (keys.KeyD) ax += 1;
    if (ax || ay) {
      const d = Math.hypot(ax, ay);
      P.vx += (ax / d) * MOVE_ACCEL * dt;
      P.vy += (ay / d) * MOVE_ACCEL * dt;
    }
    const sp = Math.hypot(P.vx, P.vy);
    if (sp > MOVE_MAX_SPEED) {
      P.vx *= MOVE_MAX_SPEED / sp;
      P.vy *= MOVE_MAX_SPEED / sp;
    }
    P.vx *= Math.pow(0.12, dt);
    P.vy *= Math.pow(0.12, dt);
  }
  P.x = clamp(P.x + P.vx * dt, 20, W - 20);
  P.y = clamp(P.y + P.vy * dt, 20, H - 20);
  P.angle = Math.atan2(mouse.y - P.y, mouse.x - P.x);
  if (P.dashCd > 0) {
    P.dashCd -= dt;
    if (P.dashCd <= 0) {
      P.dashCd = 0;
      P.dashCharges = P.dashMax;
    }
  }
  if (P.invuln > 0) P.invuln -= dt;
  for (const t of P.trail) t.life -= dt;
  P.trail = P.trail.filter((t) => t.life > 0);
}

// Auto-fire: one volley at the nearest target within range.
// Returns an array of shot objects (empty when nothing is in range).
export function playerShots(P, target) {
  if (!target) return [];
  const base = Math.atan2(target.y - P.y, target.x - P.x);
  const shots = [];
  const n = P.spread;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 0.14;
    shots.push({
      x: P.x + Math.cos(base) * 20,
      y: P.y + Math.sin(base) * 20,
      vx: Math.cos(base + off) * 620,
      vy: Math.sin(base + off) * 620,
      r: 4,
    });
  }
  beep(880, 0.05, 'square', 0.02);
  return shots;
}
