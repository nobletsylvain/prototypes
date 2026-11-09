import { HEAD_MASTERS } from './head-masters.mjs';
import { founderVisual, getVisualPhenotype } from './visual-genetics.mjs';

// Display palettes follow BenchGrowAppearance, in dark/light/middle/pistil order.
// All dimensions below are presentation units, never a quantity of product.
export const HEAD_PALETTES = Object.freeze({
  lime: Object.freeze(['#525c17', '#b8b840', '#789629', '#d48f2b']),
  olive: Object.freeze(['#0e3016', '#3b6b36', '#1c4f24', '#ab5e24']),
  mauve: Object.freeze(['#4a1f52', '#9e61ab', '#6e387a', '#d19e5e']),
});
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
const hex = values => '#' + values.map(value => Math.round(clamp(value) * 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, amount) => a.map((value, index) => value + (b[index] - value) * amount);
const noise = (index, seed) => {
  let value = Math.imul((index + 1) ^ seed, 1597334677);
  value = Math.imul(value ^ value >>> 16, 2246822507);
  return ((value ^ value >>> 13) >>> 0) / 4294967296;
};

export function getDisplayPhenotype(visual) {
  try { return getVisualPhenotype(visual); }
  catch { return getVisualPhenotype(founderVisual('y')); }
}

/** One transformed mesh is consumed by the journal projection and the 3D loupe. */
export function createHeadGeometry(visual) {
  const phenotype = getDisplayPhenotype(visual);
  const master = HEAD_MASTERS[phenotype.shape] || HEAD_MASTERS.compact;
  const elongation = clamp(phenotype.elongation), fullness = clamp(phenotype.fullness);
  const foliage = clamp(phenotype.foliage), leafWidth = clamp(phenotype.leafWidth);
  const height = .84 + elongation * .34, width = .80 + fullness * .40;
  const depth = .86 + leafWidth * .28;
  const positions = [];
  for (let index = 0; index < master.positions.length; index += 3) {
    const x = master.positions[index], y = master.positions[index + 1], z = master.positions[index + 2];
    const lowerBracts = Math.sin(Math.PI * clamp(y * 1.38));
    const leafySection = 1 + (foliage - .5) * .20 * lowerBracts;
    positions.push(x * width * leafySection, y * height, z * width * depth * leafySection);
  }
  const pigments = (phenotype.pigmentBlend || ['olive']).filter(key => HEAD_PALETTES[key]);
  if (!pigments.length) pigments.push('olive');
  const palette = Array.from({ length: 4 }, (_, group) => {
    const colors = pigments.map(key => rgb(HEAD_PALETTES[key][group]));
    return colors[0].map((_, channel) => colors.reduce((sum, color) => sum + color[channel], 0) / colors.length);
  });
  const normals = [], colors = [], triangles = [...master.triangles], groups = [...master.groups];
  for (let face = 0; face < groups.length; face++) {
    const a = triangles[face * 3] * 3, b = triangles[face * 3 + 1] * 3, c = triangles[face * 3 + 2] * 3;
    const u = [0, 1, 2].map(axis => positions[b + axis] - positions[a + axis]);
    const v = [0, 1, 2].map(axis => positions[c + axis] - positions[a + axis]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...n);
    normals.push(...n.map(value => value / length));
    let color = palette[groups[face]];
    if (pigments.length > 1 && groups[face] !== 3) {
      const center = [0, 1, 2].map(axis => (positions[a + axis] + positions[b + axis] + positions[c + axis]) / 3);
      const patch = Math.sin(center[0] * 7 + center[1] * 5 + center[2] * 4) >= 0 ? 0 : 1;
      // Both inherited pigments remain visible on broad facets; no rarity-driven tint.
      color = mix(color, rgb(HEAD_PALETTES[pigments[patch]][groups[face]]), .76);
    }
    if (groups[face] === 3) color = mix(color, [.91, .73, .40], clamp(phenotype.pistil) * .38);
    else color = mix(color, [.84, .87, .73], clamp(phenotype.frost) * (.04 + noise(face, 0) * .14));
    colors.push(hex(color));
  }
  const min = [0, 1, 2].map(axis => Math.min(...positions.filter((_, index) => index % 3 === axis)));
  const max = [0, 1, 2].map(axis => Math.max(...positions.filter((_, index) => index % 3 === axis)));
  return { positions, triangles, groups, normals, colors, bounds: { min, max }, phenotype };
}

/** Orthographic camera shared by all journal portraits, independent of entry ID. */
export function projectHeadGeometry(geometry) {
  const yaw = -.58, pitch = .13;
  const rotate = (x, y, z) => {
    const side = x * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
    return [side, y * Math.cos(pitch) - depth * Math.sin(pitch), y * Math.sin(pitch) + depth * Math.cos(pitch)];
  };
  const vertices = [];
  for (let i = 0; i < geometry.positions.length; i += 3) vertices.push(rotate(...geometry.positions.slice(i, i + 3)));
  const minX = Math.min(...vertices.map(v => v[0])), maxX = Math.max(...vertices.map(v => v[0]));
  const minY = Math.min(...vertices.map(v => v[1])), maxY = Math.max(...vertices.map(v => v[1]));
  const scale = Math.min(108, 150 / (maxX - minX), 132 / (maxY - minY));
  const centerX = (minX + maxX) / 2;
  const faces = [];
  for (let face = 0; face < geometry.groups.length; face++) {
    const normal = rotate(...geometry.normals.slice(face * 3, face * 3 + 3));
    if (normal[2] <= 0) continue;
    const points = geometry.triangles.slice(face * 3, face * 3 + 3).map(index => vertices[index]);
    const light = Math.max(0, normal[0] * -.38 + normal[1] * .65 + normal[2] * .66);
    const fill = hex(rgb(geometry.colors[face]).map(value => value * (.56 + light * .67)));
    faces.push({ index: face, points: points.map(v => [90 + (v[0] - centerX) * scale, 138 - (v[1] - minY) * scale]),
      depth: points.reduce((sum, v) => sum + v[2], 0) / 3, fill });
  }
  faces.sort((a, b) => a.depth - b.depth || a.index - b.index);
  return faces;
}
