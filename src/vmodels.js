// Grok Rides Remastered - smooth, rounded procedural vehicles (spline side-profiles with beveled edges, lathe tyres, real rims,
// glass cabins with seats and a seated driver). Origin = ground under the middle of the vehicle, +z = forward, +x = driver side.
import * as THREE from 'three';
import { M, glow } from './mats.js';
import { GEO, Batch, cg, lathe } from './geo.js';
import { makePerson, animPerson } from './people.js';
import { VEH } from './data.js';
import { NEON } from './build3d.js';
const PI = Math.PI;
const mesh = (g, m, x = 0, y = 0, z = 0, p, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; };
export function paintMat(color, fin = 'gloss') { const F = { gloss: [0.28, 0.35, 1], metal: [0.22, 0.75, 1], matte: [0.75, 0.1, 0], pearl: [0.18, 0.45, 1] }[fin] || [0.28, 0.35, 1];
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: F[0], metalness: F[1], clearcoat: F[2], clearcoatRoughness: 0.12 }); m.userData.noUber = true; return m; }
const GLASSV = () => cg('vglass', () => { const m = new THREE.MeshPhysicalMaterial({ color: 0x1b2a3f, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.72 }); m.userData = { keep: true, noUber: true }; return m; });
const TIRE = () => M(0x1f2328, { r: 0.85 }), CHROME = () => M(0xe5e7eb, { r: 0.12, m: 1 }), DARK = () => M(0x111827, { r: 0.5 }), TRIM = () => M(0x23272f, { r: 0.55 });
export const HEAD = () => cg('vhead', () => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 0.6, roughness: 0.1 }); m.userData = { keep: true, noUber: true }; return m; });
export const TAIL = () => cg('vtail', () => { const m = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xff1a1a, emissiveIntensity: 0.5, roughness: 0.2 }); m.userData = { keep: true, noUber: true }; return m; });
// smooth side profile: points [z, y] traced through with a spline, beveled across the width
function prof(key, pts, width, bevel, arches) {
  return cg('vp' + key, () => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    if (arches) { // bottom edge with wheel arches: arches = [[zc, r], ...] from rear to front
      const y0 = pts[0][1]; for (const [zc, r] of arches) { s.lineTo(zc - r, y0); s.absarc(zc, y0, r, PI, 0, true); } s.lineTo(pts[1][0], pts[1][1]);
      s.splineThru(pts.slice(2).map((p) => new THREE.Vector2(p[0], p[1])));
    } else s.splineThru(pts.slice(1).map((p) => new THREE.Vector2(p[0], p[1])));
    s.closePath();
    const w = Math.max(0.05, width - bevel * 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 5, curveSegments: 18, steps: 1 });
    g.translate(0, 0, -w / 2); g.rotateY(-PI / 2); g.computeVertexNormals(); return g;
  });
}
function tireGeo(r, w) { return cg('tire' + r + w, () => { const pts = []; const n = 10, rr = Math.min(w * 0.45, r * 0.3); for (let i = 0; i <= n; i++) { const a = -PI / 2 + i / n * PI; pts.push([r - rr + Math.cos(a) * rr, Math.sin(a) * (w / 2)]); } pts.unshift([r * 0.62, -w / 2]); pts.push([r * 0.62, w / 2]); const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 28); g.rotateZ(PI / 2); return g; }); }
function rimGeo(r, w, style) {
  return cg('rim' + r + w + style, () => {
    const B2 = new Batch(), parts = [], add = (g, m) => parts.push(g.applyMatrix4(m));
    const disc = new THREE.CylinderGeometry(r * 0.64, r * 0.64, w * 0.5, 24).rotateZ(PI / 2); parts.push(disc);
    const n = style === 'star' ? 6 : style === 'mesh' ? 12 : style === 'disc' ? 0 : 5;
    for (let i = 0; i < n; i++) { const a = i / n * PI * 2; const g = new THREE.BoxGeometry(w * 0.2, r * 0.55, style === 'mesh' ? 0.04 : 0.09); add(g, new THREE.Matrix4().makeRotationX(a).multiply(new THREE.Matrix4().makeTranslation(w * 0.28, r * 0.3, 0))); }
    add(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w * 0.62, 12).rotateZ(PI / 2), new THREE.Matrix4());
    void B2; const { mergeGeometries } = THREE.BufferGeometryUtils || {}; void mergeGeometries;
    return mergeList(parts);
  });
}
function mergeList(list) { // tiny merge for cached parts (non-indexed)
  let n = 0; const ni = list.map((g) => { const q = g.index ? g.toNonIndexed() : g; n += q.attributes.position.count; return q; });
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3); let o = 0; for (const g of ni) { if (!g.attributes.normal) g.computeVertexNormals(); P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); return g;
}
const RIMCOL = { std: 0xd1d5db, star: 0xe5e7eb, disc: 0xf8fafc, mesh: 0xcbd5e1, gold: 0xfacc15, neon: 0x22d3ee };
function wheel(V, x, y, z, r, w, front, rimStyle = 'std') {
  const steer = new THREE.Group(); steer.position.set(x, y, z); V.root.add(steer);
  const spin = new THREE.Group(); steer.add(spin);
  mesh(tireGeo(r, w), TIRE(), 0, 0, 0, spin);
  const rimM = rimStyle === 'neon' ? NEON(0x22d3ee) : M(RIMCOL[rimStyle] || RIMCOL.std, { r: 0.15, m: 1 });
  const rim = mesh(rimGeo(r, w, rimStyle), rimM, Math.sign(x) * w * 0.12, 0, 0, spin); V.rims.push(rim);
  V.wheels.push({ steer, spin, x, z, r, front, y }); return steer;
}
// generic car / truck / van / bus builder
function car(V, o) {
  const L = o.L, Wd = o.W, root = V.body, paint = V.paint, wr = o.wr, wb = o.wb, y0 = o.ride;
  const arches = o.noArch ? null : [[-wb / 2, wr + 0.12], [wb / 2, wr + 0.12]];
  const lower = [[-L / 2, y0], [L / 2, y0], ...o.lower];
  const g = prof(o.key + 'lo', lower, Wd, o.bev || 0.22, arches ? arches.map(([z, r]) => [z, r]) : null);
  mesh(g, paint, 0, 0, 0, root);
  if (o.cab) { const cg2 = prof(o.key + 'cab', o.cab, Wd - (o.cabIn || 0.3), o.cabBev || 0.2); mesh(cg2, GLASSV(), 0, 0, 0, root); }
  if (o.roof) { const rg = prof(o.key + 'roof', o.roof, Wd - (o.cabIn || 0.3) + 0.04, 0.12); mesh(rg, paint, 0, 0, 0, root); }
  for (const p of o.pillars || []) mesh(GEO.rbox(Wd - (o.cabIn || 0.3) + 0.06, p[2], 0.14, 0.05, 1), paint, 0, p[1], p[0], root, p[3] || 0);
  // bumpers, grille, lights, plates, mirrors
  const fz = L / 2, rz = -L / 2;
  mesh(GEO.rbox(Wd + 0.06, 0.26, 0.3, 0.12, 2), TRIM(), 0, y0 + 0.18, fz - 0.05, root); mesh(GEO.rbox(Wd + 0.06, 0.26, 0.3, 0.12, 2), TRIM(), 0, y0 + 0.18, rz + 0.05, root);
  const hy = o.headY || y0 + 0.5;
  for (const s of [-1, 1]) {
    const h = mesh(GEO.sphere(0.17, 16, 12), HEAD(), s * (Wd / 2 - 0.32), hy, fz - 0.06, root); h.scale.set(1.3, 0.75, 0.5); V.heads.push(h);
    const t = mesh(GEO.sphere(0.15, 14, 10), TAIL(), s * (Wd / 2 - 0.28), hy + 0.05, rz + 0.06, root); t.scale.set(1.4, 0.7, 0.45); V.tails.push(t);
    if (!o.noMirror) mesh(GEO.rbox(0.12, 0.16, 0.24, 0.05, 1), paint, s * (Wd / 2 + 0.06), o.mirrorY || y0 + 0.9, o.mirrorZ || 0.9, root);
  }
  mesh(GEO.rbox(Wd * 0.46, 0.22, 0.08, 0.06, 1), DARK(), 0, hy, fz - 0.02, root); // grille
  mesh(GEO.rbox(0.5, 0.16, 0.04, 0.03, 1), M(0xfefce8, { r: 0.4 }), 0, y0 + 0.2, rz - 0.13, root); // plate
  // interior: seats + steering wheel
  if (o.cab && !o.noSeats) { const sm = M(o.seat || 0x334155, { r: 0.75 }); for (const s of [-1, 1]) { mesh(GEO.rbox(0.52, 0.18, 0.5, 0.08, 1), sm, s * 0.38, o.seatY || y0 + 0.42, o.seatZ || -0.1, root); mesh(GEO.rbox(0.5, 0.62, 0.14, 0.07, 1), sm, s * 0.38, (o.seatY || y0 + 0.42) + 0.36, (o.seatZ || -0.1) - 0.26, root, -0.15); }
    const sw = mesh(GEO.torus(0.17, 0.03, PI * 2, 8, 20), DARK(), 0.38, (o.seatY || y0 + 0.42) + 0.48, (o.seatZ || -0.1) + 0.52, root, -0.9); void sw; }
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) wheel(V, x * (Wd / 2 - (o.wIn || 0.14)), wr, z * wb / 2, wr, o.ww || 0.32, z > 0, V.rim);
  V.seat = { x: 0.38, y: (o.seatY || y0 + 0.42) - 0.38, z: o.seatZ || -0.1 };
  V.dims = { L, W: Wd, H: o.H || 1.6 };
}
// the bodies (side profiles are [z, y] from the front bumper top, going over the vehicle to the rear)
const BODIES = {
  hatch: (V) => car(V, { key: 'hatch', L: 3.9, W: 1.82, wr: 0.34, wb: 2.45, ride: 0.3, lower: [[1.98, 0.62], [1.7, 0.88], [0.75, 1.0], [-1.6, 1.02], [-1.96, 0.85], [-1.96, 0.5]], cab: [[0.8, 0.98], [0.15, 1.45], [-1.3, 1.5], [-1.75, 1.0]], roof: [[0.2, 1.43], [-1.32, 1.47], [-1.36, 1.6], [0.05, 1.56]], pillars: [[-0.55, 1.22, 0.5]], H: 1.6 }),
  sedan: (V) => car(V, { key: 'sedan', L: 4.5, W: 1.86, wr: 0.35, wb: 2.75, ride: 0.3, lower: [[2.28, 0.6], [2.15, 0.85], [0.95, 0.98], [-1.3, 1.0], [-2.2, 0.92], [-2.27, 0.55]], cab: [[1.0, 0.96], [0.25, 1.43], [-0.95, 1.46], [-1.5, 0.98]], roof: [[0.3, 1.41], [-0.95, 1.44], [-1.0, 1.56], [0.2, 1.54]], pillars: [[-0.35, 1.2, 0.5]], H: 1.55 }),
  sports: (V) => car(V, { key: 'sports', L: 4.5, W: 1.95, wr: 0.36, wb: 2.7, ride: 0.22, ww: 0.38, lower: [[2.3, 0.45], [2.05, 0.66], [0.75, 0.8], [-1.4, 0.88], [-2.25, 0.9], [-2.28, 0.45]], cab: [[0.8, 0.78], [0.0, 1.16], [-0.85, 1.18], [-1.55, 0.86]], roof: [[0.05, 1.14], [-0.85, 1.16], [-0.9, 1.26], [-0.05, 1.25]], headY: 0.55, seatY: 0.42, mirrorY: 0.95, H: 1.25 }),
  super: (V) => { car(V, { key: 'super', L: 4.6, W: 2.0, wr: 0.37, wb: 2.75, ride: 0.18, ww: 0.42, lower: [[2.36, 0.38], [2.1, 0.55], [0.7, 0.72], [-1.6, 0.86], [-2.3, 0.82], [-2.32, 0.4]], cab: [[0.75, 0.7], [-0.1, 1.08], [-0.9, 1.1], [-1.7, 0.84]], roof: [[-0.05, 1.06], [-0.9, 1.08], [-0.95, 1.17], [-0.12, 1.16]], headY: 0.48, seatY: 0.35, mirrorY: 0.88, H: 1.15 });
    mesh(GEO.rbox(1.9, 0.08, 0.42, 0.04, 1), M(0x111827, { r: 0.4 }), 0, 1.2, -2.05, V.body); for (const s of [-0.7, 0.7]) mesh(GEO.rbox(0.06, 0.32, 0.22, 0.02, 1), M(0x111827), s, 1.0, -2.05, V.body); },
  muscle: (V) => { car(V, { key: 'muscle', L: 4.8, W: 1.98, wr: 0.38, wb: 2.85, ride: 0.28, ww: 0.4, lower: [[2.42, 0.62], [2.3, 0.9], [0.65, 1.0], [-1.35, 1.0], [-2.38, 0.95], [-2.4, 0.55]], cab: [[0.7, 0.98], [0.05, 1.36], [-0.95, 1.38], [-1.45, 0.98]], roof: [[0.1, 1.34], [-0.95, 1.36], [-1.0, 1.47], [0.0, 1.46]], H: 1.45 });
    mesh(GEO.rbox(0.7, 0.18, 1.2, 0.08, 2), M(0x111827, { r: 0.35, m: 0.6 }), 0, 1.05, 1.5, V.body); for (const s of [-0.25, 0.25]) mesh(GEO.rbox(0.12, 0.02, 4.7, 0.01, 1), M(0xffffff), s, 1.03, 0, V.body); },
  police: (V) => { BODIES.sedan(V); const bar = mesh(GEO.rbox(1.3, 0.16, 0.38, 0.06, 2), M(0x111827), 0, 1.62, -0.35, V.body); void bar; V.siren = [mesh(GEO.rbox(0.55, 0.14, 0.3, 0.05, 1), NEON(0xef4444), 0.33, 1.72, -0.35, V.body), mesh(GEO.rbox(0.55, 0.14, 0.3, 0.05, 1), NEON(0x3b82f6), -0.33, 1.72, -0.35, V.body)];
    for (const s of [-1, 1]) mesh(GEO.rbox(0.04, 0.45, 2.6, 0.02, 1), M(0xffffff, { r: 0.4 }), s * 0.95, 0.7, 0, V.body); },
  limo: (V) => car(V, { key: 'limo', L: 7.4, W: 1.95, wr: 0.36, wb: 5.2, ride: 0.3, lower: [[3.68, 0.6], [3.55, 0.85], [2.35, 0.98], [-2.6, 1.0], [-3.62, 0.92], [-3.68, 0.55]], cab: [[2.4, 0.96], [1.7, 1.42], [-2.2, 1.46], [-2.7, 0.98]], roof: [[1.75, 1.4], [-2.2, 1.44], [-2.25, 1.56], [1.65, 1.54]], pillars: [[1.0, 1.2, 0.5], [-0.6, 1.2, 0.5]], seatZ: 1.35, H: 1.55 }),
  taxi: (V) => { BODIES.sedan(V); mesh(GEO.rbox(0.9, 0.3, 0.32, 0.1, 2), M(0xfacc15, { e: 0xffd34d, ei: 0.4, r: 0.4 }), 0, 1.72, -0.3, V.body); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) mesh(GEO.box(0.03, 0.12, 0.16), M(i % 2 ? 0x111111 : 0xffffff), s * 0.94, 0.62, -0.6 + i * 0.32, V.body); },
  pickup: (V) => { car(V, { key: 'pickup', L: 5.2, W: 2.0, wr: 0.43, wb: 3.2, ride: 0.5, ww: 0.42, lower: [[2.6, 0.95], [2.45, 1.25], [1.4, 1.32], [-2.5, 1.32], [-2.6, 0.85]], cab: [[1.42, 1.3], [0.85, 1.95], [-0.3, 1.97], [-0.5, 1.3]], roof: [[0.88, 1.92], [-0.3, 1.94], [-0.32, 2.06], [0.8, 2.04]], seatY: 0.95, seatZ: 0.35, headY: 1.05, mirrorY: 1.6, mirrorZ: 1.2, H: 2.05 });
    mesh(GEO.rbox(1.9, 0.5, 0.12, 0.04, 1), V.paint, 0, 1.5, -0.6, V.body); for (const s of [-1, 1]) mesh(GEO.rbox(0.12, 0.45, 1.95, 0.04, 1), V.paint, s * 0.93, 1.52, -1.55, V.body); mesh(GEO.rbox(1.9, 0.45, 0.12, 0.04, 1), V.paint, 0, 1.52, -2.52, V.body); mesh(GEO.rbox(1.7, 0.05, 1.85, 0.02, 1), DARK(), 0, 1.32, -1.55, V.body); },
  tow: (V) => { car(V, { key: 'towcab', L: 5.6, W: 2.05, wr: 0.44, wb: 3.4, ride: 0.52, ww: 0.42, lower: [[2.8, 0.95], [2.65, 1.28], [1.6, 1.34], [-2.75, 1.34], [-2.8, 0.85]], cab: [[1.62, 1.32], [1.05, 2.0], [-0.1, 2.02], [-0.3, 1.32]], roof: [[1.08, 1.97], [-0.1, 1.99], [-0.12, 2.11], [1.0, 2.09]], seatY: 0.98, seatZ: 0.55, headY: 1.05, mirrorY: 1.6, mirrorZ: 1.4, H: 2.1 });
    const yb = M(0xfacc15, { r: 0.45, cc: 0.4 }); mesh(GEO.rbox(0.9, 0.12, 0.3, 0.04, 1), NEON(0xf59e0b), 0, 2.16, 0.5, V.body);
    const boom = V.boom = new THREE.Group(); boom.position.set(0, 1.5, -2.1); V.body.add(boom); mesh(GEO.rbox(0.25, 0.25, 2.2, 0.08, 2), yb, 0, 0.55, -0.7, boom, -0.45); mesh(GEO.cyl(0.03, 0.03, 0.9, 6), DARK(), 0, 0.55, -1.7, boom);
    V.hook = mesh(GEO.torus(0.14, 0.04, PI * 1.5, 8, 14), CHROME(), 0, 0.05, -1.7, boom); mesh(GEO.rbox(1.8, 0.3, 0.4, 0.1, 1), yb, 0, 1.45, -2.7, V.body); },
  icecream: (V) => { car(V, { key: 'icecream', L: 5.4, W: 2.1, wr: 0.42, wb: 3.3, ride: 0.42, noArch: false, lower: [[2.7, 0.95], [2.62, 1.3], [1.9, 1.45], [1.6, 2.7], [-2.6, 2.75], [-2.7, 0.8]], cab: [[1.95, 1.42], [1.62, 2.4], [1.0, 2.42], [1.0, 1.45]], cabIn: 0.1, seatZ: 1.25, seatY: 0.95, headY: 1.0, mirrorY: 1.8, mirrorZ: 2.0, H: 2.8 });
    for (let i = 0; i < 9; i++) mesh(GEO.rbox(0.04, 0.32, 0.55, 0.02, 1), M([0xf472b6, 0x60a5fa, 0xfacc15][i % 3], { r: 0.5 }), 1.04, 1.25, -2.2 + i * 0.5, V.body);
    mesh(GEO.rbox(0.06, 0.9, 1.9, 0.05, 1), GLASSV(), -1.05, 1.95, -0.6, V.body); mesh(GEO.rbox(0.5, 0.08, 2.1, 0.03, 1), M(0xfdf2f8), -1.25, 1.42, -0.6, V.body); // serving window + counter
    const cone = new THREE.Group(); cone.position.set(0, 2.8, -0.4); V.body.add(cone); mesh(GEO.cone(0.45, 1.3, 20), M(0xe0a458, { r: 0.7 }), 0, 0.55, 0, cone, PI); mesh(GEO.sphere(0.55, 20, 14), M(0xff9ec4, { r: 0.5 }), 0, 1.35, 0, cone); mesh(GEO.sphere(0.45, 18, 12), M(0xfff7d6, { r: 0.5 }), 0, 1.85, 0, cone); mesh(GEO.sphere(0.12, 10, 8), M(0xef4444, { r: 0.2, cc: 1 }), 0, 2.3, 0, cone); V.cone = cone; },
  bus: (V) => { car(V, { key: 'bus', L: 10.5, W: 2.5, wr: 0.5, wb: 6.4, ride: 0.42, bev: 0.32, lower: [[5.25, 1.0], [5.18, 2.9], [4.6, 3.15], [-5.1, 3.15], [-5.25, 2.8], [-5.25, 0.8]], noSeats: true, headY: 0.85, mirrorY: 2.4, mirrorZ: 5.0, H: 3.2 });
    const g = GLASSV(); for (const s of [-1, 1]) mesh(GEO.rbox(0.06, 1.0, 8.6, 0.05, 1), g, s * 1.23, 2.2, -0.4, V.body); mesh(GEO.rbox(2.1, 1.3, 0.06, 0.1, 1), g, 0, 2.15, 5.22, V.body);
    mesh(GEO.rbox(0.06, 2.0, 1.1, 0.04, 1), g, -1.24, 1.45, 3.9, V.body); mesh(GEO.rbox(1.8, 0.36, 0.08, 0.05, 1), NEON(0xfacc15), 0, 2.98, 5.24, V.body);
    for (const s of [-1, 1]) mesh(GEO.rbox(0.05, 0.22, 10.2, 0.02, 1), M(0xffffff), s * 1.26, 1.35, 0, V.body); V.seat = { x: 0.7, y: 0.85, z: 4.4 }; },
  fire: (V) => { car(V, { key: 'fire', L: 8.6, W: 2.4, wr: 0.5, wb: 5.0, ride: 0.48, bev: 0.25, lower: [[4.3, 1.0], [4.24, 1.55], [3.95, 2.75], [2.4, 2.8], [2.3, 2.3], [-4.25, 2.3], [-4.3, 0.9]], cab: [[4.05, 2.3], [3.85, 2.62], [2.6, 2.62], [2.6, 2.3]], cabIn: 0.1, noSeats: true, headY: 0.9, mirrorY: 2.2, mirrorZ: 3.6, H: 2.9 });
    const wh = M(0xffffff, { r: 0.4 }), ch = CHROME(); for (const s of [-1, 1]) { mesh(GEO.rbox(0.05, 0.2, 8.2, 0.02, 1), wh, s * 1.21, 1.35, 0, V.body); for (let i = 0; i < 4; i++) mesh(GEO.rbox(0.05, 1.0, 1.1, 0.05, 1), ch, s * 1.21, 1.75, -3.4 + i * 1.3, V.body); }
    mesh(GEO.rbox(1.3, 0.16, 0.36, 0.06, 1), DARK(), 0, 2.85, 3.3, V.body); V.siren = [mesh(GEO.rbox(0.55, 0.15, 0.3, 0.05, 1), NEON(0xef4444), 0.33, 2.97, 3.3, V.body), mesh(GEO.rbox(0.55, 0.15, 0.3, 0.05, 1), NEON(0xef4444), -0.33, 2.97, 3.3, V.body)];
    const lad = new THREE.Group(); lad.position.set(0, 2.55, -0.6); V.body.add(lad); for (const s of [-0.45, 0.45]) mesh(GEO.rbox(0.1, 0.12, 5.6, 0.04, 1), ch, s, 0.1, 0, lad); for (let i = 0; i < 12; i++) mesh(GEO.cyl(0.035, 0.035, 0.9, 6), ch, 0, 0.1, -2.6 + i * 0.47, lad, 0, 0, PI / 2);
    const tur = V.turret = new THREE.Group(); tur.position.set(0, 2.45, 1.6); V.body.add(tur); mesh(GEO.cyl(0.28, 0.32, 0.3, 14), ch, 0, 0.1, 0, tur); const nz = V.nozzle = new THREE.Group(); nz.position.y = 0.3; tur.add(nz); mesh(GEO.cyl(0.08, 0.12, 1.2, 12), ch, 0, 0, 0.5, nz, PI / 2, 0, 0);
    V.seat = { x: 0.55, y: 1.05, z: 3.2 }; },
  rig: (V) => { car(V, { key: 'rig', L: 7.2, W: 2.45, wr: 0.52, wb: 4.6, ride: 0.55, bev: 0.25, lower: [[3.6, 1.05], [3.55, 1.6], [3.2, 3.0], [1.5, 3.1], [1.4, 1.6], [-3.55, 1.55], [-3.6, 0.95]], cab: [[3.4, 1.85], [3.22, 2.7], [2.2, 2.75], [2.2, 1.85]], cabIn: 0.1, noSeats: true, headY: 0.95, mirrorY: 2.3, mirrorZ: 3.0, H: 3.1 });
    mesh(GEO.rbox(2.5, 2.9, 4.6, 0.25, 2), M(0xf8fafc, { r: 0.55 }), 0, 3.0, -1.2, V.body); for (const s of [-1, 1]) { mesh(GEO.cyl(0.1, 0.1, 1.8, 10), CHROME(), s * 1.0, 3.3, 1.55, V.body); mesh(GEO.cyl(0.32, 0.32, 1.2, 14), CHROME(), s * 1.25, 0.95, 1.9, V.body, PI / 2, 0, 0); }
    mesh(GEO.rbox(0.05, 1.1, 3.6, 0.04, 1), V.paint, 1.26, 3.0, -1.2, V.body); mesh(GEO.rbox(0.05, 1.1, 3.6, 0.04, 1), V.paint, -1.26, 3.0, -1.2, V.body); V.seat = { x: 0.6, y: 1.2, z: 2.7 }; },
  monster: (V) => { car(V, { key: 'monster', L: 4.6, W: 2.2, wr: 0.95, wb: 3.0, ride: 1.55, ww: 0.85, wIn: -0.15, noArch: true, lower: [[2.3, 1.95], [2.18, 2.2], [1.0, 2.3], [-2.2, 2.3], [-2.3, 1.85]], cab: [[1.02, 2.28], [0.5, 2.95], [-0.6, 2.97], [-0.8, 2.28]], roof: [[0.52, 2.92], [-0.6, 2.94], [-0.62, 3.06], [0.45, 3.04]], seatY: 1.95, seatZ: 0.05, headY: 2.0, mirrorY: 2.6, mirrorZ: 1.0, H: 3.1 });
    const fr = M(0x334155, { r: 0.4, m: 0.7 }); mesh(GEO.rbox(1.4, 0.3, 3.2, 0.1, 1), fr, 0, 1.2, 0, V.root); for (const z of [-1.5, 1.5]) { mesh(GEO.cyl(0.12, 0.12, 2.2, 10), fr, 0, 0.95, z, V.root, 0, 0, PI / 2); for (const s of [-0.5, 0.5]) mesh(GEO.cyl(0.14, 0.14, 0.9, 10), M(0xf97316, { r: 0.3, cc: 0.6 }), s, 1.3, z, V.root); }
    for (const s of [-1, 1]) { mesh(GEO.sphere(0.13, 10, 8), M(0xffffff), s * 0.5, 2.55, 1.15, V.body); mesh(GEO.sphere(0.07, 10, 8), M(0x111111), s * 0.5, 2.57, 1.26, V.body); } // googly eyes on the hood
  },
  buggy: (V) => { const fr = M(0x1f2937, { r: 0.35, m: 0.7 }), p = V.paint, b = V.body;
    const tube = (a, c, r = 0.06) => { const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); const m = mesh(GEO.cyl(r, r, L, 8), fr, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, b); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
    mesh(prof('buggyTub', [[-1.6, 0.5], [1.75, 0.5], [1.7, 0.75], [1.1, 0.95], [-1.4, 0.95], [-1.65, 0.8]], 1.5, 0.18), p, 0, 0, 0, b);
    for (const s of [-0.6, 0.6]) { tube([s, 0.95, 1.0], [s * 0.85, 1.85, 0.25]); tube([s * 0.85, 1.85, 0.25], [s * 0.85, 1.85, -0.9]); tube([s * 0.85, 1.85, -0.9], [s, 0.95, -1.4]); }
    tube([-0.51, 1.85, 0.25], [0.51, 1.85, 0.25]); tube([-0.51, 1.85, -0.9], [0.51, 1.85, -0.9]);
    const sm = M(0x111827, { r: 0.7 }); for (const s of [-1, 1]) { mesh(GEO.rbox(0.5, 0.16, 0.5, 0.08, 1), sm, s * 0.35, 0.95, -0.25, b); mesh(GEO.rbox(0.5, 0.65, 0.14, 0.07, 1), sm, s * 0.35, 1.3, -0.52, b, -0.2); }
    mesh(GEO.torus(0.16, 0.03, PI * 2, 8, 20), DARK(), 0.35, 1.45, 0.3, b, -0.9);
    for (const s of [-1, 1]) { const h = mesh(GEO.sphere(0.13, 14, 10), HEAD(), s * 0.4, 1.95, 0.35, b); V.heads.push(h); const t = mesh(GEO.sphere(0.1, 12, 8), TAIL(), s * 0.6, 0.85, -1.66, b); V.tails.push(t); }
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) wheel(V, x * 0.95, 0.5, z * 1.25, 0.5, 0.44, z > 0, V.rim);
    V.seat = { x: 0.35, y: 0.55, z: -0.25 }; V.dims = { L: 3.6, W: 1.9, H: 1.9 }; },
  kart: (V) => { const p = V.paint, b = V.body, fr = M(0x1f2937, { r: 0.4, m: 0.6 });
    mesh(prof('kartBody', [[-0.95, 0.12], [1.05, 0.12], [1.08, 0.3], [0.6, 0.42], [-0.6, 0.45], [-0.98, 0.32]], 1.1, 0.12), p, 0, 0, 0, b);
    mesh(GEO.rbox(1.35, 0.14, 0.3, 0.07, 2), p, 0, 0.22, 1.05, b); mesh(GEO.rbox(1.35, 0.2, 0.3, 0.08, 2), fr, 0, 0.25, -1.0, b);
    mesh(GEO.rbox(0.5, 0.5, 0.18, 0.08, 2), M(0x111827, { r: 0.7 }), 0, 0.62, -0.42, b, -0.3); mesh(GEO.cyl(0.03, 0.03, 0.5, 6), fr, 0, 0.6, 0.3, b, 0.9, 0, 0); mesh(GEO.torus(0.15, 0.03, PI * 2, 8, 18), DARK(), 0, 0.78, 0.15, b, -0.6);
    mesh(GEO.cyl(0.08, 0.08, 0.3, 10), CHROME(), 0.3, 0.45, -0.95, b, PI / 2.5, 0, 0);
    for (const [x, z, r] of [[1, 1, 0.2], [-1, 1, 0.2], [1, -1, 0.23], [-1, -1, 0.23]]) wheel(V, x * 0.62, r, z * 0.72, r, 0.24, z > 0, V.rim);
    V.seat = { x: 0, y: 0.18, z: -0.25 }; V.dims = { L: 2.2, W: 1.4, H: 0.9 }; V.pose = 'sit'; },
  snowmobile: (V) => { const p = V.paint, b = V.body;
    mesh(prof('snowmo', [[-1.2, 0.35], [1.3, 0.35], [1.45, 0.6], [0.9, 0.95], [0.2, 0.9], [-1.25, 0.75]], 0.95, 0.18), p, 0, 0, 0, b);
    mesh(GEO.rbox(0.45, 0.16, 1.2, 0.08, 2), M(0x111827, { r: 0.7 }), 0, 0.92, -0.5, b); mesh(GEO.rbox(0.8, 0.35, 0.06, 0.05, 1), GLASSV(), 0, 1.1, 0.75, b, -0.5);
    const sk = M(0x334155, { r: 0.3, m: 0.6 }); for (const s of [-0.45, 0.45]) { mesh(GEO.rbox(0.14, 0.06, 1.4, 0.03, 1), sk, s, 0.06, 0.9, b); mesh(GEO.cyl(0.04, 0.04, 0.35, 6), sk, s, 0.22, 0.9, b); }
    mesh(GEO.rbox(0.6, 0.35, 1.5, 0.15, 2), TIRE(), 0, 0.2, -0.65, b); mesh(GEO.torus(0.16, 0.03, PI, 8, 14), DARK(), 0, 1.15, 0.4, b, PI / 2.2);
    V.heads.push(mesh(GEO.sphere(0.12, 12, 8), HEAD(), 0, 0.8, 1.35, b)); V.tails.push(mesh(GEO.sphere(0.08, 10, 8), TAIL(), 0, 0.7, -1.25, b));
    V.seat = { x: 0, y: 0.6, z: -0.4 }; V.dims = { L: 2.8, W: 1.1, H: 1.2 }; V.pose = 'ride'; }
};
// two-wheelers: frame tubes, spoked wheels, rider leans
function tubeIn(parent, mat, a, c, r = 0.035) { const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); const m = mesh(GEO.cyl(r, r, L, 8), mat, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, parent); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; }
function spoked(V, z, r, w, front, motor) {
  const steer = new THREE.Group(); steer.position.set(0, r, z); V.lean.add(steer); const spin = new THREE.Group(); steer.add(spin);
  mesh(tireGeo(r, w), TIRE(), 0, 0, 0, spin);
  if (motor) mesh(rimGeo(r * 0.95, w, V.rim === 'std' ? 'star' : V.rim), M(RIMCOL[V.rim] || 0xd1d5db, { r: 0.15, m: 1 }), 0, 0, 0, spin);
  else { const sp = M(0xd1d5db, { r: 0.2, m: 1 }); for (let i = 0; i < 8; i++) mesh(GEO.box(0.012, r * 1.7, 0.012), sp, 0, 0, 0, spin, i / 8 * PI); mesh(GEO.cyl(0.04, 0.04, w, 8), sp, 0, 0, 0, spin, 0, 0, PI / 2); }
  V.wheels.push({ steer, spin, x: 0, z, r, front, y: r }); return steer;
}
const BIKES = {
  bmx: (V) => bike(V, { wb: 1.0, r: 0.3, w: 0.07, frame: V.paint, seatY: 0.75, barY: 0.95, pedal: 1 }),
  road: (V) => bike(V, { wb: 1.05, r: 0.35, w: 0.035, frame: V.paint, seatY: 0.98, barY: 0.95, pedal: 1, drop: 1 }),
  kick: (V) => { V.lean = new THREE.Group(); V.body.add(V.lean); const p = V.paint; mesh(GEO.rbox(0.16, 0.05, 0.75, 0.02, 1), p, 0, 0.12, 0, V.lean); tubeIn(V.lean, M(0xcbd5e1, { r: 0.2, m: 0.9 }), [0, 0.12, 0.38], [0, 0.95, 0.42], 0.025); mesh(GEO.cyl(0.025, 0.025, 0.45, 8), M(0x111827), 0, 0.95, 0.42, V.lean, 0, 0, PI / 2);
    spoked(V, 0.42, 0.09, 0.05, true, true); spoked(V, -0.38, 0.09, 0.05, false, true); V.seat = { x: 0, y: 0.15, z: -0.05 }; V.dims = { L: 1.1, W: 0.5, H: 1.0 }; V.pose = 'stand'; },
  moped: (V) => { V.lean = new THREE.Group(); V.body.add(V.lean); const p = V.paint;
    mesh(prof('moped', [[-0.75, 0.25], [0.55, 0.25], [0.62, 0.45], [0.35, 0.5], [0.0, 0.55], [-0.5, 0.75], [-0.8, 0.6]], 0.42, 0.14), p, 0, 0, 0, V.lean);
    mesh(GEO.rbox(0.36, 1.05, 0.2, 0.12, 2), p, 0, 0.75, 0.6, V.lean, -0.25); mesh(GEO.rbox(0.36, 0.14, 0.6, 0.07, 2), M(0x7c2d12, { r: 0.6 }), 0, 0.82, -0.35, V.lean);
    mesh(GEO.cyl(0.025, 0.025, 0.6, 8), CHROME(), 0, 1.25, 0.5, V.lean, 0, 0, PI / 2); V.heads.push(mesh(GEO.sphere(0.1, 12, 8), HEAD(), 0, 1.2, 0.72, V.lean)); V.tails.push(mesh(GEO.sphere(0.06, 10, 8), TAIL(), 0, 0.82, -0.78, V.lean));
    spoked(V, 0.68, 0.24, 0.1, true, true); spoked(V, -0.58, 0.24, 0.1, false, true); V.seat = { x: 0, y: 0.5, z: -0.3 }; V.dims = { L: 1.8, W: 0.6, H: 1.3 }; V.pose = 'ride'; },
  cruiser: (V) => motorbike(V, { key: 'cruiser', wb: 1.6, r: 0.36, w: 0.18, seatY: 0.62, barY: 1.12, tank: [[-0.3, 0.75], [0.55, 0.75], [0.5, 0.95], [-0.1, 1.0]], low: 1 }),
  sport: (V) => motorbike(V, { key: 'sport', wb: 1.4, r: 0.33, w: 0.2, seatY: 0.82, barY: 0.95, tank: [[-0.5, 0.6], [0.85, 0.55], [0.9, 1.05], [0.25, 1.15], [-0.35, 1.0]], fairing: 1 })
};
function bike(V, o) { V.lean = new THREE.Group(); V.body.add(V.lean); const f = o.frame, h = o.wb / 2, b = V.lean;
  const bb = [0, o.r * 0.95, 0.0], seat = [0, o.seatY, -h * 0.5], head = [0, o.barY - 0.15, h * 0.75];
  tubeIn(b, f, bb, seat); tubeIn(b, f, seat, head); tubeIn(b, f, bb, head); tubeIn(b, f, bb, [0, o.r, -h]); tubeIn(b, f, seat, [0, o.r, -h]);
  tubeIn(b, f, head, [0, o.r, h], 0.03); mesh(GEO.rbox(0.14, 0.06, 0.26, 0.03, 1), M(0x111827, { r: 0.7 }), 0, o.seatY + 0.05, -h * 0.55, b);
  if (o.drop) mesh(GEO.torus(0.16, 0.022, PI, 8, 14), M(0x111827), 0, o.barY - 0.08, h * 0.85, b, 0, PI / 2, 0); else mesh(GEO.cyl(0.022, 0.022, 0.6, 8), M(0x111827), 0, o.barY, h * 0.78, b, 0, 0, PI / 2);
  V.crank = new THREE.Group(); V.crank.position.set(0, bb[1], 0); b.add(V.crank); mesh(GEO.cyl(0.11, 0.11, 0.02, 16), CHROME(), 0.06, 0, 0, V.crank, 0, 0, PI / 2); for (const s of [-1, 1]) mesh(GEO.box(0.03, 0.03, 0.34), M(0x334155), s * 0.1, 0, 0, V.crank);
  spoked(V, h, o.r, o.w, true); spoked(V, -h, o.r, o.w, false); V.seat = { x: 0, y: o.seatY - 0.55, z: -h * 0.55 }; V.dims = { L: o.wb + o.r * 2, W: 0.6, H: 1.4 }; V.pose = 'pedal'; }
