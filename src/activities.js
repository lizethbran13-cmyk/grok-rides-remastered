// gameplay: stars, stunts, drifts, gas, car wash, mailbox, Torty, jobs (delivery, pizza, cargo, taxi, bus, fire, tow, ice cream,
// sky tours, police patrol), street races, mini games. Markers are real 3D rings/beams (no billboards).
import * as THREE from 'three';
import { G } from './gfx.js';
import * as W from './world.js';
import { GEO } from './geo.js';
import { M, glow } from './mats.js';
import { STARS, PLACES, BLD, STOPS, GAS, WASH, SPOTS } from './layout.js';
import { VEH, SNACKS, ICE, MAIL, FURN, BUFFNAME } from './data.js';
import { Car } from './vehicle.js';
import { makeVehicle } from './vmodels.js';
import { makeWalker, makeTorty, animPerson } from './people.js';
import { ST, addActs } from './state.js';
import { S, save, fmt } from './save.js';
import { toast, bigText, panel, closePanel, wire, $ } from './ui.js';
import { SFX } from './audio.js';
import { CARS, aiDrive, addWanted } from './traffic.js';
import * as SHOP from './shops.js';
import * as IN from './interiors.js';
export const STAR_N = STARS.length;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = Math.random;
const pos = () => ST.mode === 'drive' ? ST.car : ST.me;
let starMesh = null; const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
/* ---------------- 3D markers ---------------- */
function makeRing(color = 0xa855f7, r = 4) { const g = new THREE.Group(); const t = new THREE.Mesh(GEO.torus(r, 0.32, Math.PI * 2, 12, 48), M(color, { e: color, ei: 1.4, r: 0.3 })); g.add(t); g.ring = t; const beam = new THREE.Mesh(GEO.cyl(r * 0.85, r * 0.85, 60, 32), glow(color, 0.12)); beam.position.y = 30; beam.renderOrder = 3; g.add(beam); g.beam = beam; g.visible = false; G.scene.add(g); return g; }
const MK = { a: null, b: null };
function showMarker(m, x, z, y, air) { m.visible = true; m.position.set(x, y != null ? y : W.heightAt(x, z) + (air ? 0 : 0.1), z); m.ring.rotation.set(air ? 0 : Math.PI / 2, ST.t * (air ? 0.6 : 0), 0); m.ring.position.y = air ? 0 : 0.35; m.beam.visible = !air; }
/* ---------------- init ---------------- */
let torty = null, fires = [], fireMeshes = [], water = null, towed = null, robber = null, customers = [], racers = [];
export function initActivities() {
  MK.a = makeRing(0xa855f7); MK.b = makeRing(0x22c55e, 6);
  starMesh = new THREE.InstancedMesh(GEO.star(0.9, 0.35), M(0xffd23f, { e: 0xffb300, ei: 0.7, r: 0.25, m: 0.3 }), STARS.length); starMesh.castShadow = false; starMesh.frustumCulled = false; G.scene.add(starMesh);
  // Torty's Pier Snacks (she's a tortoise, so naturally the snacks are lettuce-based... mostly)
  const sp = SPOTS.find((s) => s.kind === 'torty'); if (sp) { torty = makeTorty(); torty.root.position.set(sp.x, sp.y, sp.z); torty.root.scale.setScalar(1.3); G.scene.add(torty.root); torty.spot = sp; const stall = new THREE.Group(); stall.position.set(sp.x + 2.2, sp.y, sp.z); const st = new THREE.Mesh(GEO.rbox(2.4, 1.1, 1, 0.1), M(0x16a34a, { r: 0.5, cc: 0.4 })); st.position.y = 0.55; stall.add(st); const roof = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 8, 0, 6.283, 0, 1.0), M(0xfacc15, { r: 0.5, side: THREE.DoubleSide })); roof.position.y = 1.9; stall.add(roof); const pole = new THREE.Mesh(GEO.cyl(0.05, 0.05, 2.4, 8), M(0xffffff)); pole.position.y = 1.2; stall.add(pole); G.scene.add(stall); }
  // water spray stream for the fire truck: a smooth tube rebuilt from a parabola
  water = new THREE.Mesh(new THREE.BufferGeometry(), M(0x7dd3fc, { r: 0.1, op: 0.75, e: 0x38bdf8, ei: 0.3 })); water.visible = false; water.frustumCulled = false; G.scene.add(water);
  addActs(actsOutside);
}
/* ---------------- per-frame ---------------- */
let starT = 0, driftPts = 0, driftT = 0, airMax = 0, washCD = 0, lowFuelWarn = false, fireSpawnT = 40;
export function updateActivities(dt) {
  const p = pos(); if (!p) return;
  // stars: spin, only nearby ones animate; collect
  starT += dt; let n = 0; const ang = starT * 1.6;
  for (const s of STARS) { if (S.d.stars[s.id]) { _s.set(0, 0, 0); } else { const d = Math.abs(s.x - p.x) + Math.abs(s.z - p.z); _s.set(1, 1, 1); if (d < 250) { _q.setFromEuler(_e.set(0, ang + s.id, 0)); _v.set(s.x, s.y + Math.sin(ang * 1.3 + s.id) * 0.25, s.z); } else { _q.identity(); _v.set(s.x, s.y, s.z); } if (d < 6 && !ST.inside && Math.abs((p.y || 0) + 1 - s.y) < 4.5) { S.d.stars[s.id] = 1; save(); SFX.achieve(); const c = Object.keys(S.d.stars).length; bigText('⭐ ' + c + '/' + STAR_N); SHOP.earn(100, 'Grok Star!'); if (c === STAR_N) toast('🏆 You found every Grok Star! You\'re a legend!'); } }
    _m.compose(_v, _q, _s); starMesh.setMatrixAt(n++, _m); }
  starMesh.instanceMatrix.needsUpdate = true; starMesh.visible = !ST.inside;
  if (torty) { const d = Math.hypot(torty.spot.x - p.x, torty.spot.z - p.z); if (d < 120) { torty.head.rotation.y = Math.sin(ST.t * 0.8) * 0.4; torty.body.position.y = Math.abs(Math.sin(ST.t * 2)) * 0.03; } }
  if (ST.mode === 'drive') driveStuff(dt);
  updateJob(dt); updateRace(dt); updateFires(dt);
  for (const c of customers) { c.t += dt; const tx = c.tx, tz = c.tz, dx = tx - c.x, dz = tz - c.z, L = Math.hypot(dx, dz); if (L > 0.8) { c.x += dx / L * 4 * dt; c.z += dz / L * 4 * dt; c.P.root.rotation.y = Math.atan2(dx, dz); animPerson(c.P, 'run', dt, 1, ST.t); } else animPerson(c.P, 'wave', dt, 0, ST.t); c.P.root.position.set(c.x, W.heightAt(c.x, c.z), c.z); }
  if (customers.length && (ST.mode !== 'drive' || ST.car.type !== 'icecream' || Math.abs(ST.car.speed) > 3)) clearCustomers();
}
function driveStuff(dt) {
  const c = ST.car;
  // drift scoring
  if (c.drift > 0.5 && Math.abs(c.speed) > 8 && c.ground) { driftT += dt; driftPts += dt * Math.abs(c.speed) * 3 * c.drift; } else if (driftT > 0) { if (driftT > 1.2 && driftPts > 60) { const pts = Math.round(driftPts); bigText('🌀 DRIFT ' + pts, 1000); SHOP.earn(Math.round(pts / 8), 'drift'); if (pts > (S.d.stats.bestDrift || 0)) S.d.stats.bestDrift = pts; } driftT = 0; driftPts = 0; }
  // car wash: drive slowly through
  washCD -= dt; for (const w of WASH) { if (washCD > 0) break; if (Math.hypot(w.x - c.x, w.z - c.z) < 5 && Math.abs(c.speed) < 14 && !c.isAirK()) { washCD = 25; c.dirt = 0; if (S.d.money >= 15) { S.d.money -= 15; save(); } SFX.splash(); bigText('✨ SPARKLY CLEAN!'); toast('🧽 ' + w.name + ': washed & waxed for $15. Shiny!'); if (c.V.paint) { c.V.paint.clearcoat = 1; c.V.paint.roughness = Math.max(0.12, c.V.paint.roughness - 0.08); } } }
  // dirt slowly builds up off-road / in rain (paint gets duller)
  const s = W.surfAt(c.x, c.z); if (s === W.S_DIRT || s === W.S_SAND || s === W.S_SNOW) c.dirt = Math.min(1, (c.dirt || 0) + dt * 0.01 * Math.min(1, Math.abs(c.speed) / 10));
  if (c.fuel < 0.15 && !lowFuelWarn) { lowFuelWarn = true; toast('⛽ Low fuel! Find a gas station (check the map).', true); } if (c.fuel > 0.3) lowFuelWarn = false;
  if (c.boost === false && c.hasNitro && buffOnK('nitro')) c.nitro = Math.min(1, c.nitro + dt * 0.08);
}
const buffOnK = (k) => S.d.buffs[k] && S.d.buffs[k] > Date.now();
export function buffFlags() { return { speed: buffOnK('speed'), grip: buffOnK('grip'), off: buffOnK('off'), snow: buffOnK('snow') }; }
export function mods(inp, c) { void inp; void c; }
export function onLand(c, imp, air) { if (c !== ST.car) return; if (air > 0.9) { const pay = Math.round(air * 45); bigText('🦘 BIG AIR ' + air.toFixed(1) + 's', 1100); SHOP.earn(pay, 'stunt'); if (air > (S.d.stats.bestJump || 0)) S.d.stats.bestJump = air; } if (imp > 14) G.shake = Math.min(0.5, imp * 0.02); }
export function wreck(c) { c.wrecked = true; SFX.boom(0.6); G.shake = 0.6; bigText('💥 WRECKED!'); toast('Your ride got towed to the garage. Repair was free this time 🔧', true, 3200); setTimeout(() => { c.dmg = 0; c.wrecked = false; const g = PLACES.filter((p) => p.kind === 'garage').sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0]; const [x, z, yaw] = ST.spotFor(c.type, g.door.x + g.fx * 8, g.door.z + g.fz * 8); c.place(x, z, yaw); ST.snapCam(); }, 1500); }
export function horn() {
  const c = ST.car; if (ST.mode !== 'drive') { SFX.click(); return; } const d = c.def;
  if (d.horn === 'bell') { [0, 0.15].forEach((t) => setTimeout(() => SFX.coin(), t * 1000)); } else if (c.type === 'icecream') { SFX.win(); callCustomers(); } else if (c.type === 'police' || c.type === 'fire') SFX.siren(); else SFX.pad();
  if (c.V.siren) { c.sirenT = 6; }
}
/* ---------------- context actions outside ---------------- */
function actsOutside(x, z, mode) {
  if (ST.inside) return null; const out = []; const c = ST.car;
  if (mode === 'drive') {
    for (const g of GAS) for (const pp of g.pumps) { const d = Math.hypot(pp[0] - x, pp[1] - z); if (d < 4.5 && Math.abs(c.speed) < 2 && c.fuel < 0.99 && !c.isAirK()) { const cost = Math.max(1, Math.round((1 - c.fuel) * 40)); out.push({ label: '⛽ Fill up · ' + fmt(cost), d, pri: 3, fn: () => { if (S.d.money < cost) { toast('Not enough cash!', true); return; } S.d.money -= cost; c.fuel = 1; save(); SFX.cash(); toast('⛽ Tank full! (' + fmt(cost) + ')'); } }); } }
    if (c.isAirK() && c.ground) { for (const s of SPOTS) if (s.kind === 'helipad' && Math.hypot(s.x - x, s.z - z) < 10 && c.fuel < 0.99) out.push({ label: '⛽ Refuel aircraft · $30', d: 1, pri: 3, fn: () => { if (S.d.money < 30) return toast('Not enough cash!', true); S.d.money -= 30; c.fuel = 1; save(); SFX.cash(); } }); }
    if (c.fuel <= 0.001) out.push({ label: '⛽ Call a gas can · $30', d: 5, pri: 1, fn: () => { if (S.d.money < 30) return toast('Not enough cash!', true); S.d.money -= 30; c.fuel = 0.35; save(); SFX.cash(); toast('🚚 A gas can was delivered!'); } });
    if (c.type === 'icecream' && customers.length && Math.abs(c.speed) < 2) { const cu = customers.find((k) => !k.served && Math.hypot(k.x - x, k.z - z) < 7); if (cu) out.push({ label: '🍦 Serve: ' + cu.want.e + ' ' + cu.want.n, d: 1, pri: 4, fn: () => serve(cu) }); }
    if (c.type === 'tow' && ST.job && ST.job.kind === 'tow' && ST.job.stage === 0 && towed && !towed.hooked && Math.hypot(towed.x - x, towed.z - z) < 9 && Math.abs(c.speed) < 3) out.push({ label: '🪝 Hook it up', d: 1, pri: 4, fn: hookTow });
    if (c.type === 'fire') for (const f of fires) { const d = Math.hypot(f.x - x, f.z - z); if (d < 26) out.push({ label: f.spray ? '💦 Spraying… (' + Math.round(f.hp * 100) + '%)' : '💦 Spray water', d, pri: 4, fn: () => { f.spray = !f.spray; } }); }
  } else {
    for (const p of PLACES) if (p.mailbox && S.d.homes[p.id]) { const d = Math.hypot(p.mailbox.x - x, p.mailbox.z - z); if (d < 2.5) out.push({ label: '📬 Check the mailbox', d, pri: 3, fn: () => mailbox(p) }); }
    if (torty) { const d = Math.hypot(torty.spot.x - x, torty.spot.z - z); if (d < 4) out.push({ label: "🐢 Torty's Pier Snacks", d, pri: 3, fn: () => SHOP.food({ name: "Torty's Pier Snacks", place: { menu: ['coconut', 'taco', 'soda', 'cookie'] } }) }); }
  }
  return out;
}
function mailbox(p) { const day = new Date().toDateString(); if (S.d.mailDay === day) { toast('📭 No new mail today. Check back tomorrow!'); return; } S.d.mailDay = day; const msg = MAIL[(Math.random() * MAIL.length) | 0]; const gift = 100 + Math.round(Math.random() * 4) * 75; const fk = Object.keys(FURN), f = Math.random() < 0.35 ? fk[(Math.random() * fk.length) | 0] : null; S.d.furn = S.d.furn || {}; if (f) S.d.furn[f] = (S.d.furn[f] || 0) + 1; S.d.money += gift; save(); SFX.cash();
  const c = panel(`<h2>📬 Mail for ${S.d.name || 'you'}!</h2><div class="item"><div class="grow"><b>${msg}</b></div></div><div class="item"><div class="ic">🎁</div><div class="grow"><b>Gift: ${fmt(gift)}${f ? ' + ' + FURN[f].icon + ' ' + FURN[f].name : ''}</b><small>${f ? 'Place it with Decorate inside your home!' : ''}</small></div></div><div class="btnrow"><button class="btn green" data-a="x">YAY!</button></div>`); wire(c, { x: closePanel }); }
