// terrain tiles, water, roads (asphalt ribbons, junctions, markings, crosswalks, sidewalks + curbs, guard rails), runway
import * as THREE from 'three';
import { M } from './mats.js';
import { GEO, mat4 } from './geo.js';
import { CH, cellAt, B, D } from './chunks.js';
import * as W from './world.js';
const { heightAt, surfAt, NODES, EDGES, RASTER, N, WB, CELL } = W;
export const MAT = {};
const _c = new THREE.Color();
const SC = { 0: 0x66bb4c, 1: 0x4b5160, 2: 0xf0cf8e, 3: 0xe2ebf6, 4: 0xb98a5a, 5: 0xd9c08a, 6: 0xfbe4a6, 7: 0xcfd5de, 8: 0x4b5160, 9: 0xb7e4ff, 10: 0xd6d3d1, 11: 0x9b9086 };
function vcol(x, z, h) {
  // average the 3x3 surface neighbourhood so biomes blend softly
  let r = 0, g = 0, b = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { _c.setHex(SC[surfAt(x + dx * 3, z + dz * 3)] ?? SC[0]); r += _c.r; g += _c.g; b += _c.b; }
  _c.setRGB(r / 9, g / 9, b / 9);
  const s = surfAt(x, z), n = Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.5 + Math.sin(x * 0.23 + z * 0.19) * 0.5;
  if (s === 0) { _c.offsetHSL(n * 0.025, -0.02, n * 0.05 - (h > 40 ? 0.06 : 0)); }
  else if (s === 2 || s === 6) _c.offsetHSL(0, 0, n * 0.03);
  else if (s === 5) _c.offsetHSL(0, -0.1, Math.max(-0.25, h * 0.03));
  return _c;
}
export function buildTerrain() {
  const mat = MAT.ground = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }); mat.userData.keep = true;
  const step = 4, n = CH / step + 1;
  for (let x0 = -WB - (WB % CH ? CH - (WB % CH) : 0) - CH; x0 < WB; x0 += CH) for (let z0 = -WB - (WB % CH ? CH - (WB % CH) : 0) - CH; z0 < WB; z0 += CH) {
    if (x0 + CH < -WB || z0 + CH < -WB) continue;
    const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3); let allWater = true;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = Math.max(-WB, Math.min(WB - 2, x0 + i * step)), z = Math.max(-WB, Math.min(WB - 2, z0 + j * step)), k = (j * n + i) * 3, s = surfAt(x, z);
      let h = heightAt(x, z); if (s === 1 || s === 8) h -= 0.3; else if (s === 7) h -= 0.25; if (h > -3) allWater = false;
      pos[k] = x0 + i * step; pos[k + 1] = h; pos[k + 2] = z0 + j * step;
      const hx = heightAt(x + 2, z) - heightAt(x - 2, z), hz = heightAt(x, z + 2) - heightAt(x, z - 2), L = Math.hypot(hx, 4, hz); nor[k] = -hx / L; nor[k + 1] = 4 / L; nor[k + 2] = -hz / L;
      const c = vcol(x, z, h); col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
    if (allWater) continue;
    const ind = []; for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; ind.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(ind); g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = 'terrain'; cellAt(x0 + 1, z0 + 1).g.add(m);
  }
}
export function buildWater(scene) {
  const mat = MAT.water = new THREE.MeshPhysicalMaterial({ color: 0x18a4ec, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.86, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05 });
  mat.userData.keep = true; mat.userData.noUber = true;
  const U = MAT.waterU = { uT: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uT;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec2 p = vWP.xz; float a = sin(p.x*0.35+uT*1.3)+sin(p.y*0.29-uT*1.1)+0.5*sin((p.x+p.y)*0.8+uT*2.0); float b = cos(p.y*0.33+uT*1.2)+cos(p.x*0.27-uT*0.9)+0.5*cos((p.x-p.y)*0.7+uT*1.7); vec3 wn = normalize(vec3(a*0.06, 1.0, b*0.06)); normal = normalize((viewMatrix * vec4(wn,0.0)).xyz); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\n{ float f = 0.5+0.5*sin(vWP.x*0.05+vWP.z*0.04+uT*0.3); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1,0.75,0.95), f*0.25); }');
  };
  mat.customProgramCacheKey = () => 'water1';
  // one tile per chunk that has any water (culled with the chunk)
  for (let x0 = -1536; x0 < WB + 300; x0 += CH) for (let z0 = -1536; z0 < WB + 300; z0 += CH) {
    let any = false; for (let a = 0; a <= 4 && !any; a++) for (let b = 0; b <= 4 && !any; b++) { const x = x0 + a * CH / 4, z = z0 + b * CH / 4; if (Math.abs(x) > WB - 2 || Math.abs(z) > WB - 2 ? W.coastS(x, z) > 0 : heightAt(x, z) < 0.3) any = true; }
    if (!any) continue;
    const m = new THREE.Mesh(GEO.box(CH, 0.01, CH), mat); m.position.set(x0 + CH / 2, W.WATER_Y, z0 + CH / 2); m.renderOrder = 2; m.updateMatrix(); m.matrixAutoUpdate = false; m.receiveShadow = true; m.name = 'water';
    if (Math.abs(x0) < WB && Math.abs(z0) < WB) cellAt(x0 + 1, z0 + 1).g.add(m); else scene.add(m);
  }
  // open ocean beyond the map edge
  const far = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), mat); far.position.set(2600, -0.02, 2600); far.renderOrder = 1; scene.add(far);
}
/* ---------------- roads ---------------- */
function ribbon(pos, nor, idxArr, pts, off0, off1, yOff, across = 4, skip) {
  // a strip following pts from lateral offset off0..off1; y from the ground raster
  const base = pos.length / 3; let rows = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; if (skip && skip(i)) { if (rows) { /* break strip */ } }
    const q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(pts.length - 1, i + 1)]; let dx = q1[0] - q0[0], dz = q1[1] - q0[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    for (let a = 0; a <= across; a++) { const o = off0 + (off1 - off0) * a / across, x = p[0] - dz * o, z = p[1] + dx * o; pos.push(x, (p[2] != null ? p[2] : heightAt(x, z)) + yOff, z); nor.push(0, 1, 0); }
    rows++;
  }
  const w = across + 1;
  for (let r = 0; r < rows - 1; r++) for (let a = 0; a < across; a++) { const i0 = base + r * w + a, i1 = i0 + 1, i2 = i0 + w, i3 = i2 + 1; if (off1 > off0) idxArr.push(i0, i1, i2, i1, i3, i2); else idxArr.push(i0, i2, i1, i1, i2, i3); }
}
const buckets = new Map();
function bucket(x, z, mat) { const c = cellAt(x, z), k = c.i * 1000 + c.j + '|' + mat.uuid; let b = buckets.get(k); if (!b) buckets.set(k, b = { c, mat, pos: [], nor: [], idx: [] }); return b; }
function flush(detail) {
  for (const b of buckets.values()) { if (!b.idx.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setIndex(b.idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, b.mat); m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false; (b.mat.userData.detail ? b.c.det : b.c.g).add(m); }
  buckets.clear(); void detail;
}
// split a polyline into ~CH pieces so each lands in its own cell
function pieces(pts, cb) { let cur = [pts[0]]; for (let i = 1; i < pts.length; i++) { cur.push(pts[i]); const a = cur[0]; if (Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]) > 60 || i === pts.length - 1) { cb(cur); cur = [pts[i]]; } } }
function along(e, s0, s1, step, off) { const out = []; for (let s = s0; s <= s1 + 0.01; s += step) { const p = W.edgePoint(e, Math.min(s, s1), off); out.push([p.x, p.z]); } return out; }
export function buildRoads() {
  const asphalt = MAT.road = new THREE.MeshStandardMaterial({ color: 0x4a505e, roughness: 0.82, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }); asphalt.userData.keep = true; asphalt.userData.noUber = true;
  const junc = MAT.junc = asphalt.clone(); junc.polygonOffsetFactor = -2; junc.polygonOffsetUnits = -4; junc.userData = { keep: true, noUber: true };
  const paint = MAT.paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }); paint.userData = { keep: true, noUber: true };
  const yel = MAT.yel = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }); yel.userData = { keep: true, noUber: true };
  const walk = MAT.walk = new THREE.MeshStandardMaterial({ color: 0xd3d8e0, roughness: 0.8 }); walk.userData = { keep: true, noUber: true };
  const curb = MAT.curb = new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.6, side: THREE.DoubleSide }); curb.userData = { keep: true, noUber: true };
  const deck = MAT.deck = new THREE.MeshStandardMaterial({ color: 0xc8935a, roughness: 0.7 }); deck.userData = { keep: true, noUber: true };
  for (const e of EDGES) {
    const hw = e.w / 2, A = NODES[e.a], B2 = NODES[e.b], cutA = A.r + (e.walk ? 3.6 : 0.5), cutB = B2.r + (e.walk ? 3.6 : 0.5);
    // asphalt with y from the raster
    pieces(e.pts, (pp) => { const b = bucket(pp[0][0], pp[0][1], asphalt); ribbon(b.pos, b.nor, b.idx, pp, -hw, hw, 0.04, 4); });
    // markings (skip inside junctions)
    const s0 = cutA + 1, s1 = e.len - cutB - 1; if (s1 > s0 + 4) {
      if (e.kind === 'hwy' || e.kind === 'mtn') { for (const o of [-0.18, 0.18]) pieces(along(e, s0, s1, 3, o), (pp) => { const b = bucket(pp[0][0], pp[0][1], yel); ribbon(b.pos, b.nor, b.idx, pp, -0.07, 0.07, 0.07, 1); }); }
      else { for (let s = s0; s < s1 - 3; s += 7) { const pp = along(e, s, s + 3.2, 1.6, 0); const b = bucket(pp[0][0], pp[0][1], yel); ribbon(b.pos, b.nor, b.idx, pp, -0.09, 0.09, 0.07, 1); } }
      for (const o of [-(hw - 0.45), hw - 0.45]) pieces(along(e, s0, s1, 3, o), (pp) => { const b = bucket(pp[0][0], pp[0][1], paint); ribbon(b.pos, b.nor, b.idx, pp, -0.08, 0.08, 0.07, 1); });
      // crosswalks at city/town junctions
      if (e.walk) for (const [s, n] of [[cutA - 2.6, A], [e.len - cutB + 0.4, B2]]) { if (n.edges.length < 3) continue; for (let o = -hw + 0.9; o < hw - 0.5; o += 1.2) { const pp = along(e, s, s + 2.2, 1.1, o); const b = bucket(pp[0][0], pp[0][1], paint); ribbon(b.pos, b.nor, b.idx, pp, -0.3, 0.3, 0.075, 1); } }
    }
    // sidewalks + curbs (beach edges get a wooden boardwalk on the ocean side)
    if (e.walk) {
      const sa = cutA - 2.8, sb = e.len - cutB + 2.8; if (sb > sa + 2) for (const side of [-1, 1]) {
        const mat = e.boardwalk && side > 0 ? deck : walk;
        pieces(along(e, sa, sb, 3, 0), (pp) => {
          const b = bucket(pp[0][0], pp[0][1], mat); ribbon(b.pos, b.nor, b.idx, pp, side * (hw + 0.25), side * (hw + 3.2), 0.04, 2);
          // curb face: vertical strip at the road edge
          const c = bucket(pp[0][0], pp[0][1], curb), base = c.pos.length / 3;
          pp.forEach((p, i) => { const q0 = pp[Math.max(0, i - 1)], q1 = pp[Math.min(pp.length - 1, i + 1)]; let dx = q1[0] - q0[0], dz = q1[1] - q0[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; const o = side * hw, x = p[0] - dz * o, z = p[1] + dx * o, y = heightAt(x, z); const o2 = side * (hw + 0.25), x2 = p[0] - dz * o2, z2 = p[1] + dx * o2;
            c.pos.push(x, y + 0.02, z, x, y + 0.2, z, x2, y + 0.2, z2); c.nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); });
          for (let i = 0; i < pp.length - 1; i++) { const a = base + i * 3, b2 = a + 3; if (side > 0) c.idx.push(a, a + 1, b2, b2, a + 1, b2 + 1, a + 1, a + 2, b2 + 1, b2 + 1, a + 2, b2 + 2); else c.idx.push(a, b2, a + 1, b2, b2 + 1, a + 1, a + 1, b2 + 1, a + 2, b2 + 1, b2 + 2, a + 2); }
        });
      }
    }
    // guard rails on the downhill side of the mountain road
    if (e.rails) for (let s = 8; s < e.len - 8; s += 5) {
      const pL = W.edgePoint(e, s, -hw - 10), pR = W.edgePoint(e, s, hw + 10), side = W.natural(pL.x, pL.z) < W.natural(pR.x, pR.z) ? -1 : 1;
      const p = W.edgePoint(e, s, side * (hw + 0.6)), y = heightAt(p.x, p.z), ry = Math.atan2(p.dx, p.dz);
      B(p.x, p.z).mesh(GEO.cyl(0.09, 0.09, 1.1, 8), M(0xe5e7eb, { r: 0.4, m: 0.6 }), p.x, y + 0.55, p.z);
      B(p.x, p.z).mesh(GEO.rbox(0.12, 0.32, 5.1, 0.05), M(0xcbd5e1, { r: 0.3, m: 0.8 }), p.x, y + 0.85, p.z, 0, ry, 0);
      if ((s / 5 | 0) % 4 === 0) B(p.x, p.z).mesh(GEO.rbox(0.14, 0.14, 0.05, 0.03), M(0xffffff, { e: 0xff8a00, ei: 0.6 }), p.x - p.dz * side * 0.07, y + 1.05, p.z + p.dx * side * 0.07, 0, ry, 0);
    }
  }
  // junction discs + sidewalk corners
  for (const id in NODES) {
    const n = NODES[id], r = n.r + 0.6, g = new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(n.x + p.getX(i), n.z + p.getZ(i)) + 0.06);
    g.translate(n.x, 0, n.z); const m = new THREE.Mesh(g, junc); m.receiveShadow = true; m.matrixAutoUpdate = false; cellAt(n.x, n.z).g.add(m);
    if (n.edges.some((e) => e.walk)) { const c = n.r + 1.9; for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = n.x + sx * c, z = n.z + sz * c; if (W.surfAt(x, z) === W.S_ROAD) continue; B(x, z).mesh(GEO.rbox(3.6, 0.3, 3.6, 0.12), M(0xd3d8e0, { r: 0.8 }), x, heightAt(x, z) - 0.06, z); } }
  }
  // runway with markings
  const R = W.RUNWAY, rl = R.z1 - R.z0;
  for (let z = R.z0; z < R.z1; z += 64) { const L = Math.min(64, R.z1 - z); B(R.x, z + 1).box(M(0x434955, { r: 0.85 }), R.w, 0.2, L, R.x, 1.92, z + L / 2); }
  for (let z = R.z0 + 30; z < R.z1 - 30; z += 22) D(R.x, z).box(M(0xffffff, { r: 0.5 }), 0.9, 0.05, 11, R.x, 2.04, z);
  for (const zz of [R.z0 + 8, R.z1 - 8]) for (let i = -6; i <= 6; i++) if (i) B(R.x, zz).box(M(0xffffff, { r: 0.5 }), 1.1, 0.05, 10, R.x + i * 2.2, 2.04, zz);
  for (let z = R.z0; z <= R.z1; z += 30) for (const sx of [-1, 1]) D(R.x, z).mesh(GEO.sphere(0.25, 10, 8), M(0xffffff, { e: 0x60a5fa, ei: 1.4 }), R.x + sx * (R.w / 2 + 0.8), 2.25, z);
  void rl;
  flush();
}
