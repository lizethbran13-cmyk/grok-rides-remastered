// Grok Rides Remastered - the world: terrain heightfield, regions, road network (graph + lanes), ground/water queries
export const WB = 1500, CELL = 2, N = WB * 2 / CELL, WATER_Y = 0;
export const S_GRASS = 0, S_ROAD = 1, S_SAND = 2, S_SNOW = 3, S_DIRT = 4, S_WATER = 5, S_BEACH = 6, S_WALK = 7, S_RUNWAY = 8, S_ICE = 9, S_PLAZA = 10, S_ROCK = 11;
const RB = new Uint8Array(N * N), H = new Float32Array(N * N), EDGE = new Float32Array(N * N), RH = new Float32Array(N * N), SURF = new Uint8Array(N * N), RW = new Uint8Array(N * N);
export const RASTER = { H, SURF, EDGE };
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const MTN = { x: -820, z: -820, R: 680, peak: 175 };
export const LAKE = { x: -50, z: 120, rx: 170, rz: 115 };
export const ICE_LAKE = { x: 600, z: -1150, rx: 140, rz: 90 };
export const coastS = (x, z) => x + z - 2300 + 35 * Math.sin(x * 0.008) + 25 * Math.sin(z * 0.013);
// flat zones: towns, airfield, plazas. [x0, z0, x1, z1, height, pad]
export const FLAT = [
  [300, -520, 960, 280, 2, 70], [-780, 230, -250, 730, 2, 60], [740, 800, 1120, 1160, 2, 60], [1080, 330, 1320, 860, 2, 60],
  [-400, 980, 520, 1130, 2, 50], [380, -1080, 760, -700, 1.6, 60], [-120, -90, 60, -20, 2, 30]
];
export const REGIONS = { city: 'Grok City', town: 'Pine Hollow', lake: 'Sparkle Lake', air: 'Sky Field', mtn: 'Mount Grokmore', tundra: 'Frostbite Tundra', desert: 'Sizzle Desert', beach: 'Sunny Shores', ocean: 'Sparkle Ocean', country: 'Countryside' };
export function regionAt(x, z) {
  if (coastS(x, z) > 10) return 'ocean';
  if (x > 280 && x < 980 && z > -540 && z < 300) return 'city';
  if (x > -800 && x < -230 && z > 210 && z < 750) return 'town';
  if (x > 720 && z > 780 && x < 1350) return 'beach';
  if (x > 1060 && z > 300 && z < 880) return 'air';
  if (Math.hypot(x - MTN.x, z - MTN.z) < MTN.R + 40) return 'mtn';
  if (z < -800 && x > -150) return 'tundra';
  if (z > 800) return 'desert';
  const e = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2; if (e < 2) return 'lake';
  return 'country';
}
function flatW(x, z) { let w = 0, h = 2; for (const f of FLAT) { const dx = Math.max(f[0] - x, 0, x - f[2]), dz = Math.max(f[1] - z, 0, z - f[3]); const k = 1 - ss(0, f[5], Math.hypot(dx, dz)); if (k > w) { w = k; h = f[4]; } } return [w, h]; }
export function natural(x, z) {
  let h = 2 + 3.5 * Math.sin(x * 0.0045 + 1) * Math.sin(z * 0.0052 + 2) + 1.6 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 0.6 * Math.sin(x * 0.041 + z * 0.03);
  h = Math.max(h, 0.8 + 0.25 * h);
  // mountain with a flat summit for the lodge
  const dm = Math.hypot(x - MTN.x, z - MTN.z);
  if (dm < MTN.R) { const m = 1 - dm / MTN.R, a = Math.atan2(z - MTN.z, x - MTN.x); const sm = m * m * (3 - 2 * m); h += MTN.peak * sm * (1 + 0.1 * Math.sin(a * 6 + dm * 0.014) * (1 - sm)) + 9 * Math.sin(a * 11 + dm * 0.05) * m * (1 - m) * 4; }
  if (dm < 110) h = lerp(h, 170, 1 - ss(55, 110, dm));
  // tundra: snowy rolling plains
  if (z < -820 && x > -150) h += 2.5 * Math.sin(x * 0.02) * Math.sin(z * 0.017) * ss(-820, -900, z);
  // desert dunes
  if (z > 830 && x < 560) { const k = ss(830, 920, z) * (1 - ss(400, 560, x)); h += 3.4 * Math.pow(Math.max(0, Math.sin(x * 0.034 + 2 * Math.sin(z * 0.012))), 2) * k; }
  // border hills (not on the ocean side)
  const ed = Math.min(WB - Math.abs(x), WB - Math.abs(z)); if (ed < 110) h += (110 - ed) * (110 - ed) * 0.004;
  // flat zones
  const [fw, fh] = flatW(x, z); h = lerp(h, fh, fw);
  // Sparkle Lake
  const e = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2; if (e < 1.4) h = lerp(h, -5.5, ss(1.25, 0.75, e));
  // frozen lake (solid ice)
  const ei = ((x - ICE_LAKE.x) / ICE_LAKE.rx) ** 2 + ((z - ICE_LAKE.z) / ICE_LAKE.rz) ** 2; if (ei < 1.3) h = lerp(h, 0.9, ss(1.3, 0.95, ei));
  // ocean coast
  const s = coastS(x, z); if (s > -90) h = Math.min(h, lerp(h, 2.2 - Math.max(0, s + 30) * 0.045, ss(-90, -40, s)));
  return Math.max(h, -9);
}
export function naturalSurf(x, z, h, slope) {
  const s = coastS(x, z);
  if (h < -0.15) return S_WATER;
  if (s > -75) return S_BEACH;
  const ei = ((x - ICE_LAKE.x) / ICE_LAKE.rx) ** 2 + ((z - ICE_LAKE.z) / ICE_LAKE.rz) ** 2; if (ei < 1.0) return S_ICE;
  const e = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2; if (e < 1.32) return S_BEACH;
  if (z < -830 && x > -150) return S_SNOW;
  if (h > 120) return slope > 0.55 ? S_ROCK : S_SNOW;
  if (slope > 0.75) return S_ROCK;
  if (z > 830 && x < 700) return S_SAND;
  return S_GRASS;
}
/* ---------------- road network ---------------- */
export const NODES = {}, EDGES = [];
const node = (id, x, z) => (NODES[id] = { id, x, z, edges: [], y: 2 });
function edge(a, b, via, w, kind, o) { const e = Object.assign({ a, b, via: via || [], w, kind, id: EDGES.length }, o || {}); EDGES.push(e); return e; }
export const CITY_X = [340, 480, 620, 760, 900], CITY_Z = [-460, -320, -180, -40, 100, 220];
export const TOWN_X = [-700, -560, -420, -300], TOWN_Z = [280, 420, 560, 680];
export const SHORE_X = [800, 930, 1060], SHORE_Z = [860, 980, 1100];
function grid(pre, X, Z, w, kind) {
  X.forEach((x, i) => Z.forEach((z, j) => node(pre + i + '_' + j, x, z)));
  X.forEach((x, i) => Z.forEach((z, j) => { if (i < X.length - 1) edge(pre + i + '_' + j, pre + (i + 1) + '_' + j, null, w, kind, { walk: 1 }); if (j < Z.length - 1) edge(pre + i + '_' + j, pre + i + '_' + (j + 1), null, w, kind, { walk: 1 }); }));
}
grid('c', CITY_X, CITY_Z, 12, 'city'); grid('p', TOWN_X, TOWN_Z, 10.5, 'town'); grid('s', SHORE_X, SHORE_Z, 11, 'beach');
node('mk', -30, -62); node('mk2', -30, -20); node('a1', 1150, 420); node('a2', 1150, 760); node('b1', 1235, 945); node('b2', 885, 1295);
node('d1', -300, 1050); node('d2', 100, 1080); node('d3', 450, 1060); node('m0', -430, -330); node('t1', 600, -760); node('t2', 480, -1000); node('t4', 150, -1050); node('L', -820, -760);
edge('c0_3', 'mk', [[150, -75]], 12, 'hwy'); edge('mk', 'p3_0', [[-160, -50], [-262, 90]], 12, 'hwy'); edge('mk', 'mk2', null, 9, 'town');
edge('c3_5', 's0_0', [[790, 420], [765, 650]], 12, 'hwy');
edge('c4_3', 'a1', [[1060, 40], [1140, 220]], 12, 'hwy'); edge('a1', 'a2', [[1140, 590]], 11, 'town'); edge('a2', 's2_0', [[1110, 820]], 11, 'hwy');
edge('s2_1', 'b1', [[1150, 960]], 11, 'beach', { walk: 1 }); edge('b1', 'b2', [[1110, 1080], [1000, 1185]], 11, 'beach', { walk: 1, boardwalk: 1 }); edge('s0_2', 'b2', [[815, 1205]], 11, 'beach', { walk: 1 });
edge('p1_3', 'd1', [[-560, 860], [-460, 990]], 12, 'hwy'); edge('d1', 'd2', [[-100, 1075]], 12, 'hwy'); edge('d2', 'd3', [[280, 1085]], 12, 'hwy'); edge('d3', 's0_1', [[640, 1010]], 12, 'hwy');
edge('p1_0', 'm0', [[-600, 40], [-520, -170]], 11, 'hwy');
edge('c0_0', 'm0', [[100, -545], [-200, -470]], 12, 'hwy');
edge('c2_0', 't1', [[610, -610]], 12, 'hwy'); edge('t1', 't2', [[560, -900]], 11, 'hwy'); edge('t2', 't4', [[300, -1065]], 10, 'town');
// Grokmore Pass: winding mountain road from the base up to the summit lodge (spiral with S-bends)
(function () {
  const C = MTN, sx = NODES.m0.x - C.x, sz = NODES.m0.z - C.z, r0 = Math.hypot(sx, sz), a0 = Math.atan2(sz, sx), pts = [], n = 90;
  for (let i = 1; i < n; i++) { const t = i / n, a = a0 + t * Math.PI * 2 * 1.32, r = lerp(r0, 70, Math.pow(t, 0.9)) + 26 * Math.sin(t * 34) * (1 - t * 0.6); pts.push([C.x + Math.cos(a) * r, C.z + Math.sin(a) * r]); }
  const end = pts[pts.length - 1]; NODES.L.x = end[0]; NODES.L.z = end[1]; pts.pop();
  edge('m0', 'L', pts, 9.5, 'mtn', { rails: 1 });
})();
export const RUNWAY = { x: 1240, z0: 380, z1: 830, w: 34 };
// sample every edge as a smooth centripetal Catmull-Rom polyline (~3 m steps)
function catmull(P, step) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
  }
  out.push(P[P.length - 1].slice()); return out;
}
function buildEdges() {
  for (const e of EDGES) {
    const A = NODES[e.a], B = NODES[e.b]; A.edges.push(e); B.edges.push(e);
    const P = [[A.x, A.z], ...e.via, [B.x, B.z]];
    const pts = catmull(P, 3); e.pts = pts;
    // tangents, cumulative length
    let s = 0; e.s = [0]; for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); e.s.push(s); } e.len = s;
  }
}
buildEdges();
/* ---------------- raster: natural terrain, then roads carved in ---------------- */
const idx = (i, j) => j * N + i;
export const toCell = (v) => (v + WB) / CELL;
function bake() {
  for (let j = 0; j < N; j++) { const z = -WB + j * CELL; for (let i = 0; i < N; i++) { const x = -WB + i * CELL, k = idx(i, j); H[k] = natural(x, z); EDGE[k] = 99; } }
  // road heights: natural along the road, smoothed, with gentle grades; node heights shared
  for (const id in NODES) { const n = NODES[id]; n.y = Math.max(1.7, natural(n.x, n.z)); }
  NODES.L.y = 170;
  for (const e of EDGES) {
    const raw = e.pts.map((p) => Math.max(1.7, natural(p[0], p[1])));
    if (e.kind === 'mtn') { const ya = NODES[e.a].y, yb = NODES[e.b].y; e.y = e.s.map((s) => { const t = s / e.len; return lerp(ya, yb, t * 0.92 + 0.08 * t * t * (3 - 2 * t)); }); continue; }
    const win = 8; let y = raw.map((_, i) => { let a = 0, c = 0; for (let k = -win; k <= win; k++) { const q = raw[Math.max(0, Math.min(raw.length - 1, i + k))]; a += q; c++; } return a / c; });
    const ya = NODES[e.a].y, yb = NODES[e.b].y, n = y.length; y = y.map((v, i) => { const ta = ss(0, 25, e.s[i]), tb = ss(0, 25, e.len - e.s[i]); return lerp(yb, lerp(ya, v, ta), tb); });
    // bridge-free roads: never dip below the shore
    e.y = y.map((v) => Math.max(1.7, v));
    void n;
  }
  // stamp roads into the raster (nearest road wins)
  for (const e of EDGES) {
    const hw = e.w / 2, bl = e.kind === 'mtn' ? 30 : 16, R = hw + bl + 2, side = e.walk ? 3.2 : 0;
    for (let p = 0; p < e.pts.length; p++) {
      const [px, pz] = e.pts[p], py = e.y[p], ci = Math.round(toCell(px)), cj = Math.round(toCell(pz)), rc = Math.ceil(R / CELL);
      for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const x = -WB + i * CELL, z = -WB + j * CELL, d = Math.hypot(x - px, z - pz) - hw, k = idx(i, j);
        if (d < EDGE[k]) { EDGE[k] = d; RH[k] = py; RW[k] = side * 10; RB[k] = bl; }
      }
    }
  }
  for (const id in NODES) { const n = NODES[id], hw = Math.max(...n.edges.map((e) => e.w)) / 2 + 1, R = hw + 18, ci = Math.round(toCell(n.x)), cj = Math.round(toCell(n.z)), rc = Math.ceil(R / CELL); n.r = hw;
    const walk = n.edges.some((e) => e.walk) ? 3.2 : 0;
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue; const x = -WB + i * CELL, z = -WB + j * CELL, d = Math.hypot(x - n.x, z - n.z) - hw, k = idx(i, j); if (d < EDGE[k]) { EDGE[k] = d; RH[k] = n.y; RW[k] = walk * 10; RB[k] = 16; } } }
  // runway
  for (let z = RUNWAY.z0 - 20; z <= RUNWAY.z1 + 20; z += CELL) for (let x = RUNWAY.x - RUNWAY.w / 2 - 20; x <= RUNWAY.x + RUNWAY.w / 2 + 20; x += CELL) { const i = Math.round(toCell(x)), j = Math.round(toCell(z)), k = idx(i, j); const d = Math.max(Math.abs(x - RUNWAY.x) - RUNWAY.w / 2, Math.max(RUNWAY.z0 - z, z - RUNWAY.z1)); if (d < EDGE[k]) { EDGE[k] = d; RH[k] = 2; RW[k] = 0; SURF[k] = 200; } }
  // final surface
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j), e = EDGE[k], x = -WB + i * CELL, z = -WB + j * CELL, side = RW[k] / 10, run = SURF[k] === 200;
    let h = H[k];
    if (e < 0) { h = RH[k]; SURF[k] = run ? S_RUNWAY : S_ROAD; }
    else if (e < side) { h = RH[k] + 0.14; SURF[k] = S_WALK; }
    else { const t = ss(side, side + (RB[k] || 16), e); h = lerp(RH[k] + (side ? 0.14 : -0.05), h, t); SURF[k] = 255; }
    H[k] = h;
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = idx(i, j); if (SURF[k] !== 255) continue; const x = -WB + i * CELL, z = -WB + j * CELL; const i2 = Math.min(N - 1, i + 1), j2 = Math.min(N - 1, j + 1); const sl = Math.hypot(H[idx(i2, j)] - H[k], H[idx(i, j2)] - H[k]) / CELL; SURF[k] = naturalSurf(x, z, H[k], sl); }
}
const t0 = performance.now(); bake(); export const BAKE_MS = performance.now() - t0;
/* ---------------- queries ---------------- */
export function heightAt(x, z) {
  let fx = toCell(x), fz = toCell(z); fx = Math.max(0, Math.min(N - 1.001, fx)); fz = Math.max(0, Math.min(N - 1.001, fz));
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = idx(i, j);
  return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + N] * (1 - u) + H[k + N + 1] * u) * v;
}
export function surfAt(x, z) { const i = Math.max(0, Math.min(N - 1, Math.round(toCell(x)))), j = Math.max(0, Math.min(N - 1, Math.round(toCell(z)))); return SURF[idx(i, j)]; }
export function roadEdge(x, z) { const i = Math.max(0, Math.min(N - 1, Math.round(toCell(x)))), j = Math.max(0, Math.min(N - 1, Math.round(toCell(z)))); return EDGE[idx(i, j)]; }
export function setFlat(x0, z0, x1, z1, h, s) { // building plots / pads: force flat ground (called before meshes are built)
  for (let z = z0; z <= z1; z += CELL) for (let x = x0; x <= x1; x += CELL) { const i = Math.round(toCell(x)), j = Math.round(toCell(z)); if (i < 0 || j < 0 || i >= N || j >= N) continue; const k = idx(i, j); if (SURF[k] === S_ROAD || SURF[k] === S_WALK) continue; H[k] = h; if (s != null) SURF[k] = s; }
}
// point on an edge at distance s, offset sideways (right of travel A->B is +)
export function edgePoint(e, s, off, out) {
  s = Math.max(0, Math.min(e.len, s)); let lo = 0, hi = e.s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (e.s[m] <= s) lo = m; else hi = m; }
  const a = e.pts[lo], b = e.pts[hi], L = e.s[hi] - e.s[lo] || 1, t = (s - e.s[lo]) / L, dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
  out = out || {}; out.x = a[0] + (b[0] - a[0]) * t - dz * off; out.z = a[1] + (b[1] - a[1]) * t + dx * off; out.dx = dx; out.dz = dz; out.y = e.y[lo] + (e.y[hi] - e.y[lo]) * t; return out;
}
// nearest road point (brute force over sampled points, coarse grid accel)
const RG = new Map(), RGC = 60;
for (const e of EDGES) e.pts.forEach((p, i) => { const k = Math.floor(p[0] / RGC) + ',' + Math.floor(p[1] / RGC); let l = RG.get(k); if (!l) RG.set(k, l = []); l.push([e, i]); });
export function nearestRoad(x, z, maxR = 200) {
  let best = null, bd = maxR * maxR; const cx = Math.floor(x / RGC), cz = Math.floor(z / RGC), r = Math.ceil(maxR / RGC);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const l = RG.get((cx + dx) + ',' + (cz + dz)); if (!l) continue; for (const [e, i] of l) { const p = e.pts[i], d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < bd) { bd = d; best = { e, i, s: e.s[i], x: p[0], z: p[1], d: Math.sqrt(d) }; } } }
  return best;
}
// A* over the road graph (for the GPS line and police)
export function route(fromX, fromZ, toX, toZ) {
  const a = nearestRoad(fromX, fromZ, 600), b = nearestRoad(toX, toZ, 600); if (!a || !b) return null;
  if (a.e === b.e) return [[fromX, fromZ], ...slice(a.e, a.s, b.s), [toX, toZ]];
  const start = [{ n: a.e.a, c: a.s }, { n: a.e.b, c: a.e.len - a.s }], goal = new Map([[b.e.a, b.s], [b.e.b, b.e.len - b.s]]);
  const dist = new Map(), prev = new Map(), open = [];
  for (const s of start) { dist.set(s.n, s.c); open.push(s.n); }
  const hz = (n) => Math.hypot(NODES[n].x - toX, NODES[n].z - toZ);
  let best = null, bestC = 1e12;
  while (open.length) {
    open.sort((p, q) => dist.get(p) + hz(p) - dist.get(q) - hz(q)); const n = open.shift(), c = dist.get(n);
    if (c + hz(n) >= bestC) break;
    if (goal.has(n) && c + goal.get(n) < bestC) { bestC = c + goal.get(n); best = n; }
    for (const e of NODES[n].edges) { const m = e.a === n ? e.b : e.a, nc = c + e.len; if (nc < (dist.has(m) ? dist.get(m) : 1e12)) { dist.set(m, nc); prev.set(m, [n, e]); if (!open.includes(m)) open.push(m); } }
  }
  if (!best) return null;
  const chain = []; let n = best; while (prev.has(n)) { const [p, e] = prev.get(n); chain.unshift([p, e, n]); n = p; }
  const out = [[fromX, fromZ]]; const first = n;
  out.push(...slice(a.e, a.s, first === a.e.a ? 0 : a.e.len));
  for (const [p, e] of chain) out.push(...slice(e, p === e.a ? 0 : e.len, p === e.a ? e.len : 0));
  out.push(...slice(b.e, best === b.e.a ? 0 : b.e.len, b.s), [toX, toZ]);
  return out;
}
function slice(e, s0, s1) { const out = [], st = s1 >= s0 ? 6 : -6; for (let s = s0; st > 0 ? s < s1 : s > s1; s += st) { const p = edgePoint(e, s, 0); out.push([p.x, p.z]); } const p = edgePoint(e, s1, 0); out.push([p.x, p.z]); return out; }
