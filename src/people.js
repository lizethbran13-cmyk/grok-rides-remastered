// rounded cartoon people (drivers, riders, walkers, shopkeepers) - Tempest style
import * as THREE from 'three';
import { GEO, Batch, mesh } from './geo.js';
import { M, glow } from './mats.js';
export const SKINS = [0xf6c9a0, 0xe0a979, 0xb97a4f, 0x8a5a3b, 0xffd9b8];
export const HATS = ['none', 'cap', 'hardhat', 'cowboy', 'crown', 'party', 'astro', 'dino', 'beanie', 'chef', 'meteo', 'ratears'];
export function makePerson(look) {
  look = Object.assign({ skin: SKINS[0], shirt: 0x3b82f6, pants: 0x334155, hair: 0x3a2516, hat: 'cap', hatColor: 0xef4444, shoes: 0xffffff }, look || {});
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = M(look.skin, { r: 0.55 }), shirt = M(look.shirt, { r: 0.7 }), pants = M(look.pants, { r: 0.75 }), shoe = M(look.shoes, { r: 0.4, cc: 0.4 });
  const P = { root, body, look };
  // legs
  P.legs = [-1, 1].map((s) => {
    const piv = new THREE.Group(); piv.position.set(s * 0.13, 0.78, 0); body.add(piv);
    mesh(GEO.cap(0.115, 0.42), pants, 0, -0.32, 0, piv);
    const sh = mesh(GEO.rbox(0.2, 0.15, 0.32, 0.07), shoe, 0, -0.71, 0.05, piv);
    mesh(GEO.rbox(0.21, 0.05, 0.33, 0.02), M(0x222831), 0, -0.775, 0.05, piv);
    return piv;
  });
  mesh(GEO.sphere(0.26, 20, 14), pants, 0, 0.84, 0, body).scale.set(1, 0.7, 0.85);
  const torso = mesh(GEO.cap(0.25, 0.3), shirt, 0, 1.07, 0, body); torso.scale.set(1, 1, 0.82);
  mesh(GEO.torus(0.2, 0.035, Math.PI * 2, 8, 24), M(0xffffff, { r: 0.6 }), 0, 1.33, 0, body).rotation.x = Math.PI / 2; // collar
  P.arms = [-1, 1].map((s) => {
    const piv = new THREE.Group(); piv.position.set(s * 0.31, 1.27, 0); body.add(piv);
    mesh(GEO.sphere(0.1, 14, 10), shirt, 0, 0, 0, piv);
    mesh(GEO.cap(0.08, 0.32), shirt, 0, -0.2, 0, piv);
    mesh(GEO.sphere(0.095, 14, 10), skin, 0, -0.45, 0, piv);
    piv.rotation.z = s * 0.12; return piv;
  });
  // head
  const head = P.head = new THREE.Group(); head.position.set(0, 1.42, 0); body.add(head);
  mesh(GEO.sphere(0.34, 32, 24), skin, 0, 0.3, 0, head);
  const hair = mesh(new THREE.SphereGeometry(0.355, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), M(look.hair, { r: 0.8 }), 0, 0.31, -0.01, head); hair.rotation.x = -0.25;
  const eyeW = M(0xffffff, { r: 0.2, cc: 0.6 }), eyeB = M(0x111418, { r: 0.15, cc: 1 });
  [-1, 1].forEach((s) => {
    const e = mesh(GEO.sphere(0.085, 16, 12), eyeW, s * 0.125, 0.33, 0.27, head, false); e.scale.set(0.9, 1.1, 0.6);
    mesh(GEO.sphere(0.05, 14, 10), eyeB, s * 0.125, 0.33, 0.315, head, false).scale.set(1, 1.15, 0.6);
    mesh(GEO.sphere(0.016, 8, 6), M(0xffffff, { e: 0xffffff, ei: 1 }), s * 0.125 + 0.018, 0.355, 0.34, head, false);
    mesh(GEO.sphere(0.05, 12, 8), M(0xff8fa3, { r: 0.8 }), s * 0.2, 0.22, 0.25, head, false).scale.set(1, 0.6, 0.4);
  });
  const mouth = P.mouth = mesh(GEO.torus(0.065, 0.018, Math.PI, 8, 16), M(0x5b1d1d, { r: 0.5 }), 0, 0.2, 0.31, head, false); mouth.rotation.z = Math.PI;
  P.hatG = new THREE.Group(); P.hatG.position.y = 0.3; head.add(P.hatG);
  P.backG = new THREE.Group(); P.backG.position.set(0, 1.1, -0.22); body.add(P.backG);
  setHat(P, look.hat, look.hatColor);
  // KO stars
  const stars = P.stars = new THREE.Group(); stars.position.y = 2.25; stars.visible = false; root.add(stars);
  for (let i = 0; i < 5; i++) { const s = mesh(GEO.star(0.11, 0.05), M(0xffd23f, { e: 0xffb300, ei: 0.8, r: 0.3 }), Math.cos(i / 5 * 6.283) * 0.42, 0, Math.sin(i / 5 * 6.283) * 0.42, stars, false); s.rotation.x = -0.3; }
  // umbrella (shown during hail/storm when owned)
  const um = P.umbrella = new THREE.Group(); um.position.set(0.32, 1.25, 0); um.visible = false; body.add(um);
  mesh(GEO.cyl(0.02, 0.02, 1.2, 8), M(0x444444, { m: 0.6, r: 0.3 }), 0, 0.5, 0, um);
  mesh(new THREE.SphereGeometry(0.75, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), M(0xff4fa3, { r: 0.45, cc: 0.5, side: THREE.DoubleSide }), 0, 0.45, 0, um);
  // merge the static bits of every animated part (fewer draw calls)
  [body, head, ...P.legs, ...P.arms].forEach((g) => compact(g, [P.mouth]));
  compact(P.hatG, []);
  P.walk = 0; P.stun = 0;
  return P;
}
export function compact(g, exclude) {
  const ms = g.children.filter((c) => c.isMesh && !exclude.includes(c) && c.visible);
  if (ms.length < 2) return;
  const B = new Batch(), noShadow = new Batch();
  ms.forEach((m) => { m.updateMatrix(); (m.castShadow ? B : noShadow).add(m.geometry, m.material, m.matrix); g.remove(m); });
  B.build(g); noShadow.build(g, { cast: false });
}
export function setHat(P, hat, color = 0xef4444) {
  const g = P.hatG; while (g.children.length) g.remove(g.children[0]);
  const c = M(color, { r: 0.5, cc: 0.3 });
  if (hat === 'cap') { mesh(new THREE.SphereGeometry(0.36, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.02, 0, g); mesh(GEO.cyl(0.3, 0.3, 0.03, 24), c, 0, 0.03, 0.25, g).scale.set(1, 1, 0.8); }
  else if (hat === 'hardhat') { const y = M(0xffc21a, { r: 0.35, cc: 0.8 }); mesh(new THREE.SphereGeometry(0.38, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), y, 0, 0.03, 0, g); mesh(GEO.cyl(0.46, 0.46, 0.04, 28), y, 0, 0.04, 0.03, g); mesh(GEO.rbox(0.08, 0.12, 0.62, 0.03), y, 0, 0.32, 0, g); }
  else if (hat === 'cowboy') { const b = M(0x8b5a2b, { r: 0.8 }); mesh(GEO.cyl(0.6, 0.6, 0.04, 32), b, 0, 0.06, 0, g); mesh(GEO.cyl(0.26, 0.32, 0.36, 24), b, 0, 0.24, 0, g); mesh(GEO.torus(0.31, 0.03, 6.28, 8, 24), M(0x3b2314), 0, 0.12, 0, g).rotation.x = Math.PI / 2; }
  else if (hat === 'crown') { const gd = M(0xffcf33, { r: 0.2, m: 1 }); mesh(GEO.cyl(0.27, 0.25, 0.16, 28, 1), gd, 0, 0.12, 0, g); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; mesh(GEO.cone(0.06, 0.16, 10), gd, Math.cos(a) * 0.24, 0.27, Math.sin(a) * 0.24, g); mesh(GEO.sphere(0.035, 10, 8), M(0xff2d55, { r: 0.1, cc: 1 }), Math.cos(a) * 0.27, 0.12, Math.sin(a) * 0.27, g); } }
  else if (hat === 'party') { mesh(GEO.cone(0.18, 0.5, 24), c, 0, 0.3, 0, g); mesh(GEO.sphere(0.07, 12, 8), M(0xffffff), 0, 0.57, 0, g); }
  else if (hat === 'astro') { mesh(GEO.sphere(0.5, 32, 24), M(0xbfe6ff, { r: 0.05, op: 0.28, cc: 1 }), 0, 0.0, 0.02, g, false); mesh(GEO.torus(0.42, 0.06, 6.28, 10, 32), M(0xf1f5f9, { r: 0.4 }), 0, -0.3, 0, g).rotation.x = Math.PI / 2; }
  else if (hat === 'dino') { const d = M(0x4ade80, { r: 0.6 }); mesh(new THREE.SphereGeometry(0.39, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), d, 0, -0.03, -0.02, g); for (let i = 0; i < 4; i++) mesh(GEO.cone(0.07, 0.18, 10), M(0xfacc15), 0, 0.36 - i * 0.04, -0.1 - i * 0.12, g).rotation.x = -0.5 - i * 0.25; }
  else if (hat === 'beanie') { mesh(new THREE.SphereGeometry(0.37, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, -0.02, 0, g); mesh(GEO.sphere(0.09, 12, 8), M(0xffffff, { r: 0.9 }), 0, 0.37, 0, g); }
  else if (hat === 'meteo') { // Weather Hunter: fuzzy earmuff beanie with snow goggles
    mesh(new THREE.SphereGeometry(0.37, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0x7c3aed, { r: 0.85 }), 0, -0.02, 0, g); mesh(GEO.torus(0.36, 0.05, 6.283, 8, 28), M(0xffffff, { r: 0.9 }), 0, 0.0, 0, g).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => mesh(GEO.sphere(0.13, 14, 10), M(0xffffff, { r: 0.95 }), s * 0.35, -0.12, 0, g)); mesh(GEO.sphere(0.1, 12, 8), M(0xfacc15, { r: 0.8 }), 0, 0.38, 0, g);
    mesh(GEO.torus(0.33, 0.035, Math.PI, 6, 20), M(0x111827), 0, 0.12, 0.02, g).rotation.set(0, 0, 0); [-1, 1].forEach((s) => mesh(GEO.cyl(0.1, 0.1, 0.06, 16), M(0x38bdf8, { r: 0.05, m: 0.4, cc: 1 }), s * 0.12, 0.16, 0.3, g).rotation.x = Math.PI / 2); }
  else if (hat === 'ratears') { // Ratita Industries staff headband: big grey mouse ears
    mesh(GEO.torus(0.34, 0.03, Math.PI, 6, 20), M(0x111827, { r: 0.5 }), 0, 0.02, 0, g).rotation.y = Math.PI / 2;
    [-1, 1].forEach((s) => { mesh(GEO.sphere(0.2, 18, 12), M(0x9ca3af, { r: 0.5 }), s * 0.3, 0.3, -0.02, g).scale.set(1, 1, 0.3); mesh(GEO.sphere(0.13, 14, 10), M(0xf9a8d4, { r: 0.5 }), s * 0.3, 0.3, 0.03, g).scale.set(1, 1, 0.25); }); }
  else if (hat === 'chef') { const w = M(0xffffff, { r: 0.8 }); mesh(GEO.cyl(0.3, 0.3, 0.25, 24), w, 0, 0.12, 0, g); [[0, 0.38, 0], [0.15, 0.33, 0.05], [-0.15, 0.33, 0.05], [0, 0.33, -0.15]].forEach((p) => mesh(GEO.sphere(0.2, 16, 12), w, p[0], p[1], p[2], g)); }
}

