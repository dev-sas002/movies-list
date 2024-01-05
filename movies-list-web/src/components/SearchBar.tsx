import { FormEvent, useState } from "react";
import { MOVIE_SORTS, MovieSort, SearchInterpretation } from "contracts/api";

interface Props {
  query: string;
  sort: MovieSort;
  interpretation: SearchInterpretation | null;
  onSearch: (query: string) => void;
  onSortChange: (sort: MovieSort) => void;
}

const SORT_LABELS: Record<MovieSort, string> = {
  newest: "Recently added",
  oldest: "Oldest added",
  title: "Title A–Z",
  "year-desc": "Newest release",
  "year-asc": "Oldest release",
};

/**
 * Free-text search over the collection. The API resolves the sentence into a
 * structured query and hands back its reading of it, which is shown below the
 * field so the user can see how they were understood.
 */
export const SearchBar = ({
  query,
  sort,
  interpretation,
  onSearch,
  onSortChange,
}: Props): JSX.Element => {
  const [draft, setDraft] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <div className="mb-10">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="search"
            name="q"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Search your movies"
            placeholder="Try: 90s sci-fi with a female lead"
            className="w-full rounded-lg bg-inputColor px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <label className="sr-only" htmlFor="sort">
          Sort order
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as MovieSort)}
          className="rounded-lg bg-inputColor px-4 py-3 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {MOVIE_SORTS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Search
        </button>
      </form>

      {interpretation && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
          <span
            className={
              interpretation.source === "ai"
                ? "rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary"
                : "rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white/70"
            }
          >
            {interpretation.source === "ai" ? "AI search" : "Rule-based"}
          </span>
          {interpretation.summary}
        </p>
      )}
    </div>
  );
};
