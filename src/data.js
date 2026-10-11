// Grok Rides Remastered - game data: vehicles, paints, rims, upgrades, snacks, hats, homes, furniture, races, jobs
// kind: car | bike (2 wheels) | kart | boat | heli | plane | seaplane | balloon | hover (land + water) | hovercar (floats over anything)
export const VEH = {
  compact:  { name: 'Grok Pop', icon: '🚗', kind: 'car', body: 'hatch', price: 0, vmax: 40, acc: 15, grip: 1.0, turn: 1.9, off: 0.35, snow: 0.3, mass: 1, tough: 1, len: 3.9, col: 0x38bdf8, desc: 'Your trusty little starter car.' },
  taxi:     { name: 'Grok Cab', icon: '🚕', kind: 'car', body: 'sedan', price: 2500, vmax: 43, acc: 16, grip: 1.0, turn: 1.85, off: 0.35, snow: 0.3, mass: 1.1, tough: 1, len: 4.5, tags: ['taxi'], col: 0xffc61a, desc: 'Taxi fares pay 50% more!' },
  icecream: { name: 'Ice Cream Truck', icon: '🍦', kind: 'car', body: 'icecream', price: 4000, vmax: 36, acc: 12, grip: 0.95, turn: 1.6, off: 0.4, snow: 0.3, mass: 1.6, tough: 0.9, len: 5.4, tags: ['icecream', 'treat'], col: 0xfdf2f8, isNew: 1, desc: 'NEW: park near people and SELL ice cream! Plays a jingle.' },
  snowmobile:{ name: 'Snow Zoom', icon: '🛷', kind: 'car', body: 'snowmobile', price: 4500, vmax: 44, acc: 18, grip: 0.95, turn: 2.1, off: 0.75, snow: 1, mass: 0.6, tough: 1, len: 2.8, col: 0x22d3ee, desc: 'King of snow and ice.' },
  tow:      { name: 'Hook & Haul', icon: '🪝', kind: 'car', body: 'tow', price: 5000, vmax: 42, acc: 14, grip: 0.98, turn: 1.7, off: 0.6, snow: 0.5, mass: 1.6, tough: 0.8, len: 5.6, tags: ['tow'], col: 0xff7a3d, isNew: 1, desc: 'NEW: a real hook! Tow broken-down cars to the garage.' },
  boat:     { name: 'Splash Speedboat', icon: '🚤', kind: 'boat', body: 'boat', price: 5000, vmax: 38, acc: 14, grip: 0.7, turn: 1.6, mass: 1, tough: 1, len: 5.5, col: 0x38bdf8, desc: 'Zoom around Sparkle Lake and the ocean.' },
  buggy:    { name: 'Dune Buggy', icon: '🏜️', kind: 'car', body: 'buggy', price: 5500, vmax: 50, acc: 21, grip: 1.0, turn: 2.1, off: 1, snow: 0.5, mass: 0.8, tough: 1.1, len: 3.6, col: 0xffe14d, desc: 'Flies over sand dunes like they are roads.' },
  pickup:   { name: 'Trail Boss 4x4', icon: '🛻', kind: 'car', body: 'pickup', price: 6000, vmax: 46, acc: 17, grip: 0.98, turn: 1.75, off: 0.9, snow: 0.65, mass: 1.5, tough: 0.8, len: 5.2, tags: ['cargo'], col: 0x4ade80, desc: 'Off-road truck. Does small Cargo Hauls.' },
  balloon:  { name: 'Hot Air Balloon', icon: '🎈', kind: 'balloon', body: 'balloon', price: 7000, vmax: 12, acc: 3, turn: 0.7, mass: 1, tough: 1.4, len: 6, tags: ['tour'], col: 0xff4fa0, isNew: 1, desc: 'NEW: float over the whole world. Hold UP to fire the burner.' },
  fire:     { name: 'Fire Engine 7', icon: '🚒', kind: 'car', body: 'fire', price: 7500, vmax: 40, acc: 13, grip: 0.98, turn: 1.5, off: 0.45, snow: 0.4, mass: 2.6, tough: 0.6, len: 8.6, tags: ['fire'], col: 0xdc2626, isNew: 1, desc: 'NEW: sirens, ladder and a water cannon. Put out fires!' },
  bus:      { name: 'City Bus', icon: '🚌', kind: 'car', body: 'bus', price: 8000, vmax: 34, acc: 10, grip: 0.95, turn: 1.45, off: 0.4, snow: 0.35, mass: 3, tough: 0.6, len: 10.5, tags: ['bus'], col: 0xffc61a, desc: 'Unlocks Bus Routes.' },
  sports:   { name: 'Zoomer GT', icon: '🏎️', kind: 'car', body: 'sports', price: 8000, vmax: 56, acc: 23, grip: 1.08, turn: 2.0, off: 0.25, snow: 0.25, mass: 1, tough: 1.1, len: 4.5, col: 0xff3b3b, desc: 'Quick, grippy and fun.' },
  police:   { name: 'Cruiser', icon: '🚓', kind: 'car', body: 'police', price: 9000, vmax: 57, acc: 22, grip: 1.05, turn: 1.95, off: 0.4, snow: 0.35, mass: 1.2, tough: 0.8, len: 4.8, col: 0x1e293b, desc: 'Light bar flashes when you honk (just for fun!).' },
  hover:    { name: 'Skim Hovercraft', icon: '🛸', kind: 'hover', body: 'hover', price: 9000, vmax: 42, acc: 15, grip: 0.45, turn: 1.7, mass: 1.2, tough: 1.2, len: 5.2, col: 0x14b8a6, isNew: 1, desc: 'NEW: glides on an air cushion over roads, sand, snow AND water.' },
  muscle:   { name: 'Thunder V8', icon: '🚘', kind: 'car', body: 'muscle', price: 9500, vmax: 59, acc: 26, grip: 0.9, turn: 1.85, off: 0.3, snow: 0.25, mass: 1.3, tough: 0.9, len: 4.8, col: 0x7c3aed, desc: 'Huge power, loves to drift.' },
  limo:     { name: 'Stretch Limo', icon: '🤵', kind: 'car', body: 'limo', price: 10000, vmax: 46, acc: 15, grip: 0.98, turn: 1.55, off: 0.3, snow: 0.25, mass: 1.8, tough: 0.9, len: 7.6, tags: ['limo'], col: 0x111111, desc: 'Unlocks Limo VIP gigs.' },
  bigrig:   { name: 'Big Grok Rig', icon: '🚛', kind: 'car', body: 'rig', price: 12000, vmax: 39, acc: 10, grip: 0.95, turn: 1.35, off: 0.45, snow: 0.4, mass: 4, tough: 0.5, len: 7.2, tags: ['cargo'], col: 0xe11d48, desc: 'Biggest Cargo Hauls pay the most.' },
  heli:     { name: 'Grokopter', icon: '🚁', kind: 'heli', body: 'heli', price: 14000, vmax: 34, acc: 10, turn: 1.4, mass: 1, tough: 1, len: 8, tags: ['tour'], col: 0xff4fd8, isNew: 1, desc: 'NEW: hover anywhere and land on rooftops and helipads.' },
  monster:  { name: 'Monster Truck', icon: '🦖', kind: 'car', body: 'monster', price: 15000, vmax: 50, acc: 20, grip: 1.0, turn: 1.75, off: 1, snow: 0.85, mass: 2, tough: 1.6, len: 5, crush: 1, bigSus: 1, col: 0x22c55e, desc: 'Giant bouncy suspension. Squashes benches and bins flat!' },
  seaplane: { name: 'Gull Seaplane', icon: '🛩️', kind: 'seaplane', body: 'seaplane', price: 16000, vmax: 52, acc: 11, turn: 1.1, mass: 1, tough: 1, len: 9, tags: ['tour'], col: 0xfacc15, isNew: 1, desc: 'NEW: take off and land on the lake or the ocean (or a runway).' },
  plane:    { name: 'Stunt Plane', icon: '✈️', kind: 'plane', body: 'plane', price: 18000, vmax: 62, acc: 12, turn: 1.1, mass: 1, tough: 1, len: 8, tags: ['tour'], col: 0xffffff, desc: 'Take off from the runway or a long road. Fastest way around!' },
  super:    { name: 'Grokzilla R', icon: '🏁', kind: 'car', body: 'super', price: 22000, vmax: 72, acc: 32, grip: 1.15, turn: 2.05, off: 0.2, snow: 0.2, mass: 1, tough: 1.1, len: 4.6, col: 0xffd23f, desc: 'The fastest car in the world.' },
  ratita:   { name: 'Ratita Hover-Car R1', icon: '🐭', kind: 'hovercar', body: 'hovercar', price: 25000, vmax: 58, acc: 24, grip: 1.1, turn: 2.1, mass: 1, tough: 1.3, len: 4.8, col: 0xe879f9, isNew: 1, desc: 'NEW from Ratita Industries: floats over road, grass, sand and water. Hold UP to hop!' },
  kick:     { name: 'Kick Scooter', icon: '🛴', kind: 'bike', body: 'kick', price: 300, vmax: 10, acc: 6, grip: 1.05, turn: 2.8, off: 0.2, snow: 0.2, mass: 0.2, tough: 1.2, len: 1.1, pedal: 1, col: 0x3ff0ff, horn: 'bell', desc: 'Push, glide, zip around the sidewalks.' },
  bmx:      { name: 'BMX Bandit', icon: '🚲', kind: 'bike', body: 'bmx', price: 600, vmax: 15, acc: 8.5, grip: 1.1, turn: 2.6, off: 0.8, snow: 0.3, mass: 0.25, tough: 1.2, len: 1.7, pedal: 1, wheelie: 0.6, col: 0xff4fd8, horn: 'bell', desc: 'Pedal power! Pops wheelies and big jumps off ramps.' },
  roadbike: { name: 'Road Racer', icon: '🚴', kind: 'bike', body: 'road', price: 1200, vmax: 20, acc: 8, grip: 1.05, turn: 2.2, off: 0.25, snow: 0.2, mass: 0.25, tough: 1, len: 1.8, pedal: 1, col: 0x3b82f6, horn: 'bell', desc: 'Skinny tyres, drop bars, the fastest pedal bike.' },
  moped:    { name: 'Zippy Moped', icon: '🛵', kind: 'bike', body: 'moped', price: 2000, vmax: 25, acc: 11, grip: 1.0, turn: 2.4, off: 0.35, snow: 0.3, mass: 0.45, tough: 1, len: 1.8, col: 0x7dd3c0, horn: 'meep', tags: ['treat'], desc: 'Cute and buzzy. Pizza deliveries pay extra!' },
  kart:     { name: 'Go-Kart', icon: '🏎️', kind: 'kart', body: 'kart', price: 3500, vmax: 38, acc: 27, grip: 1.35, turn: 2.5, off: 0.3, snow: 0.25, mass: 0.5, tough: 1.1, len: 2.2, col: 0xef4444, desc: 'Low, grippy and twitchy. Corners like it is on rails.' },
  jetski:   { name: 'Wave Jet', icon: '🌊', kind: 'boat', body: 'jetski', price: 4000, vmax: 36, acc: 22, grip: 0.85, turn: 2.4, mass: 0.6, tough: 1.1, len: 2.9, col: 0xfacc15, desc: 'Bounce over the waves with a big rooster-tail spray!' },
  cruiser:  { name: 'Thunder Cruiser', icon: '🏍️', kind: 'bike', body: 'cruiser', price: 7500, vmax: 50, acc: 20, grip: 1.0, turn: 1.85, off: 0.35, snow: 0.25, mass: 0.85, tough: 1.1, len: 2.4, wheelie: 0.35, col: 0xb91c1c, desc: 'Low, loud and chrome. Lazy wheelies on demand.' },
  sportbike:{ name: 'Grok Ninja', icon: '🏍️', kind: 'bike', body: 'sport', price: 11000, vmax: 64, acc: 31, grip: 1.1, turn: 2.15, off: 0.2, snow: 0.2, mass: 0.7, tough: 1, len: 2.1, wheelie: 0.55, col: 0x22c55e, desc: 'Super fast sport bike. Hold WHEELIE to pop the front.' }
};
for (const k in VEH) VEH[k].id = k;
export const VEH_ORDER = Object.keys(VEH).sort((a, b) => VEH[a].price - VEH[b].price);
export const isAir = (k) => { const v = VEH[k]; return !!v && (v.kind === 'heli' || v.kind === 'plane' || v.kind === 'seaplane' || v.kind === 'balloon'); };
export const isWater = (k) => { const v = VEH[k]; return !!v && v.kind === 'boat'; };
export const DEALERS = {
  motors: { name: 'Grok Motors', list: ['compact', 'taxi', 'sports', 'muscle', 'super', 'police', 'limo', 'buggy', 'pickup', 'snowmobile', 'kart', 'monster', 'ratita'] },
  trucks: { name: 'Big Wheels Trucks', list: ['icecream', 'tow', 'fire', 'bus', 'bigrig', 'pickup', 'monster'] },
  bikes: { name: 'Pedal & Piston', list: ['kick', 'bmx', 'roadbike', 'moped', 'cruiser', 'sportbike', 'kart'] },
  air: { name: 'Sky Field Aircraft', list: ['heli', 'plane', 'seaplane', 'balloon'] },
  marine: { name: 'Sunny Shores Marine', list: ['boat', 'jetski', 'hover', 'seaplane'] }
};
export const PAINTS = [0xff4fd8, 0xff3b3b, 0xff7a3d, 0xffd23f, 0x4ade80, 0x22c55e, 0x3ff0ff, 0x38bdf8, 0x2563eb, 0x7c3aed, 0xffffff, 0x9ca3af, 0x111111, 0xa16207, 0xf9a8d4, 0x14b8a6];
export const FINISH = { gloss: { name: 'Gloss', r: 0.28, m: 0.35, cc: 1 }, metal: { name: 'Metallic', r: 0.22, m: 0.75, cc: 1 }, matte: { name: 'Matte', r: 0.75, m: 0.1, cc: 0 }, pearl: { name: 'Pearl', r: 0.18, m: 0.45, cc: 1, price: 300 } };
export const RIMS = { std: { name: 'Classic 5-Spoke', price: 0 }, star: { name: 'Star Spokes', price: 250 }, disc: { name: 'Racing Disc', price: 300 }, mesh: { name: 'Mesh Wire', price: 400 }, gold: { name: 'Gold Chrome', price: 600 }, neon: { name: 'Neon Glow', price: 800 } };
export const UPG = {
  engine: { name: 'Engine', icon: '⚙️', max: 3, cost: [900, 1800, 3600], desc: '+6% top speed, +10% acceleration per level' },
  grip: { name: 'Tires', icon: '🛞', max: 3, cost: [700, 1400, 2800], desc: '+6% grip per level' },
  armor: { name: 'Armor', icon: '🛡️', max: 3, cost: [600, 1200, 2400], desc: '-20% crash damage per level' },
  nitro: { name: 'Nitro', icon: '🔥', max: 1, cost: [1500], desc: 'Adds the NITRO boost button' },
  tank: { name: 'Big Fuel Tank', icon: '⛽', max: 2, cost: [500, 1000], desc: '+50% fuel per level' }
};
export const SNACKS = {
  burger: { icon: '🍔', name: 'Turbo Burger', price: 15, buff: 'speed', secs: 180, desc: '+5% top speed' },
  fries: { icon: '🍟', name: 'Crispy Fries', price: 8, buff: 'grip', secs: 180, desc: '+8% grip' },
  shake: { icon: '🥤', name: 'Nitro Shake', price: 10, buff: 'nitro', secs: 180, desc: 'Nitro recharges 2x faster' },
  pancakes: { icon: '🥞', name: 'Pancake Stack', price: 12, buff: 'speed', secs: 180, desc: '+5% top speed' },
  slice: { icon: '🍕', name: 'Pizza Slice', price: 8, buff: 'grip', secs: 180, desc: '+8% grip' },
  soda: { icon: '🥫', name: 'Fizzy Soda', price: 4, buff: 'nitro', secs: 120, desc: 'Nitro recharges 2x faster' },
  coffee: { icon: '☕', name: 'Rocket Latte', price: 5, buff: 'nitro', secs: 150, desc: 'Nitro recharges 2x faster' },
  candy: { icon: '🍭', name: 'Grippy Gummies', price: 5, buff: 'grip', secs: 120, desc: '+8% grip' },
  jerky: { icon: '🥓', name: 'Trail Jerky', price: 6, buff: 'off', secs: 180, desc: 'Better grip on dirt & sand' },
  slushie: { icon: '🧊', name: 'Blue Slushie', price: 5, buff: 'nitro', secs: 150, desc: 'Nitro recharges 2x faster' },
  cocoa: { icon: '☕', name: 'Hot Cocoa', price: 6, buff: 'snow', secs: 180, desc: 'Better grip on snow & ice' },
  donut: { icon: '🍩', name: 'Frosted Donut', price: 5, buff: 'grip', secs: 150, desc: '+8% grip' },
  cone: { icon: '🍦', name: 'Triple Scoop', price: 7, buff: 'nitro', secs: 180, desc: 'Nitro recharges 2x faster' },
  sundae: { icon: '🍨', name: 'Turbo Sundae', price: 9, buff: 'speed', secs: 180, desc: '+5% top speed' },
  taco: { icon: '🌮', name: 'Beach Taco', price: 7, buff: 'speed', secs: 150, desc: '+5% top speed' },
  coconut: { icon: '🥥', name: 'Coconut Splash', price: 5, buff: 'off', secs: 180, desc: 'Better grip on dirt & sand' },
  feast: { icon: '🛎️', name: 'Room Service Feast', price: 25, buff: 'pay', secs: 300, desc: '+10% pay for jobs' },
  cookie: { icon: '🍪', name: "Grandma's Cookies", price: 0, buff: 'grip', secs: 120, desc: '+8% grip (free!)' }
};
export const BUFFNAME = { speed: '⚡ Speed', grip: '🛞 Grip', nitro: '🔥 Nitro', snow: '❄️ Snow grip', off: '🏜️ Dirt grip', pay: '💰 +10% pay' };
export const HATS = { cap: { name: 'Racing Cap', icon: '🧢', price: 40 }, cowboy: { name: 'Desert Cowboy Hat', icon: '🤠', price: 80 }, beanie: { name: 'Snow Beanie', icon: '🧶', price: 50 }, crown: { name: 'Champion Crown', icon: '👑', price: 400 }, party: { name: 'Party Hat', icon: '🥳', price: 30 }, chef: { name: 'Ice Cream Chef Hat', icon: '👨‍🍳', price: 60 }, hardhat: { name: 'Fire Chief Helmet', icon: '⛑️', price: 90 }, ratears: { name: 'Ratita Ears', icon: '🐭', price: 120 }, astro: { name: 'Astro Helmet', icon: '👨‍🚀', price: 250 }, dino: { name: 'Dino Hood', icon: '🦖', price: 150 } };
export const HOMES = [
  { id: 'h_starter', name: 'Pine Hollow Starter House', short: 'STARTER HOUSE', icon: '🏡', price: 6000, style: 'cottage', wall: 0xfde7c4, acc: 0xb45309, slots: 2, blurb: 'Cozy house in the small town. Porch, garden and a garage for 2 rides.' },
  { id: 'h_villa', name: 'Sizzle Desert Villa', short: 'DESERT VILLA', icon: '🌵', price: 14000, style: 'villa', wall: 0xfbf3e6, acc: 0xc2410c, slots: 3, blurb: 'Sunny white villa with arches, a terracotta roof and a pool. Garage for 3.' },
  { id: 'h_loft', name: 'Grok City Sky Loft', short: 'CITY LOFT', icon: '🏙️', price: 22000, style: 'loft', wall: 0xe2e8f0, acc: 0x334155, slots: 4, blurb: 'Modern downtown loft with huge windows and a roof terrace. Garage for 4.' }
];
export const FURN = {
  plant: { name: 'Leafy Plant', icon: '🪴', price: 60 }, lamp: { name: 'Floor Lamp', icon: '💡', price: 80 }, rug: { name: 'Round Rug', icon: '🟣', price: 70 },
  armchair: { name: 'Comfy Armchair', icon: '🛋️', price: 150 }, beanbag: { name: 'Bean Bag', icon: '🫘', price: 90 }, bookshelf: { name: 'Bookshelf', icon: '📚', price: 180 },
  teddy: { name: 'Giant Teddy', icon: '🧸', price: 120 }, aquarium: { name: 'Fish Tank', icon: '🐠', price: 300 }, trophy: { name: 'Trophy Stand', icon: '🏆', price: 200 },
  arcade: { name: 'Arcade Machine', icon: '🕹️', price: 400 }, piano: { name: 'Piano', icon: '🎹', price: 450 }, tree: { name: 'Party Tree', icon: '🎄', price: 160 },
  carmodel: { name: 'Model Race Car', icon: '🏎️', price: 220 }, globe: { name: 'Snow Globe', icon: '🔮', price: 90 }, torty: { name: 'Torty Plush', icon: '🐢', price: 140 }
};
export const WALLS = [0xf5e6d3, 0xfde2e4, 0xdbeafe, 0xdcfce7, 0xfef9c3, 0xede9fe, 0xe5e7eb, 0xfed7aa];
export const FLOORS = { wood: { name: 'Wood planks', c: 0xc08a5a }, tile: { name: 'White tiles', c: 0xf1f5f9 }, carpet: { name: 'Comfy carpet', c: 0x93c5fd }, check: { name: 'Checkerboard', c: 0x1f2937 }, marble: { name: 'Shiny marble', c: 0xf5f5f4 } };
export const ICE = [{ k: 'van', n: 'Vanilla', e: '🍦', c: 0xfff7d6 }, { k: 'choc', n: 'Chocolate', e: '🍫', c: 0x7b4a2a }, { k: 'straw', n: 'Strawberry', e: '🍓', c: 0xff9ec4 }, { k: 'mint', n: 'Mint Chip', e: '🌿', c: 0xa7f3d0 }, { k: 'rocket', n: 'Rocket Pop', e: '🚀', c: 0xef4444 }];
export const MAIL = ['💌 From Grandma Grok: "So proud of you! Remember to eat your veggies."', '📰 The Pine Hollow Times: "Mystery monster truck squashes 12 benches!"', '🎟️ Burger Blast says hi! Free smile with every burger.', '✉️ From the Race Club: "Come race us anytime, champ!"', '🌟 Star Map hint: "Some Grok Stars hide on rooftops..."', '📮 Postcard from Sunny Shores: "The seaplane is SO fun. Wish you were here!"', '🐢 From Torty: "Visit me at the Sunny Shores pier, I have a snack for you!"', '🐭 Ratita Industries: "Our Hover-Car R1 floats over water. Just saying."'];
