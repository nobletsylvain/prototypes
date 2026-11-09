// Fictional game catalogue prices for this standalone trial.
// This subset is for interaction rehearsal; it does not define campaign unlocks.
const products = [
  { id: 'hash100', name: { fr: 'Hash · 100 g · ordinaire', en: 'Hash · 100 g · ordinary' }, category: 'products', seller: 'Warner', price: 42000, locked: false },
  { id: 'hashPremium100', name: { fr: 'Hash · 100 g · premium', en: 'Hash · 100 g · premium' }, category: 'products', seller: 'Warner', price: 59000, locked: false },
  { id: 'hash250', name: { fr: 'Hash · 250 g · ordinaire', en: 'Hash · 250 g · ordinary' }, category: 'products', seller: 'Warner', price: 95000, locked: false },
  { id: 'buds100', name: { fr: 'Têtes · 100 g · ordinaires', en: 'Buds · 100 g · ordinary' }, category: 'products', seller: 'Warner', price: 23000, locked: false },
  { id: 'powder', name: { fr: 'Poudre · 100 g', en: 'Powder · 100 g' }, category: 'products', seller: '???', price: 30000, locked: true },
  { id: 'semiBagging', name: { fr: 'Ensachage semi-automatique', en: 'Semi-automatic bagging' }, category: 'equipment', seller: '???', price: 35000, locked: false },
  { id: 'poweredCutter', name: { fr: 'Module de coupe motorisée', en: 'Powered cutting module' }, category: 'equipment', seller: '???', price: 90000, locked: false },
  { id: 'tool', name: { fr: 'Spatule', en: 'Mixing spatula' }, category: 'equipment', seller: '???', price: 2000, locked: true },
  { id: 'scoop', name: { fr: 'Pelle à têtes', en: 'Bud scoop' }, category: 'equipment', seller: '???', price: 2500, locked: true },
  { id: 'jars', name: { fr: 'Bocal réutilisable', en: 'Reusable jar' }, category: 'supplies', seller: '???', price: 2500, locked: false },
  { id: 'cartons', name: { fr: 'Carton · 30 sachets', en: 'Carton · 30 pouches' }, category: 'supplies', seller: '???', price: 1500, locked: false },
  { id: 'diluentA', name: { fr: 'Diluant A · 100 g', en: 'Diluent A · 100 g' }, category: 'supplies', seller: '???', price: 1000, locked: true },
  { id: 'diluentB', name: { fr: 'Diluant B · 100 g', en: 'Diluent B · 100 g' }, category: 'supplies', seller: '???', price: 1500, locked: true },
  { id: 'culture', name: { fr: 'Terre', en: 'Soil' }, category: 'growing', seller: '???', price: 2500, locked: true }
];
export const CATALOG = Object.freeze(products.map(product => Object.freeze({ ...product, name: Object.freeze(product.name) })));
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(CATALOG.map(product => [product.id, product])));
