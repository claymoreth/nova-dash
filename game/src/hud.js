// All screens and overlays: HUD, title, upgrade choice, boss-reward choice,
// game-over and victory screens, mute button.
// One job: text and bars on top of the world. No game logic.
import { W, H, TAU, fmtTime } from './util.js';
import { drawEnemy, drawJet } from './draw.js';

export const MUTE_BTN = { x: W - 44, y: 54, w: 32, h: 28 };

function wrapText(ctx, text, cx, y, maxChars) {
  const words = text.split(' ');
  let line = '';
  let ly = y;
  for (const w of words) {
    if ((line + ' ' + w).length > maxChars) {
      ctx.fillText(line, cx, ly);
      ly += 24;
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  ctx.fillText(line, cx, ly);
}

function drawChoiceCards(ctx, choices, borderColor, nameColor, descColor) {
  choices.forEach((u, i) => {
    const bx = W / 2 - 470 + i * 330;
    const by = 220;
    u.bx = bx;
    u.by = by;
    ctx.fillStyle = '#101830';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, 300, 190);
    ctx.strokeRect(bx, by, 300, 190);
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(u.name, bx + 150, by + 48);
    ctx.fillStyle = descColor;
    ctx.font = '17px monospace';
    wrapText(ctx, u.desc, bx + 150, by + 86, 26);
    ctx.fillStyle = '#37e08b';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('[ CLICK TO CHOOSE ]', bx + 150, by + 170);
  });
}

export function drawTitle(ctx, demoPlanes, now) {
  for (const a of demoPlanes) drawEnemy(ctx, a, { x: W / 2, y: H / 2 });
  const bob = Math.sin(now / 500) * 6;
  drawJet(ctx, W / 2, H / 2 + 190 + bob, -Math.PI / 2, 2.0, 0, now);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#4df3ff';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#4df3ff';
  ctx.font = 'bold 84px monospace';
  ctx.fillText('NOVA DASH', W / 2, H / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8f6ff';
  ctx.font = '24px monospace';
  ctx.fillText('Fly. Dash. Destroy the Dreadnought.', W / 2, H / 2 + 10);
  ctx.fillStyle = '#9fb8cc';
  ctx.font = '20px monospace';
  ctx.fillText('WASD move   |   CLICK dash toward mouse', W / 2, H / 2 + 60);
  ctx.fillStyle = '#4df3ff';
  ctx.font = 'bold 26px monospace';
  const pulse = 0.6 + 0.4 * Math.sin(now / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK TO START', W / 2, H / 2 + 130);
  ctx.globalAlpha = 1;
}

export function drawHUD(ctx, G, P, boss) {
  // 3 big: SCORE, HULL, DASH. Combo small. Sector small.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('SCORE ' + G.score.toLocaleString('en-US'), 24, 44);
  ctx.fillStyle = '#4df3ff';
  ctx.font = 'bold 17px monospace';
  if (G.combo >= 4) ctx.fillText('COMBO x' + Math.min(8, 1 + Math.floor(G.combo / 4)) + '  (' + G.combo + ')', 26, 70);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9fb8cc';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('SECTOR ' + G.sector + ' / 3' + (boss ? '  —  BOSS' : ''), W / 2, 30);

  // HULL bar (top right, big).
  const hx = W - 264;
  const hy = 24;
  const hw = 240;
  const hh = 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('HULL', hx, hy - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(hx, hy, hw, hh);
  const hf = P.hull / P.maxHull;
  ctx.fillStyle = hf > 0.5 ? '#37e08b' : hf > 0.25 ? '#ffe066' : '#ff5d5d';
  ctx.fillRect(hx, hy, hw * hf, hh);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(hx, hy, hw, hh);
  ctx.fillStyle = '#04060f';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.ceil(P.hull) + ' / ' + P.maxHull, hx + hw / 2, hy + 15);

  // DASH bar (bottom center, big).
  const dx = W / 2 - 110;
  const dy = H - 44;
  const dw = 220;
  const dh = 16;
  const df = P.dashCd > 0 ? 1 - P.dashCd / P.dashCdMax : P.dashCharges / P.dashMax;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('DASH' + (P.dashMax > 1 ? ' x2' : ''), dx, dy - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = df >= 1 ? '#37e08b' : '#4df3ff';
  ctx.fillRect(dx, dy, dw * df, dh);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(dx, dy, dw, dh);
  if (P.dashCharges > 0) {
    ctx.fillStyle = '#37e08b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('READY — CLICK!', dx + dw + 12, dy + 13);
  }

  // Boss HP bar (big, top center) with the boss NAME above it.
  if (boss) {
    const bw = 460;
    const bx = W / 2 - bw / 2;
    const by = 52;
    const bh = 20;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb86b';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(boss.name, W / 2, by - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(bx, by, bw, bh);
  }
}

export function drawUpgrade(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,15,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.shadowColor = '#4df3ff';
  ctx.shadowBlur = 16;
  ctx.font = 'bold 40px monospace';
  ctx.fillText('SECTOR ' + G.sector + ' CLEAR — CHOOSE UPGRADE', W / 2, 130);
  ctx.shadowBlur = 0;
  drawChoiceCards(ctx, G.upgradeChoices, '#4df3ff', '#4df3ff', '#cfe0ee');
  ctx.restore();
}

export function drawBossReward(ctx, choices) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,15,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 44px monospace';
  ctx.fillText('BOSS DEFEATED!', W / 2, 110);
  ctx.font = 'bold 28px monospace';
  ctx.fillText('CHOOSE BOSS REWARD', W / 2, 152);
  ctx.shadowBlur = 0;
  drawChoiceCards(ctx, choices, '#ffd166', '#ffd166', '#f5e6c0');
  ctx.restore();
}

export function drawEnd(ctx, title, col, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,15,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 24;
  ctx.font = 'bold 64px monospace';
  ctx.fillText(title, W / 2, H / 2 - 40);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8f6ff';
  ctx.font = '28px monospace';
  ctx.fillText('SCORE  ' + G.score.toLocaleString('en-US'), W / 2, H / 2 + 20);
  if (title === 'VICTORY') {
    ctx.fillText('TIME  ' + fmtTime(G.elapsed), W / 2, H / 2 + 60);
    ctx.fillStyle = '#9fb8cc';
    ctx.font = '20px monospace';
    ctx.fillText('Dreadnought destroyed. All sectors cleared.', W / 2, H / 2 + 100);
  } else {
    ctx.fillStyle = '#9fb8cc';
    ctx.font = '20px monospace';
    ctx.fillText('Sector ' + G.sector + '  •  Time ' + fmtTime(G.elapsed), W / 2, H / 2 + 60);
  }
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#4df3ff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('CLICK OR PRESS R TO PLAY AGAIN', W / 2, H / 2 + 130);
  ctx.restore();
}

export function drawMuteButton(ctx, muted) {
  ctx.save();
  ctx.fillStyle = 'rgba(16,24,48,0.85)';
  ctx.strokeStyle = muted ? '#ff5d5d' : '#4df3ff';
  ctx.lineWidth = 2;
  ctx.fillRect(MUTE_BTN.x, MUTE_BTN.y, MUTE_BTN.w, MUTE_BTN.h);
  ctx.strokeRect(MUTE_BTN.x, MUTE_BTN.y, MUTE_BTN.w, MUTE_BTN.h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = muted ? '#ff5d5d' : '#4df3ff';
  ctx.fillText(muted ? '✕' : '♪', MUTE_BTN.x + MUTE_BTN.w / 2, MUTE_BTN.y + 21);
  ctx.restore();
}
