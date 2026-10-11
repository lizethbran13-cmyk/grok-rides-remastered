// parked cars along the kerbs: one real vehicle model per type, drawn with GPU instancing (paint colour per instance),
// only the cars within PARK_D of the camera are drawn, so they cost a few draw calls and almost no memory
import * as THREE from 'three';
import { makeVehicle } from './vmodels.js';
import { Batch } from './geo.js';
import { G } from './gfx.js';
export const PARKED = []; // {t, col, m: Matrix4, x, z}
const TPL = new Map(), MAXI = 40, PARK_D = 95;
let root = null, tick = 0;
function template(t) {
  let tp = TPL.get(t); if (tp) return tp;
  const V = makeVehicle(t, { color: 0xffffff, rider: false, noBeam: true }); V.paint.userData.noUber = true; V.root.updateMatrixWorld(true);
  const bt = new Batch(); V.root.traverse((o) => { if (o.isMesh && o.visible !== false) bt.add(o.geometry, o.material, o.matrixWorld.clone()); });
  const tmp = new THREE.Group(), meshes = bt.build(tmp);
  tp = meshes.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, MAXI); im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.paint = m.material === V.paint; if (im.paint) { im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3); } root.add(im); return im; });
  TPL.set(t, tp); return tp;
}
export function addParked(t, col, m) { PARKED.push({ t, col: new THREE.Color(col), m, x: m.elements[12], z: m.elements[14] }); }
export function initParked() { root = new THREE.Group(); root.name = 'parked'; G.scene.add(root); for (const p of PARKED) template(p.t); }
export function updateParked(cam, force) {
  if (!root || (!force && (++tick % 15))) return;
  const x = cam.position.x, z = cam.position.z, n = new Map();
  for (const tp of TPL.values()) for (const im of tp) im.count = 0;
  for (const p of PARKED) { if (Math.abs(p.x - x) > PARK_D || Math.abs(p.z - z) > PARK_D) continue; const tp = TPL.get(p.t), k = n.get(p.t) || 0; if (k >= MAXI) continue; n.set(p.t, k + 1);
    for (const im of tp) { im.setMatrixAt(k, p.m); if (im.paint) im.setColorAt(k, p.col); im.count = k + 1; } }
  for (const tp of TPL.values()) for (const im of tp) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
}
export function showParked(on) { if (root) root.visible = on; }
