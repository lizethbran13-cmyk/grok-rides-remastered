// online co-op up to 3 on GrokNet: free-roam together. Everyone drives their own ride locally and shares a
// small state packet ~10x/s; the host relays. Friends show up as their real vehicle (or walking), on the map,
// and inside the same building (home visits use the owner's decorations).
import * as THREE from 'three';
import { G } from './gfx.js';
import { makeVehicle, disposeVehicle } from './vmodels.js';
import { makePerson, animPerson } from './people.js';
import { BLD } from './layout.js';
import { ST, addActs } from './state.js';
import { S, save } from './save.js';
import { panel, closePanel, toast, $ } from './ui.js';
import { SFX } from './audio.js';
import * as IN from './interiors.js';
const GN = () => window.GrokNet;
export const NET = { room: null, peers: {} };
const esc = (s) => String(s || '').replace(/[<>&"]/g, '');
function status(t) { const m = document.getElementById('onlineMsg'); if (m) m.textContent = t; }
export function openLobby() {
  if (NET.room && NET.room.opened) return roomPanel();
  if (!GN()) { toast('Online play is not available right now', true); return; }
  const c = panel(`<h2>🤝 Play with friends</h2><div class="sub">Up to 3 drivers in the same world. One friend hosts and shares the 5-letter code.</div><input class="name" id="nmIn2" maxlength="12" placeholder="Your name" value="${esc(S.d.name)}"><div class="btnrow"><button class="btn green" id="bHost">🏠 HOST</button></div><input class="code" id="codeIn" maxlength="5" placeholder="ABCDE" autocomplete="off" autocapitalize="characters"><div class="btnrow"><button class="btn pink" id="bJoin">JOIN</button></div><div class="sub" id="onlineMsg"></div><div class="btnrow"><button class="btn gray" id="bBack">BACK</button></div>`);
  const nm = () => { const v = c.querySelector('#nmIn2').value; S.d.name = GN().cleanName ? GN().cleanName(v) : v.slice(0, 12); save(); };
  c.querySelector('#bHost').onclick = () => { nm(); bind(GN().createRoom({ role: 'host', name: S.d.name || 'Driver', color: '#3ff0ff', max: 3 })); status('Opening a room…'); };
  c.querySelector('#bJoin').onclick = () => { nm(); const code = GN().normalizeCode(c.querySelector('#codeIn').value); if (!GN().validCode(code)) return status('Codes are 5 letters, like KDXPQ'); bind(GN().createRoom({ role: 'join', code, name: S.d.name || 'Driver', color: '#ff4fd8' })); status('Joining ' + code + '…'); };
  c.querySelector('#bBack').onclick = closePanel;
}
function roomPanel() { const r = NET.room; if (!r) return; const ps = r.players(); const c = panel(`<h2>🤝 Room <span style="letter-spacing:4px;color:#7c3aed">${r.code}</span></h2><div class="sub">Friends join with code <b>${r.code}</b> (${ps.length}/3)</div>${ps.map((p) => `<div class="item"><div class="ic">${p.slot === 0 ? '👑' : '🙂'}</div><div class="grow"><b>${esc(p.name)}</b></div></div>`).join('')}<div class="btnrow"><button class="btn red small" id="bLv">LEAVE ROOM</button><button class="btn green" id="bOk">DRIVE!</button></div>`); c.querySelector('#bLv').onclick = () => { leave(); closePanel(); }; c.querySelector('#bOk').onclick = closePanel; }
function bind(room) {
  NET.room = room;
  room.on('status', status);
  room.on('open', () => { SFX.coin(); toast(room.isHost ? '🤝 Room ' + room.code + ' is open! Share the code.' : '🤝 Joined! Find your friends on the map.'); roomPanel(); });
  room.on('join', (p) => { if (p.pid !== room.pid) { toast('👋 ' + esc(p.name) + ' joined!'); SFX.coin(); } });
  room.on('leave', (p) => { toast(esc(p.name) + ' left'); drop(p.pid); });
  room.on('message', (d, from) => onMsg(d, from));
  room.on('error', (e) => { status(e.title + ': ' + e.message); toast(e.title, true); NET.room = null; for (const k in NET.peers) drop(k); });
  room.start();
}
function leave() { if (!NET.room) return; try { NET.room.leave(); } catch (e) {} NET.room = null; for (const k in NET.peers) drop(k); }
function drop(pid) { const p = NET.peers[pid]; if (!p) return; if (p.V) { G.scene.remove(p.V.root); disposeVehicle(p.V); } if (p.P) G.scene.remove(p.P.root); if (p.tag) G.scene.remove(p.tag); delete NET.peers[pid]; }
function onMsg(d, from) {
  if (!d || d.t !== 's') return; const pid = d.pid || from; if (NET.room && pid === NET.room.pid) return;
  if (NET.room && NET.room.isHost && from !== NET.room.pid) NET.room.broadcast(Object.assign({}, d, { pid }));
  let p = NET.peers[pid]; if (!p) p = NET.peers[pid] = { pid, s: d, x: d.x, y: d.y, z: d.z, yaw: d.yaw };
  p.s = d; p.last = performance.now();
  if (d.n !== p.n || JSON.stringify(d.look) !== p.lookS) { p.n = d.n; p.lookS = JSON.stringify(d.look); if (p.P) G.scene.remove(p.P.root); p.P = makePerson(d.look || {}); p.P.root.scale.setScalar(0.92); G.scene.add(p.P.root); }
  if (d.v !== p.vt || d.col !== p.col) { if (p.V) { G.scene.remove(p.V.root); disposeVehicle(p.V); } p.vt = d.v; p.col = d.col; p.V = d.v ? makeVehicle(d.v, { color: d.col, rider: d.look || {}, lite: false, noBeam: true }) : null; if (p.V) G.scene.add(p.V.root); }
}
let sendT = 0;
export function updateNet(dt) {
  const r = NET.room; if (!r || !r.opened) { $('mates').innerHTML = ''; return; }
  sendT += dt; if (sendT > 0.1) { sendT = 0; const c = ST.car, drive = ST.mode === 'drive', b = ST.inside && ST.inside.b; const pkt = { t: 's', pid: r.pid, n: S.d.name || 'Driver', look: Object.assign({}, S.d.look, { hat: S.d.hat }), v: c ? c.type : null, col: c ? (S.d.owned[c.type] || {}).color : 0, drive, x: +(drive ? c.x : ST.me.x).toFixed(2), y: +(drive ? c.y : ST.me.y).toFixed(2), z: +(drive ? c.z : ST.me.z).toFixed(2), yaw: +(drive ? c.yaw : ST.me.yaw).toFixed(3), cx: c ? +c.x.toFixed(1) : 0, cz: c ? +c.z.toFixed(1) : 0, cy: c ? +c.y.toFixed(2) : 0, cyaw: c ? +c.yaw.toFixed(2) : 0, sp: c ? +c.speed.toFixed(1) : 0, mv: ST.me.moving > 0.1 ? 1 : 0, in: b ? b.id : '', home: b && b.home && S.d.homes[b.id] ? S.d.homes[b.id] : null };
    if (r.isHost) r.broadcast(pkt); else r.send(pkt); }
  const myIn = ST.inside ? ST.inside.b.id : ''; const names = [];
  for (const k in NET.peers) { const p = NET.peers[k], s = p.s; if (performance.now() - p.last > 8000) { drop(k); continue; } names.push(esc(s.n));
    const same = (s.in || '') === myIn; const kx = s.drive ? s.cx : s.x;
    p.x += (s.x - p.x) * Math.min(1, dt * 10); p.z += (s.z - p.z) * Math.min(1, dt * 10); p.y += (s.y - p.y) * Math.min(1, dt * 10); let dy = s.yaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * Math.min(1, dt * 10); void kx;
    if (p.V) { p.V.root.visible = !myIn && !s.in; if (s.drive) { p.V.root.position.set(p.x, p.y, p.z); p.V.root.rotation.y = p.yaw; } else { p.V.root.position.set(s.cx, s.cy, s.cz); p.V.root.rotation.y = s.cyaw; } if (p.V.rider) { p.V.rider.root.visible = s.drive; animPerson(p.V.rider, p.V.pose, dt, Math.abs(s.sp) / 6, ST.t); } for (const w of p.V.wheels) w.spin.rotation.x += (s.drive ? s.sp : 0) / w.r * dt; }
    if (p.P) { p.P.root.visible = !s.drive && same; p.P.root.position.set(p.x, p.y, p.z); p.P.root.rotation.y = p.yaw; animPerson(p.P, s.mv ? 'walk' : 'idle', dt, 1, ST.t); }
  }
  $('mates').innerHTML = names.map((n) => `<div class="mate">🤝 ${n}</div>`).join('');
}
// visit a friend's home: if they're inside a home you don't own, its door lets you in
export function initNet() {
  addActs((x, z, mode) => { if (mode !== 'foot' || ST.inside) return null; for (const k in NET.peers) { const s = NET.peers[k].s; if (!s.in || !s.home) continue; const b = BLD.find((q) => q.id === s.in); if (!b || S.d.homes[b.id]) continue; const d = Math.hypot(b.door.x - x, b.door.z - z); if (d < 2.6) return [{ label: '🚪 Visit ' + esc(s.n) + '\'s home', d, pri: 3, fn: () => IN.enter(b, s.home) }]; } return null; });
}
export function mapIcons(out) { for (const k in NET.peers) { const p = NET.peers[k]; out.push({ x: p.x, z: p.z, dot: '#ec4899', edge: true }); } }
