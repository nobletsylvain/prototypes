import { getVisualPhenotype } from './visual-genetics.mjs';
import { renderStrainPortrait } from './journal-portrait.mjs';

export const VISUAL_TEXT = {
  fr: { title: 'Un air de famille', inherited: 'Apparence héritée', parent: 'Parent', child: 'Descendant', founder: 'Fondatrice', detail: 'Voir les caractères transmis', note: 'Un caractère de chaque parent par axe. Leur expression compose cette apparence, conservée avec la variété.', boundary: 'Formes et teintes ne prédisent ni rareté, ni effet, ni qualité du lot.', demo: 'Héritage visuel de démonstration · même stade d’observation pour toutes les têtes.', initialized: 'Les apparences ont été initialisées depuis vos lignées. Noms, découvertes et ressources sont conservés.', shape: 'Forme', elongation: 'Allongement', fullness: 'Ampleur', leafWidth: 'Feuilles', foliage: 'Feuillage', pigment: 'Pigmentation', pistil: 'Pistils', frost: 'Surface', compact: 'Tête compacte', spire: 'Tête élancée', cluster: 'Tête ramifiée', olive: 'Vert olive', lime: 'Vert citron', mauve: 'Mauve', short: 'Ramassé', long: 'Étendu', medium: 'Intermédiaire', narrow: 'Fines', wide: 'Larges', sparse: 'Aéré', dense: 'Dense', amber: 'Ambrés', copper: 'Cuivrés', matte: 'Mate', clear: 'Facettes claires' },
  en: { title: 'A family resemblance', inherited: 'Inherited appearance', parent: 'Parent', child: 'Offspring', founder: 'Founder', detail: 'View inherited features', note: 'One character from each parent per axis. Their expression creates this appearance, saved with the variety.', boundary: 'Shape and colour do not predict rarity, effects or batch quality.', demo: 'Demonstration visual inheritance · all heads observed at the same stage.', initialized: 'Appearances were initialized from your lineages. Names, discoveries and resources are preserved.', shape: 'Shape', elongation: 'Length', fullness: 'Fullness', leafWidth: 'Leaves', foliage: 'Foliage', pigment: 'Pigmentation', pistil: 'Pistils', frost: 'Surface', compact: 'Compact head', spire: 'Slender head', cluster: 'Branched head', olive: 'Olive green', lime: 'Lime green', mauve: 'Mauve', short: 'Short', long: 'Extended', medium: 'Intermediate', narrow: 'Narrow', wide: 'Broad', sparse: 'Open', dense: 'Dense', amber: 'Amber', copper: 'Copper', matte: 'Matte', clear: 'Pale facets' },
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.fr || '';
const band = (value, a, b, text) => value < .4 ? text[a] : value > .6 ? text[b] : text.medium;
const EXPRESSION_TEXT={fr:{transmitted:'Transmis',expressed:'Exprimé'},en:{transmitted:'Inherited',expressed:'Expressed'}};
function alleleLabel(axis,value,lang){
 const text=VISUAL_TEXT[lang]||VISUAL_TEXT.fr;
 if(axis==='shape'||axis==='pigment')return text[value];
 const pairs={elongation:['short','long'],fullness:['narrow','wide'],leafWidth:['narrow','wide'],foliage:['sparse','dense'],pistil:['amber','copper'],frost:['matte','clear']};
 return band(value/100,...pairs[axis],text);
}
export function visualFeatures(visual, lang = 'fr') {
  if (!visual) return [];
  const p = getVisualPhenotype(visual), text = VISUAL_TEXT[lang] || VISUAL_TEXT.fr;
  return [
    ['shape', text[p.shape]], ['elongation', band(p.elongation,'short','long',text)],
    ['fullness', band(p.fullness,'narrow','wide',text)], ['leafWidth', band(p.leafWidth,'narrow','wide',text)],
    ['foliage', band(p.foliage,'sparse','dense',text)], ['pigment', p.pigmentBlend.map(id => text[id]).join(' + ')],
    ['pistil', band(p.pistil,'amber','copper',text)], ['frost', band(p.frost,'matte','clear',text)],
  ].map(([id,value]) => ({id,label:text[id],value}));
}
export function visualSearchText(visual) {
  return ['fr','en'].map(lang => visualFeatures(visual,lang).map(f => `${f.label} ${f.value}`).join(' ')).join(' ');
}
export function shortVisualName(visual, lang='fr') {
  if (!visual) return '';
  const p=getVisualPhenotype(visual), text=VISUAL_TEXT[lang]||VISUAL_TEXT.fr;
  return text[p.shape];
}
export function knownPortrait(strain, prefix) {
  return renderStrainPortrait({...strain, known:true}, prefix);
}
export function visualFamilyHTML(strain, parents=[], lang='fr', prefix='family') {
  if (!strain?.visual) return '';
  const text=VISUAL_TEXT[lang]||VISUAL_TEXT.fr;
  const samples=[...parents.filter(p=>p?.visual).map(p=>({strain:p,role:text.parent})),{strain,role:parents.length?text.child:text.founder}];
  const cards=samples.map((sample,i)=>`<div class="visual-relative ${i===samples.length-1?'visual-child':''}"><small>${sample.role}</small>${knownPortrait(sample.strain,`${prefix}-${i}`)}<strong>${escape(local(sample.strain.name,lang)||sample.role)}</strong><span>${escape(shortVisualName(sample.strain.visual,lang))}</span><span>${escape(local(sample.strain.accent,lang))}</span></div>`).join('');
  const features=visualFeatures(strain.visual,lang);
  const orderedParents=[...parents].filter(Boolean).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const expression=EXPRESSION_TEXT[lang]||EXPRESSION_TEXT.fr;
  const rows=features.map(f=>{
    const inherited=strain.visual.alleles[f.id].map((value,i)=>`${orderedParents[i]?local(orderedParents[i].name,lang)+': ':''}${alleleLabel(f.id,value,lang)}`);
    return `<div><dt>${escape(f.label)}</dt><dd><span class="visual-transmitted">${expression.transmitted} · ${escape([...new Set(inherited)].join(' + '))}</span><strong>${expression.expressed} · ${escape(f.value)}</strong></dd></div>`;
  }).join('');
  return `<section class="visual-family"><h3>${parents.length?text.title:text.inherited}</h3><div class="visual-family-grid" style="--relative-count:${samples.length}">${cards}</div><details><summary>${text.detail}</summary><dl>${rows}</dl><p>${text.note}</p></details><p class="visual-boundary">${text.boundary}</p><small>${text.demo}</small></section>`;
}
