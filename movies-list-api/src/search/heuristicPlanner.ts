import { MovieSort } from '../contracts/api';
import { SearchPlan, SearchPlanner, emptyFilter } from './types';

/**
 * Rule-based query parser. It is the default planner and the fallback whenever
 * the AI planner is unavailable or fails, so search never stops working.
 */

/** Genre words the parser recognises, plus the spellings people actually type. */
const TAG_ALIASES: Record<string, string> = {
  'sci-fi': 'sci-fi',
  'sci fi': 'sci-fi',
  scifi: 'sci-fi',
  'science fiction': 'sci-fi',
  thriller: 'thriller',
  drama: 'drama',
  comedy: 'comedy',
  horror: 'horror',
  action: 'action',
  animation: 'animation',
  animated: 'animation',
  documentary: 'documentary',
  romance: 'romance',
  romantic: 'romance',
  fantasy: 'fantasy',
  crime: 'crime',
  adventure: 'adventure',
  mystery: 'mystery',
  musical: 'musical',
  western: 'western',
  war: 'war',
  biopic: 'biopic',
  family: 'family',
  noir: 'noir',
  heist: 'heist',
  'coming-of-age': 'coming-of-age',
};

const SORT_PHRASES: Array<[RegExp, MovieSort]> = [
  [/\b(newest|latest|most recent|recently added)\b/, 'newest'],
  [/\b(oldest|earliest)\b/, 'oldest'],
  [/\b(a-?z|alphabetical(ly)?|by title)\b/, 'title'],
  [/\b(newest release|most recent release)\b/, 'year-desc'],
  [/\b(oldest release|earliest release)\b/, 'year-asc'],
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'with',
  'and',
  'or',
  'of',
  'in',
  'on',
  'for',
  'from',
  'to',
  'my',
  'me',
  'show',
  'find',
  'list',
  'movies',
  'movie',
  'films',
  'film',
  'please',
  'that',
  'which',
  'some',
  'any',
  'all',
  'first',
  'sorted',
  'sort',
  'order',
  'by',
  'about',
  'released',
  'release',
]);

const clampYear = (year: number): number => Math.min(2999, Math.max(1878, year));

interface Extracted {
  remaining: string;
  yearFrom: number | null;
  yearTo: number | null;
}

/** Pulls every year expression out of the query, leaving the rest behind. */
const extractYears = (input: string): Extracted => {
  let remaining = input;
  let yearFrom: number | null = null;
  let yearTo: number | null = null;

  const take = (pattern: RegExp, handler: (match: RegExpMatchArray) => void) => {
    const match = remaining.match(pattern);
    if (match) {
      handler(match);
      remaining = remaining.replace(pattern, ' ');
    }
  };

  take(/\bbetween\s+(\d{4})\s+and\s+(\d{4})\b/, (m) => {
    const [a, b] = [clampYear(Number(m[1])), clampYear(Number(m[2]))].sort((x, y) => x - y);
    yearFrom = a;
    yearTo = b;
  });

  take(/\b(?:before|earlier than|prior to)\s+(\d{4})\b/, (m) => {
    yearTo = clampYear(Number(m[1]) - 1);
  });

  take(/\b(?:after|later than)\s+(\d{4})\b/, (m) => {
    yearFrom = clampYear(Number(m[1]) + 1);
  });

  take(/\b(?:since|from)\s+(\d{4})\b/, (m) => {
    yearFrom = clampYear(Number(m[1]));
  });

  // "90s", "1990s", "'90s", "2000s"
  take(/\b'?(\d{2}|\d{4})s\b/, (m) => {
    const raw = m[1];
    const decade =
      raw.length === 4 ? Number(raw) : Number(raw) >= 30 ? 1900 + Number(raw) : 2000 + Number(raw);
    yearFrom = clampYear(decade);
    yearTo = clampYear(decade + 9);
  });

  if (yearFrom === null && yearTo === null) {
    take(/\b(1[89]\d{2}|20\d{2})\b/, (m) => {
      yearFrom = clampYear(Number(m[1]));
      yearTo = yearFrom;
    });
  }

  return { remaining, yearFrom, yearTo };
};

const extractTags = (input: string): { remaining: string; tags: string[] } => {
  let remaining = input;
  const tags = new Set<string>();

  // Longest alias first so "science fiction" wins over "fiction".
  const aliases = Object.keys(TAG_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of aliases) {
    const pattern = new RegExp(`\\b${alias.replace(/[-\s]/g, '[-\\s]')}\\b`, 'g');
    if (pattern.test(remaining)) {
      tags.add(TAG_ALIASES[alias]);
      remaining = remaining.replace(pattern, ' ');
    }
  }

  return { remaining, tags: [...tags] };
};

export const planWithRules = (query: string): SearchPlan => {
  const normalised = query.toLowerCase().trim();
  const filter = emptyFilter();
  let sort: MovieSort = 'newest';
  let remaining = normalised;

  for (const [pattern, candidate] of SORT_PHRASES) {
    if (pattern.test(remaining)) {
      sort = candidate;
      remaining = remaining.replace(pattern, ' ');
    }
  }

  const years = extractYears(remaining);
  filter.yearFrom = years.yearFrom;
  filter.yearTo = years.yearTo;

  const tagged = extractTags(years.remaining);
  filter.tags = tagged.tags;

  const words = tagged.remaining
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  filter.text = words.length > 0 ? words.join(' ') : null;

  return { filter, sort, source: 'rules' };
};

export const heuristicPlanner: SearchPlanner = {
  name: 'rules',
  plan: async (query: string) => planWithRules(query),
};
