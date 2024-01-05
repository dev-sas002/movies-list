import { useEffect, useState } from "react";
import { ReactComponent as DeleteIcon } from "assets/delete-icon.svg";
import { Image } from "types/Image";

interface ImageProps {
  removeFile: () => void;
  image?: Image;
}

/**
 * Previews either a newly dropped file or the poster already stored for the
 * movie being edited. Object URLs are created once per file and revoked when
 * the preview changes, rather than leaking one per render.
 */
export const ImageDisplay = ({ removeFile, image }: ImageProps): JSX.Element | null => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image?.file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(image.file);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [image?.file]);

  const src = objectUrl ?? image?.url ?? null;

  if (!src) {
    return null;
  }

  return (
    <div className="relative h-full w-full p-4">
      <img
        src={src}
        alt={image?.name ? `${image.name} poster` : "Selected poster"}
        className="h-full w-full rounded-lg object-cover object-center"
      />
      <button
        type="button"
        aria-label="Remove poster"
        onClick={(event) => {
          event.stopPropagation();
          removeFile();
        }}
        className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-gray-600 transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
      >
        <DeleteIcon className="h-3 w-3" />
      </button>
    </div>
  );
};
