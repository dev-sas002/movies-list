import { createAnthropicPlanner, createSearchPlanner, heuristicPlanner } from '../search';
import { planWithRules } from '../search/heuristicPlanner';
import { describePlan } from '../search/types';

describe('rule-based planner', () => {
  it('resolves a decade into explicit year bounds', () => {
    const plan = planWithRules('90s sci-fi');

    expect(plan.filter.yearFrom).toBe(1990);
    expect(plan.filter.yearTo).toBe(1999);
    expect(plan.filter.tags).toEqual(['sci-fi']);
    expect(plan.source).toBe('rules');
  });

  it.each([
    ["'80s thrillers", 1980, 1989],
    ['2000s comedies', 2000, 2009],
    ['1970s horror', 1970, 1979],
  ])('understands %s', (query, from, to) => {
    const plan = planWithRules(query);
    expect([plan.filter.yearFrom, plan.filter.yearTo]).toEqual([from, to]);
  });

  it('understands open and closed year ranges', () => {
    expect(planWithRules('anything after 2010')).toMatchObject({
      filter: expect.objectContaining({ yearFrom: 2011, yearTo: null }),
    });
    expect(planWithRules('made before 1980')).toMatchObject({
      filter: expect.objectContaining({ yearTo: 1979, yearFrom: null }),
    });
    expect(planWithRules('between 1994 and 1999')).toMatchObject({
      filter: expect.objectContaining({ yearFrom: 1994, yearTo: 1999 }),
    });
    expect(planWithRules('since 2015')).toMatchObject({
      filter: expect.objectContaining({ yearFrom: 2015 }),
    });
  });

  it('pins a single year', () => {
    const plan = planWithRules('1999');
    expect([plan.filter.yearFrom, plan.filter.yearTo]).toEqual([1999, 1999]);
  });

  it.each([
    ['science fiction', 'sci-fi'],
    ['sci fi', 'sci-fi'],
    ['scifi', 'sci-fi'],
    ['animated', 'animation'],
    ['romantic', 'romance'],
  ])('normalises the genre word %s', (word, tag) => {
    expect(planWithRules(word).filter.tags).toEqual([tag]);
  });

  it.each([
    ['newest first', 'newest'],
    ['oldest first', 'oldest'],
    ['alphabetically', 'title'],
    ['sorted by title', 'title'],
  ])('reads the ordering hint in %s', (query, sort) => {
    expect(planWithRules(query).sort).toBe(sort);
  });

  it('keeps the distinguishing words as free text and drops filler', () => {
    const plan = planWithRules('show me 90s sci-fi movies with a female lead');

    expect(plan.filter.text).toBe('female lead');
    expect(plan.filter.tags).toEqual(['sci-fi']);
    expect(plan.filter.yearFrom).toBe(1990);
  });

  it('has no text component when the query is only genre and years', () => {
    expect(planWithRules('90s sci-fi').filter.text).toBeNull();
  });

  it('defaults to newest-first with no filters for an empty query', () => {
    const plan = planWithRules('   ');

    expect(plan).toEqual({
      filter: { text: null, yearFrom: null, yearTo: null, tags: [] },
      sort: 'newest',
      source: 'rules',
    });
  });

  it('is exposed as an async planner named "rules"', async () => {
    expect(heuristicPlanner.name).toBe('rules');
    await expect(heuristicPlanner.plan('90s')).resolves.toMatchObject({ source: 'rules' });
  });
});

describe('describePlan', () => {
  it('renders a sentence a user can check their query against', () => {
    const interpretation = describePlan(
      planWithRules('90s sci-fi with a female lead, oldest first')
    );

    expect(interpretation.summary).toBe(
      'Showing movies matching “female lead”, tagged sci-fi, from 1990–1999, oldest first.'
    );
  });

  it('renders single-year and open-ended ranges', () => {
    expect(describePlan(planWithRules('1999')).summary).toContain('from 1999');
    expect(describePlan(planWithRules('after 2010')).summary).toContain('from 2011 onwards');
    expect(describePlan(planWithRules('before 1980')).summary).toContain('up to 1979');
  });
});

describe('registry', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it('falls back to the rule-based planner when no API key is configured', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(createSearchPlanner().name).toBe('rules');
  });

  it('selects the AI planner when a key is present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-not-a-real-key';

    expect(createSearchPlanner().name).toBe('ai');
  });
});

describe('AI planner', () => {
  // No test in this file makes a network call: the Anthropic client is always
  // injected, so the suite never spends money and never needs a key.
  const parse = jest.fn();
  const createClient = async () => ({ messages: { parse } });

  beforeEach(() => {
    parse.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const planner = () =>
    createAnthropicPlanner({ fallback: heuristicPlanner, createClient, cacheTtlMs: 60_000 });

  it('turns the model output into a filter', async () => {
    parse.mockResolvedValue({
      parsed_output: {
        text: 'female lead',
        year_from: 1990,
        year_to: 1999,
        tags: ['Sci-Fi', ' '],
        sort: 'oldest',
      },
    });

    const plan = await planner().plan('90s sci-fi with a female lead');

    expect(plan).toEqual({
      filter: { text: 'female lead', yearFrom: 1990, yearTo: 1999, tags: ['sci-fi'] },
      sort: 'oldest',
      source: 'ai',
    });
  });

  it('asks the configured model with the query as the only user content', async () => {
    parse.mockResolvedValue({
      parsed_output: { text: '', year_from: 0, year_to: 0, tags: [], sort: 'newest' },
    });

    await planner().plan('heist movies');

    const request = parse.mock.calls[0][0];
    expect(request.model).toBe('claude-opus-5');
    expect(request.messages).toEqual([{ role: 'user', content: 'heist movies' }]);
    expect(request.output_config.format).toBeDefined();
  });

  it('treats 0 as "no year bound"', async () => {
    parse.mockResolvedValue({
      parsed_output: { text: 'dune', year_from: 0, year_to: 0, tags: [], sort: 'newest' },
    });

    const plan = await planner().plan('dune');

    expect(plan.filter.yearFrom).toBeNull();
    expect(plan.filter.yearTo).toBeNull();
  });

  it('caches a plan so repeat searches do not pay for a second call', async () => {
    parse.mockResolvedValue({
      parsed_output: { text: '', year_from: 0, year_to: 0, tags: ['crime'], sort: 'newest' },
    });

    const instance = planner();
    await instance.plan('crime');
    await instance.plan('  CRIME ');

    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('falls back to the rules when the API call fails', async () => {
    parse.mockRejectedValue(new Error('503 from upstream'));

    const plan = await planner().plan('90s sci-fi');

    expect(plan.source).toBe('rules');
    expect(plan.filter.yearFrom).toBe(1990);
  });

  it('falls back to the rules when the model returns nothing parseable', async () => {
    parse.mockResolvedValue({ parsed_output: null });

    await expect(planner().plan('80s horror')).resolves.toMatchObject({
      source: 'rules',
      filter: expect.objectContaining({ yearFrom: 1980, tags: ['horror'] }),
    });
  });
});
