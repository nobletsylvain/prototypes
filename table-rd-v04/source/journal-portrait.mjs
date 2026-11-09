import { createHeadGeometry, projectHeadGeometry } from './head-geometry.mjs';

function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.codePointAt(0), 16777619) >>> 0;
  return result.toString(36);
}
const number = value => String(Number(value.toFixed(2)));
function svgOpen(kind, attributes = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 154" width="180" height="154" fill="none" aria-hidden="true" focusable="false" data-portrait-kind="${kind}"${attributes}>`;
}

function sealedPortrait(token) {
  return `${svgOpen('sealed')}<defs><linearGradient id="${token}-sealed" x1="64" y1="28" x2="114" y2="130" gradientUnits="userSpaceOnUse"><stop stop-color="#7b897b"/><stop offset=".5" stop-color="#526258"/><stop offset="1" stop-color="#34483f"/></linearGradient><radialGradient id="${token}-shadow"><stop stop-color="#07130e" stop-opacity=".35"/><stop offset="1" stop-color="#07130e" stop-opacity="0"/></radialGradient></defs><ellipse cx="91" cy="138" rx="45" ry="10" fill="url(#${token}-shadow)"/><path d="M91 23C86 31 79 32 77 43C65 46 64 57 66 65C52 74 57 85 60 91C50 103 61 116 71 120C73 132 101 135 110 122C124 120 132 108 122 96C132 83 121 76 120 69C125 56 115 48 107 46C106 33 97 31 91 23Z" fill="url(#${token}-sealed)" stroke="#a1b19c" stroke-opacity=".25"/><g stroke="#a8b5a4" stroke-opacity=".18" stroke-width="1.2"><path d="M82 46C99 50 104 61 99 71M68 68C83 68 87 81 83 92M104 72C116 80 114 92 103 99M69 103C81 103 87 112 85 124"/><path d="M91 33C84 55 97 65 92 84C86 104 98 116 92 132"/></g><path d="M56 102L122 113L119 126L54 115Z" fill="#a0aa94" fill-opacity=".2" stroke="#c5cbb7" stroke-opacity=".35"/><circle cx="91" cy="111" r="15" fill="#d9dec8" stroke="#eff1df" stroke-opacity=".55"/><text x="91" y="117" fill="#435345" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="400">?</text></svg>`;
}

/** Public genotype only; unknown entries return before any identity or visual read. */
export function renderStrainPortrait(entry, prefix = 'strain-portrait') {
  const rawPrefix = typeof prefix === 'string' ? prefix : 'strain-portrait';
  const safePrefix = rawPrefix.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 36) || 'portrait';
  const token = `sp-${safePrefix}-${hash(rawPrefix)}`;
  if (entry?.known !== true) return sealedPortrait(token);
  const geometry = createHeadGeometry(entry.visual);
  const faces = projectHeadGeometry(geometry);
  const color = geometry.phenotype.color;
  const polygons = faces.map(face => `<path data-facet="${face.index}" d="M${face.points.map(point => point.map(number).join(' ')).join('L')}Z" fill="${face.fill}" stroke="${face.fill}" stroke-width=".45" stroke-linejoin="round"/>`).join('');
  return `${svgOpen('strain', ` data-body-color="${color}" data-shape="${geometry.phenotype.shape}"`)}<defs><radialGradient id="${token}-ground"><stop stop-color="#06110c" stop-opacity=".50"/><stop offset="1" stop-color="#06110c" stop-opacity="0"/></radialGradient></defs><ellipse cx="90" cy="139" rx="48" ry="9" fill="url(#${token}-ground)"/>${polygons}</svg>`;
}
