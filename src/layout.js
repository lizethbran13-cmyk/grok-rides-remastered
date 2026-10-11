// lays out the whole map: city blocks, towns, named places (enterable), homes, gas stations, car wash, ramps, stars, props
import * as THREE from 'three';
import { M, glow } from './mats.js';
import { GEO } from './geo.js';
import * as W from './world.js';
import { B, D, Bn, cellAt } from './chunks.js';
import { addBox, addCircle, addRamp } from './collide.js';
import { Frame, tree, rock, streetLamp, bench, hydrant, bin, flowerBed, trafficLight, busStop, fence, NEON, LAMP, GLASSW, sign, door } from './build3d.js';
import { tower, midrise, shop, house, beachHouse, adobe, cabin, hangar, garageBldg } from './bldg.js';
import { HOMES } from './data.js';
const { heightAt, NODES, EDGES } = W;
let seed = 1234; export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
export const BLD = [], PLACES = [], SPOTS = [], STARS = [], LIGHTS = [], STOPS = [], GAS = [], WASH = [], FIRESPOTS = [], CRUSH = [];
// named, enterable places. near = where to look for a lot; kind = interior type
export const PLACE_DEFS = [
  { id: 'motors', name: 'Grok Motors', kind: 'dealer', dealer: 'motors', near: [830, -250], reg: 'city', style: 'showroom', col: 0xf1f5f9, acc: 0xef4444, icon: '🚗' },
  { id: 'trucks', name: 'Big Wheels Trucks', kind: 'dealer', dealer: 'trucks', near: [400, 160], reg: 'city', style: 'garage', col: 0xfde68a, acc: 0xb45309, icon: '🚚' },
  { id: 'citygarage', name: 'Grok City Garage', kind: 'garage', near: [500, -140], reg: 'city', style: 'garage', col: 0xe2e8f0, acc: 0x22c55e, icon: '🔧' },
  { id: 'dispatch', name: 'Grok Dispatch', kind: 'dispatch', near: [700, -140], reg: 'city', style: 'shop', col: 0xdbeafe, acc: 0x1d4ed8, icon: '📦' },
  { id: 'hotel', name: 'Grand Grok Hotel', kind: 'hotel', near: [600, 150], reg: 'city', style: 'hotel', col: 0xfef3c7, acc: 0xb45309, icon: '🏨' },
  { id: 'raceclub', name: 'Race Club HQ', kind: 'raceclub', near: [850, 60], reg: 'city', style: 'shop', col: 0x1f2937, acc: 0xef4444, icon: '🏁' },
  { id: 'burger', name: 'Burger Blast', kind: 'food', menu: ['burger', 'fries', 'shake', 'soda'], near: [700, 165], reg: 'city', style: 'shop', col: 0xfff1f2, acc: 0xef4444, icon: '🍔' },
  { id: 'realty', name: 'Grok Realty', kind: 'realty', near: [560, -340], reg: 'city', style: 'shop', col: 0xecfdf5, acc: 0x16a34a, icon: '🏠' },
  { id: 'fire', name: 'Fire Station 7', kind: 'fire', near: [420, -260], reg: 'city', style: 'garage', col: 0xfee2e2, acc: 0xdc2626, icon: '🚒', bays: 3 },
  { id: 'police', name: 'Grok City Police', kind: 'police', near: [840, -400], reg: 'city', style: 'shop', col: 0xe0e7ff, acc: 0x1e3a8a, icon: '🚓' },
  { id: 'depot', name: 'Bus Depot', kind: 'depot', near: [400, -400], reg: 'city', style: 'garage', col: 0xfef9c3, acc: 0xca8a04, icon: '🚌', bays: 3 },
  { id: 'arcade', name: 'Grok Arcade Lounge', kind: 'arcade', near: [560, 60], reg: 'city', style: 'shop', col: 0x312e81, acc: 0xe879f9, icon: '🕹️' },
  { id: 'pizza', name: 'Pine Hollow Pizza', kind: 'pizza', menu: ['slice', 'soda'], near: [-500, 500], reg: 'town', style: 'shop', col: 0xfde6c8, acc: 0xdc2626, icon: '🍕' },
  { id: 'diner', name: 'Maple Diner', kind: 'food', menu: ['pancakes', 'coffee', 'donut', 'cookie'], near: [-640, 540], reg: 'town', style: 'shop', col: 0xfef3c7, acc: 0x0d9488, icon: '🥞' },
  { id: 'store', name: 'General Store', kind: 'store', near: [-360, 350], reg: 'town', style: 'shop', col: 0xd9b98c, acc: 0x16a34a, icon: '🏪' },
  { id: 'towngarage', name: 'Pine Hollow Garage', kind: 'garage', near: [-620, 310], reg: 'town', style: 'garage', col: 0xe2d6c4, acc: 0x22c55e, icon: '🔧' },
  { id: 'towyard', name: 'Hook & Haul Tow Yard', kind: 'towyard', near: [-340, 620], reg: 'town', style: 'garage', col: 0xfed7aa, acc: 0xea580c, icon: '🪝' },
  { id: 'bikes', name: 'Pedal & Piston', kind: 'dealer', dealer: 'bikes', near: [-470, 350], reg: 'town', style: 'shop', col: 0xccfbf1, acc: 0x0f766e, icon: '🚲' },
  { id: 'townhall', name: 'Town Hall', kind: 'townhall', near: [-490, 490], reg: 'town', style: 'shop', col: 0xf5f5f4, acc: 0x1e3a8a, icon: '🏛️' },
  { id: 'marine', name: 'Sunny Shores Marine', kind: 'dealer', dealer: 'marine', near: [1030, 1060], reg: 'beach', style: 'shop', col: 0xe0f2fe, acc: 0x0284c7, icon: '⚓' },
  { id: 'scoops', name: 'Scoops Ice Cream', kind: 'icecream', menu: ['cone', 'sundae'], near: [870, 930], reg: 'beach', style: 'shop', col: 0xfce7f3, acc: 0xdb2777, icon: '🍦' },
  { id: 'surf', name: 'Surf Shack', kind: 'store', near: [990, 940], reg: 'beach', style: 'shop', col: 0xfef08a, acc: 0x0891b2, icon: '🏄' },
  { id: 'taco', name: 'Beach Taco', kind: 'food', menu: ['taco', 'coconut', 'soda'], near: [870, 1060], reg: 'beach', style: 'shop', col: 0xfed7aa, acc: 0x16a34a, icon: '🌮' },
  { id: 'hangarshop', name: 'Sky Field Aircraft', kind: 'dealer', dealer: 'air', at: [1185, 500, Math.PI / 2], reg: 'air', style: 'hangar', w: 34, d: 30, h: 13, col: 0xe2e8f0, acc: 0x2563eb, icon: '🛩️' },
  { id: 'tours', name: 'Sky Tours', kind: 'tours', at: [1185, 690, Math.PI / 2], reg: 'air', style: 'shop', w: 20, d: 16, h: 7, col: 0xe0f2fe, acc: 0x7c3aed, icon: '🎈' },
  { id: 'cactusgas', name: 'Cactus Garage', kind: 'garage', at: [-250, 1018, Math.PI], reg: 'desert', style: 'garage', w: 22, d: 16, h: 7, col: 0xfde68a, acc: 0xc2410c, icon: '🔧' },
  { id: 'trading', name: 'Sizzle Trading Post', kind: 'store', at: [-345, 1015, Math.PI], reg: 'desert', style: 'adobe', w: 20, d: 15, h: 6, col: 0xe9b97a, icon: '🌵' },
  { id: 'museum', name: 'Dino Museum', kind: 'museum', at: [100, 1035, Math.PI], reg: 'desert', style: 'shop', w: 30, d: 20, h: 9, col: 0xfef3c7, acc: 0x15803d, icon: '🦖' },
  { id: 'cargo', name: 'Desert Cargo Depot', kind: 'cargo', at: [450, 1020, Math.PI], reg: 'desert', style: 'garage', w: 30, d: 20, h: 9, col: 0xd6d3d1, acc: 0x9a3412, icon: '📦', bays: 3 },
  { id: 'icecafe', name: 'Frostbite Ice Cafe', kind: 'food', menu: ['cocoa', 'coffee', 'donut'], at: [530, -975, -Math.PI / 2], reg: 'tundra', style: 'cabin', w: 18, d: 14, h: 5, icon: '☕' },
  { id: 'lab', name: 'Research Outpost', kind: 'lab', at: [430, -960, Math.PI / 2], reg: 'tundra', style: 'shop', w: 22, d: 16, h: 7, col: 0xe0f2fe, acc: 0x0369a1, icon: '🔬' },
  { id: 'lodge', name: 'Grokmore Lodge', kind: 'lodge', at: [0, 0, 0], reg: 'mtn', style: 'cabin', w: 26, d: 18, h: 7, icon: '🏔️' },
  { id: 'mtngarage', name: 'Mountain Garage', kind: 'garage', at: [-470, -300, Math.PI / 2], reg: 'mtn', style: 'garage', w: 20, d: 15, h: 7, col: 0xe7e5e4, acc: 0x15803d, icon: '🔧' },
  { id: 'marina', name: 'Sparkle Marina', kind: 'dealer', dealer: 'marine', at: [-75, -38, Math.PI / 2], reg: 'lake', style: 'shop', w: 18, d: 14, h: 6, col: 0xe0f2fe, acc: 0x0284c7, icon: '⚓' }
];
function addBuilding(o) {
  const yaw = o.yaw, c = Math.round(Math.cos(yaw)), s = Math.round(Math.sin(yaw)), hw = (Math.abs(c) ? o.w : o.d) / 2, hd = (Math.abs(c) ? o.d : o.w) / 2;
  o.x0 = o.x - hw; o.x1 = o.x + hw; o.z0 = o.z - hd; o.z1 = o.z + hd; o.fx = s; o.fz = c;
  o.door = { x: o.x + s * (o.d / 2 + 1.3), z: o.z + c * (o.d / 2 + 1.3) };
  W.setFlat(o.x0 - 3, o.z0 - 3, o.x1 + 3, o.z1 + 3, o.y);
  o.col = addBox(o.x0, o.z0, o.x1, o.z1, o.y - 2, o.y + o.roofY, { roof: true, bld: o }); o.id = o.id || 'b' + BLD.length; BLD.push(o); return o;
}
const STYLE = { tower, midrise, shop, house, beachHouse, adobe, cabin, hangar, garage: garageBldg };
function make(o) {
  o.y = o.y != null ? o.y : 2.02;
  const F = new Frame(o.x, o.y, o.z, o.yaw), fn = STYLE[o.style === 'showroom' || o.style === 'hotel' ? 'shop' : o.style] || shop;
  const opts = Object.assign({ name: o.sign, acc: o.acc, aw1: o.aw1, bays: o.bays, letter: o.letter, crown: o.crown, garage: o.garage }, o.opt || {});
  let r;
  if (o.style === 'showroom') { // tall glass showroom
    r = shop(F, o.w, o.d, o.h, o.col, rnd, Object.assign(opts, { noAwning: true }));
    F.bx(GLASSW(), o.w - 2, o.h - 2.5, 0.12, 0, o.h / 2, o.d / 2 + 0.08); // big front glass
  } else if (o.style === 'hotel') { r = tower(F, o.w, o.d, o.h, o.col, rnd, { crown: 'helipad', trim: 0xfde68a }); sign(F, o.sign, 0, 8.6, o.d / 2 + 0.1, 1.3, 0xffffff, o.acc); door(F, o.d / 2, 0xb45309, 2.4, 3); }
  else if (o.style === 'cabin') { r = cabin(F, o.w, o.d, o.h, o.col, rnd, { snow: o.reg !== 'town' }); door(F, o.d / 2 + 0.3, 0x7c2d12); if (o.sign) sign(F, o.sign, 0, o.h + 0.5, o.d / 2 + 0.6, 0.9, 0xfef3c7, 0x7c2d12); }
  else if (o.style === 'adobe') { r = adobe(F, o.w, o.d, o.h, o.col, rnd); door(F, o.d / 2, 0x0e7490); if (o.sign) sign(F, o.sign, 0, o.h + 0.9, o.d / 2 + 0.1, 0.85, 0xfef3c7, 0xc2410c); }
  else if (o.style === 'tower' || o.style === 'midrise' || o.style === 'beachHouse') { r = fn(F, o.w, o.d, o.h, o.col, rnd, opts); door(F, o.d / 2, 0xffffff, 1.8, 2.6); }
  else r = fn(F, o.w, o.d, o.h, o.col, rnd, opts);
  o.roofY = r.roofY; if (r.doorX) o.doorX = r.doorX;
  addBuilding(o);
  if (o.doorX) { o.door.x += Math.round(Math.cos(o.yaw)) * o.doorX; o.door.z -= Math.round(Math.sin(o.yaw)) * o.doorX; }
  return o;
}
/* ---------------- lots ---------------- */
// a lot is a rectangle with the road on side "face" (yaw)
function lotsInBlock(x0, z0, x1, z1, n) {
  const out = [], lw = (x1 - x0) / n, ld = (z1 - z0) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const edge = i === 0 || j === 0 || i === n - 1 || j === n - 1; if (!edge && n > 2) continue;
    const cx = x0 + lw * (i + 0.5), cz = z0 + ld * (j + 0.5);
    // face the closest outer side
    const dl = i, dr = n - 1 - i, dt = j, db = n - 1 - j, m = Math.min(dl, dr, dt, db);
    const yaw = m === db ? 0 : m === dt ? Math.PI : m === dr ? Math.PI / 2 : -Math.PI / 2;
    out.push({ x: cx, z: cz, lw, ld, yaw, corner: (i === 0 || i === n - 1) && (j === 0 || j === n - 1) });
  }
  return out;
}
const used = new Set();
function claim(lots, near, reg) { let best = null, bd = 1e9; for (const l of lots) { if (l.used || l.reg !== reg) continue; const d = Math.hypot(l.x - near[0], l.z - near[1]); if (d < bd) { bd = d; best = l; } } if (best) best.used = true; return best; }
export function layout() {
  const lots = [];
  // Grok City
  const X = W.CITY_X, Z = W.CITY_Z, cx0 = 620, cz0 = -120;
  for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
    const m = 6 + 3.2 + 1.8, x0 = X[i] + m, x1 = X[i + 1] - m, z0 = Z[j] + m, z1 = Z[j + 1] - m;
    if (i === 2 && j === 3) { park(x0, z0, x1, z1); continue; }
    const core = Math.abs((X[i] + X[i + 1]) / 2 - cx0) < 150 && Math.abs((Z[j] + Z[j + 1]) / 2 - cz0) < 150;
    const L = lotsInBlock(x0, z0, x1, z1, core ? 2 : 3); L.forEach((l) => { l.reg = 'city'; l.core = core; }); lots.push(...L);
    if (!core) courtyard((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 3 - 4);
  }
  // Pine Hollow
  for (let i = 0; i < W.TOWN_X.length - 1; i++) for (let j = 0; j < W.TOWN_Z.length - 1; j++) {
    const m = 5.25 + 3.2 + 1.8, x0 = W.TOWN_X[i] + m, x1 = W.TOWN_X[i + 1] - m, z0 = W.TOWN_Z[j] + m, z1 = W.TOWN_Z[j + 1] - m;
    const L = lotsInBlock(x0, z0, x1, z1, 3); L.forEach((l) => { l.reg = 'town'; }); lots.push(...L);
    garden((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 3 - 4);
  }
  // Sunny Shores
  for (let i = 0; i < W.SHORE_X.length - 1; i++) for (let j = 0; j < W.SHORE_Z.length - 1; j++) {
    const m = 5.5 + 3.2 + 1.8, x0 = W.SHORE_X[i] + m, x1 = W.SHORE_X[i + 1] - m, z0 = W.SHORE_Z[j] + m, z1 = W.SHORE_Z[j + 1] - m;
    const L = lotsInBlock(x0, z0, x1, z1, 3); L.forEach((l) => { l.reg = 'beach'; }); lots.push(...L);
    garden((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 3 - 4, 'palm');
  }
  // homes first (fixed lots)
  const homeLots = { h_starter: claim(lots, [-470, 430], 'town'), h_villa: null, h_loft: claim(lots, [820, -150], 'city') };
  // named places
  for (const p of PLACE_DEFS) {
    let o;
    if (p.at) { let [x, z, yaw] = p.at; if (p.id === 'lodge') { x = NODES.L.x + 26; z = NODES.L.z; yaw = -Math.PI / 2; } o = { x, z, yaw, w: p.w, d: p.d, h: p.h, y: Math.max(2.02, heightAt(x, z)) }; }
    else { const l = claim(lots, p.near, p.reg); if (!l) continue; o = { x: l.x, z: l.z, yaw: l.yaw, w: Math.min(l.lw, l.ld) - 8, d: Math.min(l.lw, l.ld) - 12, h: p.style === 'hotel' ? 62 : p.style === 'showroom' ? 10 : 8 }; if (p.style === 'hotel') { o.w = Math.min(l.lw, l.ld) - 6; o.d = o.w; } }
    if (p.id === 'lodge') o.y = heightAt(o.x, o.z);
    Object.assign(o, { place: p, style: p.style, col: p.col || 0xfef3c7, acc: p.acc, sign: p.name.toUpperCase(), bays: p.bays, kind: p.kind, name: p.name, id: p.id });
    make(o); PLACES.push(o);
  }
  // homes
  for (const h of HOMES) {
    let o;
    if (h.id === 'h_villa') o = { x: -170, z: 1015, yaw: Math.PI, w: 22, d: 16, h: 6, y: 2.02 };
    else { const l = homeLots[h.id]; o = { x: l.x, z: l.z, yaw: l.yaw, w: h.style === 'loft' ? 24 : 16, d: h.style === 'loft' ? 20 : 12, h: h.style === 'loft' ? 16 : 4.2 }; }
    Object.assign(o, { home: h, kind: 'home', name: h.name, id: h.id, col: h.wall, acc: h.acc, style: h.style === 'cottage' ? 'house' : h.style === 'villa' ? 'adobe' : 'midrise', opt: { garage: 1, noShop: 1, roof: 0xb45309, trim: 0xffffff, noGlow: false } });
    make(o); PLACES.push(o);
    const s = new Frame(o.x, o.y, o.z, o.yaw); // mailbox + garage pad
    s.rb(M(0x2563eb, { r: 0.4, cc: 0.4 }), 0.5, 0.45, 0.8, 0.2, -o.w / 2 + 1.5, 1.3, o.d / 2 + 4); s.add(GEO.cyl(0.06, 0.06, 1.1, 8), M(0x334155), -o.w / 2 + 1.5, 0.55, o.d / 2 + 4); s.rb1(M(0xef4444), 0.05, 0.4, 0.08, 0.02, -o.w / 2 + 1.78, 1.5, o.d / 2 + 4);
    o.mailbox = { x: s.w(-o.w / 2 + 1.5, o.d / 2 + 4)[0], z: s.w(-o.w / 2 + 1.5, o.d / 2 + 4)[1] };
    const [gx, gz] = s.w(o.w / 2 - 2, o.d / 2 + 7); o.garageSpot = { x: gx, z: gz, yaw: o.yaw };
  }
  // fill remaining lots with generic buildings
  for (const l of lots) {
    if (l.used) continue; const w = l.lw - 8 - rnd() * 4, d = l.ld - 10 - rnd() * 4;
    let o;
    if (l.reg === 'city') {
      if (l.core) o = { style: 'tower', h: 48 + Math.floor(rnd() * 8) * 9, col: pick([0x60a5fa, 0x38bdf8, 0x818cf8, 0x2dd4bf, 0xf472b6, 0xa78bfa, 0x94a3b8]), crown: rnd() < 0.3 ? 'spire' : rnd() < 0.3 ? 'helipad' : '', kind: pick(['office', 'office', 'apartment']) };
      else o = { style: 'midrise', h: 12 + Math.floor(rnd() * 6) * 3.6, col: pick([0xfca5a5, 0xfdba74, 0xfde68a, 0x86efac, 0x93c5fd, 0xc4b5fd, 0xf9a8d4, 0x5eead4, 0xfef3c7]), aw1: pick([0xef4444, 0x2563eb, 0x16a34a, 0xf59e0b, 0xdb2777]), kind: pick(['apartment', 'shop', 'office']) };
    } else if (l.reg === 'town') o = { style: 'house', h: 3.6, col: pick([0xfde7c4, 0xfecaca, 0xbfdbfe, 0xbbf7d0, 0xfef08a, 0xe9d5ff, 0xffffff]), kind: 'house', w2: 1 };
    else o = { style: 'beachHouse', h: 7 + Math.floor(rnd() * 3) * 3.4, col: pick([0xfda4af, 0xfde68a, 0x99f6e4, 0xbae6fd, 0xfbcfe8, 0xd9f99d, 0xffffff]), aw1: pick([0x06b6d4, 0xf43f5e, 0xf59e0b, 0x10b981]), kind: pick(['apartment', 'shop', 'house']) };
    Object.assign(o, { x: l.x, z: l.z, yaw: l.yaw, w: o.w2 ? Math.min(w, 15) : w, d: o.w2 ? Math.min(d, 11) : d });
    make(o);
    if (l.reg !== 'city' && rnd() < 0.8) { const F = new Frame(l.x, 2.02, l.z, l.yaw); tree(...xz(F, -o.w / 2 - 2.5, o.d / 2 + 3), rnd() * 0.3 + 0.9, l.reg === 'beach' ? 'palm' : 'round', Math.floor(rnd() * 9)); }
  }
  streetDressing(); regionsDressing(); gasAndWash(); ramps(); stars(); signals();
}
const xz = (F, lx, lz) => { const [x, z] = F.w(lx, lz); return [x, heightAt(x, z), z]; };
function park(x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  W.setFlat(x0, z0, x1, z1, 2.02, W.S_GRASS);
  // paths, fountain, pond, trees, benches
  for (const [w, d] of [[x1 - x0, 4], [4, z1 - z0]]) D(cx, cz).mesh(GEO.rbox(w, 0.12, d, 0.05, 1), M(0xe7d3a8, { r: 0.9 }), cx, 2.05, cz);
  const f = new Frame(cx, 2.02, cz, 0), st = M(0xe5e7eb, { r: 0.5 });
  f.add(GEO.cyl(7, 7.3, 0.9, 40), st, 0, 0.45, 0); f.add(GEO.cyl(6.4, 6.4, 0.2, 40), M(0x38bdf8, { r: 0.05, m: 0.2, cc: 1 }), 0, 0.8, 0);
  f.add(GEO.cyl(1.2, 1.6, 2.4, 20), st, 0, 1.6, 0); f.add(GEO.cyl(2.2, 2.2, 0.3, 24), st, 0, 2.9, 0); f.add(GEO.sphere(0.6, 16, 12), M(0xfacc15, { r: 0.2, m: 1 }), 0, 3.5, 0);
  addCircle(cx, cz, 7.2, 3.2);
  for (let i = 0; i < 26; i++) { const x = x0 + 6 + rnd() * (x1 - x0 - 12), z = z0 + 6 + rnd() * (z1 - z0 - 12); if (Math.abs(x - cx) < 10 && Math.abs(z - cz) < 10 || Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4) continue; tree(x, 2.02, z, 0.9 + rnd() * 0.5, 'round', i); addCircle(x, z, 0.5, 6); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; bench(cx + Math.cos(a) * 11, 2.02, cz + Math.sin(a) * 11, -a - Math.PI / 2); }
  for (let i = 0; i < 6; i++) flowerBed(cx + (i % 3 - 1) * 16, 2.02, cz + (i < 3 ? -18 : 18), 6, 2.4, i * 7);
  sign(new Frame(cx, 2.02, z1 - 2, 0), 'GROK CENTRAL PARK', 0, 1.6, 0, 0.8, 0x166534, 0xfacc15);
}
function courtyard(cx, cz, s) { const y = 2.02; W.setFlat(cx - s / 2, cz - s / 2, cx + s / 2, cz + s / 2, y, W.S_GRASS); for (let i = 0; i < 3; i++) tree(cx + (rnd() - 0.5) * s * 0.6, y, cz + (rnd() - 0.5) * s * 0.6, 0.8 + rnd() * 0.3, 'round', i); flowerBed(cx, y, cz, 5, 2, 3); }
function garden(cx, cz, s, kind = 'round') { const y = 2.02; W.setFlat(cx - s / 2, cz - s / 2, cx + s / 2, cz + s / 2, y, W.S_GRASS); for (let i = 0; i < 4; i++) tree(cx + (rnd() - 0.5) * s * 0.7, y, cz + (rnd() - 0.5) * s * 0.7, 0.8 + rnd() * 0.4, kind, i + 3); flowerBed(cx, y, cz, 4, 4, 9); bench(cx + 3, y, cz + 3, 0.8); }
// streetlamps, hydrants, bins, benches and bus stops along the walkable streets
function streetDressing() {
  for (const e of EDGES) {
    if (!e.walk) continue; const hw = e.w / 2;
    for (let s = 14; s < e.len - 14; s += 26) for (const side of [-1, 1]) {
      const p = W.edgePoint(e, s + (side > 0 ? 13 : 0), side * (hw + 2.4)); if (W.surfAt(p.x, p.z) !== W.S_WALK) continue;
      const y = heightAt(p.x, p.z); streetLamp(p.x, y, p.z, Math.atan2(-side * -p.dz, -side * p.dx)); addCircle(p.x, p.z, 0.25, y + 7);
      const q = W.edgePoint(e, s + 6.5 + (side > 0 ? 13 : 0), side * (hw + 1.6)), qy = heightAt(q.x, q.z), r = rnd();
      if (r < 0.18) { hydrant(q.x, qy, q.z); CRUSH.push({ x: q.x, z: q.z, t: 'hydrant' }); } else if (r < 0.36) { bin(q.x, qy, q.z); CRUSH.push({ x: q.x, z: q.z, t: 'bin' }); }
      else if (r < 0.5) { const b = W.edgePoint(e, s + 6.5, side * (hw + 2.4)); bench(b.x, heightAt(b.x, b.z), b.z, Math.atan2(side * -b.dz, side * b.dx) + Math.PI); }
    }
    if (e.len > 100 && (e.id % 3 === 0)) { const p = W.edgePoint(e, e.len / 2, hw + 2.2), y = heightAt(p.x, p.z); if (W.surfAt(p.x, p.z) === W.S_WALK) { busStop(p.x, y, p.z, Math.atan2(-p.dz, p.dx) + Math.PI / 2); STOPS.push({ e, s: e.len / 2, x: p.x, z: p.z, name: 'Stop ' + (STOPS.length + 1) }); } }
  }
}
function scatter(n, x0, z0, x1, z1, fn) { for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (Math.abs(x) > W.WB - 20 || Math.abs(z) > W.WB - 20) continue; if (W.roadEdge(x, z) < 6) continue; const s = W.surfAt(x, z); if (s === W.S_WATER || s === W.S_ROAD || s === W.S_WALK || s === W.S_RUNWAY || s === W.S_ICE) continue; if (inBld(x, z)) continue; fn(x, heightAt(x, z), z, s, i); } }
function inBld(x, z) { for (const b of BLD) if (x > b.x0 - 4 && x < b.x1 + 4 && z > b.z0 - 4 && z < b.z1 + 4) return true; return false; }
function regionsDressing() {
  // countryside forests and meadows
  scatter(2200, -1450, -1450, 1450, 1450, (x, y, z, s, i) => {
    const reg = W.regionAt(x, z); if (reg === 'city' || reg === 'town' || reg === 'beach' || reg === 'air') return;
    if (reg === 'desert') { if (i % 3 === 0) { tree(x, y, z, 0.8 + rnd() * 0.6, 'cactus', i); addCircle(x, z, 0.5, y + 3); } else if (i % 5 === 0) rock(x, y, z, 1 + rnd() * 2, i, 0xd19a66); return; }
    if (reg === 'tundra' || s === W.S_SNOW) { tree(x, y, z, 0.9 + rnd() * 0.7, 'snowpine', i); addCircle(x, z, 0.5, y + 5); return; }
    if (s === W.S_ROCK) { rock(x, y, z, 1.5 + rnd() * 2.5, i); return; }
    if (s === W.S_BEACH) { if (i % 4 === 0) { tree(x, y, z, 1, 'palm', i); addCircle(x, z, 0.4, y + 6); } return; }
    if (reg === 'mtn' || i % 3 === 0) { tree(x, y, z, 0.9 + rnd() * 0.8, 'pine', i); addCircle(x, z, 0.5, y + 5); }
    else if (i % 3 === 1) { tree(x, y, z, 0.9 + rnd() * 0.6, 'round', i); addCircle(x, z, 0.6, y + 5); }
    else tree(x, y, z, 0.8 + rnd() * 0.5, 'bush', i);
  });
  // beach: palms, umbrellas, towels, lifeguard tower, Torty's pier
  scatter(160, 700, 700, 1450, 1450, (x, y, z, s, i) => { if (s !== W.S_BEACH) return; if (i % 3 === 0) { tree(x, y, z, 1 + rnd() * 0.3, 'palm', i); addCircle(x, z, 0.4, y + 6); } else { const c = [0xef4444, 0xfacc15, 0x06b6d4, 0xec4899][i % 4]; B(x, z).mesh(GEO.cyl(0.05, 0.05, 2.4, 6), M(0xffffff), x, y + 1.2, z); B(x, z).mesh(new THREE.ConeGeometry(1.4, 0.6, 16, 1, true), M(c, { r: 0.6, side: THREE.DoubleSide }), x, y + 2.5, z); D(x, z).mesh(GEO.rbox(0.9, 0.04, 1.8, 0.02, 1), M(c, { r: 0.9 }), x + 1, y + 0.03, z); } });
  const pier = new Frame(1140, 1.4, 1140, Math.PI / 4); for (let i = 0; i < 16; i++) { pier.rb1(M(0xc8935a, { r: 0.75 }), 4.4, 0.25, 4.2, 0.06, 0, 0.6, i * 4); for (const sx of [-2, 2]) pier.add(GEO.cyl(0.2, 0.2, 4, 8), M(0x8b5a2b), sx, -1, i * 4); }
  for (let i = 0; i < 16; i++) { const [x, z] = pier.w(0, i * 4); W.setFlat(x - 3, z - 3, x + 3, z + 3, 2.15, W.S_WALK); }
  SPOTS.push({ id: 'torty', kind: 'torty', name: "Torty's Pier Snacks", x: pier.w(0, 56)[0], z: pier.w(0, 56)[1], y: 2.15 });
  // Sparkle Marina docks
  const dock = new Frame(-55, 1.3, -10, 0); for (let i = 0; i < 6; i++) { dock.rb1(M(0xc8935a, { r: 0.75 }), 3.2, 0.25, 4.2, 0.06, 0, 0.6, i * 4); dock.add(GEO.cyl(0.18, 0.18, 4, 8), M(0x8b5a2b), 1.5, -1, i * 4); }
  // Sky Field: control tower, windsock, helipads
  const tw = new Frame(1190, 2.02, 600, Math.PI / 2); tw.add(GEO.cyl(2.2, 2.6, 18, 20), M(0xe2e8f0, { r: 0.5 }), 0, 9, 0); tw.add(GEO.cyl(4.2, 3.4, 3.4, 20), GLASSW(), 0, 19.6, 0); tw.add(GEO.cyl(4.6, 4.6, 0.6, 20), M(0x2563eb), 0, 21.6, 0); tw.add(GEO.cyl(0.08, 0.08, 4, 6), M(0xffffff), 0, 24, 0); tw.add(GEO.sphere(0.3, 10, 8), NEON(0xff2d55), 0, 26, 0, 0, 0, 0, 1, 1, 1, 'N'); addCircle(1190, 600, 2.7, 22);
  for (const [x, z] of [[1180, 420], [1180, 780]]) { const f = new Frame(x, 2.02, z, 0); f.add(GEO.cyl(7, 7, 0.25, 32), M(0x334155, { r: 0.7 }), 0, 0.12, 0); f.add(GEO.torus(6.2, 0.18, Math.PI * 2, 6, 40), M(0xfacc15), 0, 0.27, 0, Math.PI / 2, 0, 0); f.text('H', 4, 0xffffff, 0, 0.27, 1.5, 0, 'N'); SPOTS.push({ kind: 'helipad', x, z }); }
  // desert: mesas + dino skeleton outside the museum
  for (const [x, z, s] of [[-900, 1250, 1], [-700, 1350, 0.8], [250, 1300, 1.2], [-1100, 1050, 0.9]]) { const y = heightAt(x, z), f = new Frame(x, y, z, s); f.add(GEO.cyl(30 * s, 38 * s, 26 * s, 9), M(0xc2410c, { r: 0.95, flat: true }), 0, 12 * s, 0); f.add(GEO.cyl(31 * s, 30 * s, 3 * s, 9), M(0xea8a4f, { r: 0.95, flat: true }), 0, 26 * s, 0); addCircle(x, z, 36 * s, y + 27 * s); }
  // tundra: igloos, snowmen, ice fishing huts
  for (let i = 0; i < 6; i++) { const x = 560 + (i % 3) * 30, z = -1110 - Math.floor(i / 3) * 40, y = heightAt(x, z); const f = new Frame(x, y, z, i); if (i % 2) { f.add(new THREE.SphereGeometry(2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf8fbff, { r: 0.4 }), 0, 0, 0); f.add(GEO.cyl(0.9, 0.9, 1.6, 14), M(0xe0f2fe, { r: 0.4 }), 0, 0.8, 2.3, Math.PI / 2, 0, 0); addCircle(x, z, 2.7, y + 2.6); } else { f.add(GEO.sphere(0.9, 16, 12), M(0xffffff, { r: 0.4 }), 0, 0.85, 0); f.add(GEO.sphere(0.65, 16, 12), M(0xffffff, { r: 0.4 }), 0, 2.1, 0); f.add(GEO.sphere(0.45, 16, 12), M(0xffffff, { r: 0.4 }), 0, 3.0, 0); f.add(GEO.cone(0.08, 0.5, 8), M(0xf97316), 0, 3.0, 0.6, Math.PI / 2, 0, 0); f.add(GEO.cyl(0.32, 0.32, 0.5, 14), M(0x111827), 0, 3.6, 0); } }
}
function gasAndWash() {
  const defs = [{ at: [470, 186, Math.PI], name: 'CITY GAS' }, { at: [-640, 662, Math.PI], name: 'PINE GAS' }, { at: [1000, 1082, Math.PI], name: 'SHORES GAS' }, { at: [-200, 1035, Math.PI], name: 'CACTUS GAS' }, { at: [600, -720, -Math.PI / 2], name: 'TUNDRA GAS' }, { at: [-430, -280, 0], name: 'BASE GAS' }];
  for (const g of defs) {
    let [x, z, yaw] = g.at; const near = W.nearestRoad(x, z, 80); if (near && near.d < 16) { const dx = x - near.x, dz = z - near.z, L = Math.hypot(dx, dz) || 1; x = near.x + dx / L * 17; z = near.z + dz / L * 17; }
    if (inBld(x, z)) continue;
    const y = 2.02; W.setFlat(x - 13, z - 10, x + 13, z + 10, y, W.S_PLAZA);
    const F = new Frame(x, y, z, yaw), red = M(0xef4444, { r: 0.4, cc: 0.6 }), wh = M(0xf8fafc, { r: 0.5 });
    F.rb(M(0xd6d3d1, { r: 0.85 }), 24, 0.12, 16, 0.1, 0, 0.0, 0, 0, 'N');
    for (const sx of [-6, 6]) for (const sz of [-3, 3]) F.add(GEO.cyl(0.3, 0.3, 5.4, 12), wh, sx, 2.7, sz);
    F.rb(red, 16, 0.9, 10, 0.35, 0, 5.6, 0); F.rb(wh, 16.4, 0.25, 10.4, 0.1, 0, 5.1, 0); Bn(x, z).add(GEO.box(14, 0.06, 8), LAMP(), new THREE.Matrix4().compose(new THREE.Vector3(x, y + 5.0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1)));
    sign(F, g.name, 0, 5.6, 5.2, 0.6, 0xffffff, 0xef4444);
    const pumps = [];
    for (const sx of [-3.2, 3.2]) { F.rb(M(0x9ca3af), 1.6, 0.25, 4, 0.1, sx, 0.12, 0); F.rb(wh, 0.9, 1.7, 0.6, 0.2, sx, 1.0, 0); F.rb(red, 0.95, 0.3, 0.65, 0.1, sx, 1.9, 0); F.bx(GLASS_(), 0.5, 0.35, 0.05, sx, 1.35, 0.33); const [px, pz] = F.w(sx, 0); addCircle(px, pz, 0.6, y + 2); pumps.push(...[[sx - 2.6, 0], [sx + 2.6, 0]].map(([a, b]) => { const [qx, qz] = F.w(a, b); return { x: qx, z: qz }; })); }
    // mini mart (enterable)
    const [mx, mz] = F.w(0, -11.5); const o = make({ x: mx, z: mz, yaw, w: 14, d: 8, h: 4.5, style: 'shop', col: 0xfff7ed, acc: 0xef4444, sign: 'MINI MART', kind: 'mart', name: g.name[0] + g.name.slice(1).toLowerCase() + ' Mini Mart', place: { kind: 'mart', menu: ['soda', 'candy', 'jerky', 'slushie', 'coffee'] } });
    PLACES.push(o);
    GAS.push({ x, z, yaw, pumps, name: g.name });
  }
  // Sparkle Car Wash (city) + Sunny Shores wash
  for (const [x0, z0, yaw, nm] of [[880, 168, Math.PI / 2, 'SPARKLE CAR WASH'], [820, 1110, 0, 'SUDS & SHINE']]) {
    let x = x0, z = z0; const near = W.nearestRoad(x, z, 80); if (near && near.d < 14) { const dx = x - near.x, dz = z - near.z, L = Math.hypot(dx, dz) || 1; x = near.x + dx / L * 15; z = near.z + dz / L * 15; }
    if (inBld(x, z)) continue;
    const y = 2.02; W.setFlat(x - 14, z - 14, x + 14, z + 14, y, W.S_PLAZA);
    const F = new Frame(x, y, z, yaw), bl = M(0x0ea5e9, { r: 0.4, cc: 0.6 }), wh = M(0xffffff, { r: 0.5 });
    for (const sx of [-1, 1]) { F.rb(bl, 0.8, 4.6, 14, 0.3, sx * 3.4, 2.3, 0); const [a, b] = F.w(sx * 3.4, 0); addBox(...(Math.abs(Math.cos(yaw)) > 0.5 ? [a - 0.4, b - 7, a + 0.4, b + 7] : [a - 7, b - 0.4, a + 7, b + 0.4]), y - 1, y + 4.6); }
    F.rb(bl, 7.6, 0.8, 14, 0.3, 0, 4.9, 0); F.rb(wh, 7.8, 0.3, 14.2, 0.1, 0, 4.4, 0);
    for (let i = -1; i <= 1; i++) for (const sx of [-1, 1]) F.add(GEO.cyl(0.55, 0.55, 3.4, 14), M([0xec4899, 0xfacc15, 0x22c55e][i + 1], { r: 0.9 }), sx * 2.4, 2.1, i * 4.2);
    sign(F, nm, 0, 6.2, 7.2, 0.55, 0xffffff, 0x0ea5e9); F.rb(M(0x334155, { r: 0.9 }), 6, 0.08, 14, 0.04, 0, 0.0, 0, 0, 'N');
    for (let i = 0; i < 6; i++) F.add(GEO.sphere(0.35 + (i % 3) * 0.12, 12, 10), M(0xffffff, { r: 0.2, op: 0.7 }), -2 + (i % 3) * 2, 4.2, -5 + i * 2, 0, 0, 0, 1, 1, 1, 'N');
    WASH.push({ x, z, yaw, name: nm });
  }
}
let GLASS__ = null; function GLASS_() { return GLASS__ || (GLASS__ = M(0x111827, { e: 0x22c55e, ei: 0.8, r: 0.2 })); }
// stunt ramps (wedges) and humps
export function ramps() {
  const R = [[650, 25, 0, 'city'], [340 + 70, -40, Math.PI / 2], [1240, 620, Math.PI, 'runway'], [1240, 470, Math.PI], [-150, 1150, Math.PI / 2], [150, 1180, -Math.PI / 2], [-100, 950, 0], [300, 920, 0.6], [-380, 760, 0], [1000, 1250, Math.PI / 4], [700, -1180, 0], [500, -1150, Math.PI / 2], [-200, -300, 0.3], [-640, 160, 0], [1050, 300, 0]];
  for (const [x, z, yaw] of R) {
    const y = heightAt(x, z), L = 12, w = 6, h = 3.2; addRamp(x, z, yaw, L, w, h);
    const F = new Frame(x, y, z, yaw), s = new THREE.Shape(); s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 }); g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2);
    F.add(g, M(0xf97316, { r: 0.45, cc: 0.5 }), 0, 0, 0); for (let i = -2; i <= 2; i++) F.add(GEO.box(0.5, 0.05, L * 1.02), M(0xffffff, { r: 0.4 }), i * 1.2, h / 2 + 0.05, 0, Math.atan2(h, L), 0, 0, 1, 1, 1, 'N');
    // back wall collider so you can't drive into the tall end
    const [bx, bz] = F.w(0, L / 2 + 0.2); addCircle(bx, bz, 0.5, y + h - 0.4, { rampBack: 1 });
  }
}
// collectible Grok Stars: 60 around the map (some on rooftops!)
function stars() {
  let n = 0; const pt = (x, z, y) => { STARS.push({ id: n++, x, z, y: y != null ? y : heightAt(x, z) + 1.6 }); };
  for (let i = 0; i < 40; i++) { const e = EDGES[(i * 7) % EDGES.length], p = W.edgePoint(e, e.len * ((i * 0.37) % 1), (i % 2 ? 1 : -1) * e.w / 4); pt(p.x, p.z); }
  for (const b of BLD) if (n < 52 && b.style === 'tower' && rnd() < 0.3) pt(b.x, b.z, b.y + b.roofY + 1.6);
  for (const [x, z] of [[-820, -820], [600, -1150], [-50, 120], [1240, 600], [1160, 1160], [100, 1300], [-1200, 300], [0, -1300]]) pt(x, z, Math.max(heightAt(x, z), 0.2) + 1.6);
}
// traffic signals at the 4-way city junctions
function signals() {
  for (const id in NODES) { const n = NODES[id]; if (!id.startsWith('c') || n.edges.length < 4) continue; n.signal = { heads: [] };
    for (const [sx, sz, ry] of [[1, 1, 0], [-1, -1, Math.PI], [1, -1, Math.PI / 2], [-1, 1, -Math.PI / 2]]) { const x = n.x + sx * (n.r + 1.8), z = n.z + sz * (n.r + 1.8); const [p, y] = trafficLight(x, heightAt(x, z), z, ry); addCircle(x, z, 0.3, 8); n.signal.heads.push({ x: p[0], y, z: p[1], ns: Math.abs(Math.sin(ry)) < 0.5 }); }
    LIGHTS.push(n); }
}
