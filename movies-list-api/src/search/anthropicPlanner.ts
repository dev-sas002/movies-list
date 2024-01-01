import { z } from 'zod';
import { MOVIE_SORTS, MovieSort } from '../contracts/api';
import { getAnthropicApiKey, getAnthropicModel } from '../config/env';
import { InMemoryTtlCache } from '../services/cache';
import { SearchPlan, SearchPlanner, emptyFilter } from './types';

/**
 * AI-assisted query planning: turns "90s sci-fi with a female lead" into the
 * structured filter the repository understands.
 *
 * Every failure path - no API key, network error, malformed output, slow
 * response - falls back to the rule-based planner, so search degrades in
 * quality but never in availability.
 */

const PLAN_TIMEOUT_MS = 8_000;

const PlanSchema = z.object({
  /** Free text to match against title, synopsis and tags. */
  text: z.string(),
  /** Inclusive lower bound on the release year, or 0 for "no bound". */
  year_from: z.number(),
  /** Inclusive upper bound on the release year, or 0 for "no bound". */
  year_to: z.number(),
  /** Lowercase genre/theme tags, e.g. ["sci-fi", "heist"]. */
  tags: z.array(z.string()),
  sort: z.enum(MOVIE_SORTS),
});

const SYSTEM_PROMPT = [
  "You translate a person's description of the movies they are looking for into a",
  'structured database query over their personal movie collection.',
  'Each movie has a title, a release year, a short synopsis and lowercase tags.',
  'Put genre or theme words in `tags` (lowercase, hyphenated, e.g. "sci-fi").',
  'Put distinguishing words that would appear in a title or synopsis in `text`',
  '(for example "female lead" becomes "female lead"). Leave `text` empty when the',
  'query is only about genre or years. Use 0 for an absent year bound.',
  'Resolve decades ("the 90s") into explicit year bounds.',
].join(' ');

const toNullableYear = (value: number): number | null =>
  Number.isInteger(value) && value >= 1878 && value <= 2999 ? value : null;

/** Anthropic client type is intentionally loose so the SDK stays a lazy import. */
type MessagesClient = {
  messages: {
    parse(body: unknown): Promise<{ parsed_output: z.infer<typeof PlanSchema> | null }>;
  };
};

export interface AnthropicPlannerOptions {
  fallback: SearchPlanner;
  /** Injected in tests; production resolves the real SDK lazily. */
  createClient?: () => Promise<MessagesClient>;
  cacheTtlMs?: number;
}

const defaultCreateClient = async (): Promise<MessagesClient> => {
  // Required lazily so a deployment without an API key never loads the SDK.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: getAnthropicApiKey() }) as unknown as MessagesClient;
};

export const createAnthropicPlanner = (options: AnthropicPlannerOptions): SearchPlanner => {
  const createClient = options.createClient ?? defaultCreateClient;
  const cache = new InMemoryTtlCache<SearchPlan>(options.cacheTtlMs ?? 10 * 60_000, 200);
  let client: MessagesClient | null = null;

  const callModel = async (query: string): Promise<SearchPlan | null> => {
    const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod');

    if (!client) {
      client = await createClient();
    }

    const response = await client.messages.parse({
      model: getAnthropicModel(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(PlanSchema),
      },
      messages: [{ role: 'user', content: query }],
    });

    const parsed = response.parsed_output;

    if (!parsed) {
      return null;
    }

    const filter = emptyFilter();
    filter.text = parsed.text.trim() || null;
    filter.yearFrom = toNullableYear(parsed.year_from);
    filter.yearTo = toNullableYear(parsed.year_to);
    filter.tags = parsed.tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .slice(0, 10);

    return { filter, sort: parsed.sort as MovieSort, source: 'ai' };
  };

  return {
    name: 'ai',
    plan: async (query: string): Promise<SearchPlan> => {
      const key = query.trim().toLowerCase();
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      try {
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), PLAN_TIMEOUT_MS).unref?.();
        });

        const plan = await Promise.race([callModel(query), timeout]);

        if (plan) {
          cache.set(key, plan);
          return plan;
        }
      } catch (error) {
        console.error('AI search planning failed, falling back to rules:', error);
      }

      return options.fallback.plan(query);
    },
  };
};
