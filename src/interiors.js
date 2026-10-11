// real walk-in interiors: every building's door leads to a furnished room with people and things to do.
// Rooms are built on demand in an off-map "stage" (the outside world is hidden while you're in), then freed on exit.
import * as THREE from 'three';
import { G } from './gfx.js';
import { GEO, Batch, mesh } from './geo.js';
import { M, glow } from './mats.js';
import { BLD } from './layout.js';
import { makePerson, randLook, animPerson, makeTorty } from './people.js';
import { makeVehicle, disposeVehicle } from './vmodels.js';
import { textGeo } from './text3d.js';
import { VEH, DEALERS, FURN, WALLS, FLOORS } from './data.js';
import { ST, addActs } from './state.js';
import { S, save } from './save.js';
import { toast, fade, hex } from './ui.js';
import { SFX } from './audio.js';
import * as SHOP from './shops.js';
import * as ACT from './activities.js';
export const IX = 6000, IZ = 6000, IY = 0;
let room = null; const hidden = [];
const R = (c, o) => M(c, o || { r: 0.6 });
/* ---------- tiny prop kit (local room coords: x across, z toward the door, y up) ---------- */
class Kit {
  constructor(g) { this.g = g; this.B = new Batch(); this.Bs = new Batch(); this.solid = []; }
  rb(c, w, h, d, x, y, z, ry = 0, r = 0.06, shell) { (shell ? this.Bs : this.B).add(GEO.rbox(w, h, d, r, 2), typeof c === 'number' ? R(c) : c, mat(x, y, z, ry)); return this; }
  cy(c, rt, rb, h, x, y, z, s = 20) { this.B.add(GEO.cyl(rt, rb, h, s), typeof c === 'number' ? R(c) : c, mat(x, y, z, 0)); return this; }
  sp(c, r, x, y, z, sx = 1, sy = 1, sz = 1) { this.B.mesh(GEO.sphere(r, 18, 12), typeof c === 'number' ? R(c) : c, IX + x, IY + y, IZ + z, 0, 0, 0, sx, sy, sz); return this; }
  solidBox(x, z, w, d, h = 1.2, top) { this.solid.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, top }); return this; }
  text(str, size, color, x, y, z, ry = 0) { this.B.add(textGeo(str, size, size * 0.2), M(color, { r: 0.4, e: color, ei: 0.35 }), mat(x, y, z, ry)); return this; }
  build() { this.Bs.build(this.g, { cast: false }); this.B.build(this.g); }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function mat(x, y, z, ry) { return new THREE.Matrix4().compose(_v.set(IX + x, IY + y, IZ + z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1)); }
