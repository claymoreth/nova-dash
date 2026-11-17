// All canvas drawing of the world: background, ships, shots, particles.
// One job: put pixels on the canvas. No game logic, no state changes.
// Visual scales (hitboxes unchanged): player jet 1.5x, enemies 1.4x, bosses 1.3x.
import { W, H, TAU, rand } from './util.js';
import { ENEMY_KINDS } from './enemies.js';

// ---------- background ----------
export function createNebula() {
  const nebula = document.createElement('canvas');
  nebula.width = W;
  nebula.height = H;
  const c = nebula.getContext('2d');
  c.fillStyle = '#04060f';
  c.fillRect(0, 0, W, H);
  const blobs = [
    [300, 180, 420, 'rgba(88,40,160,0.20)'],
    [950, 120, 380, 'rgba(20,90,140,0.18)'],
    [1100, 560, 460, 'rgba(160,40,90,0.14)'],
    [180, 580, 380, 'rgba(20,120,110,0.14)'],
    [640, 360, 520, 'rgba(60,40,120,0.10)'],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return nebula;
}

export function makeStars() {
  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({ x: rand(0, W), y: rand(0, H), s: rand(0.5, 2.2), tw: rand(0, TAU), sp: rand(2, 14) });
  }
  return stars;
}

export function drawBackground(ctx, nebula, stars, dt) {
  ctx.drawImage(nebula, 0, 0);
  for (const s of stars) {
    s.tw += dt * 2;
    s.y += s.sp * dt * 0.15;
    if (s.y > H + 2) {
      s.y = -2;
      s.x = rand(0, W);
    }
    const a = 0.35 + 0.35 * Math.sin(s.tw);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

// ---------- player jet ----------
// A real fighter jet: fuselage, swept wings, tail fins, cockpit, blue engine
// flame. Drawn pointing along `angle`. Scale 1.5 in game, 2.0 on the title.
export function drawJet(ctx, x, y, angle, scale, dashTime, now) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowColor = '#4df3ff';
  ctx.shadowBlur = 16;
  // Engine flame: blue, flickering, longer while dashing.
  const fl = (dashTime > 0 ? 20 : 11) + Math.sin(now / 40) * 3;
  ctx.fillStyle = '#66aaff';
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(-13 - fl, 0);
  ctx.lineTo(-13, 4);
  ctx.closePath();
  ctx.fill();
  // Main wings, swept back.
  ctx.fillStyle = '#1fb6d6';
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.lineTo(-16, -22);
  ctx.lineTo(-9, -3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.lineTo(-16, 22);
  ctx.lineTo(-9, 3);
  ctx.closePath();
  ctx.fill();
  // Tail fins.
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(-18, -10);
  ctx.lineTo(-13, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, 3);
  ctx.lineTo(-18, 10);
  ctx.lineTo(-13, 2);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = '#4df3ff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(-12, -5);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-12, 5);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  // Cockpit.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d8fbff';
  ctx.beginPath();
  ctx.ellipse(8, 0, 6, 3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------- enemy planes ----------
// Each kind is a different plane shape. In game they face the player;
// on the title screen (demo planes) they drift with a slow spin.
export function drawEnemy(ctx, e, player) {
  const k = ENEMY_KINDS[e.kind];
  const angle = e.demo ? e.rot : Math.atan2(player.y - e.y, player.x - e.x);
  const body = e.flash > 0 ? '#ffffff' : k.color;
  const dark = e.flash > 0 ? '#ffffff' : k.dark;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(angle);
  ctx.scale(1.4, 1.4);
  ctx.shadowColor = k.glow;
  ctx.shadowBlur = 14;
  if (e.kind === 'drone') {
    // DRONE: slim red dart.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-12, -2);
    ctx.lineTo(-12, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-14, -9);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 3);
    ctx.lineTo(-14, 9);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'fighter') {
    // FIGHTER: sharp purple arrow, double wings, orange accents.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-2, -5);
    ctx.lineTo(-14, -4);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-16, -18);
    ctx.lineTo(-8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-16, 18);
    ctx.lineTo(-8, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : k.accent;
    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(-2, -12);
    ctx.lineTo(2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.lineTo(-2, 12);
    ctx.lineTo(2, 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // ELITE: jagged black hull, gold trim, most menacing.
    ctx.fillStyle = body === '#ffffff' ? '#ffffff' : '#14141c';
    ctx.strokeStyle = e.flash > 0 ? '#ffffff' : '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(10, -4);
    ctx.lineTo(2, -12);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-14, -4);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-4, 5);
    ctx.lineTo(2, 12);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#ffd166';
    ctx.beginPath();
    ctx.arc(8, 0, 3.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- boss planes ----------
// A REAL fighter plane, much bigger than the player and the enemies,
// facing downward (toward the player). Never a box or a trapezoid.
export function drawBoss(ctx, b, now) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(1.3, 1.3);
  const flash = b.flash > 0;
  const F = flash ? '#ffffff' : null;
  if (b.type === 1) {
    // CARRIER: giant red carrier plane — wide wings, cockpit, 2 cannons.
    const hull = F || '#7a1f2b';
    const wing = F || '#a3122e';
    const line = F || '#ff5d5d';
    const accent = F || '#ffb86b';
    ctx.shadowColor = '#ff5d5d';
    ctx.shadowBlur = 26;
    ctx.fillStyle = wing;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-130, -45);
    ctx.lineTo(-118, 25);
    ctx.lineTo(-18, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(130, -45);
    ctx.lineTo(118, 25);
    ctx.lineTo(18, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 35);
    ctx.lineTo(-66, 58);
    ctx.lineTo(-52, 78);
    ctx.lineTo(-16, 55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 35);
    ctx.lineTo(66, 58);
    ctx.lineTo(52, 78);
    ctx.lineTo(16, 55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -70);
    ctx.lineTo(-28, -105);
    ctx.lineTo(-14, -65);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -70);
    ctx.lineTo(28, -105);
    ctx.lineTo(14, -65);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, 100);
    ctx.lineTo(24, 30);
    ctx.lineTo(18, -60);
    ctx.lineTo(8, -75);
    ctx.lineTo(-8, -75);
    ctx.lineTo(-18, -60);
    ctx.lineTo(-24, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = F || '#5c1420';
    for (const cx of [-58, 58]) {
      ctx.fillRect(cx - 8, 5, 16, 58);
      ctx.strokeRect(cx - 8, 5, 16, 58);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, 66, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = F || '#5c1420';
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(0, 55, 11, 20, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#04060f';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
  } else if (b.type === 2) {
    // DESTROYER: giant purple fighter — double wings, 2 side cannons.
    const hull = F || '#3d1f5c';
    const wing = F || '#5b2a86';
    const line = F || '#a55cff';
    const accent = F || '#c9a0ff';
    ctx.shadowColor = '#a55cff';
    ctx.shadowBlur = 26;
    ctx.fillStyle = wing;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -15);
    ctx.lineTo(-122, -58);
    ctx.lineTo(-104, 10);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -15);
    ctx.lineTo(122, -58);
    ctx.lineTo(104, 10);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 20);
    ctx.lineTo(-72, 44);
    ctx.lineTo(-58, 64);
    ctx.lineTo(-14, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.lineTo(72, 44);
    ctx.lineTo(58, 64);
    ctx.lineTo(14, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -75);
    ctx.lineTo(-26, -110);
    ctx.lineTo(-12, -70);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -75);
    ctx.lineTo(26, -110);
    ctx.lineTo(12, -70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, 105);
    ctx.lineTo(20, 35);
    ctx.lineTo(16, -65);
    ctx.lineTo(7, -80);
    ctx.lineTo(-7, -80);
    ctx.lineTo(-16, -65);
    ctx.lineTo(-20, 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = F || '#2a1544';
    for (const cx of [-88, 88]) {
      ctx.fillRect(cx - 7, -5, 14, 55);
      ctx.strokeRect(cx - 7, -5, 14, 55);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, 53, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = F || '#2a1544';
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(0, 60, 10, 18, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = F || '#b678ff';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#04060f';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
  } else {
    // DREADNOUGHT: giant black-gold-red fighter — biggest, most menacing.
    const hull = F || '#14141c';
    const wing = F || '#1c1c28';
    const line = F || '#ffd166';
    const accent = F || '#ffd166';
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = 30;
    ctx.fillStyle = wing;
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -20);
    ctx.lineTo(-132, -68);
    ctx.lineTo(-112, 5);
    ctx.lineTo(-18, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.lineTo(132, -68);
    ctx.lineTo(112, 5);
    ctx.lineTo(18, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 25);
    ctx.lineTo(-78, 50);
    ctx.lineTo(-64, 72);
    ctx.lineTo(-16, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 25);
    ctx.lineTo(78, 50);
    ctx.lineTo(64, 72);
    ctx.lineTo(16, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    for (const sx of [-100, -60, -30, 30, 60, 100]) {
      ctx.beginPath();
      ctx.moveTo(sx - 9, -52);
      ctx.lineTo(sx, -72);
      ctx.lineTo(sx + 9, -52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(-7, -75);
    ctx.lineTo(-30, -115);
    ctx.lineTo(-13, -70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -75);
    ctx.lineTo(30, -115);
    ctx.lineTo(13, -70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.lineTo(26, 40);
    ctx.lineTo(18, -40);
    ctx.lineTo(30, -70);
    ctx.lineTo(10, -78);
    ctx.lineTo(-10, -78);
    ctx.lineTo(-30, -70);
    ctx.lineTo(-18, -40);
    ctx.lineTo(-26, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = F || '#0d0d14';
    for (const cx of [-92, 92]) {
      ctx.fillRect(cx - 8, -5, 16, 60);
      ctx.strokeRect(cx - 8, -5, 16, 60);
      ctx.fillStyle = F || '#ff2d55';
      ctx.beginPath();
      ctx.arc(cx, 58, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = F || '#0d0d14';
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(0, 62, 11, 19, 0, 0, TAU);
    ctx.fill();
    const pulse = 0.7 + 0.3 * Math.sin(now / 200);
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = 24;
    ctx.fillStyle = F || '#ff2d55';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04060f';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- shots, bullets, particles, floating texts ----------
export function drawShots(ctx, shots) {
  ctx.fillStyle = '#7df9ff';
  for (const s of shots) {
    ctx.shadowColor = '#4df3ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export function drawBullets(ctx, bullets) {
  for (const b of bullets) {
    ctx.shadowColor = '#ff5df2';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff5df2';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export function drawParticles(ctx, particles) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function drawFloats(ctx, floats) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px monospace';
  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
