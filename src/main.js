// Grok Rides Remastered - main: boot, modes (drive / walk / inside), camera, HUD, the frame loop
import * as THREE from 'three';
import { G, initGfx, render } from './gfx.js';
import { CHUNKS, buildChunks, updateChunks } from './chunks.js';
import { buildTerrain, buildWater, buildRoads, MAT } from './scenery.js';
import * as W from './world.js';
import { layout, BLD, PLACES } from './layout.js';
import { Car } from './vehicle.js';
import { VEH, isAir, isWater } from './data.js';
import { makePerson, animPerson, setHat } from './people.js';
import { extraGround, solve, segBlocked } from './collide.js';
import { I, initInput, bindHold, bindTap, readDrive, readWalk } from './input.js';
import { S, load, save, fmt } from './save.js';
import { initAudio, SFX, setSound, ambience } from './audio.js';
import { SKY, initEnv, updateEnv, clockStr } from './env.js';
import { $, toast, bigText, UI, panel, closePanel, wire, buildMapBase, drawMini, drawBig, fade } from './ui.js';
import { ST } from './state.js';
import { warmShaders } from './perf.js';
import * as TR from './traffic.js';
import * as IN from './interiors.js';
import * as ACT from './activities.js';
import * as SHOP from './shops.js';
import * as NET from './coop.js';
const Q = new URLSearchParams(location.search);
const App = window.__rr = Object.assign(ST, { ready: false, G, W, S, I, SKY, BLD, PLACES, THREE });
initGfx(document.getElementById('c'));
G.camera.far = 1300; G.camera.near = 0.25; G.camera.updateProjectionMatrix();
G.scene.add(CHUNKS.root);
const T = []; const tm = (f) => { const a = performance.now(); f(); T.push((performance.now() - a) | 0); };
tm(layout); tm(buildTerrain); tm(() => buildWater(G.scene)); tm(buildRoads); tm(buildChunks); App.T = T;
initEnv(); tm(buildMapBase); IN.initInteriors(); TR.initTraffic(); ACT.initActivities(); NET.initNet();
G.renderer.info.autoReset = false;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angD = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
App.view = (x, y, z, tx, ty, tz) => { G.camera.position.set(x, y, z); G.camera.lookAt(tx, ty, tz); G.focus.set(tx, ty, tz); updateChunks(G.camera, true); };
/* ---------------- player (on foot) ---------------- */
const ME = ST.me = { P: null, x: 0, y: 2, z: 0, vy: 0, yaw: 0, ground: true, moving: 0 };
export function rebuildMe() {
  const d = S.d; if (ME.P) G.scene.remove(ME.P.root);
  ME.P = makePerson(Object.assign({}, d.look, { hat: d.hat === 'none' ? 'none' : d.hat, hatColor: 0xef4444 })); ME.P.root.scale.setScalar(0.92); G.scene.add(ME.P.root); ME.P.root.visible = ST.mode !== 'drive';
}
ST.rebuildMe = rebuildMe;
/* ---------------- vehicles ---------------- */
function lookFor(type) { const o = S.d.owned[type] || {}; return { color: o.color != null ? o.color : VEH[type].col, finish: o.finish || 'gloss', rim: o.rim || 'std', upg: o.upg || {}, rider: Object.assign({}, S.d.look, { hat: S.d.hat }), nitro: false }; }
export function spawnCar(type, x, z, yaw) {
  if (ST.car) { G.scene.remove(ST.car.V.root); }
  const c = new Car(type, lookFor(type)); c.mine = true; G.scene.add(c.V.root); c.place(x, z, yaw);
  if (isWater(type) || type === 'seaplane') { const h = W.heightAt(x, z); if (h < W.WATER_Y) c.y = W.WATER_Y; }
  c.fuel = S.d.fuel && S.d.fuel[type] != null ? S.d.fuel[type] : 1; ST.car = c; c.V.rider && (c.V.rider.root.visible = false);
  c.onLand = (imp, air) => ACT.onLand(c, imp, air); return c;
}
ST.spawnCar = spawnCar;
export function rebuildCar() { const c = ST.car; if (!c) return; const { x, z, yaw, y, fuel, dmg } = c; spawnCar(c.type, x, z, yaw); ST.car.y = y; ST.car.fuel = fuel; ST.car.dmg = dmg; ST.car.sync(0); if (ST.mode === 'drive') ST.car.V.rider && (ST.car.V.rider.root.visible = true); }
ST.rebuildCar = rebuildCar;
// pick a sensible spot for a vehicle type near (x,z): water vehicles on water, planes at Sky Field
export function spotFor(type, x, z) {
  const k = VEH[type].kind;
  if (k === 'boat' || (k === 'seaplane' && W.heightAt(x, z) > 0)) { const docks = [[-60, 20, Math.PI], [1170, 1180, Math.PI * 0.75], [-80, 120, 0], [1300, 1000, 2.3]]; let b = docks[0], bd = 1e12; for (const d of docks) { const dd = (d[0] - x) ** 2 + (d[1] - z) ** 2; if (dd < bd) { bd = dd; b = d; } } return b; }
  if (k === 'plane') return [W.RUNWAY.x, W.RUNWAY.z0 + 30, 0];
  const r = W.nearestRoad(x, z, 300); if (!r) return [x, z, 0];
  const p = W.edgePoint(r.e, r.s, r.e.w / 4); return [p.x, p.z, Math.atan2(p.dx, p.dz)];
}
ST.spotFor = spotFor;
/* ---------------- modes ---------------- */
function setMode(m) {
  ST.mode = m; const drive = m === 'drive';
  $('pads').classList.toggle('hidden', !drive); $('speedo').classList.toggle('hidden', !drive); $('footBtns').classList.toggle('hidden', drive);
  ['cDmg', 'cFuel'].forEach((id) => $(id).classList.toggle('hidden', !drive));
  if (ME.P) ME.P.root.visible = !drive;
  if (ST.car && ST.car.V.rider) ST.car.V.rider.root.visible = drive;
  refreshPads();
}
ST.setMode = setMode;
function refreshPads() {
  const c = ST.car; if (!c) return; const k = c.kind;
  $('bNitro').classList.toggle('hidden', !c.hasNitro); $('cNitro').classList.toggle('hidden', !c.hasNitro);
  const air = c.isAirK() || k === 'hovercar' || k === 'hover'; $('airBtns').classList.toggle('hidden', !air);
  $('bDown').classList.toggle('hidden', k === 'hovercar' || k === 'hover');
  $('upL').textContent = k === 'balloon' ? 'BURN' : k === 'plane' || k === 'seaplane' ? 'CLIMB' : k === 'hover' || k === 'hovercar' ? 'HOP' : 'UP';
  $('driftL').textContent = k === 'bike' && c.def.wheelie ? '🤸 WHEELIE' : c.isAirK() ? '🛑 STOP' : '🌀 DRIFT';
}
ST.refreshPads = refreshPads;
export function getIn() {
  const c = ST.car; if (!c) return; setMode('drive'); c.parked = false; SFX.click(); I.releaseAll && I.releaseAll(); I.camDX = 0;
  camSnap = true;
}
export function getOut() {
  const c = ST.car; if (!c) return;
  if (c.isAirK() && !c.ground) { toast('Land first! 🛬', true); return; }
  if ((c.kind === 'boat') && Math.abs(c.speed) > 3) { toast('Slow down first!', true); return; }
  const [fx, fz] = c.fwd; let x = c.x - fz * (c.wid / 2 + 1.0), z = c.z + fx * (c.wid / 2 + 1.0);
  // boats: hop out onto the closest dry land
  if (W.heightAt(x, z) < W.WATER_Y - 0.3) { let best = null; for (let r = 3; r < 40 && !best; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const px = c.x + Math.cos(a) * r, pz = c.z + Math.sin(a) * r; if (W.heightAt(px, pz) > W.WATER_Y + 0.2) { best = [px, pz]; break; } } if (!best) { toast('Get closer to land to hop out!', true); return; } [x, z] = best; }
  const p = { x, z }; solve(p, 0.45, W.heightAt(x, z) + 0.1); ME.x = p.x; ME.z = p.z; ME.y = Math.max(W.heightAt(p.x, p.z), extraGround(p.x, p.z, c.y + 1)); ME.vy = 0; ME.yaw = c.yaw;
  c.parked = true; c.vx = c.vz = 0; c.speed = 0; setMode('foot'); SFX.click(); I.releaseAll && I.releaseAll();
}
ST.getIn = getIn; ST.getOut = getOut;
/* ---------------- camera ---------------- */
const CAM = ST.cam = { yaw: 0, pitch: 0.32, pos: new THREE.Vector3(), look: new THREE.Vector3(), dist: 9 }; let camSnap = true;
const _t = new THREE.Vector3(), _d = new THREE.Vector3();
function updateCamera(dt) {
  let tx, ty, tz, base, dist, pitch, Hh;
  if (ST.mode === 'drive') { const c = ST.car; const air = c.isAirK(); Hh = c.V.dims.H || 1.6; tx = c.x; ty = c.y + Hh * 0.75 + 0.5; tz = c.z;
    let want = c.yaw; const sp = Math.hypot(c.vx, c.vz); if (c.speed < -3 && !air) want = c.yaw; // reversing: keep looking forward (no spin)
    base = want; dist = (Math.max(4.5, c.len) * 0.95 + 5.5 + Math.min(4, sp * 0.06)) * (air ? 1.35 : 1); pitch = air ? 0.3 : 0.26; if (c.kind === 'balloon') { dist = 20; pitch = 0.35; ty = c.y + 6; }
  } else { tx = ME.x; ty = ME.y + 1.5; tz = ME.z; base = CAM.walkYaw != null ? CAM.walkYaw : ME.yaw; dist = 6.6; pitch = 0.3; Hh = 1.7; }
  if (ST.inside) { dist = 9; pitch = 0.5; }
  dist *= I.zoom;
  // drag to look around; it eases back behind you after a moment
  I.camT += dt; if (I.camT > 1.6 && ST.mode === 'drive') { I.camDX = damp(I.camDX, 0, 2.2, dt); I.camDY = damp(I.camDY, 0, 2.2, dt); }
  I.camDY = clamp(I.camDY, -0.22, 0.75);
  if (ST.mode !== 'drive') { CAM.walkYaw = (CAM.walkYaw == null ? ME.yaw : CAM.walkYaw) - I.camDX; I.camDX = 0; if (ST.inside) { const d = angD(Math.PI, CAM.walkYaw); CAM.walkYaw = Math.PI + clamp(d, -0.7, 0.7); if (I.camT > 1.5) CAM.walkYaw = Math.PI + damp(d, 0, 2, dt); } if (!ST.inside && ME.moving > 0.3 && I.camT > 1.2) CAM.walkYaw += angD(CAM.walkYaw, ME.yaw) * Math.min(1, dt * 0.9 * ME.moving); base = CAM.walkYaw; }
  const yawT = base - (ST.mode === 'drive' ? I.camDX : 0);
  CAM.yaw = camSnap ? yawT : CAM.yaw + angD(CAM.yaw, yawT) * (1 - Math.exp(-(ST.mode === 'drive' ? 4.2 : 6) * dt));
  const pt = clamp(pitch + I.camDY, 0.05, 1.1); CAM.pitch = camSnap ? pt : damp(CAM.pitch, pt, 6, dt);
  _t.set(tx, ty, tz);
  _d.set(tx - Math.sin(CAM.yaw) * Math.cos(CAM.pitch) * dist, ty + Math.sin(CAM.pitch) * dist, tz - Math.cos(CAM.yaw) * Math.cos(CAM.pitch) * dist);
  // no clipping: pull in in front of walls / hills; inside rooms clamp to the room box
  if (ST.inside) IN.clampCam(_d, _t);
  else { const f = segBlocked(_t.x, _t.y, _t.z, _d.x, _d.y, _d.z); if (f < 1) { const ff = Math.max(0.12, f - 0.06); _d.lerpVectors(_t, _d, ff); } const g = W.heightAt(_d.x, _d.z) + 0.8; if (_d.y < g) _d.y = g; if (_d.y < W.WATER_Y + 0.6) _d.y = W.WATER_Y + 0.6; }
  if (camSnap) { CAM.pos.copy(_d); CAM.look.copy(_t); camSnap = false; }
  else { const pulledIn = _d.distanceTo(_t) < CAM.pos.distanceTo(_t) - 0.3; const k = pulledIn ? 14 : 8; CAM.pos.x = damp(CAM.pos.x, _d.x, k, dt); CAM.pos.y = damp(CAM.pos.y, _d.y, k, dt); CAM.pos.z = damp(CAM.pos.z, _d.z, k, dt); CAM.look.x = damp(CAM.look.x, _t.x, 16, dt); CAM.look.y = damp(CAM.look.y, _t.y, 10, dt); CAM.look.z = damp(CAM.look.z, _t.z, 16, dt); }
  G.camera.position.copy(CAM.pos); G.camera.lookAt(CAM.look);
  if (G.shake > 0) { G.camera.position.x += (Math.random() - 0.5) * G.shake; G.camera.position.y += (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 2); }
  // speed FOV kick
  const fovT = G.baseFov + (ST.mode === 'drive' && ST.car.boost ? 8 : ST.mode === 'drive' ? Math.min(6, Math.abs(ST.car.speed) * 0.08) : 0);
  if (Math.abs(G.camera.fov - fovT) > 0.05) { G.camera.fov = damp(G.camera.fov, fovT, 3, dt); G.camera.updateProjectionMatrix(); }
  G.focus.set(tx, ty - 1, tz);
}
ST.snapCam = () => { camSnap = true; };
/* ---------------- walking ---------------- */
function walk(dt) {
  const mv = readWalk(), m = Math.hypot(mv.x, mv.z), cy = CAM.yaw;
  const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
  let dx = fx * -mv.z + rx * mv.x, dz = fz * -mv.z + rz * mv.x; const sp = m > 0.85 ? 7.2 : 4.6 * Math.max(m, 0.4);
  const P = ME.P;
  if (m > 0.08) { const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; ME.x += dx * sp * Math.min(m, 1) * dt; ME.z += dz * sp * Math.min(m, 1) * dt; ME.yaw += angD(ME.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 12); }
  if ((I.jumpQ) && ME.ground) { ME.vy = 7.2; ME.ground = false; SFX.jump(); } I.jumpQ = false;
  const p = { x: ME.x, z: ME.z };
  if (ST.inside) IN.walkCollide(p, ME); else { solve(p, 0.4, ME.y + 0.1, 1.7); TR.pushPerson(p); p.x = clamp(p.x, -W.WB + 20, W.WB - 20); p.z = clamp(p.z, -W.WB + 20, W.WB - 20); }
  ME.x = p.x; ME.z = p.z;
  let g = ST.inside ? IN.floorAt(ME.x, ME.z, ME.y) : Math.max(W.heightAt(ME.x, ME.z), extraGround(ME.x, ME.z, ME.y, 0.7));
  const swim = !ST.inside && g < W.WATER_Y - 0.9; if (swim) g = W.WATER_Y - 1.0;
  ME.vy -= 22 * dt; ME.y += ME.vy * dt; if (ME.y <= g) { ME.y = g; ME.vy = 0; ME.ground = true; } else if (ME.y > g + 0.3) ME.ground = false; else { ME.y = g; ME.ground = true; }
  P.root.position.set(ME.x, ME.y, ME.z); P.root.rotation.y = ME.yaw;
  animPerson(P, ME.sitting ? ME.sitting : !ME.ground ? 'walk' : m > 0.85 ? 'run' : m > 0.08 ? 'walk' : 'idle', dt, m, ST.t);
  ME.moving = m;
}
/* ---------------- actions (context button) ---------------- */
let curAct = null;
function updateAct() {
  const px = ST.mode === 'drive' ? ST.car.x : ME.x, pz = ST.mode === 'drive' ? ST.car.z : ME.z; let best = null;
  for (const f of ST.acts) { const l = f(px, pz, ST.mode); if (l) for (const a of l) if (!best || (a.pri || 0) > (best.pri || 0) || ((a.pri || 0) === (best.pri || 0) && a.d < best.d)) best = a; }
  if (ST.mode === 'foot' && ST.car && !ST.inside) { const d = Math.hypot(ST.car.x - ME.x, ST.car.z - ME.z); if (d < ST.car.len / 2 + 2.6 && (!best || (best.pri || 0) <= 1)) best = { label: (VEH[ST.car.type].icon) + ' Get in ' + VEH[ST.car.type].name, d, fn: getIn, pri: 1 }; }
  curAct = best; const b = $('bAct');
  if (best && !UI.open) { if (b.textContent !== best.label) b.textContent = best.label; b.classList.remove('hidden'); } else b.classList.add('hidden');
}
function doAct() { if (curAct && !UI.open) { const a = curAct; curAct = null; a.fn(); } }
/* ---------------- HUD ---------------- */
let hudT = 0, miniT = 0;
const regName = { city: 'Grok City', town: 'Pine Hollow', lake: 'Sparkle Lake', air: 'Sky Field', mtn: 'Mount Grokmore', tundra: 'Frostbite Tundra', desert: 'Sizzle Desert', beach: 'Sunny Shores', wild: 'Countryside', sea: 'Big Blue Sea' };
function hud(dt) {
  hudT += dt; if (hudT < 0.1) return; hudT = 0;
  const c = ST.car, px = ST.mode === 'drive' ? c.x : ME.x, pz = ST.mode === 'drive' ? c.z : ME.z;
  $('moneyN').textContent = fmt(S.d.money);
  const reg = ST.inside ? null : W.regionAt(px, pz); ST.region = reg; $('minimap').classList.toggle('hidden', !!ST.inside); $('bMap').classList.toggle('hidden', !!ST.inside); $('regionN').textContent = ST.inside ? ST.inside.name : (W.REGIONS[reg] || regName[reg] || 'Countryside'); $('clockN').textContent = clockStr();
  if (ST.mode === 'drive') {
    const mph = Math.abs(c.isAirK() ? Math.hypot(c.vx, c.vz) : c.speed) * 2.237; $('spdN').textContent = Math.round(mph);
    const a = $('altN'); if (c.isAirK()) { a.classList.remove('hidden'); a.textContent = '↑ ' + Math.max(0, Math.round((c.y - W.heightAt(c.x, c.z)) * 3.28)) + ' ft'; } else a.classList.add('hidden');
    const dm = $('dmgBar'); dm.style.width = Math.round((1 - c.dmg) * 100) + '%'; dm.style.background = c.dmg > 0.7 ? '#ef4444' : c.dmg > 0.4 ? '#f59e0b' : '#22c55e';
    const fu = $('fuelBar'); fu.style.width = Math.round(c.fuel * 100) + '%'; fu.style.background = c.fuel < 0.15 ? '#ef4444' : '#3b82f6';
    if (c.hasNitro) $('nitroBar').style.width = Math.round(c.nitro * 100) + '%';
  }
  miniT += 1; if (miniT % 2 === 0 && !ST.inside) drawMini($('minimap'), px, pz, ST.mode === 'drive' ? c.yaw : CAM.yaw, mapIcons(false), ST.gps);
}
function mapIcons(big) {
  const out = [];
  for (const p of PLACES) { if (!big && p.kind !== 'home' && p.kind !== 'dealer' && p.kind !== 'garage' && p.kind !== 'fire' && p.kind !== 'mart') continue; if (p.kind === 'mart' && !big) continue; out.push({ x: p.x, z: p.z, e: p.kind === 'home' ? (S.d.homes[p.id] ? '🏠' : '🏷️') : (p.place && p.place.icon) || '⭐', big: p.kind === 'home' }); }
  ACT.mapIcons(out, big); TR.mapIcons(out, big); NET.mapIcons(out);
  if (ST.mode === 'foot' && ST.car) out.push({ x: ST.car.x, z: ST.car.z, e: VEH[ST.car.type].icon, edge: true });
  if (ST.gpsTarget) out.push({ x: ST.gpsTarget[0], z: ST.gpsTarget[1], e: '📍', edge: true, big: true });
  return out;
}
ST.mapIcons = mapIcons;
export function openMap() {
  if (ST.inside) return; const bm = $('bigmap'); bm.classList.remove('hidden'); UI.open = true; const px = ST.mode === 'drive' ? ST.car.x : ME.x, pz = ST.mode === 'drive' ? ST.car.z : ME.z;
  drawBig($('bigC'), px, pz, ST.mode === 'drive' ? ST.car.yaw : CAM.yaw, mapIcons(true), ST.gps);
  $('mapLeg').textContent = 'Tap anywhere to set a GPS waypoint 📍 · 🏠 your homes · 🏷️ homes for sale · ⭐ stars · 🔥 fires';
}
function setGps(x, z) { ST.gpsTarget = [x, z]; ST.gpsRouteT = 0; refreshGps(true); toast('📍 Waypoint set! Follow the purple line.'); }
ST.setGps = (x, z, quiet) => { ST.gpsTarget = x == null ? null : [x, z]; ST.gps = null; if (x != null) refreshGps(true); };
let gpsT = 0;
function refreshGps(force) {
  if (!ST.gpsTarget) { ST.gps = null; $('gps').classList.add('hidden'); return; }
  const px = ST.mode === 'drive' ? ST.car.x : ME.x, pz = ST.mode === 'drive' ? ST.car.z : ME.z, [gx, gz] = ST.gpsTarget, d = Math.hypot(gx - px, gz - pz);
  gpsT -= 1; if (force || gpsT <= 0) { gpsT = 12; const air = ST.mode === 'drive' && (ST.car.isAirK() || ST.car.kind === 'boat' || ST.car.kind === 'hovercar'); ST.gps = air || d < 60 ? [[px, pz], [gx, gz]] : (W.route(px, pz, gx, gz) || [[px, pz], [gx, gz]]); }
  $('gps').classList.remove('hidden'); $('gpsT').textContent = d > 1000 ? (d / 1609).toFixed(1) + ' mi' : Math.round(d * 3.28) + ' ft';
  const hd = ST.mode === 'drive' ? ST.car.yaw : CAM.yaw; const tgt = ST.gps.length > 2 ? ST.gps[Math.min(2, ST.gps.length - 1)] : [gx, gz]; const a = Math.atan2(tgt[0] - px, tgt[1] - pz) - hd; $('gpsArrow').style.transform = 'rotate(' + (-a * 180 / Math.PI - 90) + 'deg)';
  if (d < 14 && !ST.job && !ST.race) { ST.gpsTarget = null; ST.gps = null; $('gps').classList.add('hidden'); toast('📍 You made it!'); }
}
/* ---------------- start / title ---------------- */
function showTitle() {
  App.view(700, 70, 260, 620, 10, 40); setMode('title'); $('hud').classList.add('hidden');
}
let started = false;
function start(online) {
  if (started) return; started = true; initAudio(); setSound(S.d.opts.sound !== false);
  const nm = ($('nameIn').value || '').trim().slice(0, 12); if (nm) S.d.name = nm; save(true);
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); I.enabled = true;
  rebuildMe(); SKY.tod = S.d.time != null ? S.d.time : 0.36; SKY.snap = true;
  respawn(true);
  if (S.d.imported && !S.d.importMsg) { S.d.importMsg = 1; save(); setTimeout(() => toast('🎁 Welcome back! Half of your old Grok Rides cash came with you.'), 1200); }
  setTimeout(() => toast('Hold <b>GAS</b> to drive · drag the left side to steer'), 600);
  if (online) NET.openLobby();
}
export function respawn(first) {
  let x, z, yaw; const h = S.d.mainHome && PLACES.find((p) => p.id === S.d.mainHome);
  const type = S.d.cur;
  if (h) { [x, z, yaw] = [h.garageSpot.x, h.garageSpot.z, h.garageSpot.yaw]; }
  else { const g = PLACES.find((p) => p.id === 'citygarage'); [x, z, yaw] = spotFor('compact', g.door.x, g.door.z); }
  const [sx, sz, sy] = spotFor(type, x, z); spawnCar(type, sx, sz, sy);
  ME.x = sx; ME.z = sz; ME.y = W.heightAt(sx, sz);
  if (ST.inside) IN.leave(true);
  getIn(); camSnap = true; if (!first) { fade(true); setTimeout(() => fade(false), 350); }
}
ST.respawn = respawn;
/* ---------------- pause menu ---------------- */
function menu() {
  const own = Object.keys(S.d.owned).length;
  const c = panel(`<h2>⏸️ Paused</h2><div class="sub">${S.d.name ? 'Driver: <b>' + S.d.name + '</b> · ' : ''}${own} rides owned · ⭐ ${Object.keys(S.d.stars).length}/${ACT.STAR_N} stars</div>
  <div class="btnrow" style="flex-direction:column">
  <button class="btn green" data-a="resume">▶ Resume</button>
  <button class="btn blue" data-a="call">📲 Call one of my rides</button>
  <button class="btn purple" data-a="jobs">💼 Jobs & races</button>
  <button class="btn gray" data-a="home">🏠 ${S.d.mainHome ? 'Go home' : 'Back to Grok City Garage'}</button>
  <button class="btn gray" data-a="friends">🤝 Play with friends</button>
  <button class="btn gray" data-a="snd">${S.d.opts.sound !== false ? '🔊 Sound on' : '🔇 Sound off'}</button>
  <button class="btn gray small" data-a="arcade">← Back to Grok Arcade</button></div>`);
  wire(c, { resume: closePanel, call: () => SHOP.callRide(), jobs: () => ACT.jobBoard(), home: () => { closePanel(); respawn(); }, friends: () => { closePanel(); NET.openLobby(); }, snd: () => { S.d.opts.sound = S.d.opts.sound === false; setSound(S.d.opts.sound); save(); menu(); }, arcade: () => { save(true); location.href = 'https://lizethbran13-cmyk.github.io/grok-arcade/'; } });
}
ST.menu = menu;
/* ---------------- wire HUD buttons ---------------- */
bindHold($('bGas'), 'gas'); bindHold($('bBrake'), 'brake'); bindHold($('bDrift'), 'hand'); bindHold($('bNitro'), 'nitro'); bindHold($('bUp'), 'up'); bindHold($('bDown'), 'down');
bindTap($('bHorn'), () => { ACT.horn(); }); bindTap($('bWalk'), () => { if (ST.mode === 'drive') getOut(); });
bindTap($('bAct'), doAct); bindTap($('bJump'), () => { I.jumpQ = true; }); bindTap($('bMenu'), menu); bindTap($('bMap'), openMap); bindTap($('minimap'), openMap);
bindTap($('bMapClose'), () => { $('bigmap').classList.add('hidden'); UI.open = false; });
$('bigC').addEventListener('click', (e) => { const r = $('bigC').getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height; setGps(-W.WB + u * W.WB * 2, -W.WB + v * W.WB * 2); $('bigmap').classList.add('hidden'); UI.open = false; });
$('pnl').addEventListener('click', (e) => { if (e.target.id === 'pnl') closePanel(); });
bindTap($('bPlay'), () => start(false)); bindTap($('bOnline'), () => start(true));
bindTap($('bHow'), () => { const c = panel(`<h2>How to play</h2><div class="item"><div class="ic">🕹️</div><div class="grow"><b>Steer</b><small>Touch & drag anywhere on the left side.</small></div></div><div class="item"><div class="ic">🟢</div><div class="grow"><b>GAS / BRAKE</b><small>Brake again when stopped to reverse. DRIFT for handbrake slides.</small></div></div><div class="item"><div class="ic">🚶</div><div class="grow"><b>WALK</b><small>Hop out and walk into any building with a glowing door.</small></div></div><div class="item"><div class="ic">👀</div><div class="grow"><b>Look around</b><small>Drag on the right side of the screen. Pinch to zoom.</small></div></div><div class="item"><div class="ic">💼</div><div class="grow"><b>Earn cash</b><small>Jobs, races, stars, stunts, deliveries, fires, tows and ice cream!</small></div></div><div class="btnrow"><button class="btn green" data-a="x">GOT IT</button></div>`); wire(c, { x: closePanel }); });
$('nameIn').value = '';
/* ---------------- frame loop ---------------- */
let last = performance.now(), saveT = 0;
App.fixedDt = Q.get('fdt') ? +Q.get('fdt') : 0;
function step(dt) {
  ST.t += dt;
  if (I.mapQ) { I.mapQ = false; if ($('bigmap').classList.contains('hidden')) openMap(); else { $('bigmap').classList.add('hidden'); UI.open = false; } }
  if (I.actQ) { I.actQ = false; doAct(); }
  if (I.walkQ) { I.walkQ = false; if (ST.mode === 'drive') getOut(); else if (curAct && curAct.fn === getIn) getIn(); }
  if (ST.mode === 'drive') { const c = ST.car; const inp = UI.open ? { thr: 0, steer: 0, pitchIn: 0, active: true, hand: true } : readDrive(); ACT.mods(inp, c); c.update(dt, inp, { buff: ACT.buffFlags() }); ME.x = c.x; ME.z = c.z; ME.y = c.y; if (c.dmg >= 1 && !c.wrecked) ACT.wreck(c); }
  else if (ST.mode === 'foot') { walk(dt); if (ST.car && ST.car.parked) ST.car.update(dt, { thr: 0, steer: 0, active: false }); }
  if (ST.mode !== 'title') {
    TR.updateTraffic(dt); ACT.updateActivities(dt); IN.updateInterior(dt); NET.updateNet(dt);
    for (const f of ST.hooks.update) f(dt);
    if (!App.freeCam) updateCamera(dt); updateAct(); hud(dt); refreshGpsT += dt; if (refreshGpsT > 0.15) { refreshGpsT = 0; refreshGps(); }
    saveT += dt; if (saveT > 10) { saveT = 0; S.d.time = SKY.tod; if (ST.car) { S.d.fuel = S.d.fuel || {}; S.d.fuel[ST.car.type] = ST.car.fuel; } save(); }
  } else { const a = ST.t * 0.05; App.view(620 + Math.cos(a) * 260, 80, -120 + Math.sin(a) * 260, 620, 18, -120); TR.updateTraffic(dt); }
  const reg = ST.region, rk = reg === 'desert' ? 'desert' : reg === 'tundra' || (reg === 'mtn' && G.camera.position.y > 70) ? 'snow' : 'day';
  updateEnv(dt, G.camera, rk, !!ST.inside);
  if (ST.car) ST.car.setNight(SKY.night); TR.setNight(SKY.night);
  if (MAT.waterU) MAT.waterU.uT.value += dt;
  if (!ST.inside) updateChunks(G.camera);
}
let refreshGpsT = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); let dt = Math.min(0.05, (now - last) / 1000); last = now; if (App.fixedDt) dt = App.fixedDt;
  if (App.paused) { render(0); return; }
  try { step(dt); } catch (e) { if (!App.err) { App.err = String(e && e.stack || e); console.error(e); } }
  G.renderer.info.reset(); render(dt); App.info = Object.assign({}, G.renderer.info.render);
}
App.jobStart = (k) => ACT.startJob(k); App.raceStart = (k) => ACT.startRace(k); App.trafficInfo = () => { const a = TR.CARS.filter((c) => c.alive); return JSON.stringify({ alive: a.length, moving: a.filter((c) => c.v > 1).length, waiting: a.filter((c) => c.wait > 5).length, peds: TR.PEDS.filter((p) => p.alive).length }); };
App.sim = (sec, h = 1 / 30) => { for (let t = 0; t < sec; t += h) step(h); };
App.step = step; App.start = start; App.getIn = getIn; App.getOut = getOut; App.menu = menu; App.openMap = openMap; App.respawn = respawn;
load(); $('nameIn').value = S.d.name || '';
initInput(); showTitle(); updateChunks(G.camera, true);
warmShaders && G.composer && warmShaders(G.renderer, G.scene, G.camera);
$('loadMsg').textContent = 'Ready!'; setTimeout(() => $('loadMsg').classList.add('hidden'), 800);
loop(); App.ready = true;
if (Q.get('auto')) start(false);
