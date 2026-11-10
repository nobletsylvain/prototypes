// Fictional demonstration quality. Independent of inherited traits, appearance and batch quality.
export const QUALITY_VERSION = 2;
export const QUALITY_PARAMETERS = Object.freeze({
  parentalPercent: 90, surprisePercent: 10, offsetRadius: 20,
  globalTierWeights: Object.freeze({ poor: 10, common: 20, uncommon: 25, rare: 25, epic: 15, legendary: 5 }),
  globalTierFloorsPercent: Object.freeze({ poor: 1, common: 2, uncommon: 2.5, rare: 2.5, epic: 1.5, legendary: .5 }),
});
export const QUALITY_SAMPLE_SPACE = 4294967296;
export const QUALITY_TIERS = Object.freeze([
  { id: 'poor', min: 0, max: 19, color: '#7b8589', name: { fr: 'Pauvre', en: 'Poor' } },
  { id: 'common', min: 20, max: 39, color: '#3f9765', name: { fr: 'Commun', en: 'Common' } },
  { id: 'uncommon', min: 40, max: 59, color: '#408ed5', name: { fr: 'Peu commun', en: 'Uncommon' } },
  { id: 'rare', min: 60, max: 79, color: '#db6257', name: { fr: 'Rare', en: 'Rare' } },
  { id: 'epic', min: 80, max: 99, color: '#a879d4', name: { fr: 'Épique', en: 'Epic' } },
  { id: 'legendary', min: 100, max: 100, color: '#e9bf4f', name: { fr: 'Légendaire', en: 'Legendary' } },
].map(tier => Object.freeze({ ...tier, name: Object.freeze(tier.name) })));

const requireCondition = (condition, message) => { if (!condition) throw Error(`Invalid genetic quality: ${message}`); };
export function tierForScore(score) {
  requireCondition(Number.isInteger(score) && score >= 0 && score <= 100, 'score must be an integer from 0 to 100');
  return QUALITY_TIERS.find(tier => score >= tier.min && score <= tier.max);
}

export function getQualityOdds(parents, version = QUALITY_VERSION) {
  requireCondition(version === 1 || version === 2, 'unsupported quality version');
  requireCondition(Array.isArray(parents) && parents.length === 2, 'two parents required');
  parents.forEach(parent => tierForScore(parent?.geneticQuality));
  const center = Math.round((parents[0].geneticQuality + parents[1].geneticQuality) / 2);
  const parentalWeights = new Map();
  for (let offset = -20; offset <= 20; offset++) {
    const score = center + offset;
    if (score >= 0 && score <= 100) parentalWeights.set(score, 21 - Math.abs(offset));
  }
  const parentalTotal = BigInt([...parentalWeights.values()].reduce((sum, weight) => sum + weight, 0));
  let weighted, totalWeight;
  if (version === 1) {
    // Preserve the original bounded kernel and every exact historical seed interval.
    weighted = [...parentalWeights].map(([score, weight]) => ({ score, weight: BigInt(weight) }));
    totalWeight = parentalTotal;
  } else {
    // A common denominator combines the normalized kernel and per-tier uniform surprise.
    // Tier widths are 20 except Legendary (1); factor 20 keeps every numerator integral.
    totalWeight = 10000n * parentalTotal * 20n;
    weighted = Array.from({ length: 101 }, (_, score) => {
      const tier = tierForScore(score), width = BigInt(tier.max - tier.min + 1);
      const parental = BigInt(QUALITY_PARAMETERS.parentalPercent) * 100n * 20n * BigInt(parentalWeights.get(score) || 0);
      const surprise = BigInt(QUALITY_PARAMETERS.surprisePercent) * BigInt(QUALITY_PARAMETERS.globalTierWeights[tier.id]) * parentalTotal * 20n / width;
      return { score, weight: parental + surprise };
    });
  }
  const space = BigInt(QUALITY_SAMPLE_SPACE);
  const allocated = weighted.map(item => ({ ...item, count: Number(item.weight * space / totalWeight), remainder: item.weight * space % totalWeight }));
  const priority = [...allocated].sort((a, b) => a.remainder === b.remainder ? a.score - b.score : a.remainder > b.remainder ? -1 : 1);
  const remaining = QUALITY_SAMPLE_SPACE - allocated.reduce((sum, item) => sum + item.count, 0);
  for (let index = 0; index < remaining; index++) priority[index].count++;
  let cursor = 0;
  const counts = Object.fromEntries(QUALITY_TIERS.map(tier => [tier.id, 0]));
  const outcomes = allocated.map(item => {
    const seedStart = cursor; cursor += item.count;
    const tier = tierForScore(item.score).id; counts[tier] += item.count;
    return { score: item.score, tier, count: item.count, seedStart, seedEnd: cursor, percent: item.count * 100 / QUALITY_SAMPLE_SPACE };
  });
  const exactPercent = Object.fromEntries(Object.entries(counts).map(([tier, count]) => [tier, count * 100 / QUALITY_SAMPLE_SPACE]));
  return { ...exactPercent, version, center, counts, outcomes, exactPercent, sampleSpace: QUALITY_SAMPLE_SPACE };
}

export function drawGeneticQuality(odds, qualitySeed) {
  requireCondition(Number.isInteger(qualitySeed) && qualitySeed >= 0 && qualitySeed < QUALITY_SAMPLE_SPACE, 'seed must be uint32');
  const outcome = odds?.outcomes?.find(item => qualitySeed >= item.seedStart && qualitySeed < item.seedEnd);
  requireCondition(outcome, 'seed has no quality outcome');
  return outcome.score;
}
