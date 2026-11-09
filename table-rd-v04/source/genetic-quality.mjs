// Fictional demonstration quality. Independent of inherited traits, appearance and batch quality.
export const QUALITY_VERSION = 1;
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

export function getQualityOdds(parents) {
  requireCondition(Array.isArray(parents) && parents.length === 2, 'two parents required');
  parents.forEach(parent => tierForScore(parent?.geneticQuality));
  const center = Math.round((parents[0].geneticQuality + parents[1].geneticQuality) / 2);
  const weighted = [];
  for (let offset = -20; offset <= 20; offset++) {
    const score = center + offset;
    if (score >= 0 && score <= 100) weighted.push({ score, weight: 21 - Math.abs(offset) });
  }
  const totalWeight = BigInt(weighted.reduce((sum, item) => sum + item.weight, 0));
  const space = BigInt(QUALITY_SAMPLE_SPACE);
  const allocated = weighted.map(item => ({ ...item, count: Number(BigInt(item.weight) * space / totalWeight), remainder: BigInt(item.weight) * space % totalWeight }));
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
  return { ...exactPercent, version: QUALITY_VERSION, center, counts, outcomes, exactPercent, sampleSpace: QUALITY_SAMPLE_SPACE };
}

export function drawGeneticQuality(odds, qualitySeed) {
  requireCondition(Number.isInteger(qualitySeed) && qualitySeed >= 0 && qualitySeed < QUALITY_SAMPLE_SPACE, 'seed must be uint32');
  const outcome = odds?.outcomes?.find(item => qualitySeed >= item.seedStart && qualitySeed < item.seedEnd);
  requireCondition(outcome, 'seed has no quality outcome');
  return outcome.score;
}
