// procedural, smooth, rounded cartoon models (no textures, no billboards)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, glow } from './mats.js';

const gc = new Map();
function cg(key, fn) { let g = gc.get(key); if (!g) { g = fn(); gc.set(key, g); } return g; }
export const GEO = {
  sphere: (r, w = 24, h = 16) => cg('s' + r + w + h, () => new THREE.SphereGeometry(r, w, h)),
  cap: (r, l, s = 16) => cg('c' + r + l + s, () => new THREE.CapsuleGeometry(r, l, 6, s)),
  rbox: (w, h, d, r = 0.08, s = 2) => cg('rb' + [w, h, d, r, s], () => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))),
  box: (w, h, d) => cg('b' + [w, h, d], () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 24) => cg('cy' + [rt, rb, h, s], () => new THREE.CylinderGeometry(rt, rb, h, s)),
  cone: (r, h, s = 24) => cg('co' + [r, h, s], () => new THREE.ConeGeometry(r, h, s)),
  torus: (r, t, arc = Math.PI * 2, rs = 12, ts = 32) => cg('t' + [r, t, arc, rs, ts], () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
  star: (r = 0.5, d = 0.18) => cg('star' + r + d, () => {
    const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r * 0.45 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.5, bevelSize: r * 0.12, bevelSegments: 3 }); g.center(); return g;
  }),
  rock: (seed = 1, r = 1) => cg('rock' + seed + r, () => {
    const g = new THREE.SphereGeometry(r, 18, 12), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.18 * Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 + seed * 2) + 0.1 * Math.sin(v.z * 5 + seed * 3); v.multiplyScalar(n); v.y *= 0.75; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  })
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
// static geometry batcher: one merged mesh per material
// one shared "uber" material: colour, roughness, metalness and glow live in vertex attributes,
// so every opaque prop of a building/scene merges into a single draw call
let UBER = null;
export function uberMat() {
  if (UBER) return UBER;
  UBER = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 }); UBER.userData.keep = true;
  UBER.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 rm; attribute vec3 em; varying vec2 vRM; varying vec3 vEM;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRM = rm; vEM = em;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRM; varying vec3 vEM;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vEM;');
  };
  UBER.customProgramCacheKey = () => 'uber1';
  return UBER;
}
function route(mat) {
  if (!mat.isMeshStandardMaterial || mat.userData.noUber || mat.transparent || mat.vertexColors || mat.side !== THREE.FrontSide || mat.flatShading || mat.map || mat === UBER) return false;
  return true;
}
// fast static batcher: add() only records (geometry, material, matrix); build() writes every piece straight into one
// pre-sized buffer per material (no per-piece clones), so huge scenes merge quickly
const NI = new WeakMap(), _n3 = new THREE.Matrix3();
function baseOf(geo) {
  let b = NI.get(geo); if (b) return b;
  let g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.normal) { if (g === geo) g = geo.clone(); g.computeVertexNormals(); }
  b = { p: g.attributes.position.array, n: g.attributes.normal.array, c: g.attributes.position.count }; NI.set(geo, b); return b;
}
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, m) { const key = route(mat) ? uberMat() : mat; let e = this.groups.get(key); if (!e) { e = []; this.groups.set(key, e); } e.push(geo, mat, m); return this; }
  mesh(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) { return this.add(geo, mat, mat4(x, y, z, rx, ry, rz, sx, sy, sz)); }
  box(mat, w, h, d, x, y, z, ry = 0) { return this.add(GEO.box(w, h, d), mat, mat4(x, y, z, 0, ry, 0)); }
  rbox(mat, w, h, d, r, x, y, z, ry = 0) { return this.add(GEO.rbox(w, h, d, r), mat, mat4(x, y, z, 0, ry, 0)); }
  get count() { let n = 0; for (const l of this.groups.values()) n += l.length / 3; return n; }
  build(parent, o = {}) {
    const out = [];
    for (const [key, list] of this.groups) {
      if (!list.length) continue; const uber = key === UBER;
      let n = 0; for (let i = 0; i < list.length; i += 3) n += baseOf(list[i]).c;
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), Cc = uber ? new Float32Array(n * 3) : null, RM = uber ? new Float32Array(n * 2) : null, EM = uber ? new Float32Array(n * 3) : null;
      let v = 0;
      for (let i = 0; i < list.length; i += 3) {
        const bs = baseOf(list[i]), mat = list[i + 1], m = list[i + 2], e = m.elements, p = bs.p, nn = bs.n; _n3.getNormalMatrix(m); const ne = _n3.elements;
        let cr = 0, cg2 = 0, cb = 0, r = 0, mt = 0, er = 0, eg = 0, eb = 0;
        if (uber) { cr = mat.color.r; cg2 = mat.color.g; cb = mat.color.b; r = mat.clearcoat > 0 ? Math.min(mat.roughness, 0.35) : mat.roughness; mt = mat.metalness; const ei = mat.emissiveIntensity || 0; er = mat.emissive.r * ei; eg = mat.emissive.g * ei; eb = mat.emissive.b * ei; }
        for (let k = 0; k < bs.c; k++, v++) {
          const x = p[k * 3], y = p[k * 3 + 1], z = p[k * 3 + 2];
          P[v * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[v * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[v * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          const a = nn[k * 3], b = nn[k * 3 + 1], c = nn[k * 3 + 2]; let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c; const L = Math.hypot(nx, ny, nz) || 1;
          Nn[v * 3] = nx / L; Nn[v * 3 + 1] = ny / L; Nn[v * 3 + 2] = nz / L;
          if (uber) { Cc[v * 3] = cr; Cc[v * 3 + 1] = cg2; Cc[v * 3 + 2] = cb; RM[v * 2] = r; RM[v * 2 + 1] = mt; EM[v * 3] = er; EM[v * 3 + 1] = eg; EM[v * 3 + 2] = eb; }
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
      if (uber) { g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('rm', new THREE.BufferAttribute(RM, 2)); g.setAttribute('em', new THREE.BufferAttribute(EM, 3)); }
      g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.batch = true;
      const mesh = new THREE.Mesh(g, key); mesh.castShadow = o.cast !== false && !key.transparent; mesh.receiveShadow = o.receive !== false;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); parent.add(mesh); out.push(mesh);
    }
    this.groups.clear(); return out;
  }
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
export { mesh };
export { mergeGeometries };
// extra smooth shapes for vehicles/buildings
export function lathe(key, pts, seg = 24) { return cg('la' + key, () => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg)); }
// side-profile extrusion with rounded bevel: profile = [[z,y],...] in the YZ plane, width along X (centered)
export function profileBody(key, prof, width, bevel = 0.18, curve = 10) {
  return cg('pb' + key, () => {
    const s = new THREE.Shape(); prof.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
    const w = Math.max(0.05, width - bevel * 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 4, curveSegments: curve, steps: 1 });
    g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2); // profile z->world z, extrude along x
    g.computeVertexNormals(); return g;
  });
}
// smooth rounded shape from a 2D outline with bevel (e.g. top-down footprints)
export function smoothShape(key, outline, depth, bevel = 0.1) {
  return cg('ss' + key, () => { const s = new THREE.Shape(); outline.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 }); g.rotateX(-Math.PI / 2); return g; });
}
export function roundRect(w, h, r, n = 4) { const pts = [], hw = w / 2, hh = h / 2; r = Math.min(r, hw, hh); const c = [[hw - r, hh - r, 0], [-hw + r, hh - r, 1], [-hw + r, -hh + r, 2], [hw - r, -hh + r, 3]]; for (const [cx, cy, q] of c) for (let i = 0; i <= n; i++) { const a = q * Math.PI / 2 + i / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
export { cg };
