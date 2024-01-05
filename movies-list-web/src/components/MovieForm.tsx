import { useEffect, useState } from "react";
import { Form, Formik } from "formik";
import { useNavigate } from "react-router-dom";
import { Movie } from "contracts/api";
import { Button } from "components/Button";
import { ImageUploader } from "components/ImageUploader";
import { Input } from "components/Input";
import { ROUTES } from "constants/routes";
import { movieSchema } from "schemas/movieSchema";
import { createMovie, posterSrc, updateMovie } from "services/api";
import { getToken } from "services/session";
import { Image } from "types/Image";

interface Props {
  isEditState?: boolean;
  initialData?: Movie;
}

interface FormValues {
  title: string;
  year: string;
  synopsis: string;
  tags: string;
}

export const MovieForm = ({ isEditState, initialData }: Props): JSX.Element => {
  const navigate = useNavigate();
  const [poster, setPoster] = useState<Image | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setPoster({ name: initialData.title, file: null, url: posterSrc(initialData) });
  }, [initialData]);

  const submitForm = async (values: FormValues) => {
    setError(null);

    const userToken = getToken();

    if (!userToken) {
      navigate(ROUTES.signin);
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("publicationYear", values.year);
    formData.append("synopsis", values.synopsis);
    formData.append("tags", values.tags);

    if (poster?.file instanceof File) {
      formData.append("image", poster.file);
    }

    try {
      if (isEditState && initialData) {
        await updateMovie(initialData.id, formData, userToken);
      } else {
        await createMovie(formData, userToken);
      }

      navigate(ROUTES.movies);
    } catch (err) {
      // Show what the API actually said - "Publishing year must be a year
      // between 1878 and 2999" is more useful than a canned failure message.
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Formik<FormValues>
      initialValues={{
        title: initialData?.title ?? "",
        year: initialData ? String(initialData.publishYear) : "",
        synopsis: initialData?.synopsis ?? "",
        tags: initialData?.tags.join(", ") ?? "",
      }}
      onSubmit={submitForm}
      validationSchema={movieSchema}
    >
      {({ isSubmitting }) => (
        <Form className="grid items-start gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ImageUploader
            image={poster}
            onFileUpload={setPoster}
            onImageRemove={() => setPoster(undefined)}
          />
          <div className="flex max-w-xl flex-col gap-5">
            <Input name="title" label="Title" placeholder="Title" />
            <Input
              name="year"
              label="Publishing year"
              placeholder="Publishing year"
              inputMode="numeric"
            />
            <Input
              name="tags"
              label="Tags"
              placeholder="Tags (comma separated)"
            />
            <Input
              name="synopsis"
              label="Synopsis"
              placeholder="Synopsis"
              multiline
              rows={5}
            />
            {error && (
              <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-error" role="alert">
                {error}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => navigate(ROUTES.movies)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditState ? "Update" : "Submit"}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};