function motorbike(V, o) { V.lean = new THREE.Group(); V.body.add(V.lean); const b = V.lean, h = o.wb / 2;
  mesh(prof(o.key + 'tank', [o.tank[0], o.tank[1], ...o.tank.slice(2)], 0.42, 0.14), V.paint, 0, 0, 0, b);
  mesh(GEO.rbox(0.5, 0.4, 0.6, 0.12, 2), M(0x4b5563, { r: 0.3, m: 0.8 }), 0, 0.5, 0.05, b); for (const s of [-1, 1]) mesh(GEO.cyl(0.06, 0.07, 1.0, 10), CHROME(), s * 0.18, 0.4, -0.55, b, PI / 2 - 0.15, 0, 0);
  mesh(GEO.rbox(0.32, 0.12, 0.65, 0.06, 2), M(0x111827, { r: 0.7 }), 0, o.seatY + 0.05, -0.4, b);
  if (o.fairing) { mesh(prof('fair', [[0.45, 0.6], [1.05, 0.6], [1.0, 1.05], [0.75, 1.2], [0.5, 0.95]], 0.5, 0.15), V.paint, 0, 0, 0, b); mesh(GEO.rbox(0.38, 0.25, 0.05, 0.05, 1), GLASSV(), 0, 1.2, 0.82, b, -0.6); mesh(prof('tailsp', [[-0.95, 0.85], [-0.3, 0.85], [-0.4, 1.0], [-1.05, 1.08]], 0.32, 0.1), V.paint, 0, 0, 0, b); }
  tubeIn(b, CHROME(), [0, o.barY - 0.1, h * 0.6], [0, o.r, h], 0.04); mesh(GEO.cyl(0.025, 0.025, o.low ? 0.9 : 0.6, 8), M(0x111827), 0, o.barY, h * 0.55, b, 0, 0, PI / 2);
  V.heads.push(mesh(GEO.sphere(0.12, 12, 8), HEAD(), 0, o.barY - 0.15, h * 0.75 + 0.15, b)); V.tails.push(mesh(GEO.sphere(0.07, 10, 8), TAIL(), 0, o.seatY + 0.08, -h - 0.1, b));
  spoked(V, h, o.r, o.w, true, true); spoked(V, -h, o.r, o.w, false, true); V.seat = { x: 0, y: o.seatY - 0.48, z: -0.35 }; V.dims = { L: o.wb + o.r * 2, W: 0.8, H: 1.3 }; V.pose = 'ride'; }
