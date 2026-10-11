// every shop / service panel: dealers, garage (repair, paint, finish, rims, upgrades), food, hats, homes, decorate, wardrobe ...
import { VEH, VEH_ORDER, DEALERS, PAINTS, FINISH, RIMS, UPG, SNACKS, BUFFNAME, HATS, HOMES, FURN, WALLS, FLOORS } from './data.js';
import { S, save, fmt } from './save.js';
import { ST } from './state.js';
import { panel, closePanel, wire, toast, bigText, hex, fade } from './ui.js';
import { SFX } from './audio.js';
import { SKY, setWeather } from './env.js';
import { PLACES } from './layout.js';
import * as IN from './interiors.js';
import { clearWanted } from './traffic.js';
const money = () => S.d.money;
function pay(n) { if (S.d.money < n) { toast('Not enough cash! Try a job 💼', true); SFX.hurt(); return false; } S.d.money -= n; SFX.cash(); save(); return true; }
export function earn(n, why) { n = Math.round(n * (buffOn('pay') ? 1.1 : 1)); S.d.money += n; SFX.cash(); save(); toast('💵 +' + fmt(n) + (why ? ' · ' + why : '')); return n; }
export function buffOn(k) { const t = S.d.buffs[k]; return t && t > Date.now(); }
const head = (t, sub) => `<h2>${t}</h2><div class="sub">💵 ${fmt(money())}${sub ? ' · ' + sub : ''}</div>`;
const close = '<div class="btnrow"><button class="btn gray" data-a="close">CLOSE</button></div>';
/* ---------------- dealers ---------------- */
export function dealer(id) {
  const D = DEALERS[id] || DEALERS.motors;
  const rows = D.list.map((t) => { const v = VEH[t], own = !!S.d.owned[t]; return `<div class="item ${own ? 'on' : ''}"><div class="ic">${v.icon}</div><div class="grow"><b>${v.name}${v.isNew ? '<span class="tag2">NEW</span>' : ''}</b><small>${v.desc}</small><small>⚡ ${Math.round(v.vmax * 1.23)} mph top</small></div>${own ? `<button class="btn green small" data-a="drive" data-v="${t}">DRIVE</button>` : `<button class="btn ${money() >= v.price ? 'gold' : 'gray'} small" data-a="buy" data-v="${t}">${fmt(v.price)}</button>`}</div>`; }).join('');
  const c = panel(head(D.name, 'tap a ride to buy it') + rows + close);
  wire(c, { close: closePanel, buy: (t) => { if (!pay(VEH[t].price)) return; S.d.owned[t] = { color: VEH[t].col, finish: 'gloss', rim: 'std', upg: {} }; save(true); bigText(VEH[t].icon + ' NEW RIDE!'); toast('You bought the ' + VEH[t].name + '! It\'s parked outside.'); takeOut(t); }, drive: (t) => takeOut(t) });
}
// take a vehicle out next to the player (leaving a room if needed)
export function takeOut(t, at) {
  closePanel(); const from = IN.inRoom() ? IN.inRoom().b : null;
  const go = () => { const bx = at ? at.x : from ? from.door.x + from.fx * 6 : ST.me.x, bz = at ? at.z : from ? from.door.z + from.fz * 6 : ST.me.z; const [x, z, yaw] = ST.spotFor(t, bx, bz); S.d.cur = t; save(); ST.spawnCar(t, x, z, yaw); ST.me.x = x; ST.me.z = z; ST.getIn(); ST.refreshPads(); const far = Math.hypot(x - bx, z - bz); if (far > 60) toast(VEH[t].icon + ' Your ' + VEH[t].name + ' is waiting at ' + (VEH[t].kind === 'plane' ? 'Sky Field' : 'the docks') + '!'); };
  if (from) { IN.leave(true); go(); } else go();
}
export function callRide() {
  const rows = VEH_ORDER.filter((t) => S.d.owned[t]).map((t) => `<div class="item ${ST.car && ST.car.type === t ? 'on' : ''}"><div class="ic">${VEH[t].icon}</div><div class="grow"><b>${VEH[t].name}</b><small>${VEH[t].kind === 'boat' ? 'Shows up at the nearest dock' : VEH[t].kind === 'plane' ? 'Waits on the Sky Field runway' : 'Delivered right next to you'}</small></div><button class="btn green small" data-a="go" data-v="${t}">GO</button></div>`).join('');
  const c = panel('<h2>📲 My rides</h2>' + rows + close); wire(c, { close: closePanel, go: (t) => { if (ST.inside) { toast('Head outside first! 🚪', true); return; } takeOut(t, { x: ST.mode === 'drive' ? ST.car.x : ST.me.x, z: ST.mode === 'drive' ? ST.car.z : ST.me.z }); } });
}
/* ---------------- garage ---------------- */
export function garage(tab = 'fix') {
  const c0 = ST.car; if (!c0) return; const t = c0.type, o = S.d.owned[t] || (S.d.owned[t] = { color: VEH[t].col, finish: 'gloss', rim: 'std', upg: {} }), v = VEH[t];
  const tabs = ['fix', 'paint', 'rims', 'upg'].map((k) => `<button class="btn ${tab === k ? 'purple' : 'gray'} small" data-a="tab" data-v="${k}">${{ fix: '🔧 Fix', paint: '🎨 Paint', rims: '🛞 Rims', upg: '⚙️ Parts' }[k]}</button>`).join('');
  let body = '';
  const fixCost = Math.round(c0.dmg * 400), fuelCost = Math.round((1 - c0.fuel) * 60);
  if (tab === 'fix') body = `<div class="item"><div class="ic">🔧</div><div class="grow"><b>Repair</b><small>Damage ${Math.round(c0.dmg * 100)}%</small></div><button class="btn gold small" data-a="fix" ${fixCost ? '' : 'disabled'}>${fixCost ? fmt(fixCost) : 'OK'}</button></div><div class="item"><div class="ic">⛽</div><div class="grow"><b>Fill the tank</b><small>Fuel ${Math.round(c0.fuel * 100)}%</small></div><button class="btn gold small" data-a="fuel" ${fuelCost ? '' : 'disabled'}>${fuelCost ? fmt(fuelCost) : 'FULL'}</button></div>`;
  if (tab === 'paint') body = `<h3>Color ($100)</h3><div class="grid">${PAINTS.map((p) => `<span class="sw ${o.color === p ? 'on' : ''}" style="background:${hex(p)}" data-a="col" data-v="${p}"></span>`).join('')}</div><h3>Finish</h3>${Object.entries(FINISH).map(([k, f]) => `<div class="item ${o.finish === k ? 'on' : ''}"><div class="grow"><b>${f.name}</b></div><button class="btn small ${o.finish === k ? 'green' : 'gold'}" data-a="fin" data-v="${k}">${o.finish === k ? 'ON' : fmt(f.price || 150)}</button></div>`).join('')}`;
  if (tab === 'rims') body = c0.V.wheels.length ? Object.entries(RIMS).map(([k, r]) => `<div class="item ${o.rim === k ? 'on' : ''}"><div class="ic">🛞</div><div class="grow"><b>${r.name}</b></div><button class="btn small ${o.rim === k ? 'green' : 'gold'}" data-a="rim" data-v="${k}">${o.rim === k ? 'ON' : r.price ? fmt(r.price) : 'FREE'}</button></div>`).join('') : '<div class="sub">This ride has no wheels to change! 😄</div>';
  if (tab === 'upg') body = Object.entries(UPG).map(([k, u]) => { const lv = o.upg[k] || 0, max = lv >= u.max; return `<div class="item"><div class="ic">${u.icon}</div><div class="grow"><b>${u.name} ${'●'.repeat(lv)}${'○'.repeat(u.max - lv)}</b><small>${u.desc}</small></div><button class="btn small ${max ? 'green' : 'gold'}" data-a="upg" data-v="${k}" ${max ? 'disabled' : ''}>${max ? 'MAX' : fmt(u.cost[lv])}</button></div>`; }).join('');
  const c = panel(head('🔧 Garage', v.icon + ' ' + v.name) + `<div class="btnrow">${tabs}</div>` + body + close);
  const apply = () => { save(true); ST.rebuildCar(); garage(tab); };
  wire(c, { close: closePanel, tab: (k) => garage(k), fix: () => { if (pay(fixCost)) { ST.car.dmg = 0; ST.car.wrecked = false; toast('✨ Good as new!'); garage(tab); } }, fuel: () => { if (pay(fuelCost)) { ST.car.fuel = 1; garage(tab); } },
    col: (p) => { if (pay(100)) { o.color = +p; apply(); } }, fin: (k) => { if (o.finish === k) return; if (pay(FINISH[k].price || 150)) { o.finish = k; apply(); } }, rim: (k) => { if (o.rim === k) return; if (pay(RIMS[k].price)) { o.rim = k; apply(); } },
    upg: (k) => { const lv = o.upg[k] || 0; if (pay(UPG[k].cost[lv])) { o.upg[k] = lv + 1; if (k === 'nitro') toast('🔥 NITRO button unlocked!'); apply(); } } });
}
/* ---------------- food & buffs ---------------- */
export function food(b) {
  const menu = (b.place && b.place.menu) || ['soda', 'candy']; const rows = menu.map((k) => { const s = SNACKS[k]; return `<div class="item"><div class="ic">${s.icon}</div><div class="grow"><b>${s.name}</b><small>${s.desc} · ${Math.round(s.secs / 60)} min</small></div><button class="btn gold small" data-a="buy" data-v="${k}">${s.price ? fmt(s.price) : 'FREE'}</button></div>`; }).join('');
  const c = panel(head('🍽️ ' + (b.name || 'Menu'), activeBuffs()) + rows + (b.place && b.place.kind === 'store' ? '<div class="btnrow"><button class="btn purple small" data-a="hats">🧢 Hats</button></div>' : '') + close);
  wire(c, { close: closePanel, hats: hats, buy: (k) => { const s = SNACKS[k]; if (!pay(s.price)) return; S.d.buffs[s.buff] = Date.now() + s.secs * 1000; save(); toast(s.icon + ' Yum! ' + BUFFNAME[s.buff] + ' boost'); food(b); } });
}
function activeBuffs() { const l = Object.keys(S.d.buffs).filter(buffOn).map((k) => BUFFNAME[k]); return l.length ? l.join(' ') : 'no boosts yet'; }
export function fridgeSnack() { S.d.buffs.grip = Date.now() + 120000; save(); toast('🍪 Grandma\'s cookie! +8% grip'); SFX.coin(); }
export function hats() {
  const rows = Object.entries(HATS).map(([k, h]) => { const own = S.d.hats[k], on = S.d.hat === k; return `<div class="item ${on ? 'on' : ''}"><div class="ic">${h.icon}</div><div class="grow"><b>${h.name}</b></div><button class="btn small ${on ? 'green' : own ? 'blue' : 'gold'}" data-a="h" data-v="${k}">${on ? 'TAKE OFF' : own ? 'WEAR' : fmt(h.price)}</button></div>`; }).join('');
  const c = panel(head('🧢 Hats') + rows + close);
  wire(c, { close: closePanel, h: (k) => { if (S.d.hat === k) S.d.hat = 'none'; else { if (!S.d.hats[k]) { if (!pay(HATS[k].price)) return; S.d.hats[k] = 1; } S.d.hat = k; } save(); ST.rebuildMe(); if (ST.car) ST.rebuildCar(); hats(); } });
}
export function wardrobe() {
  const shirts = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7, 0xec4899, 0x14b8a6, 0xf97316, 0x64748b, 0xffffff, 0x111827, 0xfacc15], hair = [0x3a2516, 0x1b1b1b, 0x8b5a2b, 0xd4a14a, 0xb4532a, 0xe5e7eb, 0xec4899, 0x3b82f6], skin = [0xf6c9a0, 0xe0a979, 0xb97a4f, 0x8a5a3b, 0xffd9b8];
  const sw = (list, key) => `<div class="grid">${list.map((p) => `<span class="sw ${S.d.look[key] === p ? 'on' : ''}" style="background:${hex(p)}" data-a="${key}" data-v="${p}"></span>`).join('')}</div>`;
  const c = panel('<h2>👕 Wardrobe</h2><h3>Shirt</h3>' + sw(shirts, 'shirt') + '<h3>Pants</h3>' + sw([0x334155, 0x1e3a8a, 0x7c2d12, 0x166534, 0x111827, 0xf5f5f4], 'pants') + '<h3>Hair</h3>' + sw(hair, 'hair') + '<h3>Skin</h3>' + sw(skin, 'skin') + '<div class="btnrow"><button class="btn purple small" data-a="hats">🧢 My hats</button></div>' + close);
  const set = (k) => (v) => { S.d.look[k] = +v; save(); ST.rebuildMe(); wardrobe(); };
  wire(c, { close: closePanel, shirt: set('shirt'), pants: set('pants'), hair: set('hair'), skin: set('skin'), hats });
}
/* ---------------- homes ---------------- */
export function realty(focus) {
  const rows = HOMES.map((h) => { const own = S.d.homes[h.id], main = S.d.mainHome === h.id; return `<div class="item ${own ? 'on' : ''} ${focus === h.id ? 'on' : ''}"><div class="ic">${h.icon}</div><div class="grow"><b>${h.name}</b><small>${h.blurb}</small><small>🚗 ${h.slots}-car garage</small></div>${own ? (main ? '<button class="btn green small" disabled>HOME</button>' : `<button class="btn blue small" data-a="main" data-v="${h.id}">MAKE HOME</button>`) : `<button class="btn ${money() >= h.price ? 'gold' : 'gray'} small" data-a="buy" data-v="${h.id}">${fmt(h.price)}</button>`}</div>`; }).join('');
  const c = panel(head('🏠 Grok Realty', 'buy a home with a garage') + rows + `<div class="btnrow"><button class="btn purple small" data-a="gps">📍 GPS to ${focus ? 'this home' : 'Starter House'}</button></div>` + close);
  wire(c, { close: closePanel, buy: (id) => { const h = HOMES.find((x) => x.id === id); if (!pay(h.price)) return; S.d.homes[id] = { deco: {}, wall: h.wall, floor: 'wood' }; if (!S.d.mainHome) S.d.mainHome = id; save(true); bigText('🏠 HOME SWEET HOME!'); toast('You own the ' + h.name + '! Sleep there to respawn at home.'); realty(focus); },
    main: (id) => { S.d.mainHome = id; save(); toast('🏠 This is now your main home (respawn point)'); realty(focus); }, gps: () => { const p = PLACES.find((x) => x.id === (focus || 'h_starter')); closePanel(); if (p) ST.setGps(p.door.x, p.door.z); } });
}
export function sleep(home, b) {
  closePanel(); fade(true); SFX.click();
  setTimeout(() => { SKY.tod = 0.3; if (Math.random() < 0.6) setWeather('clear'); if (home && b) { S.d.mainHome = b.id; } S.d.time = SKY.tod; if (ST.car) { ST.car.dmg = 0; ST.car.fuel = 1; } save(true); fade(false); bigText('☀️ GOOD MORNING!'); toast(home ? '🛏️ Rested! Your ride is fixed & fueled. You\'ll respawn here.' : '🛏️ Rested till morning!'); }, 700);
}
export function hotel() { const c = panel(head('🛎️ Grand Grok Hotel') + '<div class="item"><div class="ic">🛏️</div><div class="grow"><b>Comfy room for the night</b><small>Sleep till morning + Room Service Feast (+10% job pay for 5 min)</small></div><button class="btn gold small" data-a="r">$40</button></div>' + close); wire(c, { close: closePanel, r: () => { if (!pay(40)) return; S.d.buffs.pay = Date.now() + 300000; sleep(false); } }); }
export function decorate(b, slot) {
  const hs = S.d.homes[b.id]; if (!hs) return; hs.deco = hs.deco || {}; const sl = IN.homeSlots(IN.roomShell(b)); S.d.furn = S.d.furn || {};
  if (slot == null) {
    const c = panel('<h2>🛋️ Decorate</h2><div class="sub">Pick a spot, then pick what goes there. Furniture you buy is yours forever.</div><h3>Spots</h3>' + sl.map((_, i) => `<button class="btn ${hs.deco[i] ? 'green' : 'gray'} small" style="margin:3px" data-a="slot" data-v="${i}">${i + 1}. ${hs.deco[i] ? FURN[hs.deco[i]].icon : '➕'}</button>`).join('') +
      '<h3>Walls</h3><div class="grid">' + WALLS.map((w) => `<span class="sw ${hs.wall === w ? 'on' : ''}" style="background:${hex(w)}" data-a="wall" data-v="${w}"></span>`).join('') + '</div><h3>Floor</h3>' + Object.entries(FLOORS).map(([k, f]) => `<button class="btn ${hs.floor === k ? 'green' : 'gray'} small" style="margin:3px" data-a="floor" data-v="${k}">${f.name}</button>`).join('') + close);
    wire(c, { close: closePanel, slot: (i) => decorate(b, +i), wall: (w) => { hs.wall = +w; save(); IN.rebuild(); decorate(b); }, floor: (k) => { hs.floor = k; save(); IN.rebuild(); decorate(b); } }); return;
  }
  const rows = '<div class="item"><div class="ic">🚫</div><div class="grow"><b>Empty</b></div><button class="btn gray small" data-a="put" data-v="">CLEAR</button></div>' + Object.entries(FURN).map(([k, f]) => { const have = S.d.furn[k] || 0; return `<div class="item ${hs.deco[slot] === k ? 'on' : ''}"><div class="ic">${f.icon}</div><div class="grow"><b>${f.name}</b><small>${have ? 'You have ' + have : fmt(f.price)}</small></div><button class="btn small ${have ? 'blue' : 'gold'}" data-a="put" data-v="${k}">${have ? 'PLACE' : 'BUY'}</button></div>`; }).join('');
  const c = panel(`<h2>Spot ${slot + 1}</h2>` + rows + '<div class="btnrow"><button class="btn gray" data-a="back">BACK</button></div>');
  wire(c, { back: () => decorate(b), put: (k) => { const old = hs.deco[slot]; if (k && !(S.d.furn[k] > 0)) { if (!pay(FURN[k].price)) return; S.d.furn[k] = (S.d.furn[k] || 0) + 1; } if (old) S.d.furn[old] = (S.d.furn[old] || 0) + 1; if (k) { S.d.furn[k]--; hs.deco[slot] = k; } else delete hs.deco[slot]; save(); IN.rebuild(); decorate(b); } });
}
export function homeGarage(b) {
  const h = b.home, owned = VEH_ORDER.filter((t) => S.d.owned[t] && VEH[t].kind !== 'boat' && VEH[t].kind !== 'plane');
  const c = panel(head('🚗 ' + h.name + ' garage', h.slots + ' parking bays') + owned.map((t) => `<div class="item ${ST.car && ST.car.type === t ? 'on' : ''}"><div class="ic">${VEH[t].icon}</div><div class="grow"><b>${VEH[t].name}</b></div><button class="btn green small" data-a="go" data-v="${t}">TAKE OUT</button></div>`).join('') + close);
  wire(c, { close: closePanel, go: (t) => takeOut(t, { x: b.garageSpot.x, z: b.garageSpot.z }) });
}
/* ---------------- misc buildings ---------------- */
export function payFine() { const f = Math.ceil(ST.wanted) * 50; const c = panel(head('🚓 Police desk') + `<div class="item"><div class="ic">🎫</div><div class="grow"><b>Pay your ticket</b><small>The chase is called off</small></div><button class="btn gold small" data-a="p">${fmt(f)}</button></div>` + close); wire(c, { close: closePanel, p: () => { if (pay(f)) { clearWanted(); toast('😇 All square with the law!'); closePanel(); } } }); }
export function records() {
  const s = S.d.stats; const own = Object.keys(S.d.owned).length;
  const row = (i, n, v) => `<div class="item"><div class="ic">${i}</div><div class="grow"><b>${n}</b></div><b>${v}</b></div>`;
  const c = panel('<h2>🏛️ Town Hall Records</h2><input id="nmIn" class="name" maxlength="12" placeholder="Your name" value="' + (S.d.name || '').replace(/"/g, '') + '"><div class="btnrow"><button class="btn blue small" data-a="nm">SAVE NAME</button></div>' + row('🚗', 'Rides owned', own + '/' + VEH_ORDER.length) + row('⭐', 'Grok Stars', Object.keys(S.d.stars).length + '/60') + row('💼', 'Jobs done', s.jobs) + row('🏁', 'Races won', s.wins + '/' + s.races) + row('🔥', 'Fires put out', s.fires) + row('🍦', 'Ice creams sold', s.cones) + row('🪝', 'Cars towed', s.tows) + row('🦘', 'Best jump', (s.bestJump || 0).toFixed(1) + ' s') + row('🌀', 'Best drift', Math.round(s.bestDrift || 0) + ' pts') + row('🏠', 'Homes', Object.keys(S.d.homes).length + '/3') + close);
  wire(c, { close: closePanel, nm: () => { const v = (document.getElementById('nmIn').value || '').trim().slice(0, 12); if (v) { S.d.name = v; save(); toast('Hi ' + v + '! 👋'); } } });
}
export function museum() { if (!S.d.museum) { S.d.museum = 1; earn(150, 'museum explorer bonus'); } const c = panel('<h2>🦖 The Grokosaurus</h2><div class="sub" style="text-align:left">This giant skeleton was dug up right here in the Sizzle Desert! The Grokosaurus was as long as a city bus and loved to nap in the sun. Scientists think it was a very fast runner... maybe it would have liked the Grokzilla R. 🏁</div>' + close); wire(c, { close: closePanel }); }
export function weather() {
  const opts = [['clear', '☀️ Sunny'], ['cloudy', '⛅ Cloudy'], ['rain', '🌧️ Rain'], ['storm', '⛈️ Storm']], times = [[0.3, '🌅 Morning'], [0.5, '☀️ Noon'], [0.73, '🌇 Sunset'], [0.9, '🌙 Night']];
  const c = panel('<h2>🌦️ Weather Machine</h2><div class="sub">Professor Nimbus lets you pick the sky!</div><h3>Weather</h3><div class="btnrow">' + opts.map(([k, n]) => `<button class="btn ${SKY.wx === k ? 'green' : 'gray'} small" data-a="w" data-v="${k}">${n}</button>`).join('') + '</div><h3>Time of day</h3><div class="btnrow">' + times.map(([t, n]) => `<button class="btn gray small" data-a="t" data-v="${t}">${n}</button>`).join('') + '</div>' + close);
  wire(c, { close: closePanel, w: (k) => { setWeather(k); SKY.wxT = 300; if (k === 'rain' || k === 'storm') { SKY.rain = Math.max(SKY.rain, 0.6); } toast('🌦️ The sky is changing...'); weather(); }, t: (t) => { SKY.tod = +t; toast('⏰ Time warp!'); } });
}
