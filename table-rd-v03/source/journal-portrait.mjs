const FALLBACK_COLOR = '#789264';
const PALETTES = Object.freeze({
  mauve: { light: '#ecd9ff', mid: '#c69ae7', dark: '#9168ba' },
  gold: { light: '#fff0bc', mid: '#e8c971', dark: '#b58d3c' },
  soft: { light: '#f2eed7', mid: '#cad8ae', dark: '#a0b28b' },
});

function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.codePointAt(0), 16777619) >>> 0;
  return result.toString(36);
}

function randomSequence(seed) {
  let value = seed >>> 0 || 173;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function validColor(value) {
  if (typeof value !== 'string') return FALLBACK_COLOR;
  const candidate = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(candidate)) return candidate;
  if (/^#[0-9a-f]{3}$/.test(candidate)) return '#' + [...candidate.slice(1)].map(character => character + character).join('');
  return FALLBACK_COLOR;
}

function mix(color, other, amount) {
  const result = [1, 3, 5].map(index => {
    const source = parseInt(color.slice(index, index + 2), 16);
    const destination = parseInt(other.slice(index, index + 2), 16);
    return Math.round(source + (destination - source) * amount).toString(16).padStart(2, '0');
  });
  return '#' + result.join('');
}

function accentKind(accent, rarity) {
  const values = typeof accent === 'string' ? [accent] : accent && typeof accent === 'object' ? [accent.fr, accent.en] : [];
  const text = values.filter(value => typeof value === 'string').join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/mauv|purple|violet/.test(text)) return 'mauve';
  if (/dore|gold/.test(text)) return 'gold';
  if (/doux|douce|soft|neutr/.test(text)) return 'soft';
  return rarity === 'exceptional' ? 'gold' : rarity === 'rare' ? 'mauve' : 'soft';
}

const number = value => String(Number(value.toFixed(2)));

function svgOpen(kind, attributes = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 154" width="180" height="154" fill="none" aria-hidden="true" focusable="false" data-portrait-kind="${kind}"${attributes}>`;
}

function sealedPortrait(token) {
  return `${svgOpen('sealed')}<defs><linearGradient id="${token}-sealed" x1="64" y1="28" x2="114" y2="130" gradientUnits="userSpaceOnUse"><stop stop-color="#7b897b"/><stop offset=".5" stop-color="#526258"/><stop offset="1" stop-color="#34483f"/></linearGradient><radialGradient id="${token}-shadow"><stop stop-color="#07130e" stop-opacity=".35"/><stop offset="1" stop-color="#07130e" stop-opacity="0"/></radialGradient></defs><ellipse cx="91" cy="138" rx="45" ry="10" fill="url(#${token}-shadow)"/><path d="M91 23C86 31 79 32 77 43C65 46 64 57 66 65C52 74 57 85 60 91C50 103 61 116 71 120C73 132 101 135 110 122C124 120 132 108 122 96C132 83 121 76 120 69C125 56 115 48 107 46C106 33 97 31 91 23Z" fill="url(#${token}-sealed)" stroke="#a1b19c" stroke-opacity=".25"/><g stroke="#a8b5a4" stroke-opacity=".18" stroke-width="1.2"><path d="M82 46C99 50 104 61 99 71M68 68C83 68 87 81 83 92M104 72C116 80 114 92 103 99M69 103C81 103 87 112 85 124"/><path d="M91 33C84 55 97 65 92 84C86 104 98 116 92 132"/></g><path d="M56 102L122 113L119 126L54 115Z" fill="#a0aa94" fill-opacity=".2" stroke="#c5cbb7" stroke-opacity=".35"/><circle cx="91" cy="111" r="15" fill="#d9dec8" stroke="#eff1df" stroke-opacity=".55"/><text x="91" y="117" fill="#435345" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="400">?</text></svg>`;
}