/* furniture pieces (also used by decorate mode) */
export const PIECE = {
  table: (k, x, z, c = 0xc08a5a) => { k.cy(c, 0.75, 0.75, 0.08, x, 0.76, z, 28).cy(0x475569, 0.06, 0.06, 0.74, x, 0.37, z, 10).cy(0x475569, 0.35, 0.4, 0.05, x, 0.03, z, 20).solidBox(x, z, 1.4, 1.4, 0.8, 0.8); },
  chair: (k, x, z, ry = 0, c = 0xef4444) => { k.rb(c, 0.5, 0.1, 0.5, x, 0.48, z, ry, 0.04).rb(c, 0.5, 0.55, 0.08, x - Math.sin(ry) * 0.23, 0.78, z - Math.cos(ry) * 0.23, ry, 0.04); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) k.cy(0x334155, 0.025, 0.025, 0.46, x + a, 0.23, z + b, 6); },
  counter: (k, x, z, w, c = 0xffffff, top = 0x334155) => { k.rb(c, w, 1.05, 0.9, x, 0.52, z, 0, 0.08).rb(top, w + 0.1, 0.08, 1.0, x, 1.08, z, 0, 0.03).solidBox(x, z, w, 0.9, 1.1, 1.12); },
  shelf: (k, x, z, w = 2.4, ry = 0, seed = 1) => { k.rb(0xe2e8f0, w, 2.0, 0.5, x, 1.0, z, ry, 0.04); const cols = [0xef4444, 0x22c55e, 0x3b82f6, 0xfacc15, 0xf97316, 0xa855f7, 0xec4899];
    for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor(w / 0.32); i++) { const lx = -w / 2 + 0.2 + i * 0.32, c = cols[(i * 3 + r * 5 + seed) % 7], ca = Math.cos(ry), sa = Math.sin(ry); const px = x + lx * ca + 0.12 * sa, pz = z - lx * sa + 0.12 * ca; if ((i + r + seed) % 3) k.rb(c, 0.22, 0.32, 0.2, px, 0.42 + r * 0.6, pz, ry, 0.04); else k.cy(c, 0.08, 0.09, 0.36, px, 0.44 + r * 0.6, pz, 12); }
    k.solidBox(x, z, Math.abs(Math.cos(ry)) > 0.5 ? w : 0.5, Math.abs(Math.cos(ry)) > 0.5 ? 0.5 : w, 2); },
  plant: (k, x, z) => { k.cy(0xb45309, 0.3, 0.22, 0.5, x, 0.25, z, 16); for (let i = 0; i < 5; i++) { const a = i * 1.3; k.sp(0x22c55e, 0.28, x + Math.cos(a) * 0.18, 0.75 + (i % 2) * 0.25, z + Math.sin(a) * 0.18, 1, 1.2, 1); } k.solidBox(x, z, 0.6, 0.6, 1); },
  lamp: (k, x, z) => { k.cy(0x334155, 0.2, 0.25, 0.05, x, 0.03, z, 16).cy(0x334155, 0.03, 0.03, 1.6, x, 0.8, z, 8).cy(M(0xfff7d6, { r: 0.4, e: 0xffe2a0, ei: 1.2 }), 0.22, 0.32, 0.4, x, 1.75, z, 20).solidBox(x, z, 0.5, 0.5, 1.9); },
  rug: (k, x, z, c = 0xa78bfa) => { k.cy(c, 1.3, 1.3, 0.03, x, 0.02, z, 40).cy(0xffffff, 0.9, 0.9, 0.035, x, 0.02, z, 40).cy(c, 0.5, 0.5, 0.04, x, 0.02, z, 30); },
  armchair: (k, x, z, ry = 0, c = 0x0ea5e9) => { k.rb(c, 1.1, 0.45, 1.0, x, 0.3, z, ry, 0.15).rb(c, 1.1, 0.8, 0.28, x - Math.sin(ry) * 0.4, 0.75, z - Math.cos(ry) * 0.4, ry, 0.12); for (const s of [-1, 1]) k.rb(c, 0.22, 0.6, 1.0, x + Math.cos(ry) * s * 0.5, 0.5, z - Math.sin(ry) * s * 0.5, ry, 0.1); k.solidBox(x, z, 1.1, 1.1, 0.8, 0.55); },
  sofa: (k, x, z, ry = 0, c = 0x6366f1) => { const ca = Math.cos(ry), sa = Math.sin(ry); k.rb(c, 2.4, 0.45, 1.0, x, 0.3, z, ry, 0.15).rb(c, 2.4, 0.8, 0.28, x - sa * 0.4, 0.75, z - ca * 0.4, ry, 0.12); for (const s of [-1, 1]) k.rb(c, 0.25, 0.65, 1.0, x + ca * s * 1.15, 0.5, z - sa * s * 1.15, ry, 0.1); for (const s of [-0.55, 0.55]) k.rb(0xffffff, 0.9, 0.18, 0.8, x + ca * s, 0.6, z - sa * s + 0.05 * ca, ry, 0.08); k.solidBox(x, z, Math.abs(ca) > 0.5 ? 2.5 : 1.1, Math.abs(ca) > 0.5 ? 1.1 : 2.5, 0.8, 0.6); },
  beanbag: (k, x, z) => { k.sp(0xf97316, 0.55, x, 0.35, z, 1, 0.65, 1).solidBox(x, z, 1, 1, 0.6, 0.6); },
  bookshelf: (k, x, z, ry = 0) => { PIECE.shelf(k, x, z, 1.6, ry, 4); },
  teddy: (k, x, z) => { const b = 0xa16207; k.sp(b, 0.42, x, 0.42, z).sp(b, 0.3, x, 1.0, z).sp(b, 0.12, x - 0.22, 1.25, z).sp(b, 0.12, x + 0.22, 1.25, z).sp(0xfde68a, 0.12, x, 0.95, z + 0.24, 1, 0.8, 0.6).sp(0x111111, 0.04, x - 0.1, 1.07, z + 0.26).sp(0x111111, 0.04, x + 0.1, 1.07, z + 0.26).sp(0xef4444, 0.1, x, 0.72, z + 0.3, 1.6, 0.6, 0.5).solidBox(x, z, 0.9, 0.9, 1.3); },
  aquarium: (k, x, z) => { k.rb(0x334155, 1.6, 0.7, 0.6, x, 0.35, z, 0, 0.05).rb(M(0x7dd3fc, { r: 0.05, op: 0.45, cc: 1 }), 1.5, 0.8, 0.5, x, 1.1, z, 0, 0.04); for (let i = 0; i < 4; i++) k.sp([0xf97316, 0xfacc15, 0xec4899, 0x22d3ee][i], 0.07, x - 0.5 + i * 0.32, 0.95 + (i % 2) * 0.25, z, 1.6, 1, 0.6); k.solidBox(x, z, 1.6, 0.6, 1.5); },
  trophy: (k, x, z) => { k.rb(0x1f2937, 0.8, 1.0, 0.8, x, 0.5, z, 0, 0.06).cy(M(0xfacc15, { r: 0.2, m: 1 }), 0.12, 0.2, 0.15, x, 1.08, z).cy(M(0xfacc15, { r: 0.2, m: 1 }), 0.28, 0.08, 0.45, x, 1.38, z).solidBox(x, z, 0.8, 0.8, 1.6); },
  arcade: (k, x, z, ry = 0, c = 0x7c3aed) => { k.rb(c, 0.9, 1.9, 0.8, x, 0.95, z, ry, 0.06).rb(M(0x22d3ee, { r: 0.2, e: 0x22d3ee, ei: 0.9 }), 0.7, 0.5, 0.05, x + Math.sin(ry) * 0.41, 1.4, z + Math.cos(ry) * 0.41, ry, 0.02).rb(0x111827, 0.8, 0.12, 0.35, x + Math.sin(ry) * 0.45, 1.0, z + Math.cos(ry) * 0.45, ry, 0.03).sp(0xef4444, 0.05, x + Math.sin(ry) * 0.5, 1.08, z + Math.cos(ry) * 0.5).solidBox(x, z, 0.95, 0.95, 2); },
  piano: (k, x, z) => { k.rb(0x111111, 1.6, 1.2, 0.6, x, 0.6, z, 0, 0.06).rb(0xffffff, 1.4, 0.06, 0.25, x, 0.85, z + 0.38, 0, 0.02).solidBox(x, z, 1.6, 0.9, 1.3); },
  tree: (k, x, z) => { k.cy(0x7c2d12, 0.1, 0.1, 0.4, x, 0.2, z, 10); for (let i = 0; i < 3; i++) k.B.add(GEO.cone(0.8 - i * 0.22, 0.8, 18), R(0x16a34a), mat(x, 0.7 + i * 0.5, z, 0)); k.sp(M(0xfacc15, { e: 0xfacc15, ei: 0.8 }), 0.12, x, 2.1, z); for (let i = 0; i < 6; i++) k.sp([0xef4444, 0x3b82f6, 0xfacc15][i % 3], 0.07, x + Math.cos(i) * 0.5, 0.9 + (i % 3) * 0.35, z + Math.sin(i) * 0.5); k.solidBox(x, z, 1.4, 1.4, 2.2); },
  carmodel: (k, x, z) => { k.rb(0x1f2937, 0.8, 0.9, 0.8, x, 0.45, z, 0, 0.05).rb(0xef4444, 0.5, 0.14, 0.24, x, 1.0, z, 0.6, 0.06).rb(M(0x7dd3fc, { op: 0.4, r: 0.05 }), 0.75, 0.6, 0.75, x, 1.22, z, 0, 0.04).solidBox(x, z, 0.8, 0.8, 1.5); },
  globe: (k, x, z) => { k.rb(0x92400e, 0.6, 0.8, 0.6, x, 0.4, z, 0, 0.05).sp(M(0xe0f2fe, { r: 0.05, op: 0.5, cc: 1 }), 0.3, x, 1.12, z).sp(0x16a34a, 0.12, x, 0.98, z).solidBox(x, z, 0.6, 0.6, 1.4); },
  torty: (k, x, z) => { k.sp(0x4d7c0f, 0.45, x, 0.3, z, 1, 0.7, 1.15).sp(0x9bd06a, 0.2, x, 0.35, z + 0.55).sp(0x111111, 0.035, x - 0.08, 0.42, z + 0.72).sp(0x111111, 0.035, x + 0.08, 0.42, z + 0.72).cy(0xfacc15, 0.15, 0.17, 0.03, x, 0.55, z + 0.55, 16).solidBox(x, z, 1, 1.3, 0.6); },
  bed: (k, x, z, c = 0x60a5fa) => { k.rb(0x92400e, 1.8, 0.45, 2.4, x, 0.25, z, 0, 0.08).rb(0xffffff, 1.7, 0.25, 2.3, x, 0.6, z, 0, 0.1).rb(c, 1.72, 0.12, 1.5, x, 0.76, z + 0.35, 0, 0.06).rb(0xffffff, 0.7, 0.18, 0.45, x - 0.42, 0.82, z - 0.8, 0, 0.09).rb(0xffffff, 0.7, 0.18, 0.45, x + 0.42, 0.82, z - 0.8, 0, 0.09).rb(0x92400e, 1.9, 1.2, 0.15, x, 0.6, z - 1.2, 0, 0.06).solidBox(x, z, 1.8, 2.4, 0.9, 0.85); },
  tv: (k, x, z, ry = 0) => { k.rb(0x111827, 1.8, 0.5, 0.5, x, 0.25, z, ry, 0.05).rb(0x0f172a, 1.7, 1.0, 0.08, x, 1.15, z, ry, 0.03).rb(M(0x38bdf8, { e: 0x0ea5e9, ei: 0.6, r: 0.2 }), 1.55, 0.86, 0.02, x + Math.sin(ry) * 0.05, 1.15, z + Math.cos(ry) * 0.05, ry, 0.01).solidBox(x, z, 1.8, 0.6, 1.7); },
  desk: (k, x, z, ry = 0) => { k.rb(0xf8fafc, 1.6, 0.06, 0.8, x, 0.76, z, ry, 0.02); for (const s of [-0.72, 0.72]) k.rb(0x94a3b8, 0.06, 0.74, 0.7, x + Math.cos(ry) * s, 0.37, z - Math.sin(ry) * s, ry, 0.02); k.rb(0x111827, 0.6, 0.4, 0.04, x - Math.sin(ry) * 0.2, 1.05, z - Math.cos(ry) * 0.2, ry, 0.02).rb(M(0x60a5fa, { e: 0x3b82f6, ei: 0.5 }), 0.54, 0.34, 0.01, x - Math.sin(ry) * 0.17, 1.05, z - Math.cos(ry) * 0.17, ry, 0.005).solidBox(x, z, 1.6, 0.8, 1.1, 0.8); },
  fireplace: (k, x, z) => { k.rb(0x9a3412, 2.2, 1.6, 0.7, x, 0.8, z, 0, 0.06).rb(0x1c1917, 1.2, 0.8, 0.3, x, 0.5, z + 0.25, 0, 0.04).sp(M(0xff7a1a, { e: 0xff5a00, ei: 2 }), 0.3, x, 0.45, z + 0.3, 1.4, 1.1, 0.5).rb(0x78350f, 2.5, 0.12, 0.8, x, 1.65, z, 0, 0.03).solidBox(x, z, 2.2, 0.8, 1.7); },
  fridge: (k, x, z, c = 0xe2e8f0) => { k.rb(c, 0.9, 1.9, 0.7, x, 0.95, z, 0, 0.1).rb(0x94a3b8, 0.05, 0.5, 0.05, x + 0.32, 1.25, z + 0.37, 0, 0.02).solidBox(x, z, 0.9, 0.7, 2); },
  wardrobe: (k, x, z) => { k.rb(0xb45309, 1.6, 2.1, 0.6, x, 1.05, z, 0, 0.06).rb(0x92400e, 0.04, 1.9, 0.02, x, 1.05, z + 0.31, 0, 0.01).sp(0xfacc15, 0.04, x - 0.08, 1.1, z + 0.32).sp(0xfacc15, 0.04, x + 0.08, 1.1, z + 0.32).solidBox(x, z, 1.6, 0.6, 2.2); },
  podium: (k, x, z, r = 2.6) => { k.cy(0xe2e8f0, r, r + 0.1, 0.3, x, 0.15, z, 40).cy(M(0x38bdf8, { e: 0x38bdf8, ei: 0.8 }), r + 0.12, r + 0.12, 0.05, x, 0.06, z, 40); },
  toolwall: (k, x, z, w = 4) => { k.rb(0x64748b, w, 2.2, 0.12, x, 1.4, z, 0, 0.02); for (let i = 0; i < w * 2; i++) k.rb([0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e][i % 4], 0.08, 0.5 + (i % 3) * 0.12, 0.05, x - w / 2 + 0.3 + i * 0.48, 1.5, z + 0.1, 0, 0.02); },
  tires: (k, x, z) => { for (let i = 0; i < 4; i++) k.B.add(GEO.torus(0.33, 0.14, Math.PI * 2, 10, 24), R(0x1f2937, { r: 0.9 }), new THREE.Matrix4().compose(_v.set(IX + x, IY + 0.14 + i * 0.28, IZ + z), _q.setFromEuler(_e.set(Math.PI / 2, 0, 0)), _s.set(1, 1, 1))); k.solidBox(x, z, 1, 1, 1.2); },
  lift: (k, x, z) => { for (const s of [-1.6, 1.6]) k.rb(0xdc2626, 0.3, 2.6, 0.3, x + s, 1.3, z, 0, 0.05); k.rb(0xfacc15, 3.6, 0.15, 4.6, x, 0.1, z, 0, 0.03); },
  bones: (k, x, z) => { const b = 0xf5f0e1; for (let i = 0; i < 9; i++) k.sp(b, 0.25 - i * 0.012, x - 2 + i * 0.5, 2.1 + Math.sin(i * 0.5) * 0.4, z, 1, 1, 1); k.sp(b, 0.6, x + 2.6, 2.6, z, 1.5, 0.8, 0.8); for (let i = 0; i < 6; i++) k.cy(b, 0.05, 0.05, 1.2, x - 1.2 + i * 0.4, 1.6, z, 6); for (const s of [-1.6, 1.4]) for (const t of [-0.4, 0.4]) k.cy(b, 0.12, 0.09, 2, x + s, 1, z + t, 8); k.rb(0x78716c, 6.5, 0.3, 2.2, x, 0.15, z, 0, 0.05); k.solidBox(x, z, 6.6, 2.4, 3); }
};
/* ---------- the room templates ---------- */
const STAFF = { dealer: 'Sales Sam', garage: 'Mechanic Mo', food: 'Chef Bea', pizza: 'Pizza Pete', icecream: 'Scoop Sue', mart: 'Clerk Kim', store: 'Shopkeeper Jo', hotel: 'Concierge Lou', realty: 'Agent Ana', dispatch: 'Dispatcher Dee', raceclub: 'Coach Vroom', fire: 'Chief Blaze', police: 'Officer Kay', depot: 'Driver Gus', towyard: 'Hank the Hook', cargo: 'Foreman Flo', tours: 'Pilot Penny', arcade: 'Pixel Pat', townhall: 'Mayor Grok', museum: 'Dr. Fossil', lab: 'Professor Nimbus', lodge: 'Ranger Rae' };
function shellOf(b) { const w = Math.max(12, Math.min(28, (b.w || 16) - 1)), d = Math.max(10, Math.min(20, (b.d || 12) - 1)); return { w, d, h: 4.2 }; }
function hashS(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
export function enter(b, ov) {
  if (room) return; SFX.click(); fade(true);
  setTimeout(() => { try { buildRoom(b, ov); } catch (e) { console.error(e); ST.err = ST.err || String(e.stack || e); } fade(false); }, 260);
}
function buildRoom(b, ov) {
  const kind = b.home ? 'home' : b.kind || (b.place && b.place.kind) || 'apartment', sh = shellOf(b), g = new THREE.Group(); g.name = 'room';
  const k = new Kit(g), hw = sh.w / 2, hd = sh.d / 2, H = sh.h, rnd = (() => { let s = hashS(b.id); return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  room = { b, kind, g, w: sh.w, d: sh.d, h: H, k, st: [], npc: [], spin: [], vehs: [], name: b.name || ({ apartment: 'Apartments', office: 'Offices', house: 'House', shop: 'Shop' }[kind] || 'Inside'), camDist: 7.5 };
  // shell: floor, walls, ceiling, skirting, ceiling lights, windows (glowing panes), door
  const hs = b.home && (ov || S.d.homes[b.id]) || {}; const visiting = !!ov; const wallC = b.home ? (hs.wall || WALLS[0]) : ({ fire: 0xfee2e2, police: 0xe0e7ff, arcade: 0x312e81, lab: 0xe0f2fe, lodge: 0xd6b48a, museum: 0xfef3c7, dealer: 0xf8fafc, garage: 0xe5e7eb, towyard: 0xfed7aa, raceclub: 0x1f2937, hotel: 0xfef3c7 }[kind] || [0xfef3c7, 0xdbeafe, 0xdcfce7, 0xfde2e4, 0xede9fe][hashS(b.id) % 5]);
  const floorC = b.home ? (FLOORS[hs.floor || 'wood'] || FLOORS.wood).c : ({ garage: 0x9ca3af, towyard: 0x9ca3af, fire: 0x9ca3af, depot: 0x9ca3af, cargo: 0x9ca3af, dealer: 0xf1f5f9, arcade: 0x1e1b4b, lodge: 0x92400e, hotel: 0xb91c1c, raceclub: 0x111827 }[kind] || [0xc08a5a, 0xe2e8f0, 0xd6b48a, 0xf1f5f9][hashS(b.id) % 4]);
  k.rb(floorC, sh.w, 0.2, sh.d, 0, -0.1, 0, 0, 0.02, true);
  if (kind === 'dealer' || kind === 'arcade' || (b.home && hs.floor === 'check')) for (let i = 0; i < sh.w / 2; i++) for (let j = 0; j < sh.d / 2; j++) if ((i + j) % 2) k.rb(kind === 'arcade' ? 0x4c1d95 : 0x1f2937, 1.98, 0.02, 1.98, -hw + 1 + i * 2, 0.005, -hd + 1 + j * 2, 0, 0.005, true);
  const wm = M(wallC, { r: 0.85 });
  k.rb(wm, sh.w, H, 0.3, 0, H / 2, -hd - 0.15, 0, 0.04, true).rb(wm, 0.3, H, sh.d, -hw - 0.15, H / 2, 0, 0, 0.04, true).rb(wm, 0.3, H, sh.d, hw + 0.15, H / 2, 0, 0, 0.04, true);
  k.rb(wm, hw - 1.1, H, 0.3, -(hw + 1.1) / 2, H / 2, hd + 0.15, 0, 0.04, true).rb(wm, hw - 1.1, H, 0.3, (hw + 1.1) / 2, H / 2, hd + 0.15, 0, 0.04, true).rb(wm, 2.2, H - 2.6, 0.3, 0, H - (H - 2.6) / 2, hd + 0.15, 0, 0.04, true);
  k.rb(M(0xffffff, { r: 0.4, e: 0xfff5e0, ei: 0.25 }), sh.w + 0.6, 0.2, sh.d + 0.6, 0, H + 0.1, 0, 0, 0.02, true);
  for (const s of [-1, 1]) k.rb(0xffffff, sh.w, 0.15, 0.04, 0, 0.075, s * (hd - 0.02), 0, 0.01, true);
  for (let i = 0; i < Math.floor(sh.w / 5); i++) for (let j = 0; j < Math.floor(sh.d / 5); j++) k.rb(M(0xfffbeb, { e: 0xfff1c4, ei: 1.4, r: 0.3 }), 1.2, 0.06, 1.2, -hw + 2.5 + i * 5, H - 0.03, -hd + 2.5 + j * 5, 0, 0.02, true);
  const win = M(0xbfe6ff, { r: 0.05, m: 0.1, e: 0x9fd6ff, ei: 0.55 });
  for (let i = 0; i < Math.floor(sh.d / 4); i++) for (const s of [-1, 1]) { const z = -hd + 2 + i * 4; k.rb(win, 0.06, 1.5, 2.2, s * (hw - 0.02), 2.0, z, 0, 0.02, true).rb(0xffffff, 0.1, 0.1, 2.4, s * (hw - 0.04), 1.2, z, 0, 0.02, true); }
  k.rb(M(0x7c2d12, { r: 0.6 }), 2.2, 2.6, 0.08, 0, 1.3, hd + 0.05, 0, 0.03, true).rb(M(0xfacc15, { r: 0.3, m: 0.8 }), 0.08, 0.08, 0.12, 0.8, 1.2, hd - 0.02, 0, 0.02, true);
  k.rb(M(0x22c55e, { e: 0x22c55e, ei: 0.8 }), 1.6, 0.5, 0.04, 0, 2.95, hd - 0.04, 0, 0.04).text('EXIT', 0.24, 0xffffff, 0, 2.86, hd - 0.08, Math.PI);
  station(0, hd - 0.9, 1.8, '🚪 Go outside', () => leave(), 3);
  const npc = (x, z, ry, pose = 'idle', look, label, talk) => { const P = makePerson(look || randLook(hashS(b.id) + x * 7 + z)); P.root.position.set(IX + x, IY, IZ + z); P.root.rotation.y = ry; g.add(P.root); const o = { P, pose, x, z }; room.npc.push(o); k.solidBox(x, z, 0.7, 0.7, 1.8); if (label) station(x + Math.sin(ry) * 1.3, z + Math.cos(ry) * 1.3, 1.6, label, talk || (() => toast(lines(kind))), 2); return o; };
  const staff = (x, z, label, fn) => npc(x, z, 0, 'serve', null, label, fn);
  const sign = (t, c = 0x1f2a44) => k.text(t, 0.42, c, 0, H - 0.9, -hd + 0.2, 0);
  const wallArt = () => { for (let i = 0; i < 2; i++) { const x = -hw / 2 + i * hw; k.rb(0x1f2937, 1.6, 1.1, 0.06, x, 2.3, -hd + 0.05, 0, 0.02).rb([0xfbbf24, 0x60a5fa, 0xf472b6, 0x34d399][(hashS(b.id) + i) % 4], 1.4, 0.9, 0.02, x, 2.3, -hd + 0.09, 0, 0.01).sp(0xffffff, 0.15, x + 0.3, 2.45, -hd + 0.11, 1, 1, 0.2); } };
  const kindUp = b.place ? b.place.kind : kind;
  switch (kindUp) {
    case 'dealer': { sign((b.name || 'SHOWROOM').toUpperCase()); const list = (DEALERS[b.place.dealer] || DEALERS.motors).list; const n = Math.min(3, list.length);
      for (let i = 0; i < n; i++) { const x = -hw + sh.w * (i + 0.5) / n, z = -1.2; PIECE.podium(k, x, z, Math.min(2.6, sh.w / n / 2 - 0.3)); const V = makeVehicle(list[(i + Math.floor(ST.t / 60)) % list.length], { rider: false, noBeam: true }); const sc = Math.min(1, 4.2 / Math.max(V.dims.L, V.dims.W)); V.root.scale.setScalar(sc); V.root.position.set(IX + x, IY + 0.3, IZ + z); g.add(V.root); room.spin.push(V.root); room.vehs.push(V); k.solidBox(x, z, 4.6, 4.6, 1.4); }
      PIECE.desk(k, hw - 2.5, hd - 3.2, -Math.PI / 2); staff(hw - 3.6, hd - 3.2, '🚗 Browse & buy rides', () => SHOP.dealer(b.place.dealer)); PIECE.plant(k, -hw + 1, hd - 1.5); PIECE.plant(k, hw - 1, -hd + 1); break; }
    case 'garage': { sign('GARAGE'); PIECE.lift(k, -hw / 2, -1); const V = makeVehicle(['compact', 'pickup', 'sports', 'muscle'][hashS(b.id) % 4], { rider: false, noBeam: true }); V.root.position.set(IX - hw / 2, IY + 1.4, IZ - 1); g.add(V.root); room.vehs.push(V); k.solidBox(-hw / 2, -1, 3.8, 5, 3);
      PIECE.toolwall(k, hw / 2, -hd + 0.1, 5); PIECE.tires(k, hw - 1, -hd + 2); PIECE.tires(k, hw - 2.2, -hd + 2); PIECE.counter(k, hw / 2, 1.5, 3, 0xf8fafc, 0xdc2626); staff(hw / 2, 0.6, '🔧 Repair, paint, rims & upgrades', () => SHOP.garage()); break; }
    case 'food': case 'pizza': case 'icecream': case 'mart': case 'store': {
      sign((b.name || 'SHOP').toUpperCase()); const shop = kindUp === 'mart' || kindUp === 'store';
      PIECE.counter(k, 0, -hd + 2.6, Math.min(8, sh.w - 4), 0xffffff, b.acc || 0xef4444); staff(0, -hd + 1.7, kindUp === 'store' ? '🛒 Shop snacks & hats' : '🍽️ Order something yummy', () => SHOP.food(b));
      if (kindUp === 'icecream') for (let i = 0; i < 5; i++) k.sp([0xfff7d6, 0x7b4a2a, 0xff9ec4, 0x86efac, 0xfde047][i], 0.18, -1.6 + i * 0.8, 1.3, -hd + 2.6);
      if (kindUp === 'pizza') { k.rb(0x78716c, 2.4, 2.2, 1.4, -hw + 2, 1.1, -hd + 1, 0, 0.6).sp(M(0xff7a1a, { e: 0xff5a00, ei: 1.5 }), 0.4, -hw + 2, 1.0, -hd + 1.7, 1.3, 0.8, 0.4); k.solidBox(-hw + 2, -hd + 1, 2.4, 1.4, 2.2); station(-hw + 2, -hd + 2.8, 1.8, '🍕 Pizza delivery job', () => ACT.startJob('pizza'), 2); }
      if (shop) { for (let i = 0; i < Math.floor((sh.d - 6) / 2.6); i++) for (const s of [-1, 1]) PIECE.shelf(k, s * (hw / 2), 0 + i * 2.6 - 0.5, Math.min(4, hw - 2), 0, i * 2 + s); if (kindUp === 'store') station(hw - 1.5, hd - 2.5, 1.8, '🧢 Try on hats', () => SHOP.hats(), 2); }
      else { for (let i = 0; i < Math.floor(sh.w / 4); i++) for (let j = 0; j < Math.max(1, Math.floor((sh.d - 6) / 3.5)); j++) { const x = -hw + 2 + i * 4, z = -hd + 5 + j * 3.5; if (z > hd - 2.5) continue; PIECE.table(k, x, z, 0xf8fafc); PIECE.chair(k, x - 1, z, Math.PI / 2, b.acc || 0xef4444); PIECE.chair(k, x + 1, z, -Math.PI / 2, b.acc || 0xef4444); if ((i + j) % 2 === 0) npc(x - 1, z, Math.PI / 2, 'sit', null, null); } }
      PIECE.plant(k, -hw + 0.8, hd - 1.2); PIECE.plant(k, hw - 0.8, hd - 1.2); break; }
    case 'hotel': { sign('GRAND GROK HOTEL', 0xb45309); PIECE.counter(k, 0, -hd + 2.6, 6, 0x7c2d12, 0xfacc15); staff(0, -hd + 1.7, '🛎️ Rent a room (sleep + feast)', () => SHOP.hotel()); PIECE.rug(k, 0, 1, 0xb91c1c); PIECE.sofa(k, -hw + 2.5, 1, Math.PI / 2, 0x7c2d12); PIECE.sofa(k, hw - 2.5, 1, -Math.PI / 2, 0x7c2d12); PIECE.plant(k, -hw + 1, -hd + 1); PIECE.plant(k, hw - 1, -hd + 1); k.rb(M(0xfacc15, { r: 0.2, m: 1 }), 2, 2.8, 0.1, hw - 1.5, 1.4, -hd + 0.06, 0, 0.04); npc(-hw + 2.5, 1, Math.PI / 2, 'sit'); break; }
    case 'realty': { sign('GROK REALTY', 0x16a34a); PIECE.desk(k, 0, -hd + 3, 0); staff(0, -hd + 2.2, '🏠 Buy a home', () => SHOP.realty()); for (let i = 0; i < 3; i++) { const x = -hw + 2 + i * (sh.w - 4) / 2; k.rb(0x1f2937, 2.2, 1.6, 0.06, x, 2.2, -hd + 0.06, 0, 0.02).rb([0x86efac, 0xfde68a, 0x93c5fd][i], 2, 1.4, 0.02, x, 2.2, -hd + 0.1, 0, 0.01).rb(0xffffff, 0.8, 0.5, 0.03, x, 2.05, -hd + 0.12, 0, 0.02).rb(0xef4444, 0.9, 0.3, 0.03, x, 2.45, -hd + 0.13, 0, 0.02); } PIECE.armchair(k, -1, -hd + 5, Math.PI, 0x16a34a); PIECE.armchair(k, 1, -hd + 5, Math.PI, 0x16a34a); PIECE.plant(k, hw - 1, hd - 1.5); break; }
    case 'dispatch': case 'cargo': { sign(kindUp === 'cargo' ? 'CARGO DEPOT' : 'GROK DISPATCH', 0x1d4ed8); for (let i = 0; i < 10; i++) k.rb([0xd6a15a, 0xc08a5a, 0xb45309][i % 3], 1, 0.8, 1, -hw + 1.5 + (i % 5) * 1.1, 0.4 + Math.floor(i / 5) * 0.8, -hd + 1.5, (i * 0.3) % 0.4, 0.04); k.solidBox(-hw + 3.7, -hd + 1.5, 5.6, 1.2, 1.7); PIECE.counter(k, hw / 2, -hd + 3, 4, 0xdbeafe, 0x1d4ed8); staff(hw / 2, -hd + 2.1, kindUp === 'cargo' ? '📦 Cargo haul job' : '📦 Delivery jobs', () => kindUp === 'cargo' ? ACT.startJob('cargo') : ACT.jobBoard('delivery')); k.rb(0x1f2937, 4, 2, 0.06, hw / 2, 2.6, -hd + 0.05, 0, 0.02).rb(M(0x22c55e, { e: 0x22c55e, ei: 0.4 }), 3.8, 1.8, 0.02, hw / 2, 2.6, -hd + 0.09, 0, 0.01); break; }
    case 'raceclub': { sign('RACE CLUB HQ', 0xef4444); for (let i = 0; i < 4; i++) PIECE.trophy(k, -hw + 1.5 + i * 1.4, -hd + 1); PIECE.desk(k, hw / 2, -hd + 3, 0); staff(hw / 2, -hd + 2.2, '🏁 Street races', () => ACT.raceBoard()); for (let i = 0; i < Math.floor(sh.w / 1); i++) k.rb(i % 2 ? 0xffffff : 0x111111, 1, 0.3, 0.04, -hw + 0.5 + i, H - 0.6, -hd + 0.05, 0, 0.01); PIECE.sofa(k, -hw / 2, 2, 0, 0xef4444); break; }
    case 'fire': { sign('FIRE STATION 7', 0xdc2626); const V = makeVehicle('fire', { rider: false, noBeam: true }); V.root.position.set(IX - hw / 2, IY, IZ - 0.5); V.root.scale.setScalar(0.8); g.add(V.root); room.vehs.push(V); k.solidBox(-hw / 2, -0.5, 2.6, 7.2, 3); k.cy(M(0xfacc15, { r: 0.2, m: 1 }), 0.06, 0.06, H, hw - 2, H / 2, -1, 10); for (let i = 0; i < 4; i++) k.rb(0xfacc15, 0.6, 1.0, 0.4, hw - 0.6, 1.2, -hd + 1 + i * 0.8, 0, 0.1).sp(0xdc2626, 0.22, hw - 0.6, 1.9, -hd + 1 + i * 0.8); staff(hw / 2, -hd + 2, '🚒 Fire alarm duty', () => ACT.startJob('fire')); break; }
    case 'police': { sign('GROK CITY POLICE', 0x1e3a8a); PIECE.counter(k, 0, -hd + 2.6, 5, 0x1e3a8a, 0x93c5fd); staff(0, -hd + 1.7, ST.wanted > 0 ? '💵 Pay your ticket' : '🚓 Patrol duty (catch a robber)', () => ST.wanted > 0 ? SHOP.payFine() : ACT.startJob('cop')); for (let i = 0; i < 3; i++) PIECE.desk(k, -hw + 2.5 + i * 3, 1.5, Math.PI); PIECE.plant(k, hw - 1, hd - 1.5); npc(-hw + 2.5, 2.2, Math.PI, 'sit'); break; }
    case 'depot': { sign('BUS DEPOT', 0xca8a04); const V = makeVehicle('bus', { rider: false, noBeam: true }); V.root.position.set(IX - hw / 2 + 1.2, IY, IZ - 0.5); V.root.scale.setScalar(0.65); g.add(V.root); room.vehs.push(V); k.solidBox(-hw / 2 + 1.2, -0.5, 2.2, 7.2, 3); for (let i = 0; i < 4; i++) PIECE.chair(k, hw / 2 - 1.5 + i * 0.8, 2, Math.PI, 0xca8a04); staff(hw / 2, -hd + 2, '🚌 Drive a bus route', () => ACT.startJob('bus')); break; }
    case 'towyard': { sign('HOOK & HAUL', 0xea580c); PIECE.tires(k, -hw + 1.2, -hd + 1.2); PIECE.tires(k, -hw + 2.4, -hd + 1.2); PIECE.toolwall(k, 0, -hd + 0.1, 4); for (let i = 0; i < 3; i++) k.B.add(GEO.torus(0.35, 0.06, Math.PI * 1.3, 8, 18), M(0x9ca3af, { r: 0.3, m: 0.9 }), mat(hw - 1.5, 2.2 - i * 0.3, -hd + 0.3, 0)); staff(hw / 2, -hd + 2.2, '🪝 Tow jobs', () => ACT.startJob('tow')); break; }
    case 'tours': { sign('SKY TOURS', 0x7c3aed); for (let i = 0; i < 3; i++) { k.sp([0xef4444, 0xfacc15, 0x22c55e][i], 0.6, -hw + 2 + i * 2.5, 2.8, -hd + 1.4, 1, 1.15, 1); k.cy(0x92400e, 0.2, 0.15, 0.3, -hw + 2 + i * 2.5, 1.9, -hd + 1.4, 10); } PIECE.desk(k, hw / 2, -hd + 3, 0); staff(hw / 2, -hd + 2.2, '🎈 Sky tour gigs', () => ACT.startJob('tour')); break; }
    case 'arcade': { sign('GROK ARCADE LOUNGE', 0xe879f9); for (let i = 0; i < Math.floor(sh.w / 1.6); i++) PIECE.arcade(k, -hw + 1 + i * 1.6, -hd + 0.8, 0, [0x7c3aed, 0xdb2777, 0x0ea5e9, 0x16a34a][i % 4]); for (let i = 0; i < 3; i++) npc(-hw + 1 + i * 3.2, -hd + 2.1, Math.PI, 'stand'); station(0, -hd + 2.4, 1.8, '🕹️ Play Star Catch', () => ACT.miniGame(), 2); PIECE.beanbag(k, -2, 2); PIECE.beanbag(k, 2, 2); break; }
    case 'townhall': { sign('TOWN HALL', 0x1e3a8a); for (const s of [-1, 1]) k.cy(0xffffff, 0.35, 0.4, H, s * (hw - 2), H / 2, -1, 20); PIECE.desk(k, 0, -hd + 3, 0); staff(0, -hd + 2.2, '🏛️ Records, trophies & name', () => SHOP.records()); PIECE.rug(k, 0, 1.5, 0x1e3a8a); break; }
    case 'museum': { sign('DINO MUSEUM', 0x15803d); PIECE.bones(k, 0, -1); for (const s of [-1, 1]) PIECE.plant(k, s * (hw - 1), -hd + 1); station(0, 1.6, 2.2, '🦖 Read about the Grokosaurus', () => SHOP.museum(), 2); staff(hw - 2, hd - 3, null); break; }
    case 'lab': { sign('RESEARCH OUTPOST', 0x0369a1); for (let i = 0; i < 3; i++) PIECE.desk(k, -hw + 2.5 + i * 3, -hd + 1.5, 0); k.cy(M(0x94a3b8, { r: 0.3, m: 0.8 }), 0.9, 1.1, 2.2, hw - 2.5, 1.1, 0, 24).sp(M(0x38bdf8, { e: 0x38bdf8, ei: 1.5, r: 0.1 }), 0.55, hw - 2.5, 2.6, 0); k.solidBox(hw - 2.5, 0, 2.2, 2.2, 3); station(hw - 2.5, 1.8, 1.8, '🌦️ Weather machine', () => SHOP.weather(), 2); npc(-hw + 2.5, -hd + 2.3, Math.PI, 'stand', null, null); staff(0, 1.5, null); break; }
    case 'lodge': { sign('GROKMORE LODGE', 0x7c2d12); PIECE.fireplace(k, 0, -hd + 0.5); PIECE.rug(k, 0, -hd + 3, 0xb91c1c); PIECE.armchair(k, -1.6, -hd + 3.2, Math.PI * 0.85, 0x7c2d12); PIECE.armchair(k, 1.6, -hd + 3.2, -Math.PI * 0.85, 0x7c2d12); station(0, -hd + 2, 1.8, '🔥 Warm up & rest till morning', () => SHOP.sleep(false), 2); PIECE.counter(k, hw - 2.5, 1, 3, 0x92400e, 0x78350f); staff(hw - 2.5, 0.1, '☕ Hot cocoa', () => SHOP.food({ place: { menu: ['cocoa', 'coffee', 'cookie'] }, name: 'Lodge Cafe' })); break; }
    case 'home': { if (visiting) { buildHomeDeco(k, b, sh, hs); toast('🏠 Visiting a friend\'s home!'); } else buildHome(k, b, sh, hs); break; }
    case 'office': { sign('GROK OFFICES', 0x334155); for (let i = 0; i < Math.floor(sh.w / 3.4); i++) for (let j = 0; j < 2; j++) { const x = -hw + 2 + i * 3.4, z = -hd + 2 + j * 3.2; PIECE.desk(k, x, z, 0); if ((i + j) % 2 === 0) npc(x, z + 0.8, Math.PI, 'sit'); } PIECE.plant(k, hw - 1, hd - 1.5); PIECE.fridge(k, -hw + 0.8, hd - 2); station(0, hd - 3, 1.8, '📎 Quick job: sort the mail ($)', () => ACT.officeTask(b), 2); break; }
    case 'house': { PIECE.rug(k, 0, 0, [0xa78bfa, 0xfca5a5, 0x93c5fd][hashS(b.id) % 3]); PIECE.sofa(k, 0, 1.6, Math.PI, [0x6366f1, 0x16a34a, 0xdb2777][hashS(b.id) % 3]); PIECE.tv(k, 0, -hd + 0.6, 0); PIECE.plant(k, hw - 0.8, -hd + 0.8); PIECE.lamp(k, -hw + 0.8, -hd + 0.8); PIECE.table(k, -hw + 2, hd - 2.5); PIECE.fridge(k, hw - 0.8, hd - 2.4); npc(0.6, 1.6, Math.PI, 'sit', null, '👋 Say hi', () => ACT.chat(b, 'house')); if (hashS(b.id) % 3 === 0) { const T = makeTorty(); T.root.position.set(IX - 1.5, IY, IZ + 0.5); g.add(T.root); station(-1.5, 1.6, 1.6, '🐢 Pet Torty', () => { toast('🐢 Torty does a happy little shell wiggle!'); SFX.coin(); }, 2); } wallArt(); break; }
    default: { // apartments / generic shops
      if (kindUp === 'shop') { sign('BOUTIQUE', 0xdb2777); for (let i = 0; i < 3; i++) PIECE.shelf(k, -hw + 2.5 + i * (sh.w - 5) / 2, -hd + 0.6, 2.4, 0, i * 3); PIECE.counter(k, hw / 2, 1.5, 3, 0xfdf2f8, 0xdb2777); staff(hw / 2, 0.6, '🧢 Hats & caps', () => SHOP.hats()); }
      else { sign('LOBBY', 0x334155); for (let i = 0; i < 8; i++) k.rb(M(0x94a3b8, { r: 0.3, m: 0.8 }), 0.5, 0.35, 0.1, -hw + 1 + (i % 4) * 0.55, 1.2 + Math.floor(i / 4) * 0.4, -hd + 0.06, 0, 0.02); k.rb(M(0xcbd5e1, { r: 0.2, m: 0.9 }), 2.2, 2.7, 0.1, hw - 2.5, 1.35, -hd + 0.06, 0, 0.02).rb(0x1f2937, 0.04, 2.6, 0.02, hw - 2.5, 1.35, -hd + 0.12, 0, 0.01); station(hw - 2.5, -hd + 1.4, 1.6, '🛗 Ride the elevator', () => ACT.elevator(b), 2); PIECE.sofa(k, -hw / 2, 1, Math.PI, 0x0d9488); PIECE.plant(k, -hw + 0.8, hd - 1.2); npc(1.5, 0.5, -Math.PI / 2, 'idle', null, '👋 Say hi', () => ACT.chat(b, 'apt')); wallArt(); }
    }
  }
  k.build();
  // hide the outside world while inside (big win for performance too)
  hidden.length = 0; for (const o of G.scene.children) if (o.visible && o !== ST.me.P.root && !o.isLight && o !== G.sky) { hidden.push(o); o.visible = false; }
  G.scene.add(g); ST.inside = room;
  ST.me.x = IX; ST.me.z = IZ + hd - 1.6; ST.me.y = IY; ST.me.vy = 0; ST.me.yaw = Math.PI; ST.cam.walkYaw = Math.PI; ST.snapCam();
  if (b.home) ACT.onHomeEnter && ACT.onHomeEnter(b);
  if (!S.d.visited) S.d.visited = {}; if (!S.d.visited[b.id]) { S.d.visited[b.id] = 1; save(); }
}
function buildHome(k, b, sh, hs) {
  const hw = sh.w / 2, hd = sh.d / 2; k.text((b.home.short || 'HOME'), 0.4, 0x1f2a44, 0, sh.h - 0.9, -hd + 0.2, 0);
  PIECE.bed(k, -hw + 1.6, -hd + 1.6, b.home.acc === 0x334155 ? 0x334155 : 0x60a5fa); station(-hw + 3, -hd + 1.6, 1.6, '🛏️ Sleep till morning (sets respawn)', () => SHOP.sleep(true, b), 2);
  PIECE.wardrobe(k, hw - 1.2, -hd + 0.5); station(hw - 1.2, -hd + 1.6, 1.6, '👕 Wardrobe: hats & colors', () => SHOP.wardrobe(), 2);
  PIECE.tv(k, 0, -hd + 0.5, 0); PIECE.rug(k, 0, 0.2); PIECE.sofa(k, 0, 1.8, Math.PI, 0x6366f1);
  station(0, 0.0, 1.6, '🛋️ Decorate my home', () => SHOP.decorate(b), 2);
  station(hw - 1.5, hd - 1.5, 1.6, '🚗 Home garage', () => SHOP.homeGarage(b), 2);
  PIECE.fridge(k, -hw + 0.8, hd - 2.2); station(-hw + 1.8, hd - 2.2, 1.4, '🍪 Grab a snack', () => SHOP.fridgeSnack(), 1);
  // decorations placed by the player (slots around the room)
  const deco = hs.deco || {}; for (const [i, id] of Object.entries(deco)) { const sl = homeSlots(sh)[+i]; if (sl && PIECE[id]) PIECE[id](k, sl[0], sl[1]); }
}
function buildHomeDeco(k, b, sh, hs) { const hw = sh.w / 2, hd = sh.d / 2; PIECE.bed(k, -hw + 1.6, -hd + 1.6); PIECE.wardrobe(k, hw - 1.2, -hd + 0.5); PIECE.tv(k, 0, -hd + 0.5, 0); PIECE.rug(k, 0, 0.2); PIECE.sofa(k, 0, 1.8, Math.PI, 0x6366f1); PIECE.fridge(k, -hw + 0.8, hd - 2.2); const deco = hs.deco || {}; for (const [i, id] of Object.entries(deco)) { const sl = homeSlots(sh)[+i]; if (sl && PIECE[id]) PIECE[id](k, sl[0], sl[1]); } }
export function homeSlots(sh) { const hw = sh.w / 2, hd = sh.d / 2; return [[-hw + 1, 0], [-hw + 1, 2.2], [hw - 1, 0], [hw - 1, -2.4], [-2.6, hd - 1.2], [2.6, hd - 1.2], [-3, -hd + 1], [3.2, -hd + 1], [-hw + 1, hd - 4.2], [hw - 1, 2.2]].filter(([x, z]) => Math.abs(x) < hw - 0.5 && Math.abs(z) < hd - 0.5); }
export const roomShell = shellOf;
function lines(kind) { const L = ['Nice ride you\'ve got out there! 🚗', 'Did you see the rain this morning? The puddles were huge!', 'I heard there are 60 Grok Stars hidden around the map ⭐', 'Torty was at the pier selling snacks again 🐢', 'Have you tried the mountain road? So many curves!', 'The car wash makes your ride sparkle ✨']; return '💬 ' + L[(Math.random() * L.length) | 0]; }
function station(x, z, r, label, fn, pri = 2) { room.st.push({ x, z, r, label, fn, pri }); }
export function leave(instant) {
  if (!room) return; const b = room.b, r = room;
  const go = () => {
    G.scene.remove(r.g); r.g.traverse((o) => { if (o.geometry && o.geometry.userData.batch) o.geometry.dispose(); }); r.vehs.forEach((V) => disposeVehicle(V));
    for (const o of hidden) o.visible = true; hidden.length = 0; room = null; ST.inside = null;
    if (!instant) { ST.me.x = b.door.x + b.fx * 1.2; ST.me.z = b.door.z + b.fz * 1.2; ST.me.y = Math.max(b.y, 0); ST.me.vy = 0; ST.me.yaw = Math.atan2(b.fx, b.fz); ST.cam.walkYaw = ST.me.yaw; ST.snapCam(); }
    if (ST.car) ST.car.V.root.visible = true;
  };
  if (instant) { go(); return; } SFX.click(); fade(true); setTimeout(() => { go(); fade(false); }, 260);
}
export function initInteriors() {
  // outside: every building door is a way in
  addActs((x, z, mode) => {
    if (mode !== 'foot' || room) return null; let best = null;
    for (const b of BLD) { if (!b.door) continue; const d = Math.hypot(b.door.x - x, b.door.z - z); if (d > 2.6 || (best && d > best.d)) continue;
      if (b.home && !S.d.homes[b.id]) best = { label: '🏷️ ' + b.name + ' (for sale)', d, fn: () => SHOP.realty(b.id), pri: 2 };
      else best = { label: '🚪 Enter ' + (b.name || ({ apartment: 'Apartments', office: 'Office', house: 'House', shop: 'Boutique' }[b.kind] || 'building')), d, fn: () => enter(b), pri: 2 }; }
    return best ? [best] : null;
  });
  addActs((x, z, mode) => { if (!room || mode !== 'foot') return null; const out = []; for (const s of room.st) { const d = Math.hypot(IX + s.x - x, IZ + s.z - z); if (d < s.r) out.push({ label: s.label, d, fn: s.fn, pri: s.pri }); } return out; });
}
export function updateInterior(dt) {
  if (!room) return;
  for (const r of room.spin) r.rotation.y += dt * 0.4;
  for (const n of room.npc) animPerson(n.P, n.pose, dt, 0, ST.t + n.x);
}
export function walkCollide(p) { if (!room) return; const hw = room.w / 2 - 0.4, hd = room.d / 2 - 0.4; p.x = Math.max(IX - hw, Math.min(IX + hw, p.x)); p.z = Math.max(IZ - hd, Math.min(IZ + hd, p.z));
  for (const s of room.k.solid) { const x0 = IX + s.x0 - 0.35, x1 = IX + s.x1 + 0.35, z0 = IZ + s.z0 - 0.35, z1 = IZ + s.z1 + 0.35; if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && !(s.top && ST.me.y > IY + s.top - 0.3)) { const dl = p.x - x0, dr = x1 - p.x, dt = p.z - z0, db = z1 - p.z, m = Math.min(dl, dr, dt, db); if (m === dl) p.x = x0; else if (m === dr) p.x = x1; else if (m === dt) p.z = z0; else p.z = z1; } } }
export function floorAt(x, z, y) { if (!room) return 0; let g = IY; for (const s of room.k.solid) if (s.top && x > IX + s.x0 && x < IX + s.x1 && z > IZ + s.z0 && z < IZ + s.z1 && y > IY + s.top - 0.35) g = Math.max(g, IY + s.top); return g; }
export function clampCam(d, t) { if (!room) return; const hw = room.w / 2 - 0.35, hd = room.d / 2 - 0.35; d.x = Math.max(IX - hw, Math.min(IX + hw, d.x)); d.z = Math.max(IZ - hd, Math.min(IZ + hd, d.z)); d.y = Math.max(IY + 0.8, Math.min(IY + room.h - 0.35, d.y)); }
export const inRoom = () => room;
export function rebuild() { if (!room) return; const b = room.b; const px = ST.me.x, pz = ST.me.z, yw = ST.me.yaw; G.scene.remove(room.g); room.g.traverse((o) => { if (o.geometry && o.geometry.userData.batch) o.geometry.dispose(); }); room.vehs.forEach((V) => disposeVehicle(V)); for (const o of hidden) o.visible = true; room = null; ST.inside = null; buildRoom(b); ST.me.x = px; ST.me.z = pz; ST.me.yaw = yw; }
