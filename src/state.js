// shared run-time state between modules
export const ST = { mode: 'title', car: null, me: null, myCars: [], t: 0, inside: null, job: null, race: null, wanted: 0, acts: [], hooks: { update: [], night: [] }, gps: null, gpsTarget: null, net: null, region: 'city', paused: false };
export const onUpdate = (f) => ST.hooks.update.push(f);
export const addActs = (f) => ST.acts.push(f); // f(px,pz,ctx) -> [{label, d, fn, pri}]
