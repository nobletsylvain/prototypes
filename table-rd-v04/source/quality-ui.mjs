import { PARENTS, TRAITS, getConfiguration } from './model.mjs';
import { QUALITY_TIERS, tierForScore } from './genetic-quality.mjs';
import { visualFeatures } from './visual-ui.mjs';
import { renderStrainPortrait } from './journal-portrait.mjs';

export const QUALITY_TEXT = {
  fr: {
    quality: 'Qualité génétique', legend: 'Les six paliers', hidden: 'Non révélé', certificate: 'Certificat d’analyse',
    workshop: 'TABLE DE R&D · HERBIER', demo: 'Démonstration', test: 'Mode test', unnamed: 'Découverte sans nom',
    identity: 'Identité de la variété', parents: 'Parents du croisement', parent: 'Parent', center: 'Centre parental', delta: 'Écart obtenu',
    inherited: 'Potentiels hérités', activated: 'Traits activés', noneInherited: 'Aucun potentiel hérité', noneActive: 'Aucun trait activé',
    notConfigured: 'Disponible après conservation', slots: 'Emplacements', appearance: 'Apparence exprimée', batch: 'Lot observé',
    batchIdentity: 'Identité du lot', batchQuality: 'Qualité du lot', batchStandard: 'Standard de démonstration', quantity: 'Quantité', specimen: 'spécimen(s)',
    unknown: 'Non documenté', signature: 'Signature', noSignature: 'Non signée', generation: 'Génération',
    revealed: 'Révélée', kept: 'Conservée', archived: 'Archivée', export: 'Exporter le certificat',
    boundary: 'Le score génétique, les caractères hérités et la qualité du lot sont distincts.',
    note: 'Relevé fictif de démonstration. Aucune analyse chimique ou de laboratoire.',
  },
  en: {
    quality: 'Genetic quality', legend: 'The six tiers', hidden: 'Unrevealed', certificate: 'Certificate of Analysis',
    workshop: 'R&D TABLE · HERBARIUM', demo: 'Demonstration', test: 'Test mode', unnamed: 'Unnamed discovery',
    identity: 'Variety identity', parents: 'Cross parents', parent: 'Parent', center: 'Parental centre', delta: 'Result difference',
    inherited: 'Inherited potentials', activated: 'Activated traits', noneInherited: 'No inherited potential', noneActive: 'No activated trait',
    notConfigured: 'Available after keeping', slots: 'Slots', appearance: 'Expressed appearance', batch: 'Observed batch',
    batchIdentity: 'Batch identity', batchQuality: 'Batch quality', batchStandard: 'Demonstration standard', quantity: 'Quantity', specimen: 'specimen(s)',
    unknown: 'Not documented', signature: 'Signature', noSignature: 'Unsigned', generation: 'Generation',
    revealed: 'Revealed', kept: 'Kept', archived: 'Archived', export: 'Export certificate',
    boundary: 'Genetic score, inherited features and batch quality are separate.',
    note: 'Fictional demonstration record. No chemical or laboratory analysis.',
  },
};
const language = value => value === 'en' ? 'en' : 'fr';
const local = (value, lang) => typeof value === 'string' ? value : value?.[lang] ?? value?.fr ?? value?.en ?? '';
const escape = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const validScore = value => Number.isInteger(value) && value >= 0 && value <= 100;
const unique = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string'))];
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const signed = value => value === null ? '—' : value > 0 ? `+${value}` : String(value);

export function tierBadge(score, lang = 'fr') {
  const selected = language(lang), text = QUALITY_TEXT[selected];
  if (!validScore(score)) return `<span class="tier-badge tier-unknown">${text.hidden}</span>`;
  const tier = tierForScore(score);
  return `<span class="tier-badge tier-${tier.id}" style="--tier-color:${tier.color}" title="${text.quality}"><i aria-hidden="true"></i><span>${escape(tier.name[selected])}</span><strong>${score}<small>/100</small></strong></span>`;
}

