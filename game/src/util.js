// Shared math and formatting helpers for NOVA DASH.
// One job: pure functions, no game state.
export const W = 1280;
export const H = 720;
export const TAU = Math.PI * 2;

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function clamp(v, a, b) {
  return v < a ? a : (v > b ? b : v);
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// Squared distance from point (px, py) to segment (ax, ay)-(bx, by).
// Used for every collision test so a fast dash cannot jump over a target
// between two frames (anti-tunneling).
export function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return dist2(px, py, cx, cy);
}

export function fmtTime(s) {
  s = Math.floor(s);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