// water + air + hover
const OTHER = {
  boat: (V) => { const p = V.paint, b = V.body;
    const hull = cg('hullB', () => { const s = new THREE.Shape(); s.moveTo(-1.1, -2.6); s.lineTo(1.1, -2.6); s.quadraticCurveTo(1.25, 0.5, 0, 2.9); s.quadraticCurveTo(-1.25, 0.5, -1.1, -2.6); const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 4, curveSegments: 16 }); g.rotateX(-PI / 2); g.translate(0, -0.1, 0); return g; });
    mesh(hull, p, 0, 0, 0, b); mesh(GEO.rbox(2.0, 0.12, 4.0, 0.05, 1), M(0xfafaf9, { r: 0.6 }), 0, 0.85, -0.4, b);
    mesh(GEO.rbox(1.7, 0.5, 0.06, 0.08, 1), GLASSV(), 0, 1.15, 0.7, b, -0.45); mesh(GEO.torus(0.15, 0.03, PI * 2, 8, 18), DARK(), 0.4, 1.15, 0.35, b, -0.9);
    const sm = M(0xffffff, { r: 0.6 }); for (const s of [-1, 1]) { mesh(GEO.rbox(0.55, 0.18, 0.55, 0.08, 1), sm, s * 0.42, 1.0, 0.0, b); mesh(GEO.rbox(0.55, 0.55, 0.14, 0.07, 1), sm, s * 0.42, 1.3, -0.25, b, -0.15); } mesh(GEO.rbox(1.8, 0.4, 0.6, 0.1, 1), sm, 0, 1.05, -1.9, b);
    mesh(GEO.rbox(0.5, 0.7, 0.5, 0.12, 2), M(0x111827, { r: 0.4, m: 0.5 }), 0, 0.75, -2.75, b); V.heads.push(mesh(GEO.sphere(0.1, 10, 8), HEAD(), 0, 0.95, 2.6, b));
    for (const s of [-1, 1]) mesh(GEO.rbox(0.05, 0.16, 4.6, 0.02, 1), M(0xffffff), s * 1.25, 0.55, -0.1, b);
    V.seat = { x: 0.42, y: 0.55, z: 0.0 }; V.dims = { L: 5.5, W: 2.4, H: 1.5 }; },
  jetski: (V) => { const p = V.paint, b = V.body; V.lean = new THREE.Group(); b.add(V.lean);
    mesh(prof('jetski', [[-1.35, 0.0], [1.3, 0.05], [1.45, 0.3], [0.7, 0.55], [0.2, 0.75], [-0.5, 0.6], [-1.4, 0.45]], 0.95, 0.2), p, 0, 0, 0, V.lean);
    mesh(GEO.rbox(0.42, 0.18, 1.0, 0.09, 2), M(0x111827, { r: 0.7 }), 0, 0.72, -0.45, V.lean); mesh(GEO.cyl(0.03, 0.03, 0.7, 8), DARK(), 0, 0.95, 0.35, V.lean, 0, 0, PI / 2);
    V.seat = { x: 0, y: 0.35, z: -0.45 }; V.dims = { L: 2.9, W: 1.0, H: 1.0 }; V.pose = 'ride'; },
  heli: (V) => { const p = V.paint, b = V.body;
    mesh(GEO.sphere(1.3, 32, 22), p, 0, 1.6, 0.4, b).scale.set(1, 0.95, 1.5); mesh(GEO.sphere(1.18, 28, 18, ), GLASSV(), 0, 1.75, 0.95, b).scale.set(0.92, 0.82, 1.15);
    mesh(GEO.cyl(0.18, 0.4, 4.4, 14), p, 0, 1.85, -2.6, b, PI / 2, 0, 0); mesh(prof('hfin', [[-4.9, 1.8], [-4.4, 1.8], [-4.6, 3.0], [-4.95, 3.0]], 0.12, 0.05), p, 0, 0, 0, b);
    const tr = V.tailRotor = new THREE.Group(); tr.position.set(0.18, 2.7, -4.75); b.add(tr); for (let i = 0; i < 2; i++) mesh(GEO.rbox(0.04, 1.1, 0.12, 0.02, 1), DARK(), 0, 0, 0, tr, 0, 0, 0).rotation.x = i * PI / 2;
    mesh(GEO.cyl(0.12, 0.16, 0.45, 12), DARK(), 0, 3.0, 0.2, b); const rot = V.rotor = new THREE.Group(); rot.position.set(0, 3.25, 0.2); b.add(rot);
    for (let i = 0; i < 4; i++) { const bl = mesh(GEO.rbox(4.0, 0.05, 0.3, 0.02, 1), M(0x1f2937, { r: 0.4 }), 0, 0, 0, rot); bl.rotation.y = i * PI / 2; bl.position.set(Math.cos(i * PI / 2) * 2.0, 0, -Math.sin(i * PI / 2) * 2.0); }
    const sk = M(0x9ca3af, { r: 0.3, m: 0.8 }); for (const s of [-1, 1]) { mesh(GEO.cap(0.06, 3.0, 8), sk, s * 1.0, 0.12, 0.3, b, PI / 2, 0, 0); for (const z of [-0.5, 1.0]) tubeIn(b, sk, [s * 1.0, 0.12, z], [s * 0.6, 0.85, z], 0.05); }
    for (const s of [-1, 1]) { V.tails.push(mesh(GEO.sphere(0.08, 8, 6), NEON(s > 0 ? 0x22c55e : 0xef4444), s * 1.25, 1.5, 0.3, b)); }
    const sm = M(0x334155, { r: 0.7 }); for (const s of [-1, 1]) mesh(GEO.rbox(0.5, 0.18, 0.5, 0.08, 1), sm, s * 0.38, 0.95, 0.75, b);
    V.seat = { x: 0.38, y: 0.62, z: 0.75 }; V.dims = { L: 8, W: 2.6, H: 3.3 }; },
  plane: (V) => planeModel(V, false),
  seaplane: (V) => planeModel(V, true),
  balloon: (V) => { const b = V.body, cols = [0xff4fa0, 0xfacc15, 0x38bdf8, 0x4ade80, 0xf97316, 0xa855f7];
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, y = t * 9.5, r = Math.sin(Math.min(1, t * 1.15) * PI * 0.92) * 4.6 * (t < 0.15 ? 0.55 + t * 3 : 1); pts.push(new THREE.Vector2(Math.max(0.6, r), y)); }
    const n = 12; for (let i = 0; i < n; i++) { const g = cg('bgore' + i, () => new THREE.LatheGeometry(pts, 4, i / n * PI * 2, PI * 2 / n)); mesh(g, M(i % 2 ? cols[(i >> 1) % 6] : 0xffffff, { r: 0.55, cc: 0.3, side: THREE.DoubleSide }), 0, 4.2, 0, b); }
    mesh(GEO.rbox(1.6, 1.0, 1.6, 0.18, 2), M(0xa16207, { r: 0.95 }), 0, 0.5, 0, b); mesh(GEO.torus(0.8, 0.08, PI * 2, 8, 24), M(0x7c4a1e, { r: 0.9 }), 0, 1.0, 0, b, PI / 2, 0, 0);
    for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) tubeIn(b, M(0x52525b), [x, 1.0, z], [x * 1.4, 4.4, z * 1.4], 0.02);
    mesh(GEO.cyl(0.25, 0.3, 0.5, 12), CHROME(), 0, 3.0, 0, b); V.flame = mesh(GEO.cone(0.3, 1.4, 14), glow(0xffa53d, 0.9), 0, 3.9, 0, b); V.flame.visible = false;
    V.seat = { x: 0.3, y: 0.15, z: 0 }; V.dims = { L: 4, W: 4, H: 14 }; V.pose = 'stand'; },
  hover: (V) => { const p = V.paint, b = V.body;
    mesh(GEO.torus(1.5, 0.42, PI * 2, 14, 36), M(0x1f2937, { r: 0.8 }), 0, 0.45, 0, b, PI / 2, 0, 0).scale.set(1.0, 1.65, 1);
    mesh(GEO.rbox(2.6, 0.5, 4.6, 0.25, 2), p, 0, 0.9, 0, b); mesh(prof('hovcab', [[1.2, 1.1], [0.6, 1.85], [-0.6, 1.9], [-0.9, 1.1]], 1.9, 0.25), GLASSV(), 0, 0, 0, b);
    mesh(prof('hovroof', [[0.62, 1.82], [-0.6, 1.86], [-0.62, 1.98], [0.5, 1.96]], 1.92, 0.1), p, 0, 0, 0, b);
    V.fans = []; for (const s of [-0.7, 0.7]) { const d = mesh(GEO.torus(0.65, 0.12, PI * 2, 10, 28), M(0xe5e7eb, { r: 0.3, m: 0.6 }), s, 1.85, -2.0, b); void d; const f = new THREE.Group(); f.position.set(s, 1.85, -2.0); b.add(f); for (let i = 0; i < 3; i++) mesh(GEO.rbox(1.1, 0.12, 0.04, 0.02, 1), DARK(), 0, 0, 0, f, 0, 0, i * PI / 3); V.fans.push(f); }
    for (const s of [-1, 1]) { V.heads.push(mesh(GEO.sphere(0.12, 10, 8), HEAD(), s * 0.8, 1.0, 2.32, b)); V.tails.push(mesh(GEO.sphere(0.1, 10, 8), TAIL(), s * 1.0, 1.0, -2.32, b)); }
    const sm = M(0x0f766e, { r: 0.7 }); for (const s of [-1, 1]) mesh(GEO.rbox(0.5, 0.18, 0.5, 0.08, 1), sm, s * 0.42, 1.25, 0.1, b);
    V.seat = { x: 0.42, y: 0.92, z: 0.1 }; V.dims = { L: 5.2, W: 3.0, H: 2.2 }; },
  hovercar: (V) => { const p = V.paint, b = V.body;
    mesh(prof('rh1', [[-2.3, 0.55], [2.3, 0.6], [2.42, 0.78], [1.6, 0.98], [0.6, 1.05], [-1.6, 1.1], [-2.35, 0.95]], 2.0, 0.32), p, 0, 0, 0, b);
    mesh(prof('rh1c', [[0.7, 1.0], [-0.1, 1.55], [-1.0, 1.58], [-1.7, 1.08]], 1.7, 0.3), GLASSV(), 0, 0, 0, b);
    for (const s of [-1, 1]) { mesh(GEO.sphere(0.32, 18, 12), M(0x9ca3af, { r: 0.4 }), s * 0.55, 1.75, -0.6, b).scale.set(1, 1, 0.35); mesh(GEO.sphere(0.2, 14, 10), M(0xf9a8d4, { r: 0.5 }), s * 0.55, 1.75, -0.55, b).scale.set(1, 1, 0.3); } // Ratita ears!
    V.pods = []; for (const [x, z] of [[1, 1.4], [-1, 1.4], [1, -1.5], [-1, -1.5]]) { mesh(GEO.cyl(0.42, 0.5, 0.3, 20), M(0xe5e7eb, { r: 0.2, m: 0.9 }), x * 0.95, 0.42, z, b); const g = mesh(GEO.cyl(0.36, 0.36, 0.06, 20), NEON(0xe879f9), x * 0.95, 0.26, z, b); V.pods.push(g); }
    mesh(GEO.torus(0.28, 0.06, PI * 2, 8, 20), NEON(0xe879f9), 0, 0.85, 2.38, b);
    for (const s of [-1, 1]) { const h = mesh(GEO.sphere(0.16, 14, 10), HEAD(), s * 0.7, 0.85, 2.35, b); h.scale.set(1.4, 0.5, 0.5); V.heads.push(h); const t = mesh(GEO.sphere(0.14, 12, 8), TAIL(), s * 0.75, 0.95, -2.35, b); t.scale.set(1.5, 0.5, 0.4); V.tails.push(t); }
    const sm = M(0x4c1d95, { r: 0.7 }); for (const s of [-1, 1]) { mesh(GEO.rbox(0.52, 0.18, 0.5, 0.08, 1), sm, s * 0.38, 0.95, -0.3, b); mesh(GEO.rbox(0.5, 0.55, 0.14, 0.07, 1), sm, s * 0.38, 1.28, -0.55, b, -0.15); }
    V.seat = { x: 0.38, y: 0.58, z: -0.3 }; V.dims = { L: 4.8, W: 2.0, H: 1.6 }; }
};
function planeModel(V, sea) { const p = V.paint, b = V.body, wh = M(0xffffff, { r: 0.45, cc: 0.4 });
  const fus = []; for (let i = 0; i <= 16; i++) { const t = i / 16, r = Math.sin(Math.min(1, t * 1.6) * PI * 0.5) * 0.7 * (1 - Math.pow(Math.max(0, t - 0.55) / 0.45, 1.6) * 0.82); fus.push(new THREE.Vector2(Math.max(0.05, r), t * 7.2)); }
  const fg = cg('fus', () => { const g = new THREE.LatheGeometry(fus, 24); g.rotateX(-PI / 2); g.translate(0, 0, 3.6); return g; }); mesh(fg, p, 0, 1.55, 0, b).rotation.y = PI;
  mesh(GEO.sphere(0.62, 20, 14), GLASSV(), 0, 2.05, 0.9, b).scale.set(0.8, 0.6, 1.5);
  const wing = (key, span, chord, tip) => cg(key, () => { const s = new THREE.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(span / 2 - 0.15, tip); s.quadraticCurveTo(0, chord * 1.05, -span / 2 + 0.15, tip); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 12 }); g.rotateX(PI / 2); return g; });
  mesh(wing('wingM', 9.5, 1.5, 1.2), sea ? wh : p, 0, sea ? 2.55 : 1.45, 1.2, b); mesh(wing('wingT', 3.2, 0.9, 0.7), p, 0, 1.75, -2.85, b);
  mesh(prof('vfin', [[-3.6, 1.8], [-2.6, 1.8], [-3.3, 3.1], [-3.7, 3.1]], 0.12, 0.05), p, 0, 0, 0, b);
  for (const s of [-1, 1]) { mesh(GEO.rbox(0.05, 0.1, 1.2, 0.02, 1), M(0x111827), s * 2.5, sea ? 2.64 : 1.54, 0.6, b); V.tails.push(mesh(GEO.sphere(0.1, 10, 8), NEON(s > 0 ? 0x22c55e : 0xef4444), s * 4.75, sea ? 2.56 : 1.46, 0.7, b)); }
  const pr = V.prop = new THREE.Group(); pr.position.set(0, 1.55, 3.75); b.add(pr); mesh(GEO.sphere(0.25, 14, 10), M(0xef4444, { r: 0.3, cc: 1 }), 0, 0, 0.05, pr).scale.set(1, 1, 1.5); for (let i = 0; i < 2; i++) mesh(GEO.rbox(0.14, 2.1, 0.05, 0.04, 1), DARK(), 0, 0, 0, pr, 0, 0, i * PI / 2);
  if (sea) { const fl = M(0xf8fafc, { r: 0.35, cc: 0.6 }); for (const s of [-1, 1]) { const f = mesh(GEO.cap(0.32, 4.0, 14), fl, s * 1.4, 0.35, 0.5, b, PI / 2, 0, 0); f.scale.set(1, 1, 0.8); for (const z of [-0.6, 1.4]) tubeIn(b, M(0x334155), [s * 1.4, 0.6, z], [s * 0.4, 1.3, z], 0.05); tubeIn(b, M(0x334155), [s * 1.4, 0.6, 0.5], [s * 2.0, 2.5, 1.0], 0.04); } }
  else { const lg = M(0x334155, { r: 0.4, m: 0.6 }); for (const s of [-1, 1]) { tubeIn(b, lg, [s * 0.4, 1.2, 1.2], [s * 1.0, 0.35, 1.2], 0.06); wheel(V, s * 1.05, 0.33, 1.2, 0.33, 0.2, false, 'disc'); } wheel(V, 0, 0.2, -3.3, 0.2, 0.12, true, 'disc'); }
  V.seat = { x: 0, y: 1.05, z: 0.75 }; V.dims = { L: 8, W: 9.5, H: 3.2 }; }
