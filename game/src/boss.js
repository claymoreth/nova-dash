// Boss planes: one per sector. All are REAL fighter planes (fuselage, wings,
// tail fins, cockpit, cannons) facing downward — never boxes or trapezoids.
// One job: boss data and attacks. Hitbox (boss.r) never changes;
// the visual scale lives in draw.js.
import { W, rand } from './util.js';
import { beep } from './audio.js';
import { SECTORS } from './enemies.js';

export const BOSSES = {
  1: { name: 'CARRIER', hp: 85, r: 105 },
  2: { name: 'DESTROYER', hp: 125, r: 115 },
  3: { name: 'DREADNOUGHT', hp: 175, r: 130 },
};

export const BOSS_SCORE = 5000;
export const BOSS_ENTER_SPEED = 120;
export const BOSS_STRAFE_SPEED = 90;
export const BOSS_TARGET_Y = 130;

export function makeBoss(n) {
  const b = BOSSES[n];
  return {
    type: n,
    name: b.name,
    x: W / 2,
    y: -90,
    targetY: BOSS_TARGET_Y,
    r: b.r,
    hp: b.hp,
    maxHp: b.hp,
    dir: 1,
    fireCd: 1.5,
    radialCd: 2.2,
    droneCd: 4,
    flash: 0,
    dashHit: false,
  };
}

// Move and attack. fx carries the game callbacks:
// pushBullet(bullet) and spawnBossDrone(kind).
export function updateBoss(boss, P, dt, sector, fx) {
  boss.flash = Math.max(0, boss.flash - dt);
  if (boss.y < boss.targetY) {
    boss.y += BOSS_ENTER_SPEED * dt;
    return;
  }
  boss.x += boss.dir * BOSS_STRAFE_SPEED * dt;
  if (boss.x < 180) boss.dir = 1;
  if (boss.x > W - 180) boss.dir = -1;
  // 3-way aimed shots at the player, from the nose.
  boss.fireCd -= dt;
  if (boss.fireCd <= 0) {
    boss.fireCd = 1.15;
    const dx = P.x - boss.x;
    const dy = P.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    const base = Math.atan2(dy, dx);
    for (const off of [-0.22, 0, 0.22]) {
      fx.pushBullet({
        x: boss.x,
        y: boss.y + 95,
        vx: Math.cos(base + off) * 200,
        vy: Math.sin(base + off) * 200,
        r: 6,
        counted: false,
      });
    }
    beep(180, 0.1, 'sawtooth', 0.04, 120);
  }
  // Radial burst of 10 bullets.
  boss.radialCd -= dt;
  if (boss.radialCd <= 0) {
    boss.radialCd = 2.4;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      fx.pushBullet({
        x: boss.x,
        y: boss.y + 75,
        vx: Math.cos(a) * 130,
        vy: Math.sin(a) * 130,
        r: 6,
        counted: false,
      });
    }
    beep(140, 0.2, 'sawtooth', 0.05, 90);
  }
  // Launch a drone of the sector's kind (max 3 alive).
  boss.droneCd -= dt;
  if (boss.droneCd <= 0) {
    boss.droneCd = 4.5;
    fx.spawnBossDrone(SECTORS[sector].kind);
  }
}
