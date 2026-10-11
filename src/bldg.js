// building generators. Frame F: origin at the ground centre, door on the +z face. w along x, d along z.
import * as THREE from 'three';
import { M, glow } from './mats.js';
import { GEO, cg, profileBody } from './geo.js';
import { textGeo } from './text3d.js';
import { GLASS, GLASS2, GLASSW, NEON, LAMP, windowOn, awning, door, sign } from './build3d.js';
const C = (c, o) => M(c, o || { r: 0.7 });
const prism = (w, h, d, over = 0.5) => cg('prism' + [w, h, d, over], () => { const s = new THREE.Shape(); s.moveTo(-d / 2 - over, 0); s.lineTo(d / 2 + over, 0); s.lineTo(0, h); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: w + over * 2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }); g.translate(0, 0, -(w + over * 2) / 2); g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g; });
function roofStuff(F, w, d, y, rnd, big) { // AC units, vents, water tower, antenna
  const m = C(0xcbd5e1, { r: 0.5, m: 0.5 });
  const n = big ? 4 : 2; for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * (w - 6), z = (rnd() - 0.5) * (d - 6); F.rb(m, 2.4, 1.3, 1.8, 0.2, x, y + 0.65, z); F.add(GEO.cyl(0.6, 0.6, 0.15, 16), C(0x64748b), x, y + 1.36, z); }
  if (rnd() < 0.35) { const x = -w / 4, z = -d / 4; F.add(GEO.cyl(1.6, 1.6, 2.6, 18), C(0xa16207, { r: 0.8 }), x, y + 3.6, z); F.add(GEO.cone(1.8, 1.0, 18), C(0x78350f), x, y + 5.4, z); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) F.add(GEO.cyl(0.08, 0.08, 2.3, 6), C(0x334155), x + a, y + 1.15, z + b); }
}
const SHOPW = ['CAFE', 'BOOKS', 'SHOES', 'TOYS', 'DELI', 'BAKERY', 'FLOWERS', 'MUSIC', 'GAMES', 'DONUTS', 'SUSHI', 'GYM', 'TACOS', 'PETS', 'ART', 'BIKES'];
const AWN = [0xef4444, 0x2563eb, 0x16a34a, 0xf59e0b, 0xdb2777, 0x7c3aed, 0x0891b2, 0xea580c];
// ground floor shop bays: glass, mullions, striped awning, 3D shop word, planters
function storefronts(F, w, d, h0, rnd, wall, o = {}) {
  const n = Math.max(1, Math.floor((w - 2) / 7.5)), bw = (w - 2) / n, trim = C(0xf8fafc, { r: 0.45 }), dark = C(0x1f2937, { r: 0.4, m: 0.5 });
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 1 + bw * (i + 0.5), aw = AWN[(rnd() * AWN.length) | 0];
    F.bx(GLASSW(), bw - 1.4, h0 - 1.8, 0.1, x, (h0 - 1.8) / 2 + 0.5, d / 2 + 0.04);
    F.bx(dark, bw - 1.2, 0.5, 0.2, x, 0.25, d / 2 + 0.1); F.bx(dark, 0.12, h0 - 1.8, 0.16, x, (h0 - 1.8) / 2 + 0.5, d / 2 + 0.1);
    F.rb1(trim, 0.6, h0, 0.5, 0.1, x - bw / 2, h0 / 2, d / 2 + 0.05);
    if (!o.noAwning && rnd() < 0.85) awning(F, x, h0 - 0.35, d / 2 + 0.1, bw - 1.6, aw, 0xffffff);
    if (!o.noSigns && rnd() < 0.7) { const word = SHOPW[(rnd() * SHOPW.length) | 0]; const g = textGeo(word, 0.5, 0.1); F.rb1(C(aw, { r: 0.5, cc: 0.3 }), g.userData.w + 0.7, 0.85, 0.2, 0.1, x, h0 + 0.35, d / 2 + 0.12); F.add(g, NEON(0xffffff), x, h0 + 0.12, d / 2 + 0.24, 0, 0, 0, 1, 1, 1, 'N'); }
    if (rnd() < 0.5) { F.rb1(C(0x9ca3af, { r: 0.8 }), 1.4, 0.55, 0.6, 0.1, x + bw / 2 - 1.3, 0.28, d / 2 + 0.7); F.add(GEO.sphere(0.45, 10, 8), C(0x3f9e44, { r: 0.8 }), x + bw / 2 - 1.3, 0.75, d / 2 + 0.7, 0, 0, 0, 1.3, 0.8, 0.6); }
  }
  F.rb1(trim, w + 0.4, 0.45, 0.6, 0.12, 0, h0 + 0.95, d / 2 + 0.05);
}
function balcony(F, x, y, z, w, rail, ry = 0) { const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  let [a, b] = P(0, 0.55); F.rb1(rail, w, 0.18, 1.1, 0.05, a, y, b, ry); [a, b] = P(0, 1.08); F.bx(GLASS2(), w, 0.9, 0.05, a, y + 0.55, b, ry); F.bx(rail, w + 0.06, 0.07, 0.1, a, y + 1.02, b, ry); for (const sx of [-1, 1]) { [a, b] = P(sx * w / 2, 0.55); F.bx(rail, 0.06, 0.95, 1.1, a, y + 0.5, b, ry); } }
// downtown skyscraper: podium with shop bays, then one of several tower styles, terraces, crown + LED band
export function tower(F, w, d, h, col, rnd, o = {}) {
  const pod = 8.6, stone = C(o.podium || [0xc9bfae, 0xa8a29e, 0xd6c7b0, 0x94a3b8, 0x7c6f64][(rnd() * 4) | 0], { r: 0.7 }), core = C(col, { r: 0.35, m: 0.3, cc: 0.6 }), trim = C(o.trim || 0xf8fafc, { r: 0.45 }), metal = C(0xcbd5e1, { r: 0.3, m: 0.8 });
  F.rb(stone, w, pod, d, 0.5, 0, pod / 2, 0); F.far(GEO.box(w - 2, 6.5, 0.1), GLASSW(), 0, 4, d / 2 + 0.06); storefronts(F, w, d, 4.6, rnd, stone, { noSigns: !!o.name });
  F.bx(GLASSW(), w - 3, 2.2, 0.08, 0, 6.8, d / 2 + 0.03); for (let x = -w / 2 + 2; x < w / 2 - 1; x += 2.6) F.bx(trim, 0.18, 2.3, 0.14, x, 6.8, d / 2 + 0.08);
  for (const s of [-1, 1]) { F.bx(GLASSW(), 0.08, 2.2, d - 3, s * (w / 2 + 0.03), 6.8, 0); F.bx(GLASSW(), 0.08, 2.6, d - 4, s * (w / 2 + 0.03), 2.4, 0); }
  F.rb1(trim, w + 0.8, 0.7, d + 0.8, 0.25, 0, pod, 0);
  const style = o.tstyle || ['curtain', 'banded', 'tiers', 'curtain', 'banded'][(rnd() * 5) | 0], lit = rnd() < 0.6, gl = lit ? GLASS() : GLASS2(), fl = 4.2;
  let tw = w - 5 - rnd() * 4, td = d - 5 - rnd() * 4, y0 = pod; const parts = style === 'tiers' ? [0.5, 0.3, 0.2] : [1];
  const rest = h - pod; let yTop = pod;
  parts.forEach((frac, pi) => {
    const th = rest * frac, yc = y0 + th / 2;
    if (style === 'banded' || (style === 'tiers' && pi === 1)) {
      F.rb(core, tw, th, td, 1.6, 0, yc, 0);
      for (let y = y0 + 1.6; y < y0 + th - 1.2; y += fl) { F.rb1(gl, tw + 0.12, 2.2, td + 0.12, 1.5, 0, y + 1.1, 0); }
    } else {
      F.rb(gl, tw - 0.3, th, td - 0.3, 1.2, 0, yc, 0);
      for (let y = y0 + fl; y < y0 + th - 0.5; y += fl) F.rb1(core, tw, 0.45, td, 1.3, 0, y, 0);
      const fin = (lx, lz, ry) => F.rb1(core, 0.3, th, 0.55, 0.12, lx, yc, lz, ry);
      for (let x = -tw / 2 + 2; x < tw / 2 - 1; x += 3) { fin(x, td / 2 - 0.1, 0); fin(x, -td / 2 + 0.1, 0); }
      for (let z = -td / 2 + 2; z < td / 2 - 1; z += 3) { fin(tw / 2 - 0.1, z, Math.PI / 2); fin(-tw / 2 + 0.1, z, Math.PI / 2); }
    }
    if (o.kind === 'apartment' && th > 12) for (let y = y0 + fl * 1.5; y < y0 + th - 3; y += fl * 2) for (let x = -tw / 2 + 3; x < tw / 2 - 2.5; x += 6) balcony(F, x, y, td / 2 - 0.2, 3.2, trim);
    F.rb1(trim, tw + 0.6, 0.8, td + 0.6, 0.4, 0, y0 + th + 0.1, 0);
    // setback terrace with planters + little trees
    if (pi < parts.length - 1) { const ntw = tw * 0.72, ntd = td * 0.72; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = sx * (tw / 2 - 1.6), pz = sz * (td / 2 - 1.6); F.rb1(stone, 1.6, 0.6, 1.6, 0.1, px, y0 + th + 0.8, pz); F.add(GEO.sphere(0.9, 10, 8), C(0x3f9e44, { r: 0.8 }), px, y0 + th + 1.7, pz); } tw = ntw; td = ntd; }
    y0 += th; yTop = y0;
  });
  F.rb(core, tw + 0.8, 1.2, td + 0.8, 0.5, 0, h + 0.3, 0); F.bx(NEON(o.led || [0x22d3ee, 0xf472b6, 0xa78bfa, 0xfacc15][(rnd() * 4) | 0]), tw + 0.86, 0.22, td + 0.86, 0, h + 0.1, 0, 0, 'N');
  void yTop;
  if (o.crown === 'spire') { F.add(GEO.cyl(tw * 0.18, tw * 0.3, 4, 16), metal, 0, h + 2.9, 0); F.add(GEO.cyl(0.25, 1.0, 12, 12), metal, 0, h + 10.8, 0); F.add(GEO.sphere(0.45, 12, 8), NEON(0xff2d55), 0, h + 17, 0, 0, 0, 0, 1, 1, 1, 'N'); }
  else if (o.crown === 'helipad') { F.add(GEO.cyl(Math.min(tw, td) / 2 - 1, Math.min(tw, td) / 2 - 1, 0.3, 32), C(0x334155), 0, h + 1.05, 0); F.add(GEO.torus(Math.min(tw, td) / 2 - 1.8, 0.12, Math.PI * 2, 6, 40), NEON(0xfacc15), 0, h + 1.22, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'N'); F.text('H', 4, 0xffffff, 0, h + 1.2, 1.6, 0, 'N'); }
  else if (rnd() < 0.4) { for (let i = 0; i < 6; i++) { const x = (rnd() - 0.5) * (tw - 4), z = (rnd() - 0.5) * (td - 4); F.add(GEO.sphere(0.9 + rnd() * 0.5, 10, 8), C([0x3f9e44, 0x5cbf4a][i % 2], { r: 0.8 }), x, h + 1.5, z); } F.rb1(C(0xc08a5a, { r: 0.7 }), tw * 0.5, 0.15, td * 0.4, 0.05, 0, h + 0.95, 0); }
  else roofStuff(F, tw, td, h + 0.9, rnd, true);
  return { roofY: o.crown === 'helipad' ? h + 1.2 : h + 0.9 };
}
// mid-rise city block: stucco/brick with framed windows, shutters or balconies, string courses, shop bays, cornice, rooftop life
export function midrise(F, w, d, h, col, rnd, o = {}) {
  const wall = C(col, { r: 0.78 }), trim = C(o.trim || [0xffffff, 0xf5f0e6, 0x334155, 0xfef3c7][(rnd() * 4) | 0], { r: 0.5 }), fl = 3.6, kind = o.kind || 'apartment';
  const shut = C([0x2563eb, 0x16a34a, 0x7c2d12, 0x0f766e, 0xbe123c][(rnd() * 5) | 0], { r: 0.6 });
  F.rb(wall, w, h, d, 0.5, 0, h / 2, 0);
  F.rb1(trim, w + 0.9, 0.55, d + 0.9, 0.2, 0, h + 0.05, 0); F.rb1(trim, w + 0.5, 0.35, d + 0.5, 0.12, 0, h - 0.5, 0);
  for (let y = 4.4 + fl; y < h - 1.5; y += fl) F.bx(trim, w + 0.16, 0.16, d + 0.16, 0, y - 0.25, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.rb1(trim, 0.7, h - 0.4, 0.7, 0.15, sx * (w / 2 - 0.1), (h - 0.4) / 2, sz * (d / 2 - 0.1));
  const lit = rnd() < 0.55, bal = kind === 'apartment' && rnd() < 0.7, shutters = !bal && rnd() < 0.6;
  for (let y = 4.4 + fl * 0.6; y < h - 1.6; y += fl) {
    for (let x = -w / 2 + 2.4; x <= w / 2 - 2.3; x += 3.2) {
      windowOn(F, x, y, d / 2, 1.5, 1.8, trim, lit ^ (rnd() < 0.2)); if (!o.city) windowOn(F, x, y, -d / 2, 1.5, 1.8, trim, lit, Math.PI);
      if (shutters) for (const s of [-1, 1]) F.bx(shut, 0.55, 1.9, 0.08, x + s * 1.1, y, d / 2 + 0.06);
      else if (!bal && rnd() < 0.3) { F.bx(C(0x92400e, { r: 0.8 }), 1.6, 0.35, 0.4, x, y - 1.15, d / 2 + 0.3); F.add(GEO.sphere(0.3, 8, 6), C([0xef4444, 0xfacc15, 0xec4899][(rnd() * 3) | 0], { r: 0.7 }), x, y - 0.85, d / 2 + 0.3, 0, 0, 0, 2.2, 0.6, 0.8); }
    }
    if (bal) for (let x = -w / 2 + 4; x <= w / 2 - 3.9; x += 6.4) balcony(F, x, y - 1.25, d / 2, 3.4, trim);
    for (let z = -d / 2 + 2.4; z <= d / 2 - 2.3; z += 3.2) { windowOn(F, z, y, w / 2, 1.5, 1.8, trim, lit, Math.PI / 2); windowOn(F, -z, y, w / 2, 1.5, 1.8, trim, !lit, -Math.PI / 2); }
  }
  if (o.city) for (let y = 4.4 + fl * 0.6; y < h - 1.6; y += fl) F.bx(lit ? GLASS() : GLASS2(), w - 3, 1.8, 0.1, 0, y, -d / 2 - 0.05);
  for (let y = 4.4 + fl * 0.6; y < h - 1.6; y += fl) { const g = lit ? GLASS() : GLASS2(); F.far(GEO.box(w - 3, 1.8, 0.1), g, 0, y, d / 2 + 0.06); F.far(GEO.box(w - 3, 1.8, 0.1), g, 0, y, -d / 2 - 0.06); F.far(GEO.box(0.1, 1.8, d - 3), g, w / 2 + 0.06, y, 0); F.far(GEO.box(0.1, 1.8, d - 3), g, -w / 2 - 0.06, y, 0); }
  F.far(GEO.box(w - 2, 2.8, 0.1), GLASSW(), 0, 2, d / 2 + 0.06);
  if (kind === 'office' && h > 12) { const fe = C(0x1f2937, { r: 0.4, m: 0.6 }); for (let y = 4.4 + fl * 0.6 - 1.3; y < h - 2; y += fl) { F.bx(fe, 0.12, 0.12, d * 0.45, w / 2 + 1.1, y + 0.9, 0); F.rb1(fe, 1.2, 0.1, d * 0.45, 0.02, w / 2 + 0.6, y, 0); F.add(GEO.box(0.1, 0.1, Math.hypot(fl, d * 0.4)), fe, w / 2 + 0.6, y + fl / 2, 0, Math.atan2(fl, d * 0.4), 0, 0); } }
  if (!o.noShop) storefronts(F, w, d, 4.4, rnd, wall); else F.rb1(trim, w + 0.3, 0.4, d + 0.3, 0.12, 0, 4.4, 0);
  const r = rnd(); if (r < 0.3) { const g = textGeo(['GROK COLA', 'RATITA TECH', 'ZOOM GAS', 'SUPER KART', 'TORTY TEA'][(rnd() * 5) | 0], 1.1, 0.2), bw = g.userData.w + 1.4; F.rb1(C(0x1f2937, { r: 0.4, m: 0.5 }), 0.25, 3.2, 0.25, 0.05, -bw / 3, h + 1.8, 0); F.rb1(C(0x1f2937, { r: 0.4, m: 0.5 }), 0.25, 3.2, 0.25, 0.05, bw / 3, h + 1.8, 0); F.rb1(C(0xffffff, { r: 0.5 }), bw, 2.0, 0.3, 0.1, 0, h + 3.6, 0); F.add(g, NEON(AWN[(rnd() * AWN.length) | 0]), 0, h + 3.05, 0.2, 0, 0, 0, 1, 1, 1, 'N'); }
  else if (r < 0.5) { for (let i = 0; i < 5; i++) F.add(GEO.sphere(0.7 + rnd() * 0.4, 10, 8), C([0x3f9e44, 0x5cbf4a][i % 2], { r: 0.8 }), (rnd() - 0.5) * (w - 4), h + 1.2, (rnd() - 0.5) * (d - 4)); F.rb1(C(0xef4444, { r: 0.5 }), 2.5, 0.1, 2.5, 0.03, w / 4, h + 2.6, 0); F.add(GEO.cyl(0.05, 0.05, 2.2, 6), C(0xffffff), w / 4, h + 1.5, 0); }
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
