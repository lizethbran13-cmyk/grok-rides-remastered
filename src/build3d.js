// building + prop generators (smooth rounded geometry, merged into region batches)
import * as THREE from 'three';
import { M, glow } from './mats.js';
import { GEO, mat4, cg } from './geo.js';
import { B, D, Bn } from './chunks.js';
import { textGeo } from './text3d.js';
export const NIGHT = {}; // materials that light up at night
function nm(key, color, o) { if (NIGHT[key]) return NIGHT[key]; const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.15, metalness: 0.5, emissive: 0xffd58a, emissiveIntensity: 0 }, o || {})); m.userData = { keep: true, noUber: true, night: o && o.nightI != null ? o.nightI : 0.9 }; delete m.nightI; NIGHT[key] = m; return m; }
export const GLASS = () => nm('glassLit', 0x8ecdf5, { nightI: 0.85 });
export const GLASS2 = () => nm('glassDark', 0x6fb3e6, { nightI: 0.08 });
export const GLASSW = () => nm('glassWarm', 0x9fd6f7, { nightI: 1.0, emissive: 0xffc46b });
export const LAMP = () => nm('lamp', 0xfff7d6, { roughness: 0.3, metalness: 0, emissive: 0xffe2a0, nightI: 2.4 });
export const NEON = (c) => nm('neon' + c, c, { roughness: 0.35, metalness: 0.1, emissive: c, nightI: 1.6, emissiveIntensity: 0.25 });
const _m = new THREE.Matrix4();
// a "frame" places geometry in a local building frame (x right, z toward the door, y up)
export class Frame {
  constructor(x, y, z, yaw) { this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.base = mat4(x, y, z, 0, yaw, 0); this.c = Math.cos(yaw); this.s = Math.sin(yaw); }
  w(lx, lz) { return [this.x + lx * this.c + lz * this.s, this.z - lx * this.s + lz * this.c]; }
  add(geo, mat, lx, ly, lz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, kind = 'B') {
    const [wx, wz] = [this.x, this.z]; const bt = kind === 'D' ? D(wx, wz) : kind === 'N' ? Bn(wx, wz) : B(wx, wz);
    _m.copy(this.base).multiply(mat4(lx, ly, lz, rx, ry, rz, sx, sy, sz)); bt.add(geo, mat, _m.clone()); return this;
  }
  rb(mat, w, h, d, r, lx, ly, lz, ry = 0, kind) { return this.add(GEO.rbox(w, h, d, r, 2), mat, lx, ly, lz, 0, ry, 0, 1, 1, 1, kind); }
  rb1(mat, w, h, d, r, lx, ly, lz, ry = 0, kind) { return this.add(GEO.rbox(w, h, d, r, 1), mat, lx, ly, lz, 0, ry, 0, 1, 1, 1, kind); }
  bx(mat, w, h, d, lx, ly, lz, ry = 0, kind) { return this.add(GEO.box(w, h, d), mat, lx, ly, lz, 0, ry, 0, 1, 1, 1, kind); }
  text(str, size, mat, lx, ly, lz, ry = 0, kind = 'N') { const g = textGeo(str, size, size * 0.18); return this.add(g, typeof mat === 'number' ? NEON(mat) : mat, lx, ly, lz, 0, ry, 0, 1, 1, 1, kind); }
}
const C = (c, o) => M(c, o || { r: 0.7 });
/* ---------------- shared bits ---------------- */
// window: glass pane + frame + sill, on a face at local z = fz (pointing +z), centred lx, ly
export function windowOn(F, lx, ly, fz, w, h, frame, lit, ry = 0) {
  const gm = lit ? GLASS() : GLASS2();
  const p = (x, z) => { const c = Math.cos(ry), s = Math.sin(ry); return [x * c + z * s, -x * s + z * c]; };
  const put = (geo, mat, x, y, z) => { const [a, b] = p(x, z); F.add(geo, mat, a, y, b, 0, ry, 0); };
  put(GEO.box(w + 0.3, h + 0.3, 0.12), frame, lx, ly, fz + 0.02);
  put(GEO.box(w, h, 0.08), gm, lx, ly, fz + 0.07);
  put(GEO.box(w + 0.5, 0.14, 0.36), frame, lx, ly - h / 2 - 0.14, fz + 0.14);
}
export function awning(F, lx, ly, lz, w, c1, c2) { // striped curved awning
  const n = Math.max(3, Math.round(w / 0.9)), sw = w / n;
  for (let i = 0; i < n; i++) F.add(cg('awn' + sw.toFixed(2), () => new THREE.CylinderGeometry(1, 1, sw, 14, 1, true, 0, Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2)), M(i % 2 ? c2 : c1, { r: 0.6, side: THREE.DoubleSide }), lx - w / 2 + sw * (i + 0.5), ly - 1, lz, 0, Math.PI / 2, 0, 1, 1, 1);
  F.rb1(M(c1, { r: 0.6 }), w + 0.1, 0.18, 0.18, 0.06, lx, ly - 0.95, lz + 1.02);
}
export function door(F, lz, col, w = 1.6, h = 2.5, glowDoor = true) {
  F.rb(C(col, { r: 0.45, cc: 0.4 }), w, h, 0.2, 0.08, 0, h / 2, lz + 0.05);
  F.bx(GLASS(), w * 0.6, h * 0.5, 0.06, 0, h * 0.62, lz + 0.16);
  F.add(GEO.sphere(0.07, 10, 8), M(0xfacc15, { r: 0.2, m: 1 }), w * 0.36, h * 0.45, lz + 0.22);
  F.rb1(C(0xffffff), w + 0.5, 0.22, 0.32, 0.08, 0, h + 0.11, lz + 0.1);
  if (glowDoor) F.add(GEO.torus(1.4, 0.06, Math.PI, 8, 24), glow(0x4ade80, 0.55), 0, 0.02, lz + 0.5, -Math.PI / 2, 0, 0, 1, 1, 1, 'N'); // enterable marker
  F.rb1(C(0x94a3b8, { r: 0.8 }), w + 1.2, 0.16, 1.4, 0.06, 0, 0.08, lz + 0.75); // step
}
export function sign(F, text, lx, ly, lz, size, board, letter, ry = 0) {
  const g = textGeo(text, size, size * 0.18), w = g.userData.w + size * 1.2;
  F.rb(C(board, { r: 0.45, cc: 0.5 }), w, size * 1.7, 0.35, 0.15, lx, ly, lz, ry);
  const c = Math.cos(ry), s = Math.sin(ry); F.add(g, NEON(letter), lx + 0.2 * s, ly - size * 0.45, lz + 0.18 * c, 0, ry, 0, 1, 1, 1, 'N');
  return w;
}
/* ---------------- props ---------------- */
const greens = [0x4caf50, 0x5cbf4a, 0x3f9e44, 0x6cc24a, 0x7ccf3a];
export function tree(x, y, z, s = 1, kind = 'round', seed = 0) {
  const b = B(x, z), d = D(x, z); void d;
  if (kind === 'round') {
    b.mesh(GEO.cyl(0.22 * s, 0.32 * s, 2.6 * s, 10), M(0x8b5a2b, { r: 0.9 }), x, y + 1.3 * s, z);
    const g = M(greens[seed % 5], { r: 0.8 });
    b.mesh(GEO.sphere(1.6 * s, 14, 10), g, x, y + 3.6 * s, z); b.mesh(GEO.sphere(1.15 * s, 12, 9), g, x + 0.9 * s, y + 3.1 * s, z + 0.4 * s); b.mesh(GEO.sphere(1.1 * s, 12, 9), g, x - 0.7 * s, y + 3.3 * s, z - 0.6 * s); b.mesh(GEO.sphere(0.95 * s, 12, 9), g, x + 0.1 * s, y + 4.6 * s, z - 0.2 * s);
  } else if (kind === 'pine' || kind === 'snowpine') {
    b.mesh(GEO.cyl(0.2 * s, 0.3 * s, 2 * s, 8), M(0x6b4423, { r: 0.9 }), x, y + 1 * s, z);
    const g = M(kind === 'snowpine' ? 0x2f7d4a : 0x2e8b57, { r: 0.8 }), sn = M(0xf8fbff, { r: 0.6 });
    for (let i = 0; i < 3; i++) { b.mesh(GEO.cone((1.9 - i * 0.45) * s, 2.4 * s, 14), g, x, y + (2.2 + i * 1.35) * s, z); if (kind === 'snowpine') b.mesh(GEO.cone((1.3 - i * 0.35) * s, 1.1 * s, 14), sn, x, y + (2.95 + i * 1.35) * s, z); }
  } else if (kind === 'palm') {
    const tr = M(0xa47148, { r: 0.85 }); let px = x, pz = z, py = y; const lean = seed * 1.7, lx = Math.cos(lean) * 0.18 * s, lz = Math.sin(lean) * 0.18 * s;
    for (let i = 0; i < 7; i++) { b.mesh(GEO.cyl(0.2 * s, 0.26 * s, 1.0 * s, 9), tr, px, py + 0.5 * s, pz, lz * 0.6, 0, -lx * 0.6); px += lx * (i * 0.25); pz += lz * (i * 0.25); py += 0.95 * s; }
    const lf = M(0x22a447, { r: 0.7 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + seed; b.mesh(GEO.sphere(1, 12, 6), lf, px + Math.cos(a) * 1.4 * s, py + 0.1 * s, pz + Math.sin(a) * 1.4 * s, 0, -a, -0.35, 1.8 * s, 0.14 * s, 0.5 * s); }
    b.mesh(GEO.sphere(0.22 * s, 10, 8), M(0x7c4a1e), px + 0.2 * s, py - 0.2 * s, pz, 0, 0, 0); b.mesh(GEO.sphere(0.22 * s, 10, 8), M(0x7c4a1e), px - 0.15 * s, py - 0.25 * s, pz + 0.15 * s);
  } else if (kind === 'cactus') {
    const g = M(0x3fa34d, { r: 0.7 }); b.mesh(GEO.cap(0.42 * s, 2.6 * s, 12), g, x, y + 1.7 * s, z);
    b.mesh(GEO.cap(0.28 * s, 0.9 * s, 10), g, x + 0.7 * s, y + 2 * s, z); b.mesh(GEO.cap(0.26 * s, 0.6 * s, 10), g, x + 0.45 * s, y + 1.45 * s, z, 0, 0, Math.PI / 2);
    b.mesh(GEO.cap(0.26 * s, 0.7 * s, 10), g, x - 0.65 * s, y + 2.4 * s, z); b.mesh(GEO.cap(0.24 * s, 0.5 * s, 10), g, x - 0.42 * s, y + 1.95 * s, z, 0, 0, Math.PI / 2);
    b.mesh(GEO.sphere(0.16 * s, 8, 6), M(0xff5fa2), x, y + 3.25 * s, z);
  } else if (kind === 'bush') { const g = M(greens[(seed + 2) % 5], { r: 0.8 }); b.mesh(GEO.sphere(0.9 * s, 12, 9), g, x, y + 0.6 * s, z, 0, 0, 0, 1.3, 0.8, 1.1); b.mesh(GEO.sphere(0.6 * s, 10, 8), g, x + 0.7 * s, y + 0.5 * s, z + 0.2 * s); }
}
export function rock(x, y, z, s = 1, seed = 1, color = 0x9a8f86) { B(x, z).mesh(GEO.rock(seed % 6, 1), M(color, { r: 0.9 }), x, y + 0.3 * s, z, 0, seed, 0, s, s * 0.8, s); }
export function streetLamp(x, y, z, ry) { // pole + curved arm + glowing lamp head (lights up at night)
  const b = B(x, z), pole = M(0x334155, { r: 0.35, m: 0.7 }); const c = Math.sin(ry), s2 = Math.cos(ry);
  b.mesh(GEO.cyl(0.11, 0.15, 6.4, 10), pole, x, y + 3.2, z); b.mesh(GEO.cyl(0.24, 0.3, 0.4, 12), pole, x, y + 0.2, z);
  b.mesh(GEO.torus(0.8, 0.07, Math.PI / 2, 6, 12), pole, x + c * 0.8, y + 6.4, z + s2 * 0.8, 0, ry + Math.PI / 2, 0);
  b.mesh(GEO.rbox(0.7, 0.22, 0.42, 0.1, 2), pole, x + c * 1.6, y + 7.15, z + s2 * 1.6, 0, ry, 0);
  Bn(x, z).mesh(GEO.rbox(0.56, 0.08, 0.32, 0.04, 1), LAMP(), x + c * 1.6, y + 7.02, z + s2 * 1.6, 0, ry, 0);
}
export function bench(x, y, z, ry) { const F = new Frame(x, y, z, ry), w = M(0xb45309, { r: 0.7 }), m = M(0x1f2937, { r: 0.4, m: 0.6 });
  for (let i = 0; i < 3; i++) F.rb1(w, 1.8, 0.08, 0.16, 0.03, 0, 0.5, -0.2 + i * 0.2, 0, 'D'); for (let i = 0; i < 2; i++) F.rb1(w, 1.8, 0.16, 0.06, 0.03, 0, 0.75 + i * 0.22, -0.32, 0, 'D');
  for (const sx of [-0.75, 0.75]) F.rb1(m, 0.08, 0.5, 0.5, 0.03, sx, 0.25, -0.05, 0, 'D'); }
export function hydrant(x, y, z) { const b = D(x, z), r = M(0xef4444, { r: 0.35, cc: 0.6 }); b.mesh(GEO.cyl(0.18, 0.2, 0.7, 12), r, x, y + 0.35, z); b.mesh(GEO.sphere(0.19, 12, 8), r, x, y + 0.72, z); b.mesh(GEO.cyl(0.07, 0.07, 0.5, 8), r, x, y + 0.45, z, 0, 0, Math.PI / 2); }
export function bin(x, y, z) { const b = D(x, z); b.mesh(GEO.cyl(0.32, 0.27, 0.9, 14), M(0x16a34a, { r: 0.5, cc: 0.3 }), x, y + 0.45, z); b.mesh(GEO.cyl(0.35, 0.35, 0.08, 14), M(0x15803d, { r: 0.5 }), x, y + 0.93, z); }
export function flowerBed(x, y, z, w, d, seed = 0) { const b = D(x, z); b.mesh(GEO.rbox(w, 0.4, d, 0.12, 2), M(0x9ca3af, { r: 0.8 }), x, y + 0.2, z); b.mesh(GEO.rbox(w - 0.3, 0.12, d - 0.3, 0.05, 1), M(0x5b3a1e, { r: 1 }), x, y + 0.38, z);
  const cols = [0xef4444, 0xfacc15, 0xec4899, 0xf97316, 0xa855f7, 0xffffff]; let k = seed; for (let i = -w / 2 + 0.45; i < w / 2 - 0.3; i += 0.55) for (let j = -d / 2 + 0.45; j < d / 2 - 0.3; j += 0.55) { k++; b.mesh(GEO.sphere(0.16, 8, 6), M(cols[k % 6], { r: 0.6 }), x + i, y + 0.55, z + j); b.mesh(GEO.sphere(0.13, 8, 6), M(0x3f9e44, { r: 0.8 }), x + i + 0.1, y + 0.47, z + j + 0.1); } }
export function trafficLight(x, y, z, ry) { // returns the head groups' world positions for the signal lamps (lit by the junction logic)
  const F = new Frame(x, y, z, ry), m = M(0x1f2937, { r: 0.35, m: 0.6 });
  F.add(GEO.cyl(0.12, 0.15, 5.6, 10), m, 0, 2.8, 0); F.add(GEO.cyl(0.08, 0.08, 4.2, 8), m, 0, 5.5, -2.1, Math.PI / 2, 0, 0);
  F.rb(M(0xfacc15, { r: 0.4, cc: 0.5 }), 0.6, 1.7, 0.5, 0.15, 0, 4.9, -3.9);
  return [F.w(0, -3.9), y + 4.9];
}
export function busStop(x, y, z, ry) { const F = new Frame(x, y, z, ry), m = M(0x2563eb, { r: 0.4, cc: 0.4 });
  F.rb(m, 0.14, 2.6, 0.14, 0.05, -1.8, 1.3, -0.6); F.rb(m, 0.14, 2.6, 0.14, 0.05, 1.8, 1.3, -0.6); F.rb(M(0xe0f2fe, { r: 0.1, op: 0.45 }), 3.6, 2.2, 0.06, 0.03, 0, 1.3, -0.65, 0, 'N');
  F.rb(m, 4.2, 0.18, 1.8, 0.08, 0, 2.7, 0); F.rb1(M(0xb45309, { r: 0.7 }), 3, 0.12, 0.45, 0.04, 0, 0.55, -0.35); F.rb(M(0xffffff, { r: 0.4 }), 0.7, 0.7, 0.08, 0.1, 2.3, 2.4, 0.2);
  F.text('BUS', 0.22, 0x2563eb, 2.3, 2.27, 0.26); }
export function fence(x0, z0, x1, z1, y, color = 0xffffff) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.2)), ry = Math.atan2(x1 - x0, z1 - z0), m = M(color, { r: 0.6 });
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; D(x, z).mesh(GEO.rbox(0.14, 1.1, 0.14, 0.04, 1), m, x, y + 0.55, z); }
  for (const h of [0.45, 0.85]) { const x = (x0 + x1) / 2, z = (z0 + z1) / 2; D(x, z).mesh(GEO.rbox(0.07, 0.12, L, 0.03, 1), m, x, y + h, z, 0, ry, 0); } }
export function parkedCarGeo() { return null; }
