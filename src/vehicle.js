// vehicle physics (arcade, smooth): grip by surface + weather, drift/handbrake, nitro, suspension, ramps & air time, damage,
// plus boats, hovercraft, Ratita hover-car, helicopter, planes/seaplane and the hot air balloon
import * as THREE from 'three';
import * as W from './world.js';
import { extraGround, solve } from './collide.js';
import { makeVehicle } from './vmodels.js';
import { animPerson } from './people.js';
const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const ENV = { wet: 0, gravity: 21 };
const SGRIP = { [W.S_ROAD]: 1, [W.S_WALK]: 1, [W.S_RUNWAY]: 1, [W.S_PLAZA]: 1, [W.S_GRASS]: 0.78, [W.S_DIRT]: 0.72, [W.S_SAND]: 0.6, [W.S_BEACH]: 0.62, [W.S_SNOW]: 0.5, [W.S_ICE]: 0.22, [W.S_ROCK]: 0.7, [W.S_WATER]: 0.5 };
const ROUGH = { [W.S_GRASS]: 0.82, [W.S_DIRT]: 0.8, [W.S_SAND]: 0.65, [W.S_BEACH]: 0.68, [W.S_SNOW]: 0.62, [W.S_ICE]: 0.9, [W.S_ROCK]: 0.7 };
export class Car {
  constructor(type, look = {}) {
    this.type = type; this.look = look; this.build();
    this.x = 0; this.y = 2; this.z = 0; this.yaw = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.ground = true; this.steerA = 0; this.pitch = 0; this.roll = 0; this.spP = 0; this.spR = 0; this.spY = 0; this.spV = 0;
    this.dmg = 0; this.fuel = 1; this.nitro = 1; this.air = 0; this.drift = 0; this.lean = 0; this.wheelie = 0; this.alt = 0; this.bank = 0; this.fpitch = 0; this.speed = 0; this.thr = 0; this.parked = true; this.sunk = 0; this.burn = 0; this.lastHit = 0; this.dirt = 0;
  }
  build() { const o = this.look; if (this.V) { this.V.root.parent && this.V.root.parent.remove(this.V.root); }
    this.V = makeVehicle(this.type, { color: o.color, finish: o.finish, rim: o.rim, rider: o.rider, lite: o.lite, riderVisible: o.riderVisible });
    this.def = this.V.def; this.kind = this.def.kind; this.len = this.V.dims.L; this.wid = this.V.dims.W;
    const u = o.upg || {}; this.vmax = this.def.vmax * 0.55 * (1 + 0.06 * (u.engine || 0)); this.accel = this.def.acc * 0.36 * (1 + 0.1 * (u.engine || 0)); this.gripB = (this.def.grip || 1) * (1 + 0.06 * (u.grip || 0)); this.armor = 1 - 0.2 * (u.armor || 0); this.hasNitro = !!u.nitro || o.nitro; this.tank = 1 + 0.5 * (u.tank || 0);
    this.wb = this.V.wheels.length ? Math.max(1, Math.abs(this.V.wheels[0].z - this.V.wheels[this.V.wheels.length - 1].z)) : this.len * 0.6;
    this.r = Math.min(this.wid, this.len) / 2 * 0.95; this.circ = Math.max(0, this.len / 2 - this.r);
  }
  place(x, z, yaw, y) { this.x = x; this.z = z; this.yaw = yaw; this.vx = this.vz = this.vy = 0; const g = this.groundAt(x, z, 999); this.y = y != null ? y : g; this.ground = true; this.alt = 0; this.fpitch = 0; this.bank = 0; this.sync(0); }
  get fwd() { return [Math.sin(this.yaw), Math.cos(this.yaw)]; }
  groundAt(x, z, y) { let h = W.heightAt(x, z); const e = extraGround(x, z, y != null ? y : this.y); if (e > h) h = e; return h; }
  isAirK() { return this.kind === 'heli' || this.kind === 'plane' || this.kind === 'seaplane' || this.kind === 'balloon'; }
  // inp: {thr -1..1, steer -1..1, hand, nitro, up, down, wheelie, pitch -1..1}
  update(dt, inp, opt = {}) {
    if (this.parked && !inp.active) { this.vx *= 0.8; this.vz *= 0.8; this.idle(dt); return; }
    this.parked = false;
    const k = this.kind; if (this.isAirK()) this.flyUpdate(dt, inp, opt); else this.driveUpdate(dt, inp, opt);
    if (this.fuel > 0 && !opt.noFuel && (Math.abs(inp.thr) > 0.05 || inp.up)) this.fuel = Math.max(0, this.fuel - dt * 0.0016 * (1 + Math.abs(this.speed) / 25) / this.tank);
    this.sync(dt);
    void k;
  }
  idle(dt) { this.sync(dt); }
  driveUpdate(dt, inp, opt) {
    const k = this.kind, water = k === 'boat', hover = k === 'hover', hcar = k === 'hovercar', bike = k === 'bike';
    const [fx, fz] = this.fwd, rx = -fz, rz = fx; let vf = this.vx * fx + this.vz * fz, vr = this.vx * rx + this.vz * rz;
    const s = W.surfAt(this.x, this.z), gh = W.heightAt(this.x, this.z), inWater = gh < -0.2;
    let grip = this.gripB, rough = 1;
    if (!water && !hover && !hcar) { const sg = SGRIP[s] ?? 0.8, skill = s === W.S_SNOW || s === W.S_ICE ? (this.def.snow || 0.3) : (s === W.S_ROAD || s === W.S_WALK || s === W.S_RUNWAY || s === W.S_PLAZA) ? 1 : (this.def.off || 0.35); grip *= sg + (1 - sg) * skill * 0.85; if (opt.buff && opt.buff.off && (s === W.S_SAND || s === W.S_DIRT || s === W.S_BEACH)) grip *= 1.15; if (opt.buff && opt.buff.snow && (s === W.S_SNOW || s === W.S_ICE)) grip *= 1.25;
      rough = ROUGH[s] ? ROUGH[s] + (1 - ROUGH[s]) * (this.def.off || 0.3) : 1; if (s === W.S_ROAD || s === W.S_WALK) grip *= 1 - ENV.wet * 0.18; }
    if (water) { grip = 0.55 * this.gripB; if (!inWater) rough = 0.08; }
    if (hover) { grip = 0.32 * this.gripB; }
    if (opt.buff && opt.buff.grip) grip *= 1.08;
    let vmax = this.vmax * rough * (opt.buff && opt.buff.speed ? 1.05 : 1), acc = this.accel;
    if (this.fuel <= 0 && !opt.noFuel) { vmax *= 0.25; acc *= 0.3; }
    if (this.dmg > 0.75) vmax *= 0.75;
    // nitro
    this.boost = false; if (inp.nitro && this.hasNitro && this.nitro > 0.02 && this.ground && vf > 2) { this.boost = true; this.nitro = Math.max(0, this.nitro - dt * 0.28); vmax *= 1.35; acc *= 1.8; } else this.nitro = Math.min(1, this.nitro + dt * 0.045 * (opt.buff && opt.buff.nitro ? 2 : 1));
    const onG = this.ground || water || hover || hcar;
    // steering (less lock at speed), smoothed
    const sAbs = Math.abs(vf), maxS = (this.def.turn || 1.8) * 0.3 / (1 + sAbs / 16) + 0.05;
    this.steerA = damp(this.steerA, -inp.steer * maxS, 8, dt);
    // longitudinal
    const thr = inp.thr; this.thr = thr;
    if (onG) {
      if (thr > 0.05) { if (vf < -0.5) vf += 18 * thr * dt; else vf += acc * thr * Math.max(0, 1 - Math.max(0, vf) / vmax) * (vf > vmax ? -1 : 1) * dt; }
      else if (thr < -0.05) { if (vf > 0.5) vf -= 16 * -thr * dt; else vf = Math.max(-vmax * 0.35, vf - acc * 0.6 * -thr * dt); }
      else { const d = (water ? 1.2 : 0.55) * dt + Math.abs(vf) * 0.05 * dt; vf = Math.abs(vf) <= d ? 0 : vf - Math.sign(vf) * d; }
      if (vf > vmax) vf = damp(vf, vmax, 1.5, dt);
      if (inp.hand && !water) { vf = damp(vf, 0, 0.9, dt); }
      // yaw from bicycle model; handbrake / drift loosens the rear
      let yr = vf * Math.tan(this.steerA) / this.wb; if (bike) yr *= 1.0;
      if (water || hover) yr = -inp.steer * (this.def.turn || 1.6) * 0.62 * clamp(Math.abs(vf) / 6, 0.25, 1) * Math.sign(vf || 1);
      const loose = inp.hand ? 0.22 : 1; this.yaw += yr * dt * (inp.hand ? 1.35 : 1);
      // lateral grip
      const gk = 10 * grip * loose; vr = vr * Math.exp(-gk * dt);
      this.drift = Math.abs(vr) > 2.6 && sAbs > 6 ? Math.min(1, this.drift + dt * 3) : Math.max(0, this.drift - dt * 2);
    } else { this.drift = 0; }
    const [nfx, nfz] = this.fwd; const nrx = -nfz, nrz = nfx;
    this.vx = nfx * vf + nrx * vr; this.vz = nfz * vf + nrz * vr; this.speed = vf;
    // move + collide (2 circles along the body)
    const ox = this.x, oz = this.z; this.x += this.vx * dt; this.z += this.vz * dt;
    this.collide(dt, ox, oz);
    this.x = clamp(this.x, -W.WB + 30, W.WB - 30); this.z = clamp(this.z, -W.WB + 30, W.WB - 30);
    // vertical
    let g = this.groundAt(this.x, this.z, this.y);
    if (water) { const wl = W.WATER_Y + 0.05 + Math.sin(this.t * 2.1) * 0.05; if (g < wl - 0.3) g = wl; else g = Math.max(g, wl); }
    if (hover) g = Math.max(g, W.WATER_Y) + 0.28 + Math.sin((this.t || 0) * 3) * 0.04;
    if (hcar) { g = Math.max(g, W.WATER_Y) + 0.55 + Math.sin((this.t || 0) * 2.4) * 0.06; if (inp.up && this.ground) { this.vy = 9.5; this.ground = false; } }
    this.t = (this.t || 0) + dt;
    if (this.ground) {
      if (this.y - g > 0.35 && !water) { this.ground = false; this.air = 0; } // ran off a ledge / ramp lip: keep vy
      else { const nvy = (g - this.y) / Math.max(dt, 1e-3); this.vy = clamp(nvy, -30, 22); this.y = g; }
    }
    if (!this.ground) {
      this.air += dt; this.vy -= ENV.gravity * (hcar ? 0.7 : 1) * dt; this.y += this.vy * dt;
      if (this.y <= g) { const imp = -this.vy; this.y = g; this.ground = true; if (imp > 6) { this.spV -= imp * 0.04; this.onLand && this.onLand(imp, this.air); } this.vy = 0; this.lastAir = this.air; this.air = 0; }
    }
    // cars in deep water: sink -> respawn handled by game
    this.sunk = !water && !hover && !hcar && gh < -1.2 && this.y < 0.2 ? this.sunk + dt : 0;
    // body attitude from the ground under the axles + suspension spring
    const hw = this.wb / 2, [cfx, cfz] = this.fwd;
    if (this.ground && !water) { const hf = this.groundAt(this.x + cfx * hw, this.z + cfz * hw, this.y + 1), hb = this.groundAt(this.x - cfx * hw, this.z - cfz * hw, this.y + 1), hl = this.groundAt(this.x - cfz * 0.8, this.z + cfx * 0.8, this.y + 1), hr = this.groundAt(this.x + cfz * 0.8, this.z - cfx * 0.8, this.y + 1);
      this.pitch = damp(this.pitch, Math.atan2(hb - hf, this.wb), 12, dt); this.roll = damp(this.roll, Math.atan2(hr - hl, 1.6), 12, dt); }
    else if (water) { this.pitch = damp(this.pitch, -clamp(vf / 60, -0.05, 0.12) + Math.sin(this.t * 1.7) * 0.02, 4, dt); this.roll = damp(this.roll, inp.steer * clamp(vf / 30, 0, 0.18), 4, dt); }
    else { this.pitch = damp(this.pitch, clamp(-this.vy * 0.025, -0.35, 0.35), 2, dt); }
    // suspension springs: squat/dive and body roll in turns
    const latA = vf * (this.steerA ? vf * Math.tan(this.steerA) / this.wb : 0), lonA = thr * acc * (vf < vmax ? 1 : 0);
    const big = this.def.bigSus ? 2.2 : 1;
    this.spP = damp(this.spP, clamp(lonA * 0.007 * big, -0.08, 0.08), 6, dt); this.spR = damp(this.spR, clamp(latA * 0.004 * big, -0.09, 0.09), 6, dt);
    this.spV += (-this.spY * 90 - this.spV * 9) * dt; this.spY += this.spV * dt;
    if (bike) { this.lean = damp(this.lean, clamp(this.steerA * Math.min(1, sAbs / 6) * 2.2, -0.6, 0.6), 7, dt); this.wheelie = damp(this.wheelie, inp.wheelie && vf > 1 && this.def.wheelie ? this.def.wheelie : 0, 4, dt); }
    if (k === 'kart' && this.y < 0.1) this.sunk += 0;
  }
  collide(dt, ox, oz) {
    const [fx, fz] = this.fwd; let hitN = null;
    for (const s of this.circ > 0.2 ? [this.circ, -this.circ] : [0]) {
      const p = { x: this.x + fx * s, z: this.z + fz * s }, bx = p.x, bz = p.z; const h = solve(p, this.r, this.y + 0.3, 1.4);
      if (h) { this.x += p.x - bx; this.z += p.z - bz; hitN = { nx: h.nx, nz: h.nz, o: h.o }; }
    }
    if (hitN) { const vn = this.vx * hitN.nx + this.vz * hitN.nz; if (vn < 0) { this.vx -= vn * hitN.nx * 1.35; this.vz -= vn * hitN.nz * 1.35; const imp = -vn; this.vx *= 0.92; this.vz *= 0.92; if (imp > 3) this.hit(imp, hitN.o); } }
    void ox; void oz; void dt;
  }
  hit(imp, o) { const now = performance.now(); if (now - this.lastHit < 250) return; this.lastHit = now; const d = Math.max(0, imp - 3) * 0.012 * (this.def.tough ? 1 / this.def.tough : 1) * this.armor; this.dmg = Math.min(1, this.dmg + d); this.spV += imp * 0.05; this.onHit && this.onHit(imp, o); }
  flyUpdate(dt, inp, opt) {
    const k = this.kind, g0 = this.groundAt(this.x, this.z, this.y), gw = Math.max(g0, k === 'seaplane' ? W.WATER_Y + 0.25 : -99), gnd = Math.max(g0, W.WATER_Y);
    const T = this.t = (this.t || 0) + dt, out = this.fuel <= 0 && !opt.noFuel;
    if (k === 'heli') {
      const up = (inp.up ? 1 : 0) - (inp.down ? 1 : 0) - (out ? 0.7 : 0), [fx, fz] = this.fwd;
      const tf = -inp.pitchIn * this.def.vmax * 0.5 + inp.thr * this.def.vmax * 0.5;
      const sp = clamp(tf, -8, this.def.vmax * 0.55);
      this.yaw += -inp.steer * 1.25 * dt;
      this.vx = damp(this.vx, fx * sp, 1.6, dt); this.vz = damp(this.vz, fz * sp, 1.6, dt); this.vy = damp(this.vy, up * 8, 2.2, dt);
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      if (this.y < gnd + 0.02) { this.y = gnd; if (this.vy < 0) this.vy = 0; this.ground = true; } else this.ground = this.y < gnd + 0.15;
      this.y = Math.min(this.y, 320);
      const fsp = this.vx * fx + this.vz * fz; this.speed = fsp; this.fpitch = damp(this.fpitch, clamp(fsp / 30, -0.2, 0.3), 3, dt); this.bank = damp(this.bank, inp.steer * 0.2 * clamp(Math.abs(fsp) / 8, 0.2, 1), 3, dt);
      this.collideAir(dt); this.rotor = (this.rotor || 0) + dt * (this.ground && !inp.up ? 8 : 26);
    } else if (k === 'balloon') {
      this.burn = inp.up && !out ? 1 : 0; this.vy = damp(this.vy, this.burn ? 3.2 : inp.down ? -3 : -0.9, 0.9, dt);
      const sp = this.def.vmax * 0.5, tx = -inp.steer * 0 , [fx, fz] = this.fwd; void tx;
      this.yaw += -inp.steer * 0.6 * dt; const f = clamp(inp.thr - inp.pitchIn, -0.5, 1) * sp; this.vx = damp(this.vx, fx * f + 0.6, 0.5, dt); this.vz = damp(this.vz, fz * f + 0.3, 0.5, dt);
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt; if (this.y < gnd) { this.y = gnd; this.vy = Math.max(0, this.vy); this.ground = true; this.vx *= 0.9; this.vz *= 0.9; } else this.ground = false;
      this.y = Math.min(this.y, 260); this.speed = Math.hypot(this.vx, this.vz); this.fpitch = 0; this.bank = Math.sin(T * 0.8) * 0.02; this.collideAir(dt);
    } else { // plane / seaplane
      const [fx, fz] = this.fwd; this.thrL = clamp((this.thrL || 0) + (inp.thr > 0.1 ? dt * 0.8 : inp.thr < -0.1 ? -dt * 0.9 : 0), 0, 1); if (out) this.thrL = 0;
      const vmax = this.def.vmax * 0.62, stall = 15; let sp = this.speed || 0;
      sp += (this.thrL * this.def.acc * 0.55 - sp * sp * 0.0009 * (this.ground ? 1.4 : 1) - Math.sin(this.fpitch) * 9) * dt; if (this.ground && inp.thr < -0.1) sp = damp(sp, 0, 1.2, dt); if (this.ground && this.thrL < 0.05) sp = damp(sp, 0, 0.3, dt);
      sp = clamp(sp, 0, vmax * 1.15); this.speed = sp;
      const lift = clamp((sp - stall * 0.7) / (stall * 0.6), 0, 1);
      if (this.ground) { this.yaw += -inp.steer * 0.9 * dt * clamp(sp / 8, 0.15, 1); const want = lift > 0.95 ? clamp(-inp.pitchIn * 0.5 + (inp.up ? 0.25 : 0), 0, 0.5) : 0; this.fpitch = damp(this.fpitch, want, 3, dt); this.bank = damp(this.bank, 0, 5, dt); }
      else { this.bank = damp(this.bank, inp.steer * 0.85, 2.6, dt); this.yaw -= Math.sin(this.bank) * 1.1 * dt * clamp(sp / 20, 0.3, 1.2); const pt = clamp(-inp.pitchIn * 0.55 + (inp.up ? 0.3 : 0) - (inp.down ? 0.3 : 0), -0.55, 0.55); this.fpitch = damp(this.fpitch, lift < 0.5 ? -0.35 : pt, lift < 0.5 ? 0.8 : 1.6, dt); }
      const cp = Math.cos(this.fpitch); this.vx = fx * sp * cp; this.vz = fz * sp * cp; let vy = Math.sin(this.fpitch) * sp; if (!this.ground) vy -= (1 - lift) * 9; this.vy = vy;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      const floor = k === 'seaplane' ? gw : gnd, onWater = g0 < W.WATER_Y - 0.1;
      if (this.y <= floor) {
        const hard = (!this.ground && (this.vy < -9 || Math.abs(this.bank) > 0.7)) || (k === 'plane' && onWater);
        this.y = floor; if (this.vy < 0) this.vy = 0;
        if (hard) { this.onCrash && this.onCrash(); this.speed *= 0.2; }
        if (!this.ground) this.onLand && this.onLand(-vy, 0);
        this.ground = true; if (this.fpitch < 0) this.fpitch = 0;
      } else if (this.y > floor + 0.4) this.ground = false;
      this.y = Math.min(this.y, 360); this.collideAir(dt); this.propA = (this.propA || 0) + dt * (6 + this.thrL * 60);
    }
    this.x = clamp(this.x, -W.WB + 30, W.WB + 600); this.z = clamp(this.z, -W.WB + 30, W.WB + 600);
    this.pitch = 0; this.roll = 0;
  }
  collideAir(dt) { const p = { x: this.x, z: this.z }, bx = p.x, bz = p.z; const h = solve(p, this.r * 0.9, this.y + 0.2, 2.5); if (h) { this.x = p.x; this.z = p.z; const sp = Math.hypot(this.vx, this.vz); if (sp > 8 && (this.kind === 'plane' || this.kind === 'seaplane')) { this.onCrash && this.onCrash(); this.speed *= 0.2; } else { this.vx *= 0.5; this.vz *= 0.5; } } void bx; void bz; void dt; }
  // copy state into the 3D model
  sync(dt) {
    const V = this.V, r = V.root; r.position.set(this.x, this.y, this.z); r.rotation.set(0, this.yaw, 0, 'YXZ');
    if (this.isAirK()) { V.body.rotation.set(-this.fpitch, 0, this.bank, 'YXZ'); V.body.position.y = 0; }
    else { V.body.rotation.set(this.pitch + this.spP - (this.wheelie || 0) * 0.9, 0, this.roll + this.spR + (this.lean || 0) * 0, 'YXZ'); V.body.position.y = this.spY + (this.wheelie || 0) * 0.15 * this.len * 0.3; if (V.lean) V.lean.rotation.z = -this.lean; }
    const vf = this.speed || 0;
    for (const w of V.wheels) { w.spin.rotation.x += vf / w.r * dt; if (w.front) w.steer.rotation.y = this.steerA * 1.0; if (!this.isAirK() && !V.lean) w.steer.position.y = w.y - (this.spY * 0.5); }
    if (V.rotor) V.rotor.rotation.y = this.rotor || 0; if (V.tailRotor) V.tailRotor.rotation.x = (this.rotor || 0) * 1.3;
    if (V.prop) V.prop.rotation.z = this.propA || 0;
    if (V.flame) V.flame.visible = !!this.burn;
    if (V.fans) for (const f of V.fans) f.rotation.z += dt * (6 + Math.abs(this.thr) * 30);
    if (V.crank) V.crank.rotation.x += vf / 0.33 * dt * 0.5;
    if (V.rider) { const st = V.pose; animPerson(V.rider, st, dt, Math.abs(vf) / 6, this.t || 0); }
  }
  setNight(n) { const V = this.V; if (V.beams) for (const b of V.beams) b.visible = n > 0.5; }
}