export function qualityLegend(lang = 'fr') {
  const selected = language(lang), text = QUALITY_TEXT[selected];
  return `<div class="quality-legend" role="list" aria-label="${text.legend}">${QUALITY_TIERS.map(tier => `<span class="quality-legend-item" role="listitem" style="--tier-color:${tier.color}"><i aria-hidden="true"></i><span>${escape(tier.name[selected])}</span><b>${tier.min === tier.max ? tier.min : `${tier.min}–${tier.max}`}</b></span>`).join('')}</div>`;
}

/** A detached public snapshot. The phase check precedes every result/configuration read. */
export function buildCertificate(state, trialId, lang = 'fr', testMode = false) {
  const trial = Array.isArray(state?.trials) ? state.trials.find(item => item.id === trialId) : null;
  if (!trial || !['revealed', 'kept', 'archived'].includes(trial.phase)) return null;
  const selected = language(lang), text = QUALITY_TEXT[selected];
  const varieties = Array.isArray(state.varieties) ? state.varieties : [];
  const kept = varieties.find(variety => variety.trialId === trial.id);
  const result = kept || trial.result;
  if (!result || typeof result.id !== 'string' || !validScore(result.geneticQuality)) return null;
  const tier = tierForScore(result.geneticQuality), inheritedIds = unique(result.potentialIds);
  const configuration = kept ? getConfiguration(state, kept.id) : null;
  const activeIds = unique(configuration?.activeIds).filter(id => inheritedIds.includes(id));
  const trait = id => ({ id, label: local(TRAITS.find(item => item.id === id)?.name, selected) || id });
  const known = [...PARENTS, ...varieties];
  const parents = unique(trial.parentIds || result.parents).map(id => {
    const parent = known.find(item => item.id === id);
    return { id, name: local(parent?.name, selected) || text.parent, geneticQuality: validScore(parent?.geneticQuality) ? parent.geneticQuality : null };
  });
  const storedCenter = trial.odds?.qualityOdds?.center;
  const center = validScore(storedCenter) ? storedCenter : parents.length === 2 && parents.every(parent => validScore(parent.geneticQuality))
    ? Math.round((parents[0].geneticQuality + parents[1].geneticQuality) / 2) : null;
  const visual = result.visual ? structuredClone(result.visual) : null;
  const batch = trial.batch || {};
  return freeze({
    id: `COA-V04-${result.id}`, version: 4, trialId: trial.id, strainId: result.id,
    name: local(result.name, selected) || text.unnamed, signature: local(result.signature, selected),
    lang: selected, demo: true, testMode: !!testMode, status: trial.phase,
    geneticQuality: result.geneticQuality, tier: { id: tier.id, name: tier.name[selected], color: tier.color },
    generation: Number.isInteger(result.generation) && result.generation >= 0 ? result.generation : null,
    parents, center, delta: center === null ? null : result.geneticQuality - center,
    inherited: inheritedIds.map(trait), activated: activeIds.map(trait), configurable: !!kept,
    slotCapacity: Number.isInteger(result.slotCapacity) ? result.slotCapacity : null,
    visual, features: visual ? visualFeatures(visual, selected) : [],
    batch: { id: typeof batch.id === 'string' ? batch.id : '', quality: typeof batch.quality === 'string' ? batch.quality : '',
      quantity: Number.isFinite(batch.quantity) ? batch.quantity : null, unit: typeof batch.unit === 'string' ? batch.unit : '' },
  });
}

const batchQuality = (certificate, text) => certificate.batch?.quality === 'demo-standard' ? text.batchStandard : certificate.batch?.quality || text.unknown;
const batchQuantity = (certificate, text) => `${certificate.batch?.quantity ?? '—'} ${certificate.batch?.unit === 'specimen' ? text.specimen : certificate.batch?.unit || ''}`.trim();
const traitLabels = (values, empty) => values?.length ? values.map(value => value.label).join(' · ') : empty;

