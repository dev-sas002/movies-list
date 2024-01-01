import { ReactComponent as DeleteIcon } from "assets/delete-icon.svg";

interface Props {
  title: string;
  year: string | number;
  tags?: string[];
  image: string | null;
  onEditClick: () => void;
  onDeleteClick?: () => void;
}

export const MovieCard = ({
  title,
  year,
  tags = [],
  image,
  onEditClick,
  onDeleteClick,
}: Props): JSX.Element => {
  return (
    <article className="group relative rounded-xl bg-cardColor p-2 ring-1 ring-paper/5 transition duration-200 hover:-translate-y-1 hover:bg-cardColorHover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <button
        type="button"
        onClick={onEditClick}
        aria-label={`Edit ${title}`}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-inputColor">
          {image ? (
            <img
              src={image}
              alt={`${title} poster`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-paper/50">
              No poster
            </div>
          )}
        </div>
        <div className="px-1 pb-1 pt-4">
          <h3 className="text-xl font-semibold leading-snug text-paper">{title}</h3>
          <p className="mt-1 text-sm tabular-nums text-paper/70">{year}</p>
          {tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-paper/10 px-2 py-0.5 text-xs tracking-wide text-paper/80"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </button>
      {onDeleteClick && (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={onDeleteClick}
          className="absolute right-4 top-4 rounded-full bg-ink/75 p-2 text-paper transition hover:bg-error hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-error sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
        >
          <DeleteIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </article>
  );
};
