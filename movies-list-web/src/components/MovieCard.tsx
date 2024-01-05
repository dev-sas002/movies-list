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
    <div className="group relative rounded-xl bg-cardColor p-2 transition duration-200 hover:bg-cardColorHover hover:-translate-y-1">
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
            <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
              No poster
            </div>
          )}
        </div>
        <div className="px-1 pb-1 pt-4">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/70">{year}</p>
          {tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs tracking-wide text-white/80"
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
          className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-error hover:bg-error"
        >
          <DeleteIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