// main entry: make a vehicle model. opts: {color, finish, rim, rider (look), lite}
export function makeVehicle(type, opts = {}) {
  const def = VEH[type] || VEH.compact, V = { type, def, root: new THREE.Group(), body: new THREE.Group(), wheels: [], rims: [], heads: [], tails: [], rim: opts.rim || 'std', pose: 'sit' };
  V.root.add(V.body); V.paint = paintMat(opts.color != null ? opts.color : def.col, opts.finish);
  const fn = BODIES[def.body] || BIKES[def.body] || OTHER[def.body] || BODIES.hatch; fn(V);
  if (opts.rider !== false && !opts.lite) { const P = makePerson(opts.rider || {}); P.root.scale.setScalar(0.82); V.rider = P; (V.lean || V.body).add(P.root); P.root.position.set(V.seat.x, V.seat.y, V.seat.z); animPerson(P, V.pose, 1, 0, 0); for (let i = 0; i < 20; i++) animPerson(P, V.pose, 0.1, 0, 0); P.root.visible = opts.riderVisible !== false; }
  if (opts.lite) liteMerge(V);
  // night head-light glow cones (cheap additive geometry)
  if (V.heads.length && !opts.noBeam) { const bm = cg('beamM', () => { const m = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); m.userData.keep = true; return m; });
    V.beams = V.heads.slice(0, 2).map((h) => { const c = new THREE.Mesh(cg('beamG', () => { const g = new THREE.ConeGeometry(1.6, 9, 16, 1, true); g.translate(0, -4.5, 0); g.rotateX(-PI / 2); g.rotateX(PI); return g; }), bm); c.position.copy(h.position); c.rotation.x = 0.07; c.visible = false; c.castShadow = false; h.parent.add(c); return c; }); }
  return V;
}
// traffic cars: merge every static non-paint, non-glass part into one mesh (3 draw calls per car)
function liteMerge(V) {
  const B2 = new Batch(); V.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(V.root.matrixWorld).invert();
  const keep = new Set([...V.heads, ...V.tails, ...(V.siren || [])]);
  const list = []; V.root.traverse((o) => { if (o.isMesh && !keep.has(o)) list.push(o); });
  for (const o of list) { B2.add(o.geometry, o.material, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); o.parent.remove(o); }
  B2.build(V.body); V.wheels.forEach((w) => { w.steer.parent && w.steer.parent.remove(w.steer); }); V.wheels = []; V.lite = true;
}
export function disposeVehicle(V) { V.root.traverse((o) => { if (o.geometry && o.geometry.userData.batch) o.geometry.dispose(); }); if (V.paint) V.paint.dispose(); }
