// Synthesized sound effects (no audio files, so it works fully offline and stays tiny).
let ctx = null, master = null, noiseBuf = null;
export const audio = { enabled: true, haptics: true };

export function unlockAudio() {
  if (!audio.enabled) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, freq = 1200, q = 1, delay = 0, type = 'bandpass') {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  thwack()  { noise(0.08, 0.5, 1800, 2); tone(220, 0.08, 'triangle', 0.25, -120); },
  paper()   { noise(0.12, 0.35, 3000, 0.7); },
  clunk()   { tone(140, 0.12, 'square', 0.25, -60); noise(0.06, 0.3, 900, 3); },
  thunk()   { tone(300, 0.06, 'triangle', 0.3, -200); noise(0.04, 0.3, 2500, 4); },
  splash()  { noise(0.35, 0.45, 700, 0.6, 0, 'lowpass'); noise(0.2, 0.2, 3000, 1, 0.05); },
  splat()   { noise(0.25, 0.5, 400, 0.5, 0, 'lowpass'); tone(90, 0.15, 'sine', 0.4, -40); },
  squeak()  { tone(900, 0.18, 'square', 0.18, 700); tone(1400, 0.12, 'square', 0.12, -500, 0.12); },
  clack()   { for (let i = 0; i < 5; i++) noise(0.03, 0.3, 4000, 5, i * 0.03); },
  boom()    { tone(80, 0.35, 'sine', 0.6, -50); noise(0.3, 0.5, 300, 0.7, 0, 'lowpass'); },
  ding()    { tone(1320, 0.3, 'sine', 0.25); tone(1980, 0.25, 'sine', 0.15, 0, 0.05); noise(0.05, 0.3, 1500, 2); },
  disco()   { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.12, 0, i * 0.05)); noise(0.1, 0.4, 600, 1); },
  coin()    { tone(988, 0.07, 'square', 0.12); tone(1319, 0.15, 'square', 0.12, 0, 0.07); },
  crit()    { tone(1200, 0.1, 'sawtooth', 0.15, 800); noise(0.12, 0.4, 2000, 1); },
  zap()     { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 900, 0.05, 'sawtooth', 0.15, 0, i * 0.04); noise(0.3, 0.3, 5000, 0.5); },
  alarm()   { for (let i = 0; i < 4; i++) { tone(880, 0.15, 'square', 0.15, 0, i * 0.3); tone(660, 0.15, 'square', 0.15, 0, i * 0.3 + 0.15); } },
  crash()   { noise(0.5, 0.6, 1500, 0.4); tone(110, 0.3, 'square', 0.3, -60); for (let i = 0; i < 4; i++) tone(2000 + Math.random() * 2000, 0.08, 'triangle', 0.08, 0, 0.05 + i * 0.05); },
  whoosh()  { noise(0.3, 0.3, 800, 0.8, 0, 'bandpass'); },
  pop()     { for (let i = 0; i < 8; i++) noise(0.03, 0.4, 2500, 3, i * 0.04 + Math.random() * 0.02); },
  steam()   { noise(0.6, 0.35, 5000, 0.3, 0, 'highpass'); },
  slip()    { tone(600, 0.3, 'sine', 0.25, -500); tone(80, 0.2, 'sine', 0.5, -30, 0.3); },
  ko()      { [784, 659, 523, 392, 262].forEach((f, i) => tone(f, 0.18, 'square', 0.14, 0, i * 0.1)); },
  levelup() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.15, 'square', 0.12, 0, i * 0.07)); },
  buy()     { tone(660, 0.08, 'square', 0.15); tone(990, 0.15, 'square', 0.15, 0, 0.08); },
  error()   { tone(180, 0.2, 'square', 0.15, -40); },
  rage()    { tone(100, 0.6, 'sawtooth', 0.3, 300); noise(0.6, 0.3, 400, 0.8); },
  tap()     { tone(600, 0.04, 'triangle', 0.1); },
  bird()    { tone(1800, 0.08, 'sine', 0.15, 600); tone(2200, 0.08, 'sine', 0.15, -500, 0.1); },
  meow()    { tone(700, 0.35, 'sawtooth', 0.1, 300); },
};

export function sfx(name) {
  if (!audio.enabled || !ctx || ctx.state !== 'running') return;
  const f = SFX[name]; if (f) try { f(); } catch (e) {}
}

export function buzz(pattern) {
  if (!audio.haptics) return;
  if (navigator.vibrate) try { navigator.vibrate(pattern); } catch (e) {}
}