export const SHIRTS = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7, 0xec4899, 0x14b8a6, 0xf97316, 0x64748b, 0xffffff, 0x0ea5e9, 0x84cc16];
export const HAIRS = [0x3a2516, 0x1b1b1b, 0x8b5a2b, 0xd4a14a, 0xb4532a, 0x6b4423, 0xe5e7eb];
export function randLook(seed) {
  const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
  return { skin: SKINS[r(SKINS.length)], shirt: SHIRTS[r(SHIRTS.length)], pants: [0x334155, 0x1e3a8a, 0x78350f, 0x0f172a, 0x6b7280, 0x166534][r(6)], hair: HAIRS[r(HAIRS.length)], hat: ['none', 'none', 'cap', 'beanie', 'none', 'cowboy'][r(6)], hatColor: SHIRTS[r(SHIRTS.length)] };
}
// poses: idle | walk | run | sit (car seat) | ride (motorbike/scooter) | pedal (bicycle) | wave | serve | stand (boat/jetski) | sleep
export function animPerson(P, st, dt, speed, t) {
  const b = P.body, L = P.legs, A = P.arms; P.walk += dt * (st === 'run' ? 9 : st === 'walk' ? 6 : st === 'pedal' ? 7 * Math.min(1.6, 0.3 + speed) : 0);
  let ly = 0, ry = 0, la = 0, ra = 0, bodyY = 0, tilt = 0, roll = 0, laZ = 0.12, raZ = -0.12, kneeL = 0, kneeR = 0;
  if (P.stars) P.stars.visible = false;
  if (st === 'run' || st === 'walk') { const w = Math.sin(P.walk), a = st === 'run' ? 0.9 : 0.55; ly = w * a; ry = -w * a; la = -w * a * 0.9; ra = w * a * 0.9; bodyY = Math.abs(Math.cos(P.walk)) * (st === 'run' ? 0.07 : 0.035); tilt = st === 'run' ? 0.12 : 0.03; }
  else if (st === 'sit') { ly = -1.45; ry = -1.45; la = -1.1; ra = -1.1; laZ = 0.25; raZ = -0.25; bodyY = -0.45; }
  else if (st === 'ride') { ly = -1.2; ry = -1.2; la = -1.25; ra = -1.25; laZ = 0.3; raZ = -0.3; bodyY = -0.42; tilt = 0.35; }
  else if (st === 'pedal') { const w = Math.sin(P.walk); ly = -1.0 + w * 0.55; ry = -1.0 - w * 0.55; la = -1.2; ra = -1.2; laZ = 0.25; raZ = -0.25; bodyY = -0.3; tilt = 0.45; }
  else if (st === 'stand') { ly = -0.25; ry = -0.25; la = -1.2; ra = -1.2; laZ = 0.3; raZ = -0.3; bodyY = -0.12; tilt = 0.15; }
  else if (st === 'wave') { const w = Math.sin(t * 9); ra = -2.7; raZ = -0.4 + w * 0.35; la = 0.05; }
  else if (st === 'serve') { const w = Math.sin(t * 3); la = -1.3 + w * 0.15; ra = -1.3 - w * 0.15; laZ = 0.2; raZ = -0.2; }
  else if (st === 'sleep') { tilt = -1.5; bodyY = 0.2; }
  else { const w = Math.sin(t * 2); bodyY = w * 0.015; la = w * 0.05; ra = -w * 0.05; }
  const k = Math.min(1, dt * 14), lp = (o, v) => o + (v - o) * k;
  L[0].rotation.x = lp(L[0].rotation.x, ly); L[1].rotation.x = lp(L[1].rotation.x, ry);
  A[0].rotation.x = lp(A[0].rotation.x, la); A[1].rotation.x = lp(A[1].rotation.x, ra);
  A[0].rotation.z = lp(A[0].rotation.z, -laZ); A[1].rotation.z = lp(A[1].rotation.z, -raZ);
  b.position.y = lp(b.position.y, bodyY); b.rotation.x = lp(b.rotation.x, tilt); b.rotation.z = lp(b.rotation.z, roll);
}
// low-cost crowd person (one merged mesh + 4 limbs) for pedestrians/customers
export function makeWalker(seed) { const P = makePerson(randLook(seed)); P.root.scale.setScalar(0.86); return P; }
// Torty (Martina) the tortoise: smooth domed shell, friendly face
export function makeTorty() {
  const root = new THREE.Group(), P = { root, body: new THREE.Group() }; root.add(P.body);
  const shell = M(0x4d7c0f, { r: 0.45, cc: 0.5 }), skin = M(0x9bd06a, { r: 0.6 });
  mesh(new THREE.SphereGeometry(0.62, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.32, 0, P.body).scale.set(1, 0.85, 1.15);
  mesh(GEO.torus(0.62, 0.07, 6.283, 10, 40), M(0xa16207, { r: 0.6 }), 0, 0.33, 0, P.body).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; mesh(GEO.sphere(0.17, 14, 10), M(0x65a30d, { r: 0.5 }), Math.cos(a) * 0.35, 0.72, Math.sin(a) * 0.4, P.body).scale.set(1, 0.35, 1); }
  mesh(GEO.sphere(0.2, 16, 12), M(0x65a30d, { r: 0.5 }), 0, 0.84, 0, P.body).scale.set(1, 0.4, 1);
  const head = P.head = new THREE.Group(); head.position.set(0, 0.5, 0.78); P.body.add(head);
  mesh(GEO.sphere(0.26, 24, 18), skin, 0, 0, 0, head);
  [-1, 1].forEach((s) => { mesh(GEO.sphere(0.075, 14, 10), M(0xffffff, { r: 0.2 }), s * 0.11, 0.08, 0.2, head); mesh(GEO.sphere(0.045, 12, 8), M(0x111418, { r: 0.1, cc: 1 }), s * 0.11, 0.08, 0.255, head); mesh(GEO.sphere(0.04, 10, 8), M(0xff8fa3), s * 0.17, -0.02, 0.2, head); });
  mesh(GEO.torus(0.07, 0.015, Math.PI, 8, 14), M(0x14532d), 0, -0.04, 0.24, head).rotation.z = Math.PI;
  mesh(GEO.cyl(0.2, 0.22, 0.04, 20), M(0xfacc15, { r: 0.5 }), 0, 0.22, 0, head); // sun hat brim
  mesh(new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0xfacc15, { r: 0.5 }), 0, 0.22, 0, head);
  P.legs = [[-0.4, 0.45], [0.4, 0.45], [-0.4, -0.45], [0.4, -0.45]].map(([x, z]) => mesh(GEO.cap(0.12, 0.12, 10), skin, x, 0.16, z, P.body));
  return P;
}