/* ---------------- ice cream ---------------- */
function callCustomers() {
  const c = ST.car; if (Math.abs(c.speed) > 2) { toast('🍦 Stop the truck first, then play the chime!'); return; } if (customers.length) return;
  const reg = W.regionAt(c.x, c.z); if (reg !== 'city' && reg !== 'town' && reg !== 'beach' && reg !== 'lake') { toast('🍦 Nobody around here… try a town, the beach or the park!'); return; }
  const n = 2 + ((Math.random() * 3) | 0), [fx, fz] = c.fwd;
  for (let i = 0; i < n; i++) { const P = makeWalker(((Math.random() * 1e6) | 0)); P.root.scale.setScalar(0.62 + Math.random() * 0.15); const a = Math.random() * 6.28, x = c.x + Math.cos(a) * 22, z = c.z + Math.sin(a) * 22; G.scene.add(P.root); const side = (i % 2 ? 1 : -1); customers.push({ P, x, z, t: 0, tx: c.x + fz * (c.wid / 2 + 1.4) * 1 + fx * (i - n / 2) * 1.1, tz: c.z - fx * (c.wid / 2 + 1.4) + fz * (i - n / 2) * 1.1, want: ICE[(Math.random() * ICE.length) | 0], served: false, side }); }
  toast('🍦 Kids are running over! Serve the flavor they ask for.');
}
function serve(cu) {
  const c = panel(`<h2>🍦 What flavor?</h2><div class="sub">They want: <b>${cu.want.e} ${cu.want.n}</b></div><div class="btnrow">${ICE.map((f) => `<button class="btn gray" data-a="f" data-v="${f.k}">${f.e} ${f.n}</button>`).join('')}</div>`);
  wire(c, { f: (k) => { closePanel(); cu.served = true; if (k === cu.want.k) { SHOP.earn(18 + ((Math.random() * 8) | 0), 'yum, perfect scoop!'); S.d.stats.cones++; } else { SHOP.earn(5, 'oops, wrong flavor 😅'); } save(); setTimeout(() => { G.scene.remove(cu.P.root); customers.splice(customers.indexOf(cu), 1); }, 600); } });
}
function clearCustomers() { for (const c of customers) G.scene.remove(c.P.root); customers.length = 0; }
/* ---------------- fires ---------------- */
const flameG = new THREE.ConeGeometry(1, 2.6, 16, 1), flameM = [M(0xff7a1a, { e: 0xff5a00, ei: 2.2, r: 0.4 }), M(0xffd23f, { e: 0xffb300, ei: 2.4, r: 0.4 })], smokeM = M(0x6b7280, { r: 1, op: 0.55 });
function startFire(b) {
  const g = new THREE.Group(); const y = b.y + Math.min(b.roofY, 12); g.position.set(b.x, b.y, b.z); const fl = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(flameG, flameM[i % 2]); const fx = (Math.random() - 0.5) * (b.x1 - b.x0) * 0.8, fz = (Math.random() - 0.5) * (b.z1 - b.z0) * 0.8; m.position.set(fx, Math.min(b.roofY, 12) + 1, fz); m.base = m.position.y; m.s = 1.2 + Math.random(); m.ph = Math.random() * 6; g.add(m); fl.push(m); }
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(GEO.sphere(1.8, 14, 10), smokeM); m.position.set((Math.random() - 0.5) * 6, Math.min(b.roofY, 12) + 4 + i * 2.5, (Math.random() - 0.5) * 6); m.ph = i; g.add(m); fl.push(m); m.smoke = 1; }
  G.scene.add(g); const f = { b, g, fl, hp: 1, x: b.x, z: b.z, y, spray: false }; fires.push(f); return f;
}
function updateFires(dt) {
  for (const f of fires.slice()) {
    const d = Math.hypot(f.x - G.camera.position.x, f.z - G.camera.position.z); if (d < 400) for (const m of f.fl) { if (m.smoke) { m.position.y += dt * 1.5; m.scale.setScalar(0.6 + ((m.position.y % 12) / 12) * 1.2); if (m.position.y > 30) m.position.y = Math.min(f.b.roofY, 12) + 3; m.visible = f.hp > 0.05; } else { const s = m.s * (0.85 + Math.sin(ST.t * 9 + m.ph) * 0.15) * Math.max(0.15, f.hp); m.scale.set(s, s * (1 + Math.sin(ST.t * 7 + m.ph) * 0.2), s); } }
    const c = ST.car; let spraying = false;
    if (f.spray && ST.mode === 'drive' && c.type === 'fire') { const dd = Math.hypot(f.x - c.x, f.z - c.z); if (dd < 28) { spraying = true; f.hp -= dt * 0.16; drawWater(c, f); } else f.spray = false; }
    if (!spraying && water.visible && !fires.some((q) => q.spray)) water.visible = false;
    if (f.hp <= 0) { G.scene.remove(f.g); fires.splice(fires.indexOf(f), 1); water.visible = false; SFX.win(); bigText('🚒 FIRE OUT!'); S.d.stats.fires++; if (ST.job && ST.job.kind === 'fire' && ST.job.fire === f) finishJob(); else SHOP.earn(150, 'hero bonus!'); }
  }
  fireSpawnT -= dt; if (fireSpawnT < 0) { fireSpawnT = 150 + Math.random() * 120; if (ST.car && ST.car.type === 'fire' && !fires.length && !ST.job) { const p = pos(); const list = BLD.filter((b) => !b.home && Math.hypot(b.x - p.x, b.z - p.z) < 500 && Math.hypot(b.x - p.x, b.z - p.z) > 120); if (list.length) { const f = startFire(list[(Math.random() * list.length) | 0]); toast('🔥 Fire alarm! A building is on fire nearby. Check your map!'); SFX.siren(); void f; } } }
}
function drawWater(c, f) {
  const [fx, fz] = c.fwd; const ax = c.x - fx * c.len * 0.2, az = c.z - fz * c.len * 0.2, ay = c.y + 3.2, bx = f.x, bz = f.z, by = f.y + 1; const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * 6, az + (bz - az) * t)); }
  if (!water.lastT || ST.t - water.lastT > 0.08) { water.lastT = ST.t; water.geometry.dispose(); water.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.22 + Math.sin(ST.t * 20) * 0.03, 8, false); }
  water.visible = true;
}
/* ---------------- tow ---------------- */
function hookTow() { towed.hooked = true; SFX.click(); toast('🪝 Hooked! Haul it to the Hook & Haul Tow Yard.'); const yard = PLACES.find((p) => p.id === 'towyard'); ST.job.stage = 1; ST.job.target = [yard.door.x + yard.fx * 10, yard.door.z + yard.fz * 10]; ST.setGps(...ST.job.target); }
function updateTowed(dt) {
  if (!towed || !towed.hooked) return; const c = ST.car, [fx, fz] = c.fwd; const hx = c.x - fx * (c.len / 2 + 0.6), hz = c.z - fz * (c.len / 2 + 0.6);
  const dx = hx - towed.x, dz = hz - towed.z, L = Math.hypot(dx, dz) || 1, want = towed.len / 2 + 0.2; // trailer follow: front of towed car pinned to the hook
  towed.x = hx - dx / L * want; towed.z = hz - dz / L * want; towed.yaw = Math.atan2(dx, dz); towed.y = W.heightAt(towed.x, towed.z);
  towed.V.root.position.set(towed.x, towed.y + 0.25, towed.z); towed.V.root.rotation.set(-0.12, towed.yaw, 0, 'YXZ');
}
/* ---------------- jobs ---------------- */
const JOBS = {
  delivery: { name: 'Package Delivery', icon: '📦', need: null, desc: 'Grab a package and race it across town before the timer runs out.' },
  pizza: { name: 'Pizza Delivery', icon: '🍕', need: null, desc: 'Hot pizza from Pine Hollow Pizza to a hungry house. Bikes and mopeds welcome!' },
  taxi: { name: 'Taxi Fares', icon: '🚕', need: 'car', desc: 'Pick up passengers and drop them off. The Grok Cab pays +50%!' },
  cargo: { name: 'Cargo Haul', icon: '🚛', need: ['pickup', 'bigrig'], desc: 'Big crates from the Desert Cargo Depot. Big money.' },
  bus: { name: 'Bus Route', icon: '🚌', need: ['bus'], desc: 'Drive the City Bus to 5 stops and stop at each one.' },
  fire: { name: 'Fire Alarm', icon: '🚒', need: ['fire'], lend: 'fire', desc: 'Drive Fire Engine 7 to the fire and spray it out!' },
  tow: { name: 'Tow Job', icon: '🪝', need: ['tow'], lend: 'tow', desc: 'A car broke down. Hook it and haul it to the tow yard.' },
  cop: { name: 'Police Patrol', icon: '🚓', need: ['police'], lend: 'police', desc: 'A robber is getting away! Catch them in the Cruiser.' },
  tour: { name: 'Sky Tour', icon: '🎈', need: ['heli', 'plane', 'seaplane', 'balloon'], desc: 'Fly tourists through 5 sky rings over the best sights.' },
  icecream: { name: 'Ice Cream Rounds', icon: '🍦', need: ['icecream'], lend: 'icecream', desc: 'Stop anywhere in town, play the chime and serve the right flavors.' }
};
export function jobBoard(filter) {
  const rows = Object.entries(JOBS).filter(([k]) => !filter || k === filter || filter === 'delivery').map(([k, j]) => { const ok = canDo(k); return `<div class="item ${ok ? '' : ''}"><div class="ic">${j.icon}</div><div class="grow"><b>${j.name}</b><small>${j.desc}</small><small>${ok ? '✅ Ready' : j.lend ? '🔑 We\'ll lend you one' : '🔒 Needs: ' + j.need.map((t) => VEH[t].name).join(' or ')}</small></div><button class="btn ${ok || j.lend ? 'green' : 'gray'} small" data-a="go" data-v="${k}" ${ok || j.lend ? '' : 'disabled'}>GO</button></div>`; }).join('');
  const c = panel('<h2>💼 Jobs</h2><div class="sub">Jobs done: ' + S.d.stats.jobs + (ST.job ? ' · <b>current: ' + JOBS[ST.job.kind].name + '</b>' : '') + '</div>' + (ST.job ? '<div class="btnrow"><button class="btn red small" data-a="quit">QUIT CURRENT JOB</button></div>' : '') + rows + '<div class="btnrow"><button class="btn purple small" data-a="races">🏁 Street races</button><button class="btn gray" data-a="close">CLOSE</button></div>');
  wire(c, { close: closePanel, go: (k) => startJob(k), quit: () => { endJob(); closePanel(); toast('Job cancelled.'); }, races: raceBoard });
}
function canDo(k) { const j = JOBS[k], t = ST.car && ST.car.type; if (!j.need) return true; if (j.need === 'car') return t && VEH[t].kind === 'car'; return j.need.includes(t) || j.need.some((n) => S.d.owned[n]); }
const randPlace = (fromX, fromZ, min, max, f) => { const l = PLACES.concat(BLD.filter((b) => b.kind === 'house' || b.kind === 'apartment')).filter((p) => p.door && (!f || f(p))); const ok = l.filter((p) => { const d = Math.hypot(p.door.x - fromX, p.door.z - fromZ); return d > min && d < max; }); const a = ok.length ? ok : l; return a[(Math.random() * a.length) | 0]; };
const doorSpot = (p, k = 5) => [p.door.x + p.fx * k, p.door.z + p.fz * k];
export function startJob(k) {
  closePanel(); if (ST.race) { toast('Finish your race first!', true); return; } if (ST.job) endJob();
  const j = JOBS[k];
  const begin = () => {
    const p = pos(), job = ST.job = { kind: k, stage: 0, t: 0, timer: 0, pay: 0, n: 0 };
    if (k === 'delivery' || k === 'pizza') { const from = PLACES.find((q) => q.id === (k === 'pizza' ? 'pizza' : 'dispatch')); const start = Math.hypot(from.door.x - p.x, from.door.z - p.z) < 60 ? null : from; job.pickup = start ? doorSpot(start) : null; const dest = randPlace(from.x, from.z, 250, 900, (q) => k === 'pizza' ? (q.kind === 'house' || q.kind === 'home' || W.regionAt(q.x, q.z) === 'town') : true); job.dest = dest; job.target = job.pickup || doorSpot(dest); job.stage = job.pickup ? 0 : 1; if (!job.pickup) setTimer(job); toast(j.icon + (job.pickup ? ' Head to ' + from.name + ' to pick it up!' : ' Deliver to ' + (dest.name || 'the house') + '!')); }
    else if (k === 'cargo') { const from = PLACES.find((q) => q.id === 'cargo'); job.pickup = doorSpot(from, 8); job.dest = randPlace(from.x, from.z, 600, 2200, (q) => W.regionAt(q.x, q.z) === 'city' || W.regionAt(q.x, q.z) === 'beach'); job.target = job.pickup; toast('🚛 Pick up the cargo at the Desert Cargo Depot!'); }
    else if (k === 'taxi') { nextFare(job); }
    else if (k === 'bus') { const st = STOPS.slice().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); job.stops = [st[1] || st[0]]; for (let i = 0; i < 4; i++) { const last = job.stops[job.stops.length - 1]; const nx = st.filter((s) => !job.stops.includes(s)).sort((a, b) => Math.abs(Math.hypot(a.x - last.x, a.z - last.z) - 160) - Math.abs(Math.hypot(b.x - last.x, b.z - last.z) - 160))[0]; if (nx) job.stops.push(nx); } job.i = 0; job.target = [job.stops[0].x, job.stops[0].z]; job.hold = 0; toast('🚌 Drive to each bus stop and stop there to let people on!'); }
    else if (k === 'fire') { const list = BLD.filter((b) => !b.home && Math.hypot(b.x - p.x, b.z - p.z) < 700 && Math.hypot(b.x - p.x, b.z - p.z) > 150); const f = startFire(list[(Math.random() * list.length) | 0]); job.fire = f; job.target = [f.x, f.z]; toast('🚒 Fire! Drive there, stop close and tap 💦 SPRAY.'); SFX.siren(); }
    else if (k === 'tow') { const r = W.nearestRoad(p.x + (Math.random() - 0.5) * 900, p.z + (Math.random() - 0.5) * 900, 400); const q = W.edgePoint(r.e, r.s, r.e.w / 2 - 1.2); const V = makeVehicle(['compact', 'sports', 'pickup', 'muscle', 'taxi'][(Math.random() * 5) | 0], { lite: true, color: [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15][(Math.random() * 4) | 0], rider: false }); G.scene.add(V.root); V.root.position.set(q.x, W.heightAt(q.x, q.z), q.z); V.root.rotation.y = Math.atan2(q.dx, q.dz); towed = { V, x: q.x, z: q.z, y: 0, yaw: V.root.rotation.y, len: V.dims.L, hooked: false }; job.target = [q.x, q.z]; toast('🪝 A car broke down! Find it (hazard lights blinking) and back up close.'); }
    else if (k === 'cop') { const r = W.nearestRoad(p.x + 120, p.z + 80, 300); const q = W.edgePoint(r.e, r.s, 0); robber = new Car('muscle', { color: 0x111827, lite: true, rider: false }); G.scene.add(robber.V.root); robber.place(q.x, q.z, Math.atan2(q.dx, q.dz)); robber.vmax *= 0.8; robber.goal = null; job.catchT = 0; job.timer = 120; job.target = [q.x, q.z]; toast('🚓 Catch the black getaway car! Stay close to it.'); SFX.siren(); }
    else if (k === 'tour') { job.rings = []; const land = [[620, -120, 90], [-50, 120, 40], [-820, -820, 210], [1140, 1140, 30], [100, 1035, 45], [600, -1150, 50], [1240, 600, 35], [-500, 500, 40]]; const st = land.slice().sort(() => Math.random() - 0.5).slice(0, 5); st.sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.z) - Math.hypot(b[0] - p.x, b[1] - p.z)); job.rings = st.map(([x, z, h]) => [x, z, Math.max(W.heightAt(x, z), 0) + h]); job.i = 0; job.target = job.rings[0]; toast('🎈 Fly through the 5 glowing sky rings!'); }
    else if (k === 'icecream') { job.goal = 6; job.base = S.d.stats.cones; toast('🍦 Park in a town, tap 📣 for the chime, and serve 6 happy customers!'); }
    if (job.target) ST.setGps(job.target[0], job.target[1]);
    showJobBox();
  };
  // need a special vehicle? lend one if they don't own it
  if (j.need && j.need !== 'car' && !j.need.includes(ST.car && ST.car.type)) { const own = j.need.find((t) => S.d.owned[t]); const t = own || j.lend; if (!t) { toast('You need: ' + j.need.map((x) => VEH[x].name).join(' or '), true); return; } SHOP.takeOut(t, null); if (!own) toast('🔑 Here, borrow our ' + VEH[t].name + '!'); setTimeout(begin, 50); return; }
  if (j.need === 'car' && !(ST.car && VEH[ST.car.type].kind === 'car')) { toast('You need a car for taxi fares!', true); return; }
  if (IN.inRoom()) { IN.leave(true); ST.getIn(); }
  begin();
}
function setTimer(job) { const p = pos(), [tx, tz] = job.target; job.timer = Math.round(Math.hypot(tx - p.x, tz - p.z) / 11 + 35); job.pay = Math.round(60 + Math.hypot(tx - p.x, tz - p.z) * 0.28); }
function nextFare(job) { const p = pos(); const a = randPlace(p.x, p.z, 60, 300), b = randPlace(a.x, a.z, 250, 800); job.pick = a; job.dest = b; job.stage = 0; job.target = doorSpot(a, 6); ST.setGps(...job.target); toast('🚕 Pick up the passenger at ' + (a.name || 'the curb') + '!'); job.rider = null; }
function showJobBox() { const j = ST.job, box = $('jobBox'); if (!j) { box.classList.add('hidden'); return; } box.classList.remove('hidden'); const J = JOBS[j.kind]; let s = `<b>${J.icon} ${J.name}</b>`; if (j.timer > 0) s += ` · ⏱️ ${Math.ceil(j.timer)}s`; if (j.kind === 'bus') s += ` · stop ${j.i + 1}/${j.stops.length}`; if (j.kind === 'tour') s += ` · ring ${j.i + 1}/5`; if (j.kind === 'icecream') s += ` · ${S.d.stats.cones - j.base}/${j.goal} served`; if (j.kind === 'fire' && j.fire) s += ` · 🔥 ${Math.round(j.fire.hp * 100)}%`; if (j.kind === 'taxi') s += ` · fares ${j.n}`; box.innerHTML = s; }
function updateJob(dt) {
  const j = ST.job; if (!j) { MK.a.visible = false; return; } j.t += dt; const p = pos(); if (!p) return;
  if (j.timer > 0 && j.kind !== 'cop') { j.timer -= dt; if (j.timer <= 0) { toast('⏱️ Out of time! The job was cancelled.', true); SFX.hurt(); endJob(); return; } }
  updateTowed(dt);
  const air = j.kind === 'tour'; if (j.target) showMarker(MK.a, j.target[0], j.target[1], air ? j.target[2] : null, air); else MK.a.visible = false;
  const at = (r = 7) => j.target && Math.hypot(j.target[0] - p.x, j.target[1] - p.z) < r && (!air || Math.abs(j.target[2] - p.y) < 9) && !ST.inside;
  const slow = ST.mode !== 'drive' || Math.abs(ST.car.speed) < 3 || ST.car.kind === 'bike';
  if ((j.kind === 'delivery' || j.kind === 'pizza' || j.kind === 'cargo') && at(j.kind === 'cargo' ? 9 : 7) && slow) {
    if (j.stage === 0) { j.stage = 1; j.target = doorSpot(j.dest); setTimer(j); if (j.kind === 'cargo') { j.pay *= 2.2; j.timer *= 1.3; } SFX.coin(); toast((j.kind === 'pizza' ? '🍕' : '📦') + ' Got it! Now to ' + (j.dest.name || 'the address') + '!'); ST.setGps(...j.target); }
    else { finishJob(); return; }
  }
  if (j.kind === 'taxi' && at(7) && slow && ST.mode === 'drive') { if (j.stage === 0) { j.stage = 1; j.target = doorSpot(j.dest, 6); setTimer(j); SFX.coin(); toast('🚕 Hop in! Take me to ' + (j.dest.name || 'my house') + ', please.'); ST.setGps(...j.target); } else { j.n++; const pay = Math.round(j.pay * (ST.car.type === 'taxi' ? 1.5 : 1)); SHOP.earn(pay, 'fare ' + j.n); S.d.stats.jobs++; save(); if (j.n >= 4) { finishJob(150); return; } nextFare(j); j.timer = 0; } }
  if (j.kind === 'bus' && at(9) && ST.mode === 'drive' && ST.car.type === 'bus') { if (Math.abs(ST.car.speed) < 1.2) { j.hold += dt; if (j.hold > 1.8) { j.hold = 0; SHOP.earn(40, 'stop ' + (j.i + 1)); j.i++; if (j.i >= j.stops.length) { finishJob(100); return; } j.target = [j.stops[j.i].x, j.stops[j.i].z]; ST.setGps(...j.target); } } else j.hold = 0; }
  if (j.kind === 'fire') { if (!fires.includes(j.fire)) { endJob(); return; } }
  if (j.kind === 'tow' && j.stage === 1 && at(14) && slow) { G.scene.remove(towed.V.root); towed = null; S.d.stats.tows++; finishJob(Math.round(120 + j.t * 0.5)); return; }
  if (j.kind === 'tow' && towed && !towed.hooked) { const on = (ST.t * 3 | 0) % 2; towed.V.root.visible = true; towed.V.tails.forEach((m) => { m.visible = !!on; }); }
  if (j.kind === 'cop' && robber) { if (!robber.goal || Math.hypot(robber.goal[0] - robber.x, robber.goal[1] - robber.z) < 25) { const r = W.nearestRoad(robber.x + (Math.random() - 0.5) * 500, robber.z + (Math.random() - 0.5) * 500, 300); const route = r && W.route(robber.x, robber.z, r.x, r.z); robber.path = route || [[r.x, r.z]]; robber.pi = 0; robber.goal = [r.x, r.z]; }
    const pp = robber.path; while (robber.pi < pp.length - 1 && Math.hypot(pp[robber.pi][0] - robber.x, pp[robber.pi][1] - robber.z) < 12) robber.pi++; const wp = pp[robber.pi] || robber.goal; const dd = Math.hypot(robber.x - p.x, robber.z - p.z); robber.vmax = ST.car.vmax * (dd < 30 ? 0.88 : 0.7); aiDrive(robber, wp[0], wp[1], dt);
    j.target = [robber.x, robber.z]; j.timer -= dt; if (dd < 9) { j.catchT += dt; if (j.catchT > 2.5) { bigText('🚓 GOTCHA!'); G.scene.remove(robber.V.root); robber = null; finishJob(350); return; } } else j.catchT = Math.max(0, j.catchT - dt * 0.5); if (j.timer <= 0) { toast('The robber got away this time!', true); endJob(); return; } }
  if (j.kind === 'tour' && at(8)) { SFX.coin(); j.i++; if (j.i >= j.rings.length) { finishJob(300); return; } j.target = j.rings[j.i]; ST.setGps(j.target[0], j.target[1]); }
  if (j.kind === 'icecream' && S.d.stats.cones - j.base >= j.goal) { finishJob(80); return; }
  if ((j.t * 4 | 0) !== (j.lt || 0)) { j.lt = j.t * 4 | 0; showJobBox(); }
}
function finishJob(bonus) { const j = ST.job; const pay = (j.pay || 0) + (bonus || 0); S.d.stats.jobs++; save(); SFX.win(); bigText('✅ JOB DONE!'); if (pay) SHOP.earn(pay, JOBS[j.kind].name); endJob(); }
export function endJob() { const j = ST.job; if (!j) return; if (towed) { G.scene.remove(towed.V.root); towed = null; } if (robber) { G.scene.remove(robber.V.root); robber = null; } if (j.kind === 'fire' && j.fire && fires.includes(j.fire)) { G.scene.remove(j.fire.g); fires.splice(fires.indexOf(j.fire), 1); water.visible = false; } ST.job = null; MK.a.visible = false; ST.setGps(null); showJobBox(); }
/* ---------------- street races ---------------- */
const RACES = [
  { id: 'city', name: 'Grok City Sprint', icon: '🏙️', pts: [[480, -180], [760, -180], [760, 100], [480, 100], [480, -320]], laps: 1, prize: 400, opp: ['sports', 'muscle', 'compact'] },
  { id: 'town', name: 'Pine Hollow Dash', icon: '🌲', pts: [[-700, 280], [-300, 280], [-300, 680], [-700, 680]], laps: 1, prize: 350, opp: ['compact', 'pickup', 'taxi'] },
  { id: 'shore', name: 'Shoreline Run', icon: '🏖️', pts: [[760, 100], [790, 420], [765, 650], [800, 860], [1060, 1100]], laps: 1, prize: 500, opp: ['sports', 'buggy', 'muscle'] },
  { id: 'pass', name: 'Grokmore Pass Climb', icon: '🏔️', mtn: true, laps: 1, prize: 900, opp: ['sports', 'muscle', 'super'] },
  { id: 'desert', name: 'Sizzle Desert Dash', icon: '🌵', pts: [[-300, 1050], [100, 1080], [450, 1060]], laps: 1, prize: 600, opp: ['buggy', 'pickup', 'muscle'] }
];
function racePath(R) {
  if (R.mtn) { const e = W.EDGES.find((x) => x.kind === 'mtn'); const out = []; for (let s = 10; s < e.len - 5; s += 14) { const q = W.edgePoint(e, s, 0); out.push([q.x, q.z]); } return out; }
  let path = []; for (let i = 0; i < R.pts.length - 1; i++) { const seg = W.route(R.pts[i][0], R.pts[i][1], R.pts[i + 1][0], R.pts[i + 1][1]) || [R.pts[i], R.pts[i + 1]]; path = path.concat(i ? seg.slice(1) : seg); }
  const out = [path[0]]; for (const q of path) { const l = out[out.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 14) out.push(q); } return out;
}
export function raceBoard() {
  const rows = RACES.map((R) => { const best = S.d.raceBest[R.id]; return `<div class="item"><div class="ic">${R.icon}</div><div class="grow"><b>${R.name}</b><small>1st: ${fmt(R.prize)} · 2nd: ${fmt(R.prize / 2)} · 3rd: ${fmt(R.prize / 4)}</small><small>${best ? '🏅 Best: ' + best.toFixed(1) + 's' : 'Not raced yet'}</small></div><button class="btn green small" data-a="go" data-v="${R.id}">RACE</button></div>`; }).join('');
  const c = panel('<h2>🏁 Street Races</h2><div class="sub">Race 3 rivals through the checkpoints. Any car, bike or kart!</div>' + rows + '<div class="btnrow"><button class="btn gray" data-a="close">CLOSE</button></div>'); wire(c, { close: closePanel, go: (id) => startRace(id) });
}
export function startRace(id) {
  closePanel(); if (ST.job) endJob(); const R = RACES.find((r) => r.id === id); if (IN.inRoom()) IN.leave(true);
  if (!ST.car || ST.car.isAirK() || ST.car.kind === 'boat') { toast('Races need a land vehicle!', true); return; }
  const path = racePath(R); const [sx, sz] = path[0], [nx, nz] = path[Math.min(2, path.length - 1)], yaw = Math.atan2(nx - sx, nz - sz), fx = Math.sin(yaw), fz = Math.cos(yaw);
  const c = ST.car; c.place(sx - fx * 6 + fz * 2.5, sz - fz * 6 - fx * 2.5, yaw); c.dmg = 0; c.fuel = Math.max(c.fuel, 0.6); ST.me.x = c.x; ST.me.z = c.z; ST.getIn();
  racers = R.opp.map((t, i) => { const k = new Car(t, { lite: true, rider: false, color: [0xef4444, 0x22c55e, 0xfacc15][i] }); G.scene.add(k.V.root); const row = i + 1, side = row % 2 ? -1 : 1; k.place(sx - fx * (6 + row * 7) + fz * 2.5 * side, sz - fz * (6 + row * 7) - fx * 2.5 * side, yaw); k.vmax *= 0.82 + i * 0.04; k.pi = 0; k.lap = 0; k.done = 0; return k; });
  ST.race = { R, path, i: 1, t: -3.5, go: false, done: false, cp: 0 }; bigText('3', 900); SFX.click(); ST.setGps(null);
  // checkpoints every few path points
  ST.race.cps = []; for (let i = 3; i < path.length; i += 4) ST.race.cps.push(i); if (ST.race.cps[ST.race.cps.length - 1] !== path.length - 1) ST.race.cps.push(path.length - 1);
}
function updateRace(dt) {
  const r = ST.race; if (!r) { MK.b.visible = false; return; } const c = ST.car, P = r.path;
  const prevT = r.t; r.t += dt; if (r.t < 0) { const n = Math.ceil(-r.t); if (Math.ceil(-prevT) !== n && n > 0 && n <= 3) { bigText(String(n), 800); SFX.click(); } c.vx = c.vz = 0; c.speed = 0; } else if (!r.go) { r.go = true; bigText('GO! 🏁', 900); SFX.win(); }
  const cpI = r.cps[r.cp], cp = P[cpI]; showMarker(MK.b, cp[0], cp[1]); MK.b.ring.rotation.set(0, Math.atan2(P[Math.min(cpI + 1, P.length - 1)][0] - P[Math.max(0, cpI - 1)][0], P[Math.min(cpI + 1, P.length - 1)][1] - P[Math.max(0, cpI - 1)][1]), 0); MK.b.ring.position.y = 3;
  if (Math.hypot(cp[0] - c.x, cp[1] - c.z) < 12 && r.go) { r.cp++; SFX.coin(); if (r.cp >= r.cps.length) { finishRace(); return; } }
  for (const k of racers) { if (!r.go) { k.update(dt, { thr: 0, steer: 0, active: true, hand: true }, { noFuel: true }); continue; } if (k.done) { k.update(dt, { thr: 0, steer: 0, active: true, hand: true }, { noFuel: true }); continue; }
    while (k.pi < P.length - 1 && Math.hypot(P[k.pi][0] - k.x, P[k.pi][1] - k.z) < 14) k.pi++; const la = P[Math.min(P.length - 1, k.pi + 1)];
    // rubber band: rivals keep it close but beatable
    const myProg = progress(c.x, c.z, r), theirs = k.pi; k.vmax = VEH[k.type].vmax * 0.55 * (theirs > myProg + 3 ? 0.78 : theirs < myProg - 4 ? 1.02 : 0.9);
    aiDrive(k, la[0], la[1], dt); if (k.pi >= P.length - 1 && Math.hypot(P[P.length - 1][0] - k.x, P[P.length - 1][1] - k.z) < 14) { k.done = r.t; }
    // a rival stuck out of sight hops back onto the course
    k.stk = Math.abs(k.speed) < 1 ? (k.stk || 0) + dt : 0; if (k.stk > 4 && Math.hypot(k.x - G.camera.position.x, k.z - G.camera.position.z) > 60) { const q = P[Math.max(0, k.pi - 1)], q2 = P[k.pi]; k.place(q[0], q[1], Math.atan2(q2[0] - q[0], q2[1] - q[1])); k.stk = 0; } }
  for (const k of racers) { const dx = c.x - k.x, dz = c.z - k.z, d = Math.hypot(dx, dz), R = c.r + k.r; if (d < R && d > 0.01) { c.x += dx / d * (R - d) * 0.5; c.z += dz / d * (R - d) * 0.5; k.x -= dx / d * (R - d) * 0.5; k.z -= dz / d * (R - d) * 0.5; } }
  const place = 1 + racers.filter((k) => k.done || k.pi > progress(c.x, c.z, r)).length; $('jobBox').classList.remove('hidden'); $('jobBox').innerHTML = `<b>🏁 ${r.R.name}</b> · ${r.t > 0 ? r.t.toFixed(1) : '0.0'}s · <b>${['1st', '2nd', '3rd', '4th'][place - 1]}</b> · CP ${r.cp}/${r.cps.length}`;
}
function progress(x, z, r) { let best = 0, bd = 1e9; const lo = Math.max(0, r.cps[Math.max(0, r.cp - 1)] - 6), hi = Math.min(r.path.length - 1, r.cps[r.cp] + 2); for (let i = lo; i <= hi; i++) { const d = Math.hypot(r.path[i][0] - x, r.path[i][1] - z); if (d < bd) { bd = d; best = i; } } return best; }
function finishRace() {
  const r = ST.race, place = 1 + racers.filter((k) => k.done).length; const prize = [r.R.prize, r.R.prize / 2, r.R.prize / 4, 25][place - 1];
  S.d.stats.races++; if (place === 1) S.d.stats.wins++; const best = S.d.raceBest[r.R.id]; if (!best || r.t < best) S.d.raceBest[r.R.id] = r.t; save(true);
  bigText(place === 1 ? '🏆 YOU WIN!' : ['', '', '🥈 2ND!', '🥉 3RD!', '4TH'][place] || '🏁', 2200); SFX.win(); SHOP.earn(prize, r.R.name + ' · ' + r.t.toFixed(1) + 's'); endRace();
}
export function endRace() { for (const k of racers) G.scene.remove(k.V.root); racers = []; ST.race = null; MK.b.visible = false; $('jobBox').classList.add('hidden'); }
/* ---------------- mini games & chats ---------------- */
export function miniGame() {
  let score = 0, left = 20; const c = panel('<h2>🕹️ Star Catch</h2><div class="sub">Tap the stars before they fall! <b id="mgS">0</b> pts · <b id="mgT">20</b>s</div><div id="mg" style="position:relative;height:340px;background:linear-gradient(#1e1b4b,#7c3aed);border-radius:16px;overflow:hidden;touch-action:none"></div>');
  const box = c.querySelector('#mg'); const iv = setInterval(() => { left -= 0.5; c.querySelector('#mgT').textContent = Math.ceil(left); if (left <= 0) { clearInterval(iv); clearInterval(sp); const pay = score * 4; closePanel(); if (pay) SHOP.earn(pay, 'Star Catch: ' + score + ' stars'); else toast('🕹️ Game over! Try again?'); return; } }, 500);
  const sp = setInterval(() => { const s = document.createElement('div'); s.textContent = Math.random() < 0.15 ? '🌟' : '⭐'; s.style.cssText = `position:absolute;left:${10 + Math.random() * 80}%;top:-30px;font-size:34px;transition:top 2.4s linear;cursor:pointer`; box.appendChild(s); requestAnimationFrame(() => requestAnimationFrame(() => s.style.top = '360px')); const hit = (e) => { e.preventDefault(); score += s.textContent === '🌟' ? 3 : 1; c.querySelector('#mgS').textContent = score; SFX.coin(); s.remove(); }; s.addEventListener('touchstart', hit, { passive: false }); s.addEventListener('mousedown', hit); setTimeout(() => s.remove(), 2500); }, 450);
  const old = closePanel; void old;
}
export function officeTask(b) { const day = new Date().toDateString(); S.d.office = S.d.office || {}; if (S.d.office[b.id] === day) { toast('📎 All sorted here today! Come back tomorrow.'); return; } let n = 0; const goal = 8; const c = panel(`<h2>📎 Sort the mail</h2><div class="sub">Tap each letter into the right tray! <b id="ot">0</b>/${goal}</div><div class="btnrow" id="ob"></div>`); const ob = c.querySelector('#ob'); const icons = ['📕', '📗', '📘']; let want = 0; const draw = () => { want = (Math.random() * 3) | 0; ob.innerHTML = `<div style="width:100%;text-align:center;font-size:50px">${icons[want]}</div>` + icons.map((ic, i) => `<button class="btn gray" data-i="${i}" style="font-size:28px">${ic} tray</button>`).join(''); ob.querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => { if (+bt.dataset.i === want) { n++; SFX.coin(); c.querySelector('#ot').textContent = n; if (n >= goal) { S.d.office[b.id] = day; closePanel(); SHOP.earn(60, 'office helper'); return; } } else SFX.hurt(); draw(); })); }; draw(); }
export function elevator(b) { const top = b.y + (b.roofY || 10); if (top - b.y < 9) { toast('🛗 Ding! Only one floor here. 😄'); return; } IN.leave(true); ST.me.x = b.x; ST.me.z = b.z; ST.me.y = top + 0.2; ST.me.vy = 0; ST.snapCam(); toast('🛗 Rooftop! What a view. (Stars sometimes hide up here ⭐)'); }
export function chat(b, kind) { const day = new Date().toDateString(); S.d.chats = S.d.chats || {}; const L = kind === 'house' ? ['Want a cookie? Fresh from the oven! 🍪', 'My kid wants a monster truck so badly!', 'Have you seen Torty at the pier? Such a sweetie 🐢'] : ['The view from the roof is amazing, take the elevator!', 'I love the sound of rain on the windows 🌧️', 'Sky Field has a hot air balloon for sale 🎈']; toast('💬 ' + L[(Math.random() * L.length) | 0], false, 3500); if (S.d.chats[b.id] !== day) { S.d.chats[b.id] = day; if (kind === 'house') { S.d.buffs.grip = Date.now() + 120000; toast('🍪 +8% grip snack!'); } else SHOP.earn(20, 'tip from a neighbor'); save(); } }
export function onHomeEnter(b) { void b; }
/* ---------------- map icons ---------------- */
export function mapIcons(out, big) {
  for (const s of STARS) if (!S.d.stars[s.id] && big) out.push({ x: s.x, z: s.z, e: '⭐' });
  for (const g of GAS) out.push({ x: g.x, z: g.z, e: '⛽' }); for (const w of WASH) out.push({ x: w.x, z: w.z, e: '🧽' });
  for (const f of fires) out.push({ x: f.x, z: f.z, e: '🔥', edge: true, big: true });
  if (torty && big) out.push({ x: torty.spot.x, z: torty.spot.z, e: '🐢' });
  if (ST.race) { const cp = ST.race.path[ST.race.cps[ST.race.cp]]; out.push({ x: cp[0], z: cp[1], e: '🏁', edge: true }); for (const k of racers) out.push({ x: k.x, z: k.z, dot: '#ef4444' }); }
  if (robber) out.push({ x: robber.x, z: robber.z, e: '🦹', edge: true });
}
export { addWanted, CARS, BUFFNAME, SNACKS };
