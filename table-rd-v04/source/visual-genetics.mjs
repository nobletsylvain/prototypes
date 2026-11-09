// Fictional visual inheritance, independent of potency, lot quality and research odds.
export const VISUAL_PALETTE = Object.freeze({ olive: '#1c4f24', lime: '#789629', mauve: '#6e387a' });
export const VISUAL_AXES = Object.freeze(['shape', 'elongation', 'fullness', 'leafWidth', 'foliage', 'pigment', 'pistil', 'frost']);
const NUMERIC_AXES = ['elongation', 'fullness', 'leafWidth', 'foliage', 'pistil', 'frost'];
const SHAPES = ['compact', 'spire', 'cluster'];
const PIGMENTS = ['olive', 'lime', 'mauve'];
const UINT32_SPACE = 4294967296;
const LABELS = {
  shape: {
    compact: { fr: 'Forme compacte', en: 'Compact form' },
    spire: { fr: 'Forme élancée', en: 'Spire form' },
    cluster: { fr: 'Forme en grappes', en: 'Clustered form' },
  },
  pigment: {
    olive: { fr: 'olive', en: 'olive' }, lime: { fr: 'citron vert', en: 'lime' }, mauve: { fr: 'mauves', en: 'mauve' },
  },
  leaves: { broad: { fr: 'feuilles larges', en: 'broad leaves' }, narrow: { fr: 'feuilles fines', en: 'narrow leaves' } },
  surface: { visible: { fr: 'surface givrée', en: 'frosted surface' }, discreet: { fr: 'surface discrète', en: 'subtle surface' } },
};
const FOUNDERS = {
  x: { shape: 'compact', elongation: 25, fullness: 75, leafWidth: 80, foliage: 70, pigment: 'olive', pistil: 35, frost: 25 },
  y: { shape: 'spire', elongation: 85, fullness: 35, leafWidth: 25, foliage: 30, pigment: 'lime', pistil: 65, frost: 30 },
  z: { shape: 'cluster', elongation: 50, fullness: 70, leafWidth: 55, foliage: 55, pigment: 'mauve', pistil: 50, frost: 80 },
};
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isUint32 = value => Number.isInteger(value) && value >= 0 && value < UINT32_SPACE;
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Invalid visual genetics: ${message}`); };
const exactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

// FNV-1a over UTF-16 code units, followed by an integer avalanche. Versioned by each domain salt.
function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  value ^= value >>> 16; value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13; value = Math.imul(value, 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

export function validateVisual(visual) {
  requireCondition(exactKeys(visual, ['version', 'alleles', 'expressionSeed']) && visual.version === 1, 'version or fields');
  requireCondition(isUint32(visual.expressionSeed), 'expression seed');
  requireCondition(exactKeys(visual.alleles, VISUAL_AXES), 'allele axes');
  for (const axis of VISUAL_AXES) {
    const values = visual.alleles[axis];
    requireCondition(Array.isArray(values) && values.length === 2 && Object.keys(values).length === 2 && Object.hasOwn(values, 0) && Object.hasOwn(values, 1), `${axis} must contain two alleles`);
    const valid = axis === 'shape' ? value => SHAPES.includes(value) : axis === 'pigment' ? value => PIGMENTS.includes(value) : value => Number.isInteger(value) && value >= 0 && value <= 100;
    requireCondition(values.every(valid), `${axis} allele value`);
  }
  return visual;
}

export function founderVisual(id) {
  requireCondition(Object.hasOwn(FOUNDERS, id), 'unknown founder');
  return {
    version: 1,
    alleles: Object.fromEntries(VISUAL_AXES.map(axis => {
      const center = FOUNDERS[id][axis];
      return [axis, NUMERIC_AXES.includes(axis) ? [Math.max(0, center - 15), Math.min(100, center + 15)] : [center, center]];
    })),
    expressionSeed: hash(`botanical-visual-v1:founder:${id}`),
  };
}

export function inheritVisual(parents, seed) {
  requireCondition(isUint32(seed), 'inheritance seed');
  requireCondition(Array.isArray(parents) && parents.length === 2 && parents.every(parent => isRecord(parent) && typeof parent.id === 'string' && parent.id.length), 'two identified parents required');
  requireCondition(parents[0].id !== parents[1].id, 'distinct parents required');
  const ordered = [...parents].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  ordered.forEach(parent => validateVisual(parent.visual));
  const context = JSON.stringify(['botanical-visual-v1', seed, ...ordered.map(parent => parent.id)]);
  const alleles = Object.fromEntries(VISUAL_AXES.map(axis => [axis, ordered.map(parent => {
    const alleleIndex = hash(`${context}:${axis}:${JSON.stringify(parent.id)}`) & 1;
    return parent.visual.alleles[axis][alleleIndex];
  })]));
  return { version: 1, alleles, expressionSeed: hash(`${context}:expression`) };
}

export function getVisualPhenotype(visual) {
  validateVisual(visual);
  const numeric = Object.fromEntries(NUMERIC_AXES.map(axis => [axis, (visual.alleles[axis][0] + visual.alleles[axis][1]) / 200]));
  const shape = visual.alleles.shape[hash(`botanical-expression-v1:${visual.expressionSeed}:shape`) & 1];
  const pigmentBlend = [...new Set(visual.alleles.pigment)].sort();
  const pigmentColors = visual.alleles.pigment.map(pigment => VISUAL_PALETTE[pigment]);
  const color = '#' + [1, 3, 5].map(index => Math.round(pigmentColors.reduce((sum, pigmentColor) => sum + parseInt(pigmentColor.slice(index, index + 2), 16), 0) / 2).toString(16).padStart(2, '0')).join('');
  const accent = Object.fromEntries(['fr', 'en'].map(lang => [lang, (lang === 'fr' ? 'Reflets ' : 'Glints: ') + pigmentBlend.map(pigment => LABELS.pigment[pigment][lang]).join(lang === 'fr' ? ' et ' : ' and ')]));
  const leaves = LABELS.leaves[numeric.leafWidth >= .5 ? 'broad' : 'narrow'];
  const surface = LABELS.surface[numeric.frost >= .5 ? 'visible' : 'discreet'];
  const signature = Object.fromEntries(['fr', 'en'].map(lang => [lang, [LABELS.shape[shape][lang], leaves[lang], surface[lang]].join(' · ')]));
  return { shape, ...numeric, pigmentBlend, color, accent, signature };
}
