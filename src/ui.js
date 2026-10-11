// HUD helpers: toasts, big text, panels, minimap + big map (pre-rendered from the real world data)
import * as W from './world.js';
import { BLD, PLACES } from './layout.js';
import { SFX } from './audio.js';
export const $ = (id) => document.getElementById(id);
export function toast(msg, bad, ms = 2600) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.innerHTML = msg; const box = $('toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, ms); }
let bigT = 0; export function bigText(s, ms = 1400) { const b = $('bigText'); b.innerHTML = s; b.classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => b.classList.remove('on'), ms); }
export const UI = { open: null, onClose: null };
export function panel(html, onClose) { const p = $('pnl'), c = $('pnlCard'); c.innerHTML = html; c.scrollTop = 0; p.classList.remove('hidden'); UI.open = true; UI.onClose = onClose || null; return c; }
export function closePanel() { $('pnl').classList.add('hidden'); UI.open = false; const f = UI.onClose; UI.onClose = null; f && f(); }
export function fade(on) { $('fade').classList.toggle('on', on); }
// wire every [data-a] inside the open panel to handlers[name](value)
export function wire(c, H) { c.querySelectorAll('[data-a]').forEach((el) => { const go = (e) => { e.preventDefault(); e.stopPropagation(); if (el.disabled) return; SFX.click(); const fn = H[el.dataset.a]; fn && fn(el.dataset.v, el); }; el.addEventListener('click', go); }); }
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
/* ---------------- maps ---------------- */
const MS = 600, SC = (W.WB * 2) / MS; let base = null;
const SURFC = ['#7cc95a', '#5b6170', '#f2d39a', '#eef5fb', '#b08a5a', '#38a8ee', '#f6e2ac', '#cfd5dd', '#4b5160', '#bfe7ff', '#d6d3d1', '#8b8f94'];
export function buildMapBase() {
  base = document.createElement('canvas'); base.width = base.height = MS; const x = base.getContext('2d'), img = x.createImageData(MS, MS), d = img.data;
  const rgb = SURFC.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let j = 0; j < MS; j++) for (let i = 0; i < MS; i++) { const wx = -W.WB + (i + 0.5) * SC, wz = -W.WB + (j + 0.5) * SC; let s = W.surfAt(wx, wz); const h = W.heightAt(wx, wz); let c = rgb[s] || rgb[0]; if (h < W.WATER_Y - 0.2 && s !== 1) c = rgb[5]; const sh = s === 0 || s === 4 || s === 3 || s === 11 ? Math.max(0.75, Math.min(1.15, 0.85 + h / 400)) : 1; const k = (j * MS + i) * 4; d[k] = c[0] * sh; d[k + 1] = c[1] * sh; d[k + 2] = c[2] * sh; d[k + 3] = 255; }
  x.putImageData(img, 0, 0);
  x.strokeStyle = '#ffffff'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const e of W.EDGES) { x.lineWidth = Math.max(2, e.w / SC); x.strokeStyle = e.kind === 'hwy' ? '#fde68a' : '#f8fafc'; x.beginPath(); e.pts.forEach((p, i) => { const u = (p[0] + W.WB) / SC, v = (p[1] + W.WB) / SC; i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.stroke(); }
  x.fillStyle = 'rgba(71,85,105,.85)'; for (const b of BLD) x.fillRect((b.x0 + W.WB) / SC, (b.z0 + W.WB) / SC, Math.max(1, (b.x1 - b.x0) / SC), Math.max(1, (b.z1 - b.z0) / SC));
  return base;
}
export const toMap = (wx, wz, S = MS) => [(wx + W.WB) / (W.WB * 2) * S, (wz + W.WB) / (W.WB * 2) * S];
export function drawMini(cv, px, pz, heading, icons, routePts, scale = 1) {
  const x = cv.getContext('2d'), R = cv.width / 2, span = 260 * scale; // metres across
  x.save(); x.clearRect(0, 0, cv.width, cv.height); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip();
  x.fillStyle = '#38a8ee'; x.fillRect(0, 0, cv.width, cv.height);
  x.translate(R, R); x.rotate(Math.PI + heading); const k = cv.width / span; x.scale(k, k);
  const [mu, mv] = toMap(px, pz); x.drawImage(base, -mu * SC, -mv * SC, MS * SC, MS * SC);
  if (routePts && routePts.length > 1) { x.strokeStyle = '#a855f7'; x.lineWidth = 6 / k * 0.9; x.lineCap = 'round'; x.beginPath(); routePts.forEach((p, i) => { const u = p[0] - px, v = p[1] - pz; i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.stroke(); }
  x.restore(); x.save(); x.translate(R, R);
  for (const ic of icons) { let u = ic.x - px, v = ic.z - pz; const c = Math.cos(-(Math.PI + heading)), s = Math.sin(-(Math.PI + heading)); let ru = (u * Math.cos(Math.PI + heading) - v * Math.sin(Math.PI + heading)) * k, rv = (u * Math.sin(Math.PI + heading) + v * Math.cos(Math.PI + heading)) * k; void c; void s; const L = Math.hypot(ru, rv); if (L > R - 10) { if (!ic.edge) continue; ru *= (R - 10) / L; rv *= (R - 10) / L; } x.font = (ic.big ? 20 : 15) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; if (ic.dot) { x.fillStyle = ic.dot; x.beginPath(); x.arc(ru, rv, 5, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); } else x.fillText(ic.e, ru, rv); }
  // player arrow (always up)
  x.fillStyle = '#ffffff'; x.strokeStyle = '#1f2a44'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 8); x.lineTo(0, 4); x.lineTo(-8, 8); x.closePath(); x.fill(); x.stroke();
  x.restore();
}
export function drawBig(cv, px, pz, heading, icons, routePts) {
  const x = cv.getContext('2d'), S = cv.width; x.clearRect(0, 0, S, S); x.drawImage(base, 0, 0, S, S);
  if (routePts && routePts.length > 1) { x.strokeStyle = '#a855f7'; x.lineWidth = 4; x.beginPath(); routePts.forEach((p, i) => { const [u, v] = toMap(p[0], p[1], S); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const ic of icons) { const [u, v] = toMap(ic.x, ic.z, S); if (ic.dot) { x.fillStyle = ic.dot; x.beginPath(); x.arc(u, v, 6, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); } else { x.font = (ic.big ? 24 : 18) + 'px sans-serif'; x.fillText(ic.e, u, v); } }
  x.font = 'bold 15px sans-serif'; x.fillStyle = 'rgba(31,42,68,.85)'; x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4;
  for (const [n, wx, wz] of [['GROK CITY', 620, -330], ['PINE HOLLOW', -500, 250], ['SUNNY SHORES', 930, 820], ['SPARKLE LAKE', -50, 250], ['SKY FIELD', 1240, 340], ['MOUNT GROKMORE', -820, -560], ['FROSTBITE TUNDRA', 450, -1180], ['SIZZLE DESERT', 0, 1200]]) { const [u, v] = toMap(wx, wz, S); x.strokeText(n, u, v); x.fillText(n, u, v); }
  const [u, v] = toMap(px, pz, S); x.save(); x.translate(u, v); x.rotate(Math.PI - heading); x.fillStyle = '#fff'; x.strokeStyle = '#1f2a44'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -13); x.lineTo(9, 9); x.lineTo(0, 5); x.lineTo(-9, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
}
export { PLACES };
