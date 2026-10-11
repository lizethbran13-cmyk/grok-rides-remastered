// region chunks: every static thing lives in a 125 m cell. Cells beyond the fog are hidden, fine detail only near the camera
// (far-only LOD), and each cell's batches are merged so a cell costs a handful of draw calls.
import * as THREE from 'three';
import { Batch } from './geo.js';
export const CH = 128;
const cells = new Map();
export const CHUNKS = { cells, root: new THREE.Group(), view: 760, detail: 180, nearD: 250 };
CHUNKS.root.name = 'chunks';
const key = (i, j) => i * 1000 + j;
export function cellAt(x, z) {
  const i = Math.floor(x / CH), j = Math.floor(z / CH), k = key(i, j); let c = cells.get(k);
  if (!c) { c = { i, j, x0: i * CH, z0: j * CH, g: new THREE.Group(), det: new THREE.Group(), nearG: new THREE.Group(), far: new THREE.Group(), B: new Batch(), D: new Batch(), Bn: new Batch(), L: new Batch(), anim: [] }; c.det.name = 'det'; c.nearG.name = 'near'; c.far.name = 'far'; c.g.add(c.det, c.nearG, c.far); c.far.visible = false; CHUNKS.root.add(c.g); cells.set(k, c); }
  return c;
}
// add to the cell's main batch (shadow casters) / detail batch (small stuff, near only) / no-shadow batch
export const L = (x, z) => cellAt(x, z).L;
export const B = (x, z) => cellAt(x, z).B, D = (x, z) => cellAt(x, z).D, Bn = (x, z) => cellAt(x, z).Bn;
export function addObj(x, z, o, detail) { const c = cellAt(x, z); (detail ? c.det : c.g).add(o); return o; }
export function buildChunks() {
  for (const c of cells.values()) { c.B.build(c.nearG); c.D.build(c.det, { cast: false }); c.Bn.build(c.nearG, { cast: false }); c.L.build(c.far, { cast: false }); }
}
let tick = 0;
export function updateChunks(cam, force) {
  if (!force && (++tick % 6)) return;
  const x = cam.position.x, z = cam.position.z, V = CHUNKS.view, Dd = CHUNKS.detail;
  for (const c of cells.values()) {
    const dx = Math.max(c.x0 - x, 0, x - c.x0 - CH), dz = Math.max(c.z0 - z, 0, z - c.z0 - CH), d2 = dx * dx + dz * dz;
    c.g.visible = d2 < V * V; c.det.visible = c.g.visible && d2 < Dd * Dd; c.near = d2 < 200 * 200; const nr = d2 < CHUNKS.nearD * CHUNKS.nearD; c.nearG.visible = nr; c.far.visible = !nr;
  }
}
