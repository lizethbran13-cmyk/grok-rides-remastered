// save game (localStorage, own key so the old Grok Rides save is untouched). One-time welcome-back import from the old game.
const KEY = 'grokRides2.save.v1', OLD = 'grokRides.save.v1';
export const S = { d: null };
function fresh() { return { v: 1, money: 1500, owned: { compact: { color: 0x38bdf8, finish: 'gloss', rim: 'std', upg: {} } }, cur: 'compact', homes: {}, mainHome: null, stars: {}, hats: {}, hat: 'none', name: '', look: { shirt: 0x3b82f6, skin: 0xf6c9a0, hair: 0x3a2516, pants: 0x334155 }, time: 0.35, stats: { jobs: 0, races: 0, wins: 0, fires: 0, cones: 0, tows: 0, miles: 0, bestJump: 0, bestDrift: 0 }, mailDay: '', opts: { sound: true }, raceBest: {}, buffs: {}, tickets: 0, ach: {} }; }
export function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  if (!d) { d = fresh(); try { const o = JSON.parse(localStorage.getItem(OLD) || 'null'); if (o && typeof o === 'object') { const m = Math.min(60000, Math.max(0, +o.money || 0)); if (m > 0) d.money += Math.round(m * 0.5); d.imported = 1; if (o.name) d.name = String(o.name).slice(0, 12); } } catch (e) {} }
  const f = fresh(); for (const k in f) if (d[k] === undefined) d[k] = f[k]; for (const k in f.stats) if (d.stats[k] === undefined) d.stats[k] = 0;
  if (!d.owned[d.cur]) d.cur = Object.keys(d.owned)[0] || 'compact';
  S.d = d; return d;
}
let t = 0; export function save(now) { const n = performance.now(); if (!now && n - t < 1500) { clearTimeout(save.q); save.q = setTimeout(() => save(true), 1600); return; } t = n; try { localStorage.setItem(KEY, JSON.stringify(S.d)); } catch (e) {} }
export const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
