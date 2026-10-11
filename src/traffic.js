// NPC traffic (lane following, smooth junction curves, signals, give-way, no gridlock), pedestrians, police
import * as THREE from 'three';
import { G } from './gfx.js';
import * as W from './world.js';
import { makeVehicle } from './vmodels.js';
import { makeWalker, animPerson } from './people.js';
import { LIGHTS, SIG } from './layout.js';
import { Car } from './vehicle.js';
import { solve } from './collide.js';
import { ST } from './state.js';
import { SFX } from './audio.js';
import { toast, bigText } from './ui.js';
import { S, save } from './save.js';
const { EDGES, NODES } = W;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const CARS = [], PEDS = [], COPS = [];
const N_CARS = 34, N_PEDS = 26, NEAR = 330, FAR = 400;
const TYPES = ['compact', 'compact', 'taxi', 'sports', 'muscle', 'pickup', 'compact', 'taxi', 'limo', 'icecream', 'bigrig', 'pickup', 'bus', 'compact', 'sports', 'police'];
const COLS = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15, 0xffffff, 0x111827, 0xf97316, 0xa855f7, 0x14b8a6, 0x9ca3af, 0xec4899];
const drivable = EDGES.filter((e) => e.kind !== 'mtn' || true);
const _p = {}, _q = {};
let sigT = 0, lastG = '';
export function initTraffic() {
  for (let i = 0; i < N_CARS; i++) {
    const type = TYPES[i % TYPES.length], col = type === 'taxi' ? 0xffc61a : type === 'police' ? 0x1e293b : type === 'bus' ? 0xffc61a : type === 'icecream' ? 0xfdf2f8 : COLS[i % COLS.length];
    const V = makeVehicle(type, { lite: true, color: col, rider: false }); G.scene.add(V.root); V.root.visible = false;
    if (V.siren) V.siren.forEach((m) => { m.material = m.material.clone(); });
    CARS.push({ V, type, len: V.dims.L, wid: V.dims.W, v: 0, vmax: 0, e: null, dir: 1, s: 0, turn: null, wait: 0, stuck: 0, x: 0, z: 0, y: 0, yaw: 0, id: i, alive: false, bump: 0, honkT: 0 });
  }
  for (let i = 0; i < N_PEDS; i++) { const P = makeWalker(i * 31 + 7); G.scene.add(P.root); P.root.visible = false; PEDS.push({ P, e: null, s: 0, side: 1, dir: 1, x: 0, z: 0, y: 0, yaw: 0, alive: false, dodge: 0, v: 1.3 + (i % 5) * 0.12 }); }
}
function laneOff(e) { return e.w / 4 + (e.kind === 'hwy' ? 0 : 0); }
function lanePt(e, dir, s, out) { return W.edgePoint(e, dir > 0 ? s : e.len - s, dir > 0 ? laneOff(e) : -laneOff(e), out); }
function endNode(e, dir) { return NODES[dir > 0 ? e.b : e.a]; }
function spawnCar(c, px, pz) {
  for (let tries = 0; tries < 30; tries++) {
    const e = drivable[(Math.random() * drivable.length) | 0]; if (c.type === 'bus' && e.kind === 'mtn') continue; if (e.len < 30) continue;
    const s = 10 + Math.random() * (e.len - 20), dir = Math.random() < 0.5 ? 1 : -1; lanePt(e, dir, s, _p);
    const d = Math.hypot(_p.x - px, _p.z - pz); if (d < 110 || d > NEAR) continue;
    let clash = false; for (const o of CARS) if (o.alive && Math.hypot(o.x - _p.x, o.z - _p.z) < 18) { clash = true; break; } if (clash) continue;
    Object.assign(c, { e, dir, s, turn: null, wait: 0, stuck: 0, alive: true, v: 6, bump: 0 }); c.vmax = (e.kind === 'hwy' ? 19 : e.kind === 'mtn' ? 11 : 12.5) * (c.type === 'bus' || c.type === 'bigrig' ? 0.85 : 1) * (0.9 + (c.id % 4) * 0.05);
    pose(c, 0); c.V.root.visible = true; return true;
  }
  c.alive = false; c.V.root.visible = false; return false;
}
function nextEdge(c) {
  const n = endNode(c.e, c.dir), opts = n.edges.filter((e) => e !== c.e && !(c.type === 'bus' && e.kind === 'mtn'));
  const e = opts.length ? opts[(Math.random() * opts.length) | 0] : c.e; return { e, dir: e.a === n.id ? 1 : -1, n };
}
// junction approach: start a smooth bezier through the node
function startTurn(c) {
  const R = Math.min(endNode(c.e, c.dir).r + 5, c.e.len / 2 - 1); const nx = nextEdge(c), R2 = Math.min(nx.n.r + 5, nx.e.len / 2 - 1);
  const p0 = lanePt(c.e, c.dir, c.e.len - R, {}), p2 = lanePt(nx.e, nx.dir, R2, {}); const pe = lanePt(c.e, c.dir, c.e.len, {}), ps = lanePt(nx.e, nx.dir, 0, {});
  const p1 = { x: (pe.x + ps.x) / 2, z: (pe.z + ps.z) / 2 }, L = Math.hypot(p1.x - p0.x, p1.z - p0.z) + Math.hypot(p2.x - p1.x, p2.z - p1.z);
  c.turn = { p0, p1, p2, L: Math.max(2, L), u: 0, nx, R2, node: nx.n };
}
function signalRed(c) { // approach axis vs. current green axis
  const n = endNode(c.e, c.dir); if (!n.signal) return false; lanePt(c.e, c.dir, c.e.len - 1, _q); const dx = Math.abs(_q.dx), ns = dx < 0.5; return ns ? n.signal.green !== 'ns' : n.signal.green !== 'ew';
}
function pose(c, dt) {
  let x, z, yaw;
  if (c.turn) { const t = c.turn, u = t.u, a = 1 - u; x = a * a * t.p0.x + 2 * a * u * t.p1.x + u * u * t.p2.x; z = a * a * t.p0.z + 2 * a * u * t.p1.z + u * u * t.p2.z; const dx = 2 * a * (t.p1.x - t.p0.x) + 2 * u * (t.p2.x - t.p1.x), dz = 2 * a * (t.p1.z - t.p0.z) + 2 * u * (t.p2.z - t.p1.z); yaw = Math.atan2(dx, dz); }
  else { lanePt(c.e, c.dir, c.s, _p); x = _p.x; z = _p.z; yaw = Math.atan2(_p.dx * c.dir, _p.dz * c.dir); }
  const y = W.heightAt(x, z); c.x = x; c.z = z;
  if (dt === 0) { c.yaw = yaw; c.y = y; } else { let d = yaw - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * Math.min(1, dt * 10); c.y = damp(c.y, y, 14, dt); }
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), hf = W.heightAt(x + fx * c.len * 0.4, z + fz * c.len * 0.4), hb = W.heightAt(x - fx * c.len * 0.4, z - fz * c.len * 0.4);
  const r = c.V.root; r.position.set(c.x, c.y, c.z); r.rotation.set(0, c.yaw, 0, 'YXZ'); c.V.body.rotation.x = Math.atan2(hb - hf, c.len * 0.8) + (c.bump > 0 ? Math.sin(c.bump * 30) * 0.03 : 0);
}
// distance to the closest thing ahead in my lane (other cars, the player, peds crossing)
function gapAhead(c) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let best = 1e9;
  const test = (x, z, len, yawO) => { const dx = x - c.x, dz = z - c.z, f = dx * fx + dz * fz; if (f <= 0 || f > 32) return; const lat = Math.abs(dx * fz - dz * fx); if (lat > 2.3) return; if (yawO != null && Math.cos(yawO - c.yaw) < -0.3 && lat > 1.2) return; const g = f - (c.len + len) / 2; if (g < best) best = g; };
  for (const o of CARS) if (o !== c && o.alive) test(o.x, o.z, o.len, o.yaw);
  const pc = ST.car; if (pc && !pc.isAirK()) test(pc.x, pc.z, pc.len, pc.yaw);
  if (ST.mode === 'foot' && !ST.inside) test(ST.me.x, ST.me.z, 0.6, null);
  for (const o of COPS) test(o.car.x, o.car.z, o.car.len, o.car.yaw);
  return best;
}
function updateCar(c, dt) {
  if (c.bump > 0) c.bump -= dt;
  let target = c.vmax;
  if (!c.turn) { const left = c.e.len - c.s; const n = endNode(c.e, c.dir);
    if (n.signal && left < 22 && signalRed(c)) { const stopAt = left - (n.r + 4); if (stopAt < 0.5 && stopAt > -2) target = 0; else if (stopAt > 0) target = Math.min(target, Math.sqrt(2 * 5 * stopAt)); }
    if (left < 26) target = Math.min(target, 8.5); // slow down for the corner
    if (!n.signal && left < 18) { const occ = n.occ; if (occ && occ !== c && occ.alive && occ.turn && occ.turn.node === n && c.wait < 3.5) { const stopAt = left - (n.r + 5); target = Math.min(target, stopAt > 0 ? Math.sqrt(2 * 5 * stopAt) : 0); } }
  }
  const gap = gapAhead(c); if (gap < 18) target = Math.min(target, Math.max(0, (gap - 2.5) * 0.9)); if (gap < 2.2) target = 0;
  if (c.bump > 0) target = 0;
  c.v = target < c.v ? Math.max(target, c.v - dt * 9) : Math.min(target, c.v + dt * 3.2);
  if (c.v < 0.3) c.wait += dt; else c.wait = Math.max(0, c.wait - dt * 2);
  // anti-gridlock: stuck for long with nobody moving -> quietly recycle (only when the player can't see it)
  if (c.wait > 14) { const d = Math.hypot(c.x - G.camera.position.x, c.z - G.camera.position.z); if (d > 70) { c.alive = false; c.V.root.visible = false; return; } }
  const ds = c.v * dt;
  if (c.turn) { c.turn.u += ds / c.turn.L; if (c.turn.u >= 1) { const t = c.turn; c.e = t.nx.e; c.dir = t.nx.dir; c.s = t.R2; c.turn = null; if (t.node.occ === c) t.node.occ = null; c.vmax = (c.e.kind === 'hwy' ? 19 : c.e.kind === 'mtn' ? 11 : 12.5) * (c.type === 'bus' || c.type === 'bigrig' ? 0.85 : 1); } }
  else { c.s += ds; const n = endNode(c.e, c.dir), R = Math.min(n.r + 5, c.e.len / 2 - 1); if (c.s >= c.e.len - R) { if (!n.occ || !n.occ.alive || !n.occ.turn || n.occ.turn.node !== n || n.signal) n.occ = c; startTurn(c); } }
  pose(c, dt);
  if (c.V.siren && c.type === 'police') { const on = (ST.t * 4 | 0) % 2; c.V.siren[0].material.emissiveIntensity = on ? 2 : 0.2; c.V.siren[1] && (c.V.siren[1].material.emissiveIntensity = on ? 0.2 : 2); }
}
// the player bumping into traffic
function playerHits(dt) {
  const pc = ST.car; if (!pc || ST.mode !== 'drive' || pc.isAirK()) return;
  for (const c of CARS) { if (!c.alive) continue; const dx = pc.x - c.x, dz = pc.z - c.z, d = Math.hypot(dx, dz), R = pc.r + Math.min(c.wid, c.len) / 2 + Math.max(0, Math.abs((dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / (d || 1)) * (c.len - c.wid) / 2); if (d >= R || d < 1e-3 || Math.abs(pc.y - c.y) > 2.5) continue;
    const nx = dx / d, nz = dz / d, pen = R - d; pc.x += nx * pen; pc.z += nz * pen; const vn = pc.vx * nx + pc.vz * nz;
    if (vn < 0) { const imp = -vn; pc.vx -= nx * vn * 1.4; pc.vz -= nz * vn * 1.4; if (pc.def.crush && imp > 6) { c.bump = 1.5; } pc.hit(imp, { traffic: c }); c.bump = Math.max(c.bump, 1.2); if (imp > 4) { SFX.hurt(); if (c.type === 'police' && imp > 6) addWanted(1); else if (imp > 9) addWanted(0.34); } if (c.honkT <= 0) { c.honkT = 3; } } }
  for (const c of CARS) if (c.honkT > 0) c.honkT -= dt;
}
/* ---------------- pedestrians on the sidewalks ---------------- */
const walkE = EDGES.filter((e) => e.walk);
function spawnPed(p, px, pz) {
  for (let t = 0; t < 20; t++) { const e = walkE[(Math.random() * walkE.length) | 0], s = Math.random() * e.len, side = Math.random() < 0.5 ? 1 : -1; W.edgePoint(e, s, side * (e.w / 2 + 2.0), _p); if (W.surfAt(_p.x, _p.z) !== W.S_WALK) continue; const d = Math.hypot(_p.x - px, _p.z - pz); if (d < 40 || d > 170) continue; Object.assign(p, { e, s, side, dir: Math.random() < 0.5 ? 1 : -1, alive: true, dodge: 0 }); p.P.root.visible = true; return; }
}
function updatePed(p, dt) {
  p.s += p.dir * p.v * dt; if (p.s < 2 || p.s > p.e.len - 2) { p.dir *= -1; p.s = clamp(p.s, 2, p.e.len - 2); }
  W.edgePoint(p.e, p.s, p.side * (p.e.w / 2 + 2.0 + p.dodge), _p);
  // a car is coming: hop onto the grass side and wave
  const pc = ST.car; let danger = false; if (pc && ST.mode === 'drive') { const d = Math.hypot(pc.x - _p.x, pc.z - _p.z); if (d < 7 && Math.abs(pc.speed) > 2) danger = true; }
  p.dodge = damp(p.dodge, danger ? 2.6 : 0, danger ? 9 : 1.5, dt);
  if (W.surfAt(_p.x, _p.z) !== W.S_WALK && W.surfAt(_p.x, _p.z) !== W.S_GRASS && W.surfAt(_p.x, _p.z) !== W.S_PLAZA) { p.dir *= -1; }
  p.x = _p.x; p.z = _p.z; p.y = W.heightAt(p.x, p.z); p.yaw = Math.atan2(_p.dx * p.dir, _p.dz * p.dir);
  p.P.root.position.set(p.x, p.y, p.z); p.P.root.rotation.y = p.yaw; animPerson(p.P, danger || p.dodge > 1 ? 'wave' : 'walk', dt, 1, ST.t + p.s);
}
export function pushPerson(q) { for (const c of CARS) { if (!c.alive) continue; const dx = q.x - c.x, dz = q.z - c.z, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), f = dx * fx + dz * fz, l = dx * fz - dz * fx; if (Math.abs(f) < c.len / 2 + 0.4 && Math.abs(l) < c.wid / 2 + 0.4) { const pl = c.wid / 2 + 0.4 - Math.abs(l); q.x += fz * Math.sign(l || 1) * pl; q.z -= fx * Math.sign(l || 1) * pl; } } }
/* ---------------- police ---------------- */
let wanted = 0, calm = 0, bustT = 0;
export function addWanted(v) { if (ST.job && ST.job.kind === 'cop') return; const was = Math.floor(wanted); wanted = Math.min(3, wanted + v); ST.wanted = wanted; calm = 0; if (Math.floor(wanted) > was) { bigText('🚨'.repeat(Math.floor(wanted))); toast('The police are after you! Get away or pull over.', true); SFX.siren(); } }
function spawnCop() {
  const pc = ST.car || { x: ST.me.x, z: ST.me.z }; const r = W.nearestRoad(pc.x + (Math.random() - 0.5) * 300, pc.z + (Math.random() - 0.5) * 300, 300); if (!r) return; const p = W.edgePoint(r.e, r.s, 0);
  if (Math.hypot(p.x - pc.x, p.z - pc.z) < 80) return;
  const car = new Car('police', { color: 0x1e293b, lite: true, rider: false }); car.V.siren && car.V.siren.forEach((m) => { m.material = m.material.clone(); }); G.scene.add(car.V.root); car.place(p.x, p.z, Math.atan2(pc.x - p.x, pc.z - p.z)); car.vmax *= 0.92; COPS.push({ car, t: 0 });
}
export function aiDrive(car, tx, tz, dt, o = {}) { // simple seek steering for chasers/robbers
  const dx = tx - car.x, dz = tz - car.z, want = Math.atan2(dx, dz); let d = want - car.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const dist = Math.hypot(dx, dz);
  const steer = clamp(-d * 2.2, -1, 1); let thr = dist < (o.stop || 0) ? -0.4 : 1; if (Math.abs(d) > 1.4 && car.speed > 8) thr = 0.2;
  car.stuckT = (Math.abs(car.speed) < 1 && thr > 0) ? (car.stuckT || 0) + dt : 0; if (car.stuckT > 1.2) { car.revT = 1.2; car.stuckT = 0; }
  if (car.revT > 0) { car.revT -= dt; car.update(dt, { thr: -1, steer: -steer, active: true }, { noFuel: true }); return; }
  car.update(dt, { thr, steer, hand: Math.abs(d) > 1.2 && car.speed > 10, active: true }, { noFuel: true });
}
function updateCops(dt) {
  if (wanted > 0) { const pc = ST.car; const px = ST.mode === 'drive' ? pc.x : ST.me.x, pz = ST.mode === 'drive' ? pc.z : ST.me.z;
    if (COPS.length < Math.ceil(wanted) && Math.random() < dt * 0.5) spawnCop();
    let near = 1e9; for (const k of COPS) { aiDrive(k.car, px, pz, dt, { stop: 7 }); const on = (ST.t * 5 | 0) % 2; if (k.car.V.siren) { k.car.V.siren[0].material.emissiveIntensity = on ? 2.4 : 0.2; k.car.V.siren[1] && (k.car.V.siren[1].material.emissiveIntensity = on ? 0.2 : 2.4); } near = Math.min(near, Math.hypot(k.car.x - px, k.car.z - pz));
      if (pc && ST.mode === 'drive') { const dx = pc.x - k.car.x, dz = pc.z - k.car.z, d = Math.hypot(dx, dz), R = pc.r + k.car.r + 0.6; if (d < R && d > 0.01) { const nx = dx / d, nz = dz / d; pc.x += nx * (R - d) * 0.6; pc.z += nz * (R - d) * 0.6; k.car.x -= nx * (R - d) * 0.4; k.car.z -= nz * (R - d) * 0.4; } } }
    calm += dt; if (near > 220) wanted -= dt * 0.12; else if (calm > 25) wanted -= dt * 0.03;
    const slow = ST.mode !== 'drive' || Math.abs(pc.speed) < 1.5; if (near < 9 && slow) { bustT += dt; if (bustT > 2.5) busted(); } else bustT = Math.max(0, bustT - dt);
    if (ST.inside) wanted -= dt * 0.5;
    if (wanted <= 0) { wanted = 0; toast('😎 You lost the police!'); clearCops(); }
    ST.wanted = wanted;
  }
}
function clearCops() { for (const k of COPS) G.scene.remove(k.car.V.root); COPS.length = 0; }
function busted() { const fine = Math.min(S.d.money, 100 * Math.ceil(wanted)); S.d.money -= fine; save(); bigText('🚓 BUSTED!'); toast('Pulled over! Paid a $' + fine + ' ticket. Drive nice! 😅', true, 3500); wanted = 0; ST.wanted = 0; bustT = 0; clearCops(); }
export const clearWanted = () => { wanted = 0; ST.wanted = 0; clearCops(); };
/* ---------------- per frame ---------------- */
let tick = 0;
export function updateTraffic(dt) {
  sigT += dt; const ph = sigT % 24, g = ph < 10 ? 'ns' : ph < 12 ? 'nsY' : ph < 22 ? 'ew' : 'ewY';
  if (g !== lastG) { lastG = g; const go = g === 'ns' ? 'ns' : g === 'ew' ? 'ew' : 'none'; for (const n of LIGHTS) n.signal.green = go;
    for (const ax of ['ns', 'ew']) { const on = g === ax, amb = g === ax + 'Y'; SIG[ax + 'G'].emissiveIntensity = on ? 2.4 : 0.05; SIG[ax + 'A'].emissiveIntensity = amb ? 2.4 : 0.05; SIG[ax + 'R'].emissiveIntensity = !on && !amb ? 2.4 : 0.05; } }
  const cp = ST.mode === 'title' ? G.camera.position : ST.mode === 'drive' ? ST.car : ST.me; const px = cp.x, pz = cp.z; tick++;
  if (ST.inside) return;
  for (const c of CARS) { if (!c.alive) { if ((tick + c.id) % 20 === 0) spawnCar(c, px, pz); continue; } const d = Math.hypot(c.x - px, c.z - pz); if (d > FAR) { c.alive = false; c.V.root.visible = false; continue; }
    // far + offscreen cars only move every other frame (offscreen animation skipping)
    if (d > 160 && (tick + c.id) % 2) continue; updateCar(c, d > 160 ? dt * 2 : dt); }
  for (const p of PEDS) { if (!p.alive) { if ((tick + 7) % 30 === 0) spawnPed(p, px, pz); continue; } const d = Math.hypot(p.x - px, p.z - pz); if (d > 200) { p.alive = false; p.P.root.visible = false; continue; } if (d > 90 && tick % 3) continue; updatePed(p, d > 90 ? dt * 3 : dt); }
  playerHits(dt); updateCops(dt);
}
export function mapIcons(out, big) { if (big) return; for (const c of CARS) if (c.alive) out.push({ x: c.x, z: c.z, dot: c.type === 'police' ? '#1e3a8a' : '#e2e8f0' }); for (const k of COPS) out.push({ x: k.car.x, z: k.car.z, e: '🚓', edge: true }); }
let lastN = -1; export function setNight(n) { const on = n > 0.5; if (on === lastN) return; lastN = on; for (const c of CARS) if (c.V.beams) c.V.beams.forEach((b) => b.visible = on); }
