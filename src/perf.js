// "Smart" speed pass (same approach as Grok Arcade 4.2 / Ratita Rescue). Nothing here lowers visual quality:
//  - region chunks: the ground-detail batch is re-ordered into grid cells that share ONE set of GPU buffers
//    (drawRange per cell), so frustum culling can skip whole cells
//  - far-only LOD: tiny ground detail (flowers/grass/pebbles) skips cells you couldn't see anyway (> ~85 m, in fog)
//  - shader warm-up on map load (incl. hidden FX + basements) so the first disaster never hitches
//  - memory freed on map change (map geometry, map-only textures/materials, ambient batches)
import * as THREE from 'three';
import { isCached } from './mats.js';

const QS = new URLSearchParams(location.search); let MINT = 4000;
const _b = new THREE.Box3(), _v = new THREE.Vector3();
function chunkMesh(mesh, cell) {
  let g = mesh.geometry; if (g.groups && g.groups.length > 1) return null; if (Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return null; if (g.index) g = g.toNonIndexed();
  const pos = g.attributes.position, nt = pos.count / 3; if (nt < MINT) return null;
  const keys = new Int32Array(nt), buckets = new Map();
  for (let t = 0; t < nt; t++) {
    const i = t * 3, cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const k = (Math.floor(cx / cell) + 64) * 256 + (Math.floor(cz / cell) + 64); keys[t] = k; buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  if (buckets.size < 2) return null;
  const order = [...buckets.keys()], start = new Map(); let s = 0; for (const k of order) { start.set(k, s); s += buckets.get(k); }
  const fill = new Map(start), slot = new Int32Array(nt); for (let t = 0; t < nt; t++) { const d = fill.get(keys[t]); slot[t] = d; fill.set(keys[t], d + 1); }
  const shared = {};
  for (const name in g.attributes) { const a = g.attributes[name], is = a.itemSize, src = a.array, dst = new src.constructor(src.length), w = 3 * is;
    for (let t = 0; t < nt; t++) dst.set(src.subarray(t * w, t * w + w), slot[t] * w);
    shared[name] = new THREE.BufferAttribute(dst, is, a.normalized); }
  if (g !== mesh.geometry) g.dispose();
  const out = [];
  for (const k of order) {
    const geo = new THREE.BufferGeometry(); for (const name in shared) geo.setAttribute(name, shared[name]);
    const st = start.get(k) * 3, ct = buckets.get(k) * 3; geo.setDrawRange(st, ct);
    _b.makeEmpty(); const p = shared.position; for (let i = st; i < st + ct; i++) _b.expandByPoint(_v.fromBufferAttribute(p, i));
    geo.boundingBox = _b.clone(); geo.boundingSphere = _b.getBoundingSphere(new THREE.Sphere()); geo.userData.chunk = true;
    const m = new THREE.Mesh(geo, mesh.material); m.castShadow = mesh.castShadow; m.receiveShadow = mesh.receiveShadow; m.renderOrder = mesh.renderOrder;
    m.matrixAutoUpdate = false; m.matrix.copy(mesh.matrix); m.name = mesh.name; out.push(m);
  }
  return out;
}
export function chunkStatic(W, root, cell = 40) { // ground detail only: measured on every map, splitting the big shadow-casting batches cost more draw calls than the triangles it saved
  root = W.detail; if (!root) return 0;
  const skip = new Set(); for (const b of W.buildings) { if (b.group) skip.add(b.group); if (b.upper) skip.add(b.upper); if (b.inner) skip.add(b.inner); } for (const r of W.rooms) if (r.group) skip.add(r.group);
  const list = [];
  const walk = (o) => { if (skip.has(o)) return; for (const c of o.children) walk(c); if (o.isMesh && !o.isInstancedMesh && !o.material.transparent && o.matrixAutoUpdate === false && !o.userData.dyn) {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; if (Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) > cell * 1.5) list.push(o); } };
  walk(root);
  let made = 0; W.farCull = [];
  for (const o of list) { const parts = chunkMesh(o, cell); if (!parts) continue; const par = o.parent; const det = par === W.detail;
    for (const m of parts) { par.add(m); if (det) W.farCull.push(m); } par.remove(o); o.geometry.dispose(); made += parts.length; }
  return made;
}
// far-only LOD for fine ground detail: only cells you are far away from (tiny, foggy) are skipped
export function farCull(W, cam, R = 85) {
  if (!W.farCull) return; const x = cam.position.x, z = cam.position.z;
  for (const m of W.farCull) { const bb = m.geometry.boundingBox, dx = Math.max(bb.min.x - x, 0, x - bb.max.x), dz = Math.max(bb.min.z - z, 0, z - bb.max.z); m.visible = dx * dx + dz * dz < R * R; }
}
// compile every program the map can use (hidden FX pools, basements, interiors) while the loading/menu screen is up
export function warmShaders(renderer, scene, camera) {
  const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try { renderer.compile(scene, camera); } catch (e) {}
  for (const o of hidden) o.visible = false;
}
// free GPU memory of a tree that's leaving the scene (shared/cached geometry + materials are kept)
export function freeTree(root, all) {
  const mats = new Set();
  root.traverse((o) => { if (o.geometry && (all ? !o.geometry.userData.keep : o.geometry.userData.batch || o.geometry.userData.chunk)) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!isCached(m) && !m.userData.keep) mats.add(m); }); });
  for (const m of mats) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); }
}
