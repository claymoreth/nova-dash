// WebAudio synth for NOVA DASH. Every sound is generated in code — no mp3 files.
// One job: make noise. The game never depends on audio working.
export const audioState = { muted: false };

let AC = null;

export function ensureAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      AC = null;
    }
  }
  return AC;
}

export function beep(freq, dur, type, vol, slide) {
  if (audioState.muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch (e) {}
}

// Short noise burst for explosions.
export function boom() {
  if (audioState.muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  try {
    const len = ac.sampleRate * 0.25;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
    src.connect(g);
    g.connect(ac.destination);
    src.start();
  } catch (e) {}
}

// Two-note chime for upgrades and boss rewards.
export function ding() {
  beep(660, 0.15, 'sine', 0.07, 990);
  beep(990, 0.2, 'sine', 0.05, 1320);
}
