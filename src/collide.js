// static collision: buildings (axis-aligned boxes with a roof height), round things (trees, poles), ramps (driveable wedges)
import { heightAt } from './world.js';
const GC = 32, grid = new Map();
const k = (i, j) => i * 4096 + j;
export const BOXES = [], CIRCLES = [], RAMPS = [];
function put(o, x0, z0, x1, z1) { for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(z0 / GC); j <= Math.floor(z1 / GC); j++) { const kk = k(i, j); let l = grid.get(kk); if (!l) grid.set(kk, l = []); l.push(o); } }
export function addBox(x0, z0, x1, z1, y0, y1, o) { const b = Object.assign({ t: 'b', x0, z0, x1, z1, y0, y1 }, o || {}); BOXES.push(b); put(b, x0, z0, x1, z1); return b; }
export function addCircle(x, z, r, y1, o) { const c = Object.assign({ t: 'c', x, z, r, y1 }, o || {}); CIRCLES.push(c); put(c, x - r, z - r, x + r, z + r); return c; }
// ramp: local frame (yaw), length L along +z rising to height h, width w. Ground on the ramp = base + h * (t)
export function addRamp(x, z, yaw, L, w, h, o) { const base = heightAt(x, z); const r = Object.assign({ t: 'r', x, z, yaw, L, w, h, base, c: Math.cos(yaw), s: Math.sin(yaw) }, o || {}); RAMPS.push(r); const R = Math.max(L, w); put(r, x - R, z - R, x + R, z + R); return r; }
export function near(x, z) { return grid.get(k(Math.floor(x / GC), Math.floor(z / GC))) || EMPTY; }
const EMPTY = [];
// extra ground from ramps and rooftops at (x,z) for something at height y (only surfaces below y + step count)
export function extraGround(x, z, y, step = 1.2) {
  let g = -1e9;
  for (const o of near(x, z)) {
    if (o.t === 'r') { const dx = x - o.x, dz = z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c; if (Math.abs(lx) < o.w / 2 && lz > -o.L / 2 && lz < o.L / 2) { const t = (lz + o.L / 2) / o.L, hh = o.base + o.h * (o.kind === 'hump' ? Math.sin(t * Math.PI) : t); if (hh < y + step && hh > g) g = hh; } }
    else if (o.t === 'b' && o.roof && x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1 && o.y1 < y + step && o.y1 > g) g = o.y1;
  }
  return g;
}
// push a circle (x,z,r) at height y out of static solids. returns {nx,nz,depth} of the deepest hit or null
const hit = { nx: 0, nz: 0, d: 0, o: null };
export function solve(p, r, y, h = 1.5) {
  let any = null;
  for (let pass = 0; pass < 2; pass++) for (const o of near(p.x, p.z)) {
    if (o.t === 'b') {
      if (y > o.y1 - 0.3 || y + h < o.y0) continue;
      const cx = Math.max(o.x0, Math.min(o.x1, p.x)), cz = Math.max(o.z0, Math.min(o.z1, p.z)); let dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let d = Math.sqrt(d2), nx, nz, pen;
      if (d < 1e-4) { // centre inside the box: push out the nearest side
        const l = p.x - o.x0, rr = o.x1 - p.x, t = p.z - o.z0, bb = o.z1 - p.z, m = Math.min(l, rr, t, bb);
        if (m === l) { nx = -1; nz = 0; pen = l + r; } else if (m === rr) { nx = 1; nz = 0; pen = rr + r; } else if (m === t) { nx = 0; nz = -1; pen = t + r; } else { nx = 0; nz = 1; pen = bb + r; }
      } else { nx = dx / d; nz = dz / d; pen = r - d; }
      p.x += nx * pen; p.z += nz * pen; if (!any || pen > hit.d) { hit.nx = nx; hit.nz = nz; hit.d = pen; hit.o = o; any = hit; }
    } else if (o.t === 'c') {
      if (o.gone || y > o.y1) continue; const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), R = r + o.r; if (d >= R || d < 1e-4) continue;
      const pen = R - d, nx = dx / d, nz = dz / d; p.x += nx * pen; p.z += nz * pen; if (!any || pen > hit.d) { hit.nx = nx; hit.nz = nz; hit.d = pen; hit.o = o; any = hit; }
    }
  }
  return any;
}
// segment test for the camera (does the line a->b at heights pass through a box?)
export function segBlocked(ax, ay, az, bx, by, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2) + 1; let best = 1;
  for (let i = 1; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t;
    if (y < heightAt(x, z) + 0.6) { best = Math.min(best, (i - 1) / n); break; }
    for (const o of near(x, z)) if (o.t === 'b' && !o.noCam && x > o.x0 - 0.4 && x < o.x1 + 0.4 && z > o.z0 - 0.4 && z < o.z1 + 0.4 && y < o.y1 + 0.5 && y > o.y0 - 0.5) { best = Math.min(best, (i - 1) / n); i = n + 1; break; } }
  return best;
}
