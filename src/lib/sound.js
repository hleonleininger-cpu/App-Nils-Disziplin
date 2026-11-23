// Töne per WebAudio, ohne Audiodateien. Standardmäßig aus (Einstellung).
let ctx = null;
let enabled = false;
export const setSoundEnabled = (v) => (enabled = Boolean(v));
function tone(freq, t0, dur, type = 'sine', vol = 0.15) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + t0);
  o.stop(ctx.currentTime + t0 + dur + 0.05);
}
export function play(kind = 'ding') {
  if (!enabled) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (kind === 'ding') {
      tone(784, 0, 0.18, 'triangle');
      tone(1175, 0.09, 0.25, 'triangle');
    } else if (kind === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle'));
    } else if (kind === 'warn') {
      tone(220, 0, 0.25, 'sawtooth', 0.1);
      tone(196, 0.22, 0.35, 'sawtooth', 0.1);
    } else if (kind === 'tick') tone(660, 0, 0.06, 'square', 0.05);
  } catch {}
}
