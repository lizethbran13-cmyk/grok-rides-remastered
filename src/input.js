// touch controls: floating STEER joystick (left), pedal buttons (right), camera drag on the open screen; keyboard too
export const I = { steer: 0, pitchIn: 0, jx: 0, jy: 0, gas: false, brake: false, hand: false, nitro: false, up: false, down: false, horn: false, actQ: false, walkQ: false, mapQ: false, jumpQ: false, camDX: 0, camDY: 0, camT: 9, zoom: 1, keys: {}, enabled: false, touch: 'ontouchstart' in window };
let joyId = null, joyO = null, camId = null, camP = null, pinch = null; const touches = new Map();
const $ = (id) => document.getElementById(id);
function isUI(t) { return t && t.closest && t.closest('button, .panel, .card, input, .noTouch, #minimap, #bigmap'); }
function showJoy(x, y, dx, dy) { const j = $('joy'); if (!j) return; j.style.display = 'block'; j.style.left = (x - 60) + 'px'; j.style.top = (y - 60) + 'px'; j.firstChild.style.transform = `translate(${dx}px,${dy}px)`; }
function release() { joyId = null; joyO = null; I.jx = I.jy = 0; const j = $('joy'); if (j) j.style.display = 'none'; }
function still(list, id) { for (const t of list) if (t.identifier === id) return true; return false; }
function sweep(e) { if (joyId !== null && e.touches && !still(e.touches, joyId)) release(); if (camId !== null && e.touches && !still(e.touches, camId)) camId = null; for (const id of [...touches.keys()]) if (e.touches && !still(e.touches, id)) touches.delete(id); if (touches.size < 2) pinch = null; }
export function initInput() {
  const opt = { passive: false };
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) release(); if (t.identifier === camId) camId = null; touches.delete(t.identifier); } sweep(e); };
  const move = (e) => {
    if (e._rr) return; e._rr = 1; if (!I.enabled) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { e.preventDefault(); let dx = t.clientX - joyO.x, dy = t.clientY - joyO.y; const L = Math.hypot(dx, dy), R = 55; if (L > R) { dx *= R / L; dy *= R / L; } I.jx = dx / R; I.jy = dy / R; showJoy(joyO.x, joyO.y, dx, dy); continue; }
      const p = touches.get(t.identifier); if (!p) continue; e.preventDefault();
      if (touches.size === 1) { I.camDX += (t.clientX - p.x) * 0.008; I.camDY += (t.clientY - p.y) * 0.005; I.camT = 0; }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (touches.size >= 2 && pinch) { const a = [...touches.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); I.zoom = Math.max(0.6, Math.min(1.8, pinch.z * pinch.d / Math.max(20, d))); }
  };
  window.addEventListener('touchstart', (e) => {
    sweep(e); if (!I.enabled) return;
    for (const t of e.changedTouches) {
      if (isUI(t.target)) continue; e.preventDefault();
      if (t.clientX < innerWidth * 0.48 && t.clientY > innerHeight * 0.3 && joyId === null) { joyId = t.identifier; joyO = { x: t.clientX, y: t.clientY }; showJoy(t.clientX, t.clientY, 0, 0); const tg = t.target; if (tg && tg.addEventListener && !tg._rrEnd) { tg._rrEnd = 1; tg.addEventListener('touchend', end); tg.addEventListener('touchcancel', end); tg.addEventListener('touchmove', move, opt); } }
      else touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (touches.size >= 2) { const a = [...touches.values()]; pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: I.zoom }; }
  }, opt);
  window.addEventListener('touchmove', move, opt); window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
  const relAll = () => { release(); touches.clear(); camId = null; pinch = null; for (const k of ['gas', 'brake', 'hand', 'nitro', 'up', 'down', 'horn']) I[k] = false; document.querySelectorAll('.held').forEach((b) => b.classList.remove('held')); };
  window.addEventListener('blur', relAll); document.addEventListener('visibilitychange', () => { if (document.hidden) relAll(); });
  I.releaseAll = relAll;
  // mouse camera drag + wheel zoom
  let drag = null;
  window.addEventListener('mousedown', (e) => { if (!I.enabled || isUI(e.target)) return; drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mousemove', (e) => { if (!drag) return; I.camDX += (e.clientX - drag.x) * 0.006; I.camDY += (e.clientY - drag.y) * 0.004; I.camT = 0; drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => drag = null);
  window.addEventListener('wheel', (e) => { if (!I.enabled) return; I.zoom = Math.max(0.6, Math.min(1.8, I.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });
  window.addEventListener('keydown', (e) => { if (e.target && e.target.tagName === 'INPUT') return; I.keys[e.code] = true; if (e.code === 'KeyE') I.actQ = true; if (e.code === 'KeyG') I.walkQ = true; if (e.code === 'KeyM') I.mapQ = true; if (e.code === 'Space') { I.jumpQ = true; e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
}
// hold-buttons: <button data-hold="gas">
export function bindHold(el, key) {
  const on = (e) => { e.preventDefault(); e.stopPropagation(); I[key] = true; el.classList.add('held'); if (key === 'gas' || key === 'brake') I.lastPedal = performance.now(); }, off = (e) => { e && e.preventDefault(); I[key] = false; el.classList.remove('held'); };
  el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
  el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
}
export function bindTap(el, fn) { let t = 0; const go = (e) => { e.preventDefault(); e.stopPropagation(); const n = performance.now(); if (n - t < 250) return; t = n; fn(); }; el.addEventListener('touchstart', go, { passive: false }); el.addEventListener('click', go); }
export function readDrive() {
  const k = I.keys; let steer = I.jx, py = I.jy;
  if (k.KeyA || k.ArrowLeft) steer = -1; if (k.KeyD || k.ArrowRight) steer = 1;
  const gas = I.gas || k.KeyW || k.ArrowUp, brake = I.brake || k.KeyS || k.ArrowDown;
  if (k.KeyW || k.ArrowUp) py = Math.min(py, -0.0); 
  return { thr: (gas ? 1 : 0) - (brake ? 1 : 0), steer: Math.max(-1, Math.min(1, steer)), pitchIn: py, hand: I.hand || k.Space, nitro: I.nitro || k.ShiftLeft || k.ShiftRight, up: I.up || k.KeyR, down: I.down || k.KeyF, wheelie: I.hand || k.Space, active: true };
}
export function readWalk() { let x = I.jx, z = I.jy; const k = I.keys; if (k.KeyW || k.ArrowUp) z = -1; if (k.KeyS || k.ArrowDown) z = 1; if (k.KeyA || k.ArrowLeft) x = -1; if (k.KeyD || k.ArrowRight) x = 1; const L = Math.hypot(x, z); if (L > 1) { x /= L; z /= L; } return { x, z }; }
