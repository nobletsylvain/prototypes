import { CATALOG } from './catalog.mjs';
import { getProductDetails } from './product-details.mjs?v=20261109profiles';

export const FILTER_VALUES = Object.freeze({
  category: Object.freeze(['all', 'products', 'equipment', 'supplies', 'growing']),
  seller: Object.freeze(['all', 'Warner', '???']),
  quality: Object.freeze(['all', 'ordinary', 'premium', 'standard']),
  availability: Object.freeze(['all', 'available', 'locked'])
});

const categoryLabels = Object.freeze({
  products: 'produits products',
  equipment: 'équipement equipment',
  supplies: 'consommables supplies',
  growing: 'culture growing'
});

function normalize(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}?]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function qualityOf(item) {
  const value = getProductDetails(item.id, 'en')?.fields.find(field => field.id === 'quality')?.value;
  if (!value) return null;
  const quality = normalize(value).split(' ')[0];
  return FILTER_VALUES.quality.includes(quality) && quality !== 'all' ? quality : null;
}

function searchableText(item) {
  const details = ['fr', 'en'].flatMap(language => {
    const entry = getProductDetails(item.id, language);
    return entry ? [entry.description, ...entry.fields.flatMap(field => [field.label, field.value])] : [];
  });
  return normalize([
    item.name.fr, item.name.en, item.seller, categoryLabels[item.category],
    item.locked ? 'verrouillé locked' : 'disponible available', ...details
  ].join(' '));
}

const searchIndex = new Map(CATALOG.map(item => [item.id, Object.freeze({
  text: searchableText(item), quality: qualityOf(item)
})]));

/** Filter the existing catalogue without changing its order, identities or prices. */
export function filterCatalog(query = '', filters = {}) {
  if (typeof query !== 'string' || filters === null || typeof filters !== 'object' || Array.isArray(filters)) return [];
  const selected = {};
  for (const [key, values] of Object.entries(FILTER_VALUES)) {
    selected[key] = filters[key] === undefined ? 'all' : filters[key];
    if (!values.includes(selected[key])) return [];
  }
  const terms = normalize(query).split(' ').filter(Boolean);
  return CATALOG.filter(item => {
    const entry = searchIndex.get(item.id);
    return (selected.category === 'all' || item.category === selected.category)
      && (selected.seller === 'all' || item.seller === selected.seller)
      && (selected.quality === 'all' || entry.quality === selected.quality)
      && (selected.availability === 'all' || item.locked === (selected.availability === 'locked'))
      && terms.every(term => entry.text.includes(term));
  });
}