export function certificateHTML(certificate) {
  if (!certificate) return '';
  const text = QUALITY_TEXT[language(certificate.lang)];
  const portrait = renderStrainPortrait({ known: true, visual: certificate.visual }, `coa-html-${certificate.id}`);
  const traits = (items, fallback) => items.length ? items.map(item => `<span class="coa-trait">${escape(item.label)}</span>`).join('') : `<span class="coa-muted">${fallback}</span>`;
  return `<article class="coa-card"><div class="coa-topline"><span>${text.workshop}</span><strong>${certificate.testMode ? text.test : text.demo}</strong></div>
    <div class="coa-hero"><div><p class="coa-kicker">${text.certificate}</p><h2>${escape(certificate.name)}</h2>${tierBadge(certificate.geneticQuality, certificate.lang)}<p class="coa-identity">${escape(certificate.id)}<br><span>${text.identity} · ${escape(certificate.strainId)}</span></p></div><div class="coa-portrait">${portrait}</div></div>
    <div class="coa-summary"><span>${text.center}<b>${escape(certificate.center ?? '—')}<small>/100</small></b></span><span>${text.delta}<b>${escape(signed(certificate.delta))}</b></span><span>${text.generation}<b>${escape(certificate.generation ?? '—')}</b></span></div>
    <section class="coa-section"><h3>${text.parents}</h3><div class="coa-parents">${certificate.parents.map(parent => `<div><strong>${escape(parent.name)}</strong><small>${escape(parent.id)}</small>${tierBadge(parent.geneticQuality, certificate.lang)}</div>`).join('')}</div></section>
    <section class="coa-section coa-trait-columns"><div><h3>${text.inherited}</h3><div class="coa-traits">${traits(certificate.inherited, text.noneInherited)}</div></div><div><h3>${text.activated}</h3><div class="coa-traits">${traits(certificate.activated, certificate.configurable ? text.noneActive : text.notConfigured)}</div><small class="coa-muted">${certificate.activated.length} / ${certificate.slotCapacity ?? '—'} · ${text.slots}</small></div></section>
    <section class="coa-section"><h3>${text.appearance}</h3><dl class="coa-features">${certificate.features.map(feature => `<div><dt>${escape(feature.label)}</dt><dd>${escape(feature.value)}</dd></div>`).join('')}</dl></section>
    <section class="coa-section coa-batch"><h3>${text.batch}</h3><dl><div><dt>${text.batchIdentity}</dt><dd>${escape(certificate.batch.id || text.unknown)}</dd></div><div><dt>${text.quantity}</dt><dd>${escape(batchQuantity(certificate, text))}</dd></div><div><dt>${text.batchQuality}</dt><dd>${escape(batchQuality(certificate, text))}</dd></div></dl><p>${text.boundary}</p></section>
    <div class="coa-signature"><span>${text.signature}</span><strong>${escape(certificate.signature || text.noSignature)}</strong><small>${escape(text[certificate.status] || certificate.status)}</small></div>
    <p class="coa-disclaimer">${text.note}</p><button type="button" class="coa-export" data-export-coa="${escape(certificate.trialId)}">${text.export} ↓</button></article>`;
}

