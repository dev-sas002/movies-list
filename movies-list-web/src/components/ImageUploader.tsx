import { useCallback } from "react";
import Dropzone from "react-dropzone";
import { ReactComponent as DropIcon } from "assets/drop-icon.svg";
import { Image } from "types/Image";
import { ImageDisplay } from "./ImageDisplay";

interface Props {
  image?: Image;
  onFileUpload: (image: Image) => void;
  onImageRemove: () => void;
}

const ACCEPTED = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
  "image/gif": [],
};

export const ImageUploader = ({ image, onFileUpload, onImageRemove }: Props): JSX.Element => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length) {
        const file = acceptedFiles[0];
        onFileUpload({ name: file.name, type: file.type, file });
      }
    },
    [onFileUpload]
  );

  const hasPreview = Boolean(image?.file || image?.url);

  return (
    <Dropzone accept={ACCEPTED} maxFiles={1} onDrop={onDrop}>
      {({ getRootProps, getInputProps, isDragActive }) => (
        <section
          className={`flex aspect-[2/3] w-full max-w-sm flex-col items-center justify-center rounded-xl border border-dashed bg-inputColor text-white transition ${
            isDragActive ? "border-primary bg-primary/10" : "border-white/40"
          }`}
        >
          {hasPreview ? (
            <ImageDisplay image={image} removeFile={onImageRemove} />
          ) : (
            <div
              {...getRootProps()}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3"
            >
              <input {...getInputProps()} aria-label="Poster image" />
              <DropIcon />
              <p className="text-sm">Drop an image here</p>
              <p className="text-xs text-white/50">JPEG, PNG, WebP or GIF · up to 5 MB</p>
            </div>
          )}
        </section>
      )}
    </Dropzone>
  );
};
