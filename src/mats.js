import * as THREE from 'three';
const cache = new Map(), owned = new WeakSet();
export function isCached(m) { return owned.has(m); }
// physically based material cache. o: {r: roughness, m: metalness, e: emissive hex, ei, cc: clearcoat, op: opacity}
export function M(color, o) {
  o = o || {};
  const key = color + '|' + JSON.stringify(o);
  let m = cache.get(key); if (m) return m;
  const P = { color, roughness: o.r != null ? o.r : 0.6, metalness: o.m || 0 };
  if (o.e != null) { P.emissive = o.e; P.emissiveIntensity = o.ei != null ? o.ei : 1; }
  if (o.op != null) { P.transparent = true; P.opacity = o.op; P.depthWrite = o.dw != null ? o.dw : false; }
  if (o.side) P.side = o.side;
  if (o.cc) { P.clearcoat = o.cc; P.clearcoatRoughness = o.ccr != null ? o.ccr : 0.25; m = new THREE.MeshPhysicalMaterial(P); }
  else m = new THREE.MeshStandardMaterial(P);
  if (o.flat) m.flatShading = true;
  cache.set(key, m); owned.add(m); return m;
}
export function glow(color, a) { // additive glow material (bloom catches it)
  const key = 'glow|' + color + '|' + a; let m = cache.get(key); if (m) return m;
  m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: a == null ? 0.6 : a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  cache.set(key, m); owned.add(m); return m;
}
export function basic(color, o) {
  o = o || {}; const key = 'basic|' + color + JSON.stringify(o); let m = cache.get(key); if (m) return m;
  m = new THREE.MeshBasicMaterial(Object.assign({ color, toneMapped: o.tm !== undefined ? o.tm : false }, o.p || {}));
  cache.set(key, m); owned.add(m); return m;
}
