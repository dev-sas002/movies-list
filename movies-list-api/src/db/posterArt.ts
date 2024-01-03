/**
 * Generates the poster art used by the seeder.
 *
 * Seed data has to look like a real collection for the app to be worth
 * looking at, and shipping a folder of binary images for that is both heavy
 * and legally murky. These posters are drawn from scratch as SVG: a few
 * kilobytes each, deterministic, and unambiguously ours.
 */

export interface PosterPalette {
  from: string;
  to: string;
  accent: string;
}

export const PALETTES: PosterPalette[] = [
  { from: '#0b2b3a', to: '#123f4f', accent: '#2BD17E' },
  { from: '#2a1230', to: '#54204a', accent: '#f6c667' },
  { from: '#101a3a', to: '#1f3a6e', accent: '#7fd7ff' },
  { from: '#3a1414', to: '#6b2020', accent: '#ffb199' },
  { from: '#132a1c', to: '#1f4a31', accent: '#b6f09c' },
  { from: '#241a0d', to: '#4d3a14', accent: '#ffd479' },
];

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });

/** Naive but adequate word wrap for the poster title. */
const wrap = (text: string, maxChars: number): string[] => {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
};

/** A different geometric motif per poster so the grid does not look cloned. */
const motif = (index: number, accent: string): string => {
  switch (index % 6) {
    case 0:
      return `<circle cx="300" cy="330" r="150" fill="none" stroke="${accent}" stroke-width="3" opacity="0.5"/>
        <circle cx="300" cy="330" r="96" fill="${accent}" opacity="0.12"/>`;
    case 1:
      return `<path d="M120 470 L300 170 L480 470 Z" fill="none" stroke="${accent}" stroke-width="3" opacity="0.55"/>
        <path d="M190 470 L300 286 L410 470 Z" fill="${accent}" opacity="0.12"/>`;
    case 2:
      return Array.from(
        { length: 7 },
        (_, i) =>
          `<line x1="90" y1="${200 + i * 42}" x2="510" y2="${200 + i * 42}" stroke="${accent}" stroke-width="2" opacity="${0.5 - i * 0.05}"/>`
      ).join('');
    case 3:
      return `<rect x="150" y="190" width="300" height="300" fill="none" stroke="${accent}" stroke-width="3" opacity="0.5"/>
        <rect x="210" y="250" width="180" height="180" fill="${accent}" opacity="0.14"/>`;
    case 4:
      return `<path d="M100 470 Q300 120 500 470" fill="none" stroke="${accent}" stroke-width="3" opacity="0.55"/>
        <path d="M100 470 Q300 250 500 470" fill="none" stroke="${accent}" stroke-width="2" opacity="0.3"/>
        <circle cx="300" cy="215" r="26" fill="${accent}" opacity="0.5"/>`;
    default:
      return Array.from(
        { length: 5 },
        (_, i) =>
          `<circle cx="300" cy="330" r="${52 + i * 34}" fill="none" stroke="${accent}" stroke-width="2" opacity="${0.45 - i * 0.07}"/>`
      ).join('');
  }
};

export interface PosterSpec {
  title: string;
  year: number;
  tags: string[];
  index: number;
}

/** Poster geometry, in user units of the 600x900 viewBox. */
const POSTER_WIDTH = 600;
const MARGIN = 60;
const MAX_TITLE_WIDTH = POSTER_WIDTH - MARGIN * 2;
const MAX_FONT_SIZE = 66;
/** Rough advance width of uppercase Helvetica Bold, as a fraction of em. */
const GLYPH_WIDTH_RATIO = 0.62;

/**
 * Largest font size at which every line still fits inside the margins.
 * Without this a long word like "MAD MAX: FURY ROAD" runs off the artwork.
 */
const fitFontSize = (lines: string[]): number => {
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);

  if (longest === 0) {
    return MAX_FONT_SIZE;
  }

  const fitted = MAX_TITLE_WIDTH / (longest * GLYPH_WIDTH_RATIO);

  return Math.max(28, Math.min(MAX_FONT_SIZE, Math.floor(fitted)));
};

/** Renders a 600x900 poster as an SVG string. */
export const renderPoster = ({ title, year, tags, index }: PosterSpec): string => {
  const palette = PALETTES[index % PALETTES.length];
  const lines = wrap(title.toUpperCase(), 13);
  const fontSize = fitFontSize(lines);
  const lineHeight = fontSize + 6;
  const startY = 660 - (lines.length - 1) * lineHeight;

  const titleMarkup = lines
    .map(
      (line, i) =>
        `<text x="${MARGIN}" y="${startY + i * lineHeight}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="1" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join('');

  const tagLine = tags.slice(0, 3).join('  \u00b7  ').toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900" role="img" aria-label="${escapeXml(title)} poster">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.36" r="0.6">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#glow)"/>
  ${motif(index, palette.accent)}
  <rect x="0" y="560" width="600" height="340" fill="#000000" opacity="0.32"/>
  <rect x="${MARGIN}" y="600" width="72" height="4" fill="${palette.accent}"/>
  ${titleMarkup}
  <text x="${MARGIN}" y="${startY + lines.length * lineHeight + 18}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" letter-spacing="3" fill="${palette.accent}">${year}</text>
  <text x="${MARGIN}" y="${startY + lines.length * lineHeight + 52}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" letter-spacing="2" fill="#ffffff" opacity="0.72">${escapeXml(tagLine)}</text>
</svg>`;
};
