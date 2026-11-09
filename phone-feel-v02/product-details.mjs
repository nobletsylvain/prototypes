const LABELS = {
  strain: { fr: 'Variété / strain', en: 'Strain' },
  quality: { fr: 'Qualité', en: 'Quality' },
  effect: { fr: 'Effet', en: 'Effect' },
  taste: { fr: 'Goût', en: 'Taste' },
  weight: { fr: 'Poids du lot', en: 'Lot weight' },
  use: { fr: 'Utilisation', en: 'Use' },
  packaging: { fr: 'Conditionnement', en: 'Packaging' },
  requirement: { fr: 'Prérequis dans l’atelier', en: 'Workshop requirement' },
  capacity: { fr: 'Contenance', en: 'Capacity' }
};
const unknown = { fr: 'Non renseigné', en: 'Not specified' };
const field = (id, fr, en) => ({ id, values: { fr, en }, status: 'known' });
const missing = id => ({ id, values: unknown, status: 'unknown' });
const cannabis = (grams, premium, buds = false) => ({
  description: buds
    ? { fr: 'Un lot de têtes pour le poste de conditionnement de l’atelier.', en: 'A lot of buds for the workshop packing station.' }
    : { fr: 'Un pain de hash pour le poste de découpe et de conditionnement.', en: 'A block of hash for the cutting and packing station.' },
  fields: [
    missing('strain'), field('quality', premium ? 'Premium' : 'Ordinaire', premium ? 'Premium' : 'Ordinary'),
    missing('effect'), missing('taste'), field('weight', `${grams} g`, `${grams} g`),
    field('packaging', buds ? 'Lot brut de têtes' : 'Pain de hash', buds ? 'Bulk lot of buds' : 'Hash block'),
    field('use', buds ? 'Conditionnement des têtes à l’atelier' : 'Découpe et conditionnement à l’atelier',
      buds ? 'Packing buds at the workshop' : 'Cutting and packing at the workshop')
  ]
});
const bottle = letter => ({
  description: { fr: `Diluant ${letter} pour le poste de mélange du jeu.`, en: `Diluent ${letter} for the game’s mixing station.` },
  fields: [
    field('use', 'Consommable du poste de mélange', 'Mixing-station consumable'),
    field('packaging', 'Un flacon scellé de 100 g', 'One sealed 100 g bottle'),
    field('weight', '100 g', '100 g')
  ]
});
const entries = {
  hash100: cannabis(100, false),
  hashPremium100: cannabis(100, true),
  hash250: cannabis(250, false),
  buds100: cannabis(100, false, true),
  powder: {
    description: { fr: 'Un lot de poudre brute pour l’atelier. Article visible, mais verrouillé dans cet essai.', en: 'A bulk powder lot for the workshop. Visible, but locked in this trial.' },
    fields: [missing('quality'), missing('effect'), missing('taste'), field('weight', '100 g', '100 g'),
      field('packaging', 'Lot brut', 'Bulk lot'), field('use', 'Préparation et conditionnement à l’atelier', 'Preparation and packing at the workshop')]
  },
  semiBagging: {
    description: { fr: 'L’équipement d’ensachage de l’atelier, pour les portions déjà préparées.', en: 'Workshop bagging equipment for prepared portions.' },
    fields: [field('use', 'Ensachage du hash et des têtes', 'Bagging hash and buds'),
      field('packaging', 'Un équipement d’atelier', 'One workshop equipment upgrade'),
      field('requirement', 'Emplacements de machines libres', 'Clear machine spaces')]
  },
  poweredCutter: {
    description: { fr: 'Le module qui motorise la coupe sur le poste de hash.', en: 'The module that powers cutting at the hash station.' },
    fields: [field('use', 'Coupe motorisée du pain de hash', 'Powered cutting of a hash block'),
      field('packaging', 'Un module de machine', 'One machine module'),
      field('requirement', 'Ensachage semi-automatique acquis et emplacement libre', 'Semi-automatic equipment owned and installation space clear')]
  },
  tool: {
    description: { fr: 'Une spatule pour manipuler le contenu du bac de mélange.', en: 'A spatula for working with the contents of the mixing tray.' },
    fields: [field('use', 'Mélange dans le bac de l’atelier', 'Mixing in the workshop tray'),
      field('packaging', 'Une spatule', 'One spatula'),
      field('requirement', 'Outil unique dans l’atelier', 'One of this tool per workshop')]
  },
  scoop: {
    description: { fr: 'Une pelle pour prélever et transférer des têtes au poste de travail.', en: 'A scoop for picking up and transferring buds at the workstation.' },
    fields: [field('use', 'Prélèvement et transfert des têtes', 'Picking up and transferring buds'),
      field('packaging', 'Une pelle à têtes', 'One bud scoop'),
      field('requirement', 'Outil unique dans l’atelier', 'One of this tool per workshop')]
  },
  jars: {
    description: { fr: 'Un contenant vide et réutilisable pour conserver des têtes et les transférer avec le bac.', en: 'An empty reusable container for storing buds and transferring them to and from the tray.' },
    fields: [field('use', 'Conservation et transfert des têtes', 'Storing and transferring buds'),
      field('packaging', 'Un bocal vide', 'One empty jar')]
  },
  cartons: {
    description: { fr: 'Un carton vide pour regrouper et transporter les sachets fermés.', en: 'An empty carton for collecting and carrying sealed pouches.' },
    fields: [field('use', 'Transport des sachets fermés', 'Carrying sealed pouches'),
      field('packaging', 'Un carton vide', 'One empty carton'),
      field('capacity', 'Jusqu’à 30 sachets, selon leur épaisseur', 'Up to 30 pouches, depending on their thickness')]
  },
  diluentA: bottle('A'),
  diluentB: bottle('B'),
  culture: {
    description: { fr: 'La terre de base du poste de culture. Article visible, mais verrouillé dans cet essai.', en: 'Basic soil for the growing station. Visible, but locked in this trial.' },
    fields: [field('use', 'Une plantation dans un pot de culture', 'One planting in a growing pot'),
      field('packaging', 'Une dose pour une plantation', 'One portion for one planting')]
  }
};

function localize(entry, language) {
  return Object.freeze({
    description: entry.description[language],
    fields: Object.freeze(entry.fields.map(({ id, values, status }) => Object.freeze({
      id, label: LABELS[id][language], value: values[language], status
    })))
  });
}

export const PRODUCT_DETAILS = Object.freeze(Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id,
  Object.freeze({ fr: localize(entry, 'fr'), en: localize(entry, 'en') })
])));

export function getProductDetails(productId, language = 'fr') {
  if (typeof productId !== 'string' || !Object.hasOwn(PRODUCT_DETAILS, productId)) return null;
  return PRODUCT_DETAILS[productId][language === 'en' ? 'en' : 'fr'];
}
