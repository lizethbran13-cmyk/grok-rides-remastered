// tiny WebAudio synth: sfx + ambience, no files
let ctx = null, master = null, on = true, loops = {};
export function initAudio() { if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; } try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; } }
export function setSound(v) { on = v; if (master) master.gain.value = v ? 0.5 : 0; }
function noiseBuf() { if (noiseBuf.b) return noiseBuf.b; const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (noiseBuf.b = b); }
function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, vol = 0.3, delay = 0) { if (!ctx || !on) return; const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, 0.01, dur, vol); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); }
function noise(dur, f, vol = 0.4, q = 1, type = 'lowpass', delay = 0, f1) { if (!ctx || !on) return; const t = ctx.currentTime + delay, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q; env(g, t, 0.01, dur, vol); s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.1); }
export const SFX = {
  coin: () => { tone('square', 988, 0, 0.08, 0.12); tone('square', 1319, 0, 0.18, 0.12, 0.07); },
  cash: () => { [0, 0.06, 0.12].forEach((d, i) => tone('triangle', 1200 + i * 300, 0, 0.12, 0.2, d)); noise(0.25, 6000, 0.12, 1, 'highpass', 0.15); tone('sine', 2093, 0, 0.4, 0.15, 0.2); },
  jump: () => tone('sine', 380, 760, 0.16, 0.18),
  click: () => tone('triangle', 660, 0, 0.06, 0.15),
  hurt: () => { tone('sawtooth', 300, 120, 0.25, 0.2); },
  ko: () => { tone('triangle', 900, 200, 0.5, 0.25); [0, 0.12, 0.24].forEach((d) => tone('sine', 1500, 0, 0.08, 0.1, 0.5 + d)); },
  boom: (v = 1) => { noise(1.2 * v, 900, 0.7 * v, 0.7, 'lowpass', 0, 60); tone('sine', 120, 35, 0.8, 0.5 * v); },
  thunder: () => { noise(0.08, 8000, 0.5, 0.5, 'highpass'); noise(2.2, 700, 0.6, 0.5, 'lowpass', 0.05, 80); },
  roar: () => { if (!ctx || !on) return; const t = ctx.currentTime; const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(95, t + 1.6); o2.frequency.setValueAtTime(71, t); o2.frequency.linearRampToValueAtTime(48, t + 1.6); f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(300, t + 1.6); f.Q.value = 1.5; env(g, t, 0.15, 1.6, 0.5); o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9); noise(1.6, 900, 0.25, 2, 'bandpass'); },
  beam: () => { tone('sawtooth', 220, 880, 1.0, 0.18); noise(1.0, 3000, 0.15, 3, 'bandpass'); },
  zap: () => { tone('square', 1800, 200, 0.3, 0.15); },
  siren: () => { if (!ctx || !on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; for (let i = 0; i < 3; i++) { o.frequency.setValueAtTime(520, t + i * 1.1); o.frequency.linearRampToValueAtTime(980, t + i * 1.1 + 0.55); o.frequency.linearRampToValueAtTime(520, t + i * 1.1 + 1.1); } g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.1); g.gain.setValueAtTime(0.16, t + 3.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 3.4); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, 0.25, 0.2, i * 0.11)),
  splash: () => noise(0.6, 1500, 0.35, 0.8, 'lowpass', 0, 300),
  whoosh: () => noise(0.5, 400, 0.3, 1, 'bandpass', 0, 2000),
  pad: () => { tone('sine', 523, 1047, 0.25, 0.18); },
  ufo: () => { tone('sine', 300, 900, 0.6, 0.12); tone('sine', 900, 300, 0.6, 0.12, 0.6); },
  shield: () => { tone('sine', 400, 1200, 0.4, 0.2); },
  achieve: () => [784, 988, 1175, 1568].forEach((f, i) => tone('square', f, 0, 0.16, 0.12, i * 0.09))
};
// looping ambience: wind / rain / rumble with a target volume
export function ambience(name, vol) {
  if (!ctx) return; let L = loops[name];
  if (!L) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(); s.loop = true;
    f.type = name === 'rain' ? 'highpass' : name === 'rumble' ? 'lowpass' : 'bandpass'; f.frequency.value = name === 'rain' ? 2500 : name === 'rumble' ? 120 : 500; f.Q.value = 0.7;
    g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); L = loops[name] = { g, f };
  }
  L.g.gain.setTargetAtTime(on ? vol : 0, ctx.currentTime, 0.4);
  if (name === 'wind') L.f.frequency.setTargetAtTime(400 + vol * 900, ctx.currentTime, 0.5);
}