/** Purely illustrative public portrait. Callers provide a unique prefix per SVG occurrence. */
export function renderStrainPortrait(entry, prefix = 'strain-portrait') {
  const rawPrefix = typeof prefix === 'string' ? prefix : 'strain-portrait';
  const safePrefix = rawPrefix.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 36) || 'portrait';
  const prefixToken = `sp-${safePrefix}-${hash(rawPrefix)}`;
  // Unknown trials must return before reading any phenotype or identity field.
  if (entry?.known !== true) return sealedPortrait(prefixToken);

  const identity = typeof entry.id === 'string' || typeof entry.id === 'number' ? String(entry.id) : 'public-strain';
  const identityHash = hash(identity);
  const token = `${prefixToken}-${identityHash}`;
  const random = randomSequence(parseInt(identityHash, 36));
  const color = validColor(entry.color);
  const kind = accentKind(entry.accent, entry.rarity);
  const palette = PALETTES[kind];
  const dark = mix(color, '#162d22', 0.64);
  const shade = mix(color, '#29402e', 0.34);
  const light = mix(color, '#edf0bf', 0.31);
  const rim = mix(color, '#eff3c7', 0.49);
  const leafDark = mix(color, '#183c2a', 0.55);
  const lean = (random() - 0.5) * 9;
  const width = 0.92 + random() * 0.16;
  const tilt = (random() - 0.5) * 8;
  const parts = [svgOpen('strain', ` data-body-color="${color}" data-accent="${kind}"`)];

  parts.push(`<defs><radialGradient id="${token}-ground"><stop stop-color="#06110c" stop-opacity=".48"/><stop offset="1" stop-color="#06110c" stop-opacity="0"/></radialGradient><radialGradient id="${token}-aura"><stop stop-color="${palette.mid}" stop-opacity=".14"/><stop offset="1" stop-color="${palette.mid}" stop-opacity="0"/></radialGradient><radialGradient id="${token}-bract" cx="29%" cy="22%" r="81%"><stop stop-color="${light}"/><stop offset=".34" stop-color="${color}"/><stop offset=".72" stop-color="${shade}"/><stop offset="1" stop-color="${dark}"/></radialGradient><radialGradient id="${token}-bract-light" cx="23%" cy="16%" r="87%"><stop stop-color="${rim}"/><stop offset=".3" stop-color="${light}"/><stop offset=".68" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></radialGradient><linearGradient id="${token}-core" x1="66" y1="37" x2="115" y2="125" gradientUnits="userSpaceOnUse"><stop stop-color="${color}"/><stop offset=".42" stop-color="${shade}"/><stop offset="1" stop-color="${dark}"/></linearGradient><linearGradient id="${token}-leaf" x1="-8" y1="-34" x2="8" y2="5" gradientUnits="userSpaceOnUse"><stop stop-color="${light}"/><stop offset=".38" stop-color="${color}"/><stop offset="1" stop-color="${leafDark}"/></linearGradient><radialGradient id="${token}-crystal"><stop stop-color="${palette.light}"/><stop offset=".4" stop-color="${palette.mid}"/><stop offset="1" stop-color="${palette.dark}" stop-opacity=".12"/></radialGradient></defs>`);
  parts.push(`<ellipse cx="91" cy="140" rx="47" ry="10" fill="url(#${token}-ground)"/><ellipse cx="91" cy="83" rx="65" ry="65" fill="url(#${token}-aura)"/><g transform="translate(${number(lean)} 0) rotate(${number(tilt)} 90 93)">`);

  // Slender rear leaves give the head an irregular botanical outline.
  const leaves = [[65, 109, -51, 1.2], [58, 93, -72, 0.92], [70, 73, -54, 0.82], [107, 105, 48, 1.12], [119, 88, 63, 0.91], [106, 64, 44, 0.72], [82, 117, -21, 0.88]];
  leaves.forEach(([x, y, rotation, scale]) => {
    const angle = rotation + (random() - 0.5) * 12;
    parts.push(`<g transform="translate(${x} ${y}) rotate(${number(angle)}) scale(${number(scale)})"><path d="M0 5C-4-4-8-14-6-23L-8-26L-4-28L-4-33L-1-32L1-40C7-29 9-13 0 5Z" fill="url(#${token}-leaf)" stroke="${leafDark}" stroke-width=".5"/><path d="M0 3L0-32M0-11L-4-18M0-18L4-25" stroke="${rim}" stroke-opacity=".3" stroke-width=".55"/></g>`);
  });
  parts.push(`<path d="M89 132C86 138 84 140 85 145L91 145L96 130Z" fill="${leafDark}"/><path d="M88 25C83 30 79 42 75 48C66 56 59 71 58 87C56 105 65 123 79 131C92 139 112 129 119 116C129 96 120 74 111 59C105 48 100 33 94 26C92 22 90 22 88 25Z" fill="url(#${token}-core)"/>`);

  // Each asymmetric bract has its own volume and a fine leaf vein.
  const rows = [3, 4, 5, 6, 6, 5, 4];
  rows.forEach((count, row) => {
    const y = 35 + row * 13.3;
    const spread = (row < 4 ? 9 + row * 5.7 : 33 - (row - 3) * 3.9) * width;
    for (let index = 0; index < count; index++) {
      const x = 90 + ((index / Math.max(1, count - 1)) * 2 - 1) * spread + (random() - 0.5) * 5;
      const cy = y + Math.sin(index * 2.3 + row) * 3.8;
      const bractWidth = 5.2 + row * 0.38 + random() * 3.3;
      const bractHeight = 8 + random() * 4.5;
      const rotation = (random() - 0.5) * 43;
      const gradient = (row + index) % 4 === 0 ? 'bract-light' : 'bract';
      parts.push(`<g transform="translate(${number(x)} ${number(cy)}) rotate(${number(rotation)})"><path d="M0 ${number(-bractHeight)}C${number(bractWidth * .75)} ${number(-bractHeight * .68)} ${number(bractWidth * 1.12)} ${number(bractHeight * .16)} ${number(bractWidth * .36)} ${number(bractHeight * .73)}C${number(-bractWidth * .08)} ${number(bractHeight * .99)} ${number(-bractWidth * .95)} ${number(bractHeight * .4)} ${number(-bractWidth * .69)} ${number(-bractHeight * .08)}C${number(-bractWidth * .61)} ${number(-bractHeight * .63)} ${number(-bractWidth * .22)} ${number(-bractHeight * .8)} 0 ${number(-bractHeight)}Z" fill="url(#${token}-${gradient})" stroke="${dark}" stroke-opacity=".46" stroke-width=".48"/><path d="M-.4 ${number(bractHeight * .5)}Q${number(-bractWidth * .18)} ${number(-bractHeight * .12)} 0 ${number(-bractHeight * .69)}" stroke="${rim}" stroke-opacity=".21" stroke-width=".6"/></g>`);
      if ((row + index) % 3 === 0 && kind !== 'soft') {
        parts.push(`<g transform="translate(${number(x)} ${number(cy)}) rotate(${number(rotation)})"><path d="M${number(-bractWidth * .49)} ${number(bractHeight * .05)}Q${number(-bractWidth * .52)} ${number(-bractHeight * .54)} ${number(-bractWidth * .08)} ${number(-bractHeight * .78)}" stroke="${palette.mid}" stroke-width="1.5" stroke-opacity=".72" stroke-linecap="round"/><path d="M${number(-bractWidth * .37)} ${number(-bractHeight * .38)}L${number(-bractWidth * .15)} ${number(-bractHeight * .66)}" stroke="${palette.light}" stroke-width=".65" stroke-opacity=".74" stroke-linecap="round"/></g>`);
      }
    }
  });

  // Warm pistils and tiny surface grains provide detail without external textures.
  for (let index = 0; index < 32; index++) {
    const y = 34 + random() * 91;
    const bodyWidth = Math.sin((y - 22) / 119 * Math.PI) * 31 * width;
    const x = 90 + (random() * 2 - 1) * bodyWidth;
    const direction = random() < .5 ? -1 : 1;
    const reach = 4 + random() * 6;
    parts.push(`<path d="M${number(x)} ${number(y)}Q${number(x + direction * reach)} ${number(y - 6)} ${number(x + direction * reach * .58)} ${number(y - 11)}" stroke="${index % 3 ? '#c99a60' : '#efd09a'}" stroke-opacity="${number(.48 + random() * .35)}" stroke-width="${number(.55 + random() * .35)}" stroke-linecap="round"/>`);
  }
  for (let index = 0; index < 132; index++) {
    const y = 29 + random() * 103;
    const bodyWidth = Math.sin((y - 22) / 119 * Math.PI) * 30 * width;
    const x = 90 + (random() * 2 - 1) * bodyWidth;
    parts.push(`<circle cx="${number(x)}" cy="${number(y)}" r="${number(.3 + random() * .62)}" fill="${index % 3 ? light : dark}" fill-opacity="${number(.17 + random() * .25)}"/>`);
  }

  // Accent follows the recorded public appearance; sparkle placement is illustrative.
  for (let index = 0; index < 52; index++) {
    const y = 31 + random() * 98;
    const bodyWidth = Math.sin((y - 22) / 119 * Math.PI) * 30 * width;
    const x = 90 + (random() * 2 - 1) * bodyWidth;
    const radius = .45 + random() * 1.02;
    parts.push(`<path d="M${number(x)} ${number(y + 1.8)}L${number(x - .45)} ${number(y)}" stroke="${palette.light}" stroke-opacity=".32" stroke-width=".45"/><circle cx="${number(x - .45)}" cy="${number(y)}" r="${number(radius)}" fill="url(#${token}-crystal)"/><circle cx="${number(x - .75)}" cy="${number(y - .35)}" r="${number(radius * .3)}" fill="${palette.light}" fill-opacity=".88"/>`);
  }
  for (let index = 0; index < 7; index++) {
    const y = 39 + random() * 82;
    const bodyWidth = Math.sin((y - 22) / 119 * Math.PI) * 25;
    const x = 90 + (random() * 2 - 1) * bodyWidth;
    const reach = 1.7 + random() * 2;
    parts.push(`<path d="M${number(x)} ${number(y - reach)}L${number(x + .55)} ${number(y - .55)}L${number(x + reach)} ${number(y)}L${number(x + .55)} ${number(y + .55)}L${number(x)} ${number(y + reach)}L${number(x - .55)} ${number(y + .55)}L${number(x - reach)} ${number(y)}L${number(x - .55)} ${number(y - .55)}Z" fill="${palette.light}" fill-opacity=".82"/>`);
  }
  parts.push('</g></svg>');
  return parts.join('');
}