function wrap(value, width, size) {
  const limit = Math.max(8, Math.floor(width / (size * .56))), words = String(value ?? '').trim().split(/\s+/);
  const lines = []; let line = '';
  for (const word of words) {
    const chunks = Array.from(word); while (chunks.length > limit) { if (line) { lines.push(line); line = ''; } lines.push(chunks.splice(0, limit).join('')); }
    const rest = chunks.join(''); if (!rest) continue;
    if (line && line.length + rest.length + 1 > limit) { lines.push(line); line = rest; } else line = line ? `${line} ${rest}` : rest;
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

/** Standalone paper record: all supplied text is escaped, and no external SVG content is loaded. */
export function certificateSVG(certificate) {
  if (!certificate) return '';
  const text = QUALITY_TEXT[language(certificate.lang)], tier = validScore(certificate.geneticQuality) ? tierForScore(certificate.geneticQuality) : QUALITY_TIERS[0];
  const elements = [], left = 64, right = 896; let y = 82;
  const lines = (value, x, top, width = 768, size = 18, fill = '#334936', family = 'Arial', spacing = 1.4) => {
    const content = wrap(value, width, size);
    elements.push(`<text x="${x}" y="${top}" fill="${fill}" font-family="${family}" font-size="${size}">${content.map((line, index) => `<tspan x="${x}" dy="${index ? size * spacing : 0}">${escape(line)}</tspan>`).join('')}</text>`);
    return content.length * size * spacing;
  };
  const rule = () => { elements.push(`<path d="M${left} ${y}H${right}" stroke="#bbc4a8"/>`); y += 32; };
  const section = label => { rule(); y += lines(label, left, y, 800, 21, '#526647', 'Georgia') + 10; };
  y += lines(text.workshop, left, y, 580, 14, '#7b866e');
  elements.push(`<text x="${right}" y="82" text-anchor="end" font-family="Arial" font-size="14" fill="#7b866e">${escape(certificate.testMode ? text.test : text.demo)}</text>`);
  y += 27; y += lines(text.certificate, left, y, 570, 18, '#7b866e');
  y += lines(certificate.name, left, y + 9, 560, 36, '#2c4432', 'Georgia');
  y += 20;
  elements.push(`<rect x="${left}" y="${y - 23}" width="390" height="45" rx="8" fill="${tier.color}" fill-opacity=".14" stroke="${tier.color}"/>`);
  y += lines(`${tier.name[language(certificate.lang)]} · ${certificate.geneticQuality}/100`, left + 18, y + 6, 350, 23, '#30462f') + 25;
  elements.push(`<g transform="translate(690 119) scale(1.13)">${renderStrainPortrait({ known: true, visual: certificate.visual }, `coa-svg-${certificate.id}`)}</g>`);
  y += lines(certificate.id, left, y, 800, 15, '#77836a');
  y += lines(`${text.identity} · ${certificate.strainId}`, left, y, 800, 15, '#77836a') + 22;
  y += lines(`${text.center} ${certificate.center ?? '—'}/100     ${text.delta} ${signed(certificate.delta)}     ${text.generation} ${certificate.generation ?? '—'}`, left, y, 800, 18) + 15;
  section(text.parents);
  for (const parent of certificate.parents) {
    y += lines(`${parent.name} · ${parent.id} · ${parent.geneticQuality ?? '—'}/100`, left, y, 800, 18) + 5;
  }
  y += 13; section(text.inherited);
  y += lines(traitLabels(certificate.inherited, text.noneInherited), left, y) + 15;
  y += lines(`${text.activated} · ${traitLabels(certificate.activated, certificate.configurable ? text.noneActive : text.notConfigured)}`, left, y) + 7;
  y += lines(`${certificate.activated.length} / ${certificate.slotCapacity ?? '—'} · ${text.slots}`, left, y, 800, 15, '#77836a') + 17;
  section(text.appearance);
  for (let index = 0; index < certificate.features.length; index += 2) {
    const heights = certificate.features.slice(index, index + 2).map((feature, column) => lines(`${feature.label} · ${feature.value}`, left + column * 420, y, 390, 17));
    y += Math.max(...heights) + 10;
  }
  y += 12; section(text.batch);
  y += lines(`${certificate.batch.id || text.unknown} · ${batchQuantity(certificate, text)}`, left, y) + 7;
  y += lines(`${text.batchQuality} · ${batchQuality(certificate, text)}`, left, y) + 10;
  y += lines(text.boundary, left, y, 800, 15, '#77836a') + 20;
  rule(); y += lines(`${text.signature} · ${certificate.signature || text.noSignature}`, left, y, 800, 21, '#526647', 'Georgia') + 15;
  y += lines(text.note, left, y, 800, 14, '#77836a') + 40;
  const height = Math.ceil(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-label="${escape(text.certificate)}"><rect width="960" height="${height}" rx="16" fill="#f5f2e6"/><rect x="24" y="24" width="912" height="${height - 48}" rx="10" fill="none" stroke="#b6c09f"/><path d="M64 36H896" stroke="${tier.color}" stroke-width="4"/>${elements.join('')}</svg>`;
}
