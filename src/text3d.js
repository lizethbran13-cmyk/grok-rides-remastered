// real extruded 3D lettering for signs (no flat textures)
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
const font = new Font(fontJson), cache = new Map();
export function textGeo(str, size = 1, depth = 0.12) {
  const key = str + '|' + size + '|' + depth; let g = cache.get(key); if (g) return g;
  g = new TextGeometry(str, { font, size, depth, curveSegments: 3, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: size * 0.025, bevelSegments: 1 });
  g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.max.x + bb.min.x) / 2, 0, 0); g.userData.w = bb.max.x - bb.min.x; cache.set(key, g); return g;
}
export function textWidth(str, size) { return textGeo(str, size).userData.w; }
