// building generators. Frame F: origin at the ground centre, door on the +z face. w along x, d along z.
import * as THREE from 'three';
import { M, glow } from './mats.js';
import { GEO, cg, profileBody } from './geo.js';
import { GLASS, GLASS2, GLASSW, NEON, LAMP, windowOn, awning, door, sign } from './build3d.js';
const C = (c, o) => M(c, o || { r: 0.7 });
const prism = (w, h, d, over = 0.5) => cg('prism' + [w, h, d, over], () => { const s = new THREE.Shape(); s.moveTo(-d / 2 - over, 0); s.lineTo(d / 2 + over, 0); s.lineTo(0, h); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: w + over * 2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }); g.translate(0, 0, -(w + over * 2) / 2); g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g; });
function roofStuff(F, w, d, y, rnd, big) { // AC units, vents, water tower, antenna
  const m = C(0xcbd5e1, { r: 0.5, m: 0.5 });
  const n = big ? 4 : 2; for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * (w - 6), z = (rnd() - 0.5) * (d - 6); F.rb(m, 2.4, 1.3, 1.8, 0.2, x, y + 0.65, z); F.add(GEO.cyl(0.6, 0.6, 0.15, 16), C(0x64748b), x, y + 1.36, z); }
  if (rnd() < 0.35) { const x = -w / 4, z = -d / 4; F.add(GEO.cyl(1.6, 1.6, 2.6, 18), C(0xa16207, { r: 0.8 }), x, y + 3.6, z); F.add(GEO.cone(1.8, 1.0, 18), C(0x78350f), x, y + 5.4, z); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) F.add(GEO.cyl(0.08, 0.08, 2.3, 6), C(0x334155), x + a, y + 1.15, z + b); }
}
// downtown skyscraper: glass core with floor slabs, rounded corners, podium with storefront, crown
export function tower(F, w, d, h, col, rnd, o = {}) {
  const pod = 7, core = C(col, { r: 0.35, m: 0.3, cc: 0.6 }), trim = C(o.trim || 0xf8fafc, { r: 0.45 });
  F.rb(C(0xe2e8f0, { r: 0.6 }), w, pod, d, 0.8, 0, pod / 2, 0);
  F.bx(GLASSW(), w - 3, pod - 2.6, 0.1, 0, pod / 2 - 0.4, d / 2 + 0.02); F.bx(GLASSW(), 0.1, pod - 2.6, d - 3, w / 2 + 0.02, pod / 2 - 0.4, 0); F.bx(GLASSW(), 0.1, pod - 2.6, d - 3, -w / 2 - 0.02, pod / 2 - 0.4, 0);
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += 4) F.rb1(trim, 0.3, pod - 2.4, 0.35, 0.1, x, pod / 2 - 0.4, d / 2 + 0.1);
  F.rb(trim, w + 0.6, 0.6, d + 0.6, 0.3, 0, pod, 0);
  const tw = w - 6, td = d - 6, th = h - pod, lit = rnd() < 0.6;
  F.rb(lit ? GLASS() : GLASS2(), tw - 0.4, th, td - 0.4, 1.4, 0, pod + th / 2, 0);
  const fl = 4.2; for (let y = pod + fl; y < h - 1; y += fl) F.rb1(core, tw, 0.55, td, 1.5, 0, y, 0);
  // vertical fins on two faces
  for (let x = -tw / 2 + 2; x < tw / 2 - 1; x += 3.2) { F.rb1(core, 0.35, th, 0.6, 0.15, x, pod + th / 2, td / 2 - 0.05); F.rb1(core, 0.35, th, 0.6, 0.15, x, pod + th / 2, -td / 2 + 0.05); }
  F.rb(core, tw + 0.8, 1.4, td + 0.8, 0.7, 0, h + 0.2, 0);
  if (o.crown === 'spire') { F.add(GEO.cyl(0.3, 1.4, 14, 12), C(0xe5e7eb, { r: 0.2, m: 0.9 }), 0, h + 7.5, 0); F.add(GEO.sphere(0.5, 12, 8), NEON(0xff2d55), 0, h + 14.8, 0, 0, 0, 0, 1, 1, 1, 'N'); }
  else if (o.crown === 'helipad') { F.add(GEO.cyl(Math.min(tw, td) / 2 - 1, Math.min(tw, td) / 2 - 1, 0.3, 32), C(0x334155), 0, h + 1.05, 0); F.text('H', 4, 0xffffff, 0, h + 1.2, 1.6, 0, 'N'); }
  else roofStuff(F, tw, td, h + 0.9, rnd, true);
  return { roofY: o.crown === 'helipad' ? h + 1.2 : h + 0.9 };
}
// mid-rise city block: rounded stucco with punched windows, cornice, ground-floor shop
export function midrise(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.75 }), trim = C(o.trim || 0xffffff, { r: 0.5 }), fl = 3.6;
  F.rb(wall, w, h, d, 0.7, 0, h / 2, 0);
  F.rb(trim, w + 0.7, 0.7, d + 0.7, 0.3, 0, h + 0.1, 0); F.rb(trim, w + 0.3, 0.4, d + 0.3, 0.15, 0, 4.4, 0);
  const lit = rnd() < 0.55;
  for (let y = 4.4 + fl * 0.6; y < h - 1.6; y += fl) {
    for (let x = -w / 2 + 2.4; x <= w / 2 - 2.3; x += 3.2) { windowOn(F, x, y, d / 2, 1.5, 1.8, trim, lit ^ (rnd() < 0.2)); windowOn(F, x, y, -d / 2, 1.5, 1.8, trim, lit, Math.PI); }
    for (let z = -d / 2 + 2.4; z <= d / 2 - 2.3; z += 3.2) { windowOn(F, z, y, w / 2, 1.5, 1.8, trim, lit, Math.PI / 2); windowOn(F, -z, y, w / 2, 1.5, 1.8, trim, !lit, -Math.PI / 2); }
  }
  if (!o.noShop) { F.bx(GLASSW(), w - 6, 2.6, 0.1, 0, 2.0, d / 2 + 0.02); awning(F, 0, 4.0, d / 2 + 0.1, Math.min(w - 4, 14), o.aw1 || 0xef4444, 0xffffff); }
  roofStuff(F, w, d, h + 0.45, rnd);
  return { roofY: h + 0.45 };
}
// small shop / named place: 1-2 storeys, big storefront, awning, 3D sign
export function shop(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.7 }), acc = C(o.acc || 0x2563eb, { r: 0.45, cc: 0.4 }), trim = C(0xffffff, { r: 0.5 });
  F.rb(wall, w, h, d, 0.6, 0, h / 2, 0);
  F.rb(acc, w + 0.5, 0.8, d + 0.5, 0.3, 0, h + 0.2, 0);
  F.rb(acc, w + 0.2, 0.5, 0.5, 0.2, 0, 0.25, d / 2 + 0.1);
  const sw = (w - 4) / 2 - 1; for (const sx of [-1, 1]) { F.bx(GLASSW(), sw, 2.6, 0.1, sx * (sw / 2 + 1.6), 1.9, d / 2 + 0.03); F.rb1(trim, sw + 0.4, 0.2, 0.3, 0.06, sx * (sw / 2 + 1.6), 3.3, d / 2 + 0.1); }
  if (!o.noAwning) awning(F, 0, Math.min(h - 0.6, 4.6), d / 2 + 0.1, w - 2, o.aw1 || 0xef4444, o.aw2 || 0xffffff);
  if (h > 7) for (let x = -w / 2 + 2.5; x <= w / 2 - 2.4; x += 3.4) { windowOn(F, x, h - 2.2, d / 2, 1.6, 1.6, trim, true); windowOn(F, x, h - 2.2, -d / 2, 1.6, 1.6, trim, false, Math.PI); }
  for (let z = -d / 2 + 3; z <= d / 2 - 3; z += 4) { windowOn(F, z, 2.2, w / 2, 1.6, 1.6, trim, true, Math.PI / 2); windowOn(F, -z, 2.2, w / 2, 1.6, 1.6, trim, true, -Math.PI / 2); }
  door(F, d / 2, o.doorCol || 0xffffff);
  if (o.name) sign(F, o.name, 0, h + 1.5, d / 2 + 0.1, Math.min(1.1, (w - 2) / (o.name.length * 0.75)), o.board || 0xffffff, o.letter || o.acc || 0x2563eb);
  roofStuff(F, w, d, h + 0.6, rnd);
  return { roofY: h + 0.6 };
}
// cottage house with pitched roof, porch, chimney, garden
export function house(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.8 }), roof = C(o.roof || [0xb45309, 0x9a3412, 0x1e3a8a, 0x166534, 0x7c2d12][Math.floor(rnd() * 5)], { r: 0.6 }), trim = C(0xffffff, { r: 0.5 });
  F.rb(C(0x9ca3af), w + 0.4, 0.5, d + 0.4, 0.15, 0, 0.1, 0);
  F.rb(wall, w, h, d, 0.35, 0, h / 2 + 0.3, 0);
  F.add(prism(w, d * 0.42, d, 0.7), roof, 0, h + 0.3, 0);
  F.rb(C(0xa1a1aa, { r: 0.8 }), 1.1, 2.6, 1.1, 0.15, w * 0.28, h + d * 0.3, -d * 0.15);
  // porch
  F.rb(C(0xd6d3d1), w * 0.5, 0.3, 2.4, 0.1, 0, 0.35, d / 2 + 1.1); for (const sx of [-1, 1]) F.add(GEO.cyl(0.12, 0.12, 2.6, 10), trim, sx * w * 0.23, 1.6, d / 2 + 2.1);
  F.add(prism(w * 0.52, 0.9, 2.6, 0.2), roof, 0, 2.9, d / 2 + 1.1, 0, Math.PI / 2, 0, 1, 1, 1); // little porch roof
  door(F, d / 2, o.doorCol || [0x2563eb, 0xdc2626, 0x16a34a, 0x7c3aed][Math.floor(rnd() * 4)], 1.4, 2.4, !o.noGlow);
  for (const sx of [-1, 1]) { windowOn(F, sx * w * 0.32, 1.9, d / 2, 1.5, 1.3, trim, true); windowOn(F, sx * w * 0.25, 1.9, -d / 2, 1.5, 1.3, trim, true, Math.PI); }
  windowOn(F, 0, 1.9, w / 2, 1.5, 1.3, trim, true, Math.PI / 2); windowOn(F, 0, 1.9, w / 2, 1.5, 1.3, trim, false, -Math.PI / 2);
  if (o.garage) { F.rb(wall, 5.4, 3.2, d * 0.8, 0.3, w / 2 + 2.6, 1.9, 0); F.rb(roof, 6, 0.35, d * 0.85, 0.15, w / 2 + 2.6, 3.6, 0); for (let i = 0; i < 5; i++) F.rb1(C(0xf8fafc), 4.2, 0.5, 0.1, 0.05, w / 2 + 2.6, 0.6 + i * 0.52, d * 0.4 + 0.05); }
  return { roofY: h + 0.3 };
}
// Sunny Shores pastel stucco with balconies and a flat roof terrace
export function beachHouse(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.75 }), trim = C(0xffffff, { r: 0.5 }), rail = C(o.acc || 0x0ea5e9, { r: 0.4, cc: 0.4 });
  F.rb(wall, w, h, d, 1.0, 0, h / 2, 0); F.rb(trim, w + 0.6, 0.5, d + 0.6, 0.25, 0, h, 0);
  for (let y = 3.2; y < h - 1; y += 3.4) {
    for (let x = -w / 2 + 2.5; x <= w / 2 - 2.4; x += 3.6) windowOn(F, x, y + 0.8, d / 2, 1.4, 1.6, trim, rnd() < 0.7);
    if (y > 4) { F.rb(trim, w * 0.7, 0.25, 1.6, 0.1, 0, y - 0.2, d / 2 + 0.8); F.rb1(rail, w * 0.7, 0.9, 0.1, 0.05, 0, y + 0.3, d / 2 + 1.55); }
    for (let z = -d / 2 + 2.5; z <= d / 2 - 2.4; z += 3.6) { windowOn(F, z, y + 0.8, w / 2, 1.4, 1.6, trim, true, Math.PI / 2); windowOn(F, -z, y + 0.8, w / 2, 1.4, 1.6, trim, true, -Math.PI / 2); }
  }
  if (!o.noShop) { F.bx(GLASSW(), w - 6, 2.2, 0.1, 0, 1.5, d / 2 + 0.02); awning(F, 0, 3.4, d / 2 + 0.1, w - 4, o.aw1 || 0x06b6d4, 0xffffff); }
  F.add(GEO.cyl(1.6, 1.6, 0.1, 18), C(0xfbbf24), w / 4, h + 2.2, -d / 4); F.add(GEO.cyl(0.06, 0.06, 2.2, 6), trim, w / 4, h + 1.1, -d / 4); // parasol
  return { roofY: h + 0.25 };
}
// desert adobe with rounded edges and wooden vigas
export function adobe(F, w, d, h, col, rnd) {
  const wall = C(col || 0xe9b97a, { r: 0.95 }), wood = C(0x7c4a1e, { r: 0.9 }), trim = C(0x0e7490, { r: 0.5 });
  F.rb(wall, w, h, d, 1.2, 0, h / 2, 0); F.rb(wall, w * 0.6, 3, d * 0.6, 1.0, -w * 0.12, h + 1.2, -d * 0.1);
  for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2) F.add(GEO.cyl(0.16, 0.16, 1.4, 8), wood, x, h - 0.7, d / 2 + 0.4, Math.PI / 2, 0, 0);
  for (const sx of [-1, 1]) windowOn(F, sx * w * 0.3, 2.2, d / 2, 1.3, 1.3, trim, true);
  return { roofY: h };
}
// log cabin with snowy roof
export function cabin(F, w, d, h, col, rnd, o = {}) {
  const log = C(col || 0x8b5a2b, { r: 0.85 }), roof = C(o.snow ? 0xf8fbff : 0x7c2d12, { r: 0.6 }), trim = C(0xffffff);
  for (let y = 0.4; y < h; y += 0.6) { F.add(GEO.cyl(0.3, 0.3, w + 0.8, 10), log, 0, y, d / 2, 0, 0, Math.PI / 2); F.add(GEO.cyl(0.3, 0.3, w + 0.8, 10), log, 0, y, -d / 2, 0, 0, Math.PI / 2); F.add(GEO.cyl(0.3, 0.3, d + 0.8, 10), log, w / 2, y + 0.3, 0, Math.PI / 2, 0, 0); F.add(GEO.cyl(0.3, 0.3, d + 0.8, 10), log, -w / 2, y + 0.3, 0, Math.PI / 2, 0, 0); }
  F.rb(C(0xa16207, { r: 0.9 }), w - 0.2, h, d - 0.2, 0.1, 0, h / 2, 0);
  F.add(prism(w, d * 0.5, d, 1.0), roof, 0, h, 0);
  F.rb(C(0x78716c), 1.2, 3.5, 1.2, 0.2, -w * 0.3, h + d * 0.3, -d * 0.2);
  for (const sx of [-1, 1]) windowOn(F, sx * w * 0.28, 2, d / 2 + 0.3, 1.4, 1.2, trim, true);
  return { roofY: h };
}
// airfield hangar: half-cylinder shell with big doors
export function hangar(F, w, d, h, col, rnd, o = {}) {
  const shell = C(col || 0xe2e8f0, { r: 0.35, m: 0.6 });
  F.add(cg('hangar' + [w, d], () => new THREE.CylinderGeometry(w / 2, w / 2, d, 32, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2)), shell, 0, 0, 0, 0, 0, 0, 1, (h) / (w / 2), 1);
  F.bx(C(0xfafafa), w * 0.96, h * 0.85, 0.3, 0, h * 0.42, d / 2 - 0.1);
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += 3) F.rb1(C(0x94a3b8), 0.2, h * 0.75, 0.2, 0.05, x, h * 0.4, d / 2 + 0.1);
  door(F, d / 2, 0x2563eb); if (o.name) sign(F, o.name, 0, h * 0.95, d / 2 + 0.2, 1.4, 0xffffff, o.acc || 0x2563eb);
  return { roofY: h };
}
// garage-door building (fire station, garages, depots)
export function garageBldg(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.75 }), acc = C(o.acc || 0x334155, { r: 0.45 }), n = o.bays || 2;
  F.rb(wall, w, h, d, 0.6, 0, h / 2, 0); F.rb(acc, w + 0.5, 0.8, d + 0.5, 0.3, 0, h + 0.2, 0);
  const bw = Math.min(5.2, (w - 6) / n - 0.8);
  for (let i = 0; i < n; i++) { const x = -w / 2 + 2 + bw / 2 + i * (bw + 0.8); F.rb1(C(0x1f2937), bw + 0.4, 4.4, 0.2, 0.05, x, 2.2, d / 2); for (let k = 0; k < 6; k++) F.rb1(C(o.doorCol || 0xf8fafc, { r: 0.4, m: 0.3 }), bw, 0.66, 0.12, 0.05, x, 0.4 + k * 0.7, d / 2 + 0.1); }
  const dx = w / 2 - 2.2; F.rb(C(0xffffff, { r: 0.45, cc: 0.4 }), 1.6, 2.5, 0.2, 0.08, dx, 1.25, d / 2 + 0.05);
  F.add(GEO.torus(1.3, 0.06, Math.PI, 8, 24), glow(0x4ade80, 0.55), dx, 0.02, d / 2 + 0.5, -Math.PI / 2, 0, 0, 1, 1, 1, 'N');
  if (o.name) sign(F, o.name, 0, h + 1.5, d / 2 + 0.1, Math.min(1.2, (w - 2) / (o.name.length * 0.75)), 0xffffff, o.letter || o.acc || 0x334155);
  roofStuff(F, w, d, h + 0.6, rnd);
  return { roofY: h + 0.6, doorX: dx };
}
export { prism };
