import { MovieSort, SearchInterpretation } from '../contracts/api';
import { MovieFilter } from '../repositories/movieRepository';

/** The structured query a free-text search resolves to. */
export interface SearchPlan {
  filter: MovieFilter;
  sort: MovieSort;
  source: SearchInterpretation['source'];
}

/**
 * The extension seam of this project: anything that can turn a human sentence
 * into a structured movie query. A rule-based implementation ships as the
 * always-available default; an Anthropic-backed one takes over when an API key
 * is configured. A future provider (a different model, a local classifier, a
 * remote search service) only has to satisfy this interface.
 */
export interface SearchPlanner {
  /** Stable identifier, surfaced in `/health` and in test assertions. */
  readonly name: string;
  plan(query: string): Promise<SearchPlan>;
}

export const emptyFilter = (): MovieFilter => ({
  text: null,
  yearFrom: null,
  yearTo: null,
  tags: [],
});

/** Builds the user-facing description of a plan. */
export const describePlan = (plan: SearchPlan): SearchInterpretation => {
  const parts: string[] = [];

  if (plan.filter.text) parts.push(`matching “${plan.filter.text}”`);
  if (plan.filter.tags.length > 0) parts.push(`tagged ${plan.filter.tags.join(', ')}`);

  const { yearFrom, yearTo } = plan.filter;
  if (yearFrom !== null && yearTo !== null) {
    parts.push(yearFrom === yearTo ? `from ${yearFrom}` : `from ${yearFrom}–${yearTo}`);
  } else if (yearFrom !== null) {
    parts.push(`from ${yearFrom} onwards`);
  } else if (yearTo !== null) {
    parts.push(`up to ${yearTo}`);
  }

  const SORT_LABELS: Record<MovieSort, string> = {
    newest: 'newest first',
    oldest: 'oldest first',
    title: 'by title',
    'year-desc': 'newest release first',
    'year-asc': 'oldest release first',
  };

  parts.push(SORT_LABELS[plan.sort]);

  return {
    source: plan.source,
    text: plan.filter.text,
    yearFrom: plan.filter.yearFrom,
    yearTo: plan.filter.yearTo,
    tags: plan.filter.tags,
    sort: plan.sort,
    summary: `Showing movies ${parts.join(', ')}.`,
  };
};
