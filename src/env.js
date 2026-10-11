// day/night cycle + dynamic weather (rain streaks, puddles, wet shiny roads, lightning)
import * as THREE from 'three';
import { G } from './gfx.js';
import { NIGHT } from './build3d.js';
import { MAT } from './scenery.js';
import { ENV } from './vehicle.js';
import * as W from './world.js';
import { SFX, ambience } from './audio.js';
export const SKY = { tod: 0.36, day: 1, rain: 0, rainT: 0, want: 0, wet: 0, night: 0, wx: 'clear', wxT: 140, frozen: false, DAY: 900 };
const C = (h) => new THREE.Color(h);
const PAL = {
  day: { top: C(0x1ea7ff), hor: C(0xc4f1ff), fog: C(0xb9e6fb), sun: C(0xfff4dc), gnd: C(0x9fd27a) },
  desert: { top: C(0x2b9bff), hor: C(0xffe9c2), fog: C(0xf6dfbd), sun: C(0xfff0d0), gnd: C(0xe8c690) },
  snow: { top: C(0x4aa6ff), hor: C(0xe6f6ff), fog: C(0xdcedfb), sun: C(0xfff8ea), gnd: C(0xdbe7f3) },
  dusk: { top: C(0x5b4bd6), hor: C(0xffa77a), fog: C(0xf3a888), sun: C(0xffb877), gnd: C(0xb08a7a) },
  night: { top: C(0x0a1238), hor: C(0x24346e), fog: C(0x1c2850), sun: C(0x9fb4ff), gnd: C(0x2a3550) },
  rain: { top: C(0x4b5d86), hor: C(0x9aabc6), fog: C(0x8d9db8), sun: C(0xd6e2ff), gnd: C(0x6f8a7a) }
};
const t1 = new THREE.Color(), t2 = new THREE.Color(), t3 = new THREE.Color(), t4 = new THREE.Color(), t5 = new THREE.Color();
let rainMesh = null, puddles = null, roadCol0 = null; const lastReg = { k: 'day', w: 0 };
function mix(out, key, wR, wD, wN, wW, base) { out.copy(PAL[base][key]); out.lerp(PAL.dusk[key], wD); out.lerp(PAL.night[key], wN); out.lerp(PAL.rain[key], wW * (1 - wN * 0.6)); return out; }
export function initEnv() {
  // rain: 2400 thin streak segments in a box that follows the camera; the shader wraps them so nothing is re-uploaded
  const n = 2400, pos = new Float32Array(n * 6), seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 70, y = Math.random() * 40, z = (Math.random() - 0.5) * 70; pos.set([x, y, z, x - 0.05, y + 0.9, z + 0.03], i * 6); seed[i * 2] = seed[i * 2 + 1] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sd', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uA: { value: 0 } },
    vertexShader: 'uniform float uT; uniform vec3 uC; attribute float sd; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y - uT * (24.0 + sd * 8.0), 40.0); p.x = mod(p.x - uC.x + 35.0, 70.0) - 35.0 + uC.x; p.z = mod(p.z - uC.z + 35.0, 70.0) - 35.0 + uC.z; p.y += uC.y - 14.0; vA = 0.5 + sd * 0.5; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform float uA; varying float vA; void main(){ gl_FragColor = vec4(0.82, 0.9, 1.0, uA * vA * 0.55); }' });
  rainMesh = new THREE.LineSegments(g, m); rainMesh.frustumCulled = false; rainMesh.visible = false; rainMesh.renderOrder = 5; G.scene.add(rainMesh);
  // puddles: real shallow discs (instanced, glossy) scattered on the road shoulders near the player
  const pg = new THREE.CylinderGeometry(1, 1, 0.02, 20); const pm = new THREE.MeshPhysicalMaterial({ color: 0x3b4a66, roughness: 0.02, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  puddles = new THREE.InstancedMesh(pg, pm, 90); puddles.count = 0; puddles.castShadow = false; puddles.receiveShadow = false; puddles.frustumCulled = false; G.scene.add(puddles); puddles.lastAt = null;
  if (MAT.road) roadCol0 = MAT.road.color.clone();
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function placePuddles(x, z) {
  let n = 0; let sd = Math.floor(x / 40) * 7 + Math.floor(z / 40) * 13;
  const r = () => { sd = (sd * 16807 + 11) % 2147483647; return (sd & 0xffff) / 65536; };
  for (let k = 0; k < 400 && n < 90; k++) { const px = x + (r() - 0.5) * 220, pz = z + (r() - 0.5) * 220, e = W.roadEdge(px, pz); if (W.surfAt(px, pz) !== W.S_ROAD || e > -1.2) continue; const s = 0.9 + r() * 1.8; _v.set(px, W.heightAt(px, pz) + 0.035, pz); _q.setFromAxisAngle(_s.set(0, 1, 0), r() * 6); _s.set(s * (1 + r() * 0.8), 1, s); _m.compose(_v, _q, _s); puddles.setMatrixAt(n++, _m); }
  puddles.count = n; puddles.instanceMatrix.needsUpdate = true; puddles.lastAt = [x, z];
}
export function setWeather(w) { SKY.wx = w; SKY.want = w === 'rain' ? 1 : w === 'storm' ? 1 : w === 'cloudy' ? 0.35 : 0; SKY.wxT = 160 + Math.random() * 200; }
let flashT = 0;
export function updateEnv(dt, cam, regKey, inside) {
  if (!SKY.frozen) SKY.tod = (SKY.tod + dt / SKY.DAY) % 1;
  SKY.wxT -= dt; if (SKY.wxT <= 0 && !SKY.lock) { const r = Math.random(); setWeather(SKY.wx === 'clear' ? (r < 0.5 ? 'cloudy' : 'clear') : SKY.wx === 'cloudy' ? (r < 0.6 ? 'rain' : 'clear') : SKY.wx === 'rain' ? (r < 0.25 ? 'storm' : 'cloudy') : 'rain'); }
  SKY.rain += (SKY.want - SKY.rain) * Math.min(1, dt * 0.15);
  const raining = SKY.rain > 0.55 && (SKY.wx === 'rain' || SKY.wx === 'storm');
  SKY.wet = Math.max(0, Math.min(1, SKY.wet + (raining ? dt * 0.05 : -dt * 0.012)));
  ENV.wet = SKY.wet;
  const ang = (SKY.tod - 0.25) * Math.PI * 2, elev = Math.sin(ang) * 72; // degrees
  const nN = Math.max(0, Math.min(1, (-elev + 3) / 12)), nD = Math.max(0, Math.min(1, 1 - Math.abs(elev - 4) / 16)) * (1 - nN);
  SKY.night = nN;
  const base = regKey === 'desert' ? 'desert' : regKey === 'snow' ? 'snow' : 'day', wW = Math.min(1, SKY.rain);
  const m = G.moodT || (G.moodT = {});
  m.top = mix(t1, 'top', 0, nD, nN, wW, base).getHex(); m.hor = mix(t2, 'hor', 0, nD, nN, wW, base).getHex(); m.fog = mix(t3, 'fog', 0, nD, nN, wW, base).getHex(); m.sunCol = mix(t4, 'sun', 0, nD, nN, wW, base).getHex(); m.gnd = mix(t5, 'gnd', 0, nD, nN, wW, base).getHex();
  m.elev = nN > 0.5 ? 38 : Math.max(8, Math.abs(elev)); m.azim = nN > 0.5 ? 210 : 100 + SKY.tod * 220;
  m.sunI = (2.4 * (1 - nD * 0.25) * (1 - wW * 0.5)) * (1 - nN) + 0.32 * nN; m.hemiI = (1.05 - wW * 0.1) * (1 - nN) + 0.5 * nN;
  m.fogNear = (inside ? 400 : 230 - wW * 120); m.fogFar = (inside ? 900 : 680 - wW * 300) * (1 - nN * 0.15); m.exp = 1.0 + nN * 0.12; m.env = 0.45 * (1 - nN * 0.55);
  m.bloomT = base === 'snow' ? 2.2 : 0.95; m.bloomS = base === 'snow' ? 0.14 : 0.28 + nN * 0.12;
  if (inside) { m.sunI = 1.25; m.hemiI = 0.8; m.exp = 0.95; m.env = 0.5; m.bloomS = 0.2; }
  if (!G.mood) G.mood = Object.assign({}, m);
  // night: windows, lamps, neon
  for (const k in NIGHT) { const mt = NIGHT[k], ni = mt.userData.night; mt.emissiveIntensity = (k.startsWith('neon') ? 0.25 : 0) + ni * nN * (k === 'glassDark' ? 1 : 1); }
  // wet roads: darker + glossy
  if (MAT.road && roadCol0) { MAT.road.color.copy(roadCol0).multiplyScalar(1 - SKY.wet * 0.38); MAT.road.roughness = 0.82 - SKY.wet * 0.62; MAT.road.metalness = SKY.wet * 0.15; if (MAT.junc) { MAT.junc.color.copy(MAT.road.color); MAT.junc.roughness = MAT.road.roughness; MAT.junc.metalness = MAT.road.metalness; } }
  // rain streaks (snowy regions get slow white flakes via the same streaks, just shorter + slower)
  const ra = inside ? 0 : Math.max(0, (SKY.rain - 0.5) * 2);
  rainMesh.visible = ra > 0.02; if (rainMesh.visible) { const u = rainMesh.material.uniforms; u.uT.value += dt * (regKey === 'snow' ? 0.18 : 1); u.uC.value.copy(cam.position); u.uA.value = ra; }
  // puddles fade in as the road gets wet
  puddles.visible = SKY.wet > 0.05 && !inside; if (puddles.visible) { puddles.material.opacity = Math.min(0.75, SKY.wet * 0.9); if (!puddles.lastAt || Math.hypot(puddles.lastAt[0] - cam.position.x, puddles.lastAt[1] - cam.position.z) > 70) placePuddles(cam.position.x, cam.position.z); }
  // storm lightning
  if (SKY.wx === 'storm' && SKY.rain > 0.8 && !inside) { flashT -= dt; if (flashT < 0) { flashT = 8 + Math.random() * 14; G.flash.position.set(cam.position.x + 60, cam.position.y + 120, cam.position.z - 40); G.flash.intensity = 60; setTimeout(() => SFX.thunder(), 500 + Math.random() * 900); } }
  ambience('rain', inside ? 0.03 * ra : 0.22 * ra);
}
export function clockStr() { const h = Math.floor(SKY.tod * 24), mm = Math.floor((SKY.tod * 24 - h) * 60 / 15) * 15, h12 = ((h + 11) % 12) + 1; return (SKY.night > 0.5 ? '🌙 ' : SKY.rain > 0.55 ? '🌧️ ' : SKY.rain > 0.25 ? '⛅ ' : '☀️ ') + h12 + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); }
