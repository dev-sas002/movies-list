import * as Yup from "yup";

const CURRENT_YEAR = new Date().getFullYear();

export const movieSchema = Yup.object().shape({
  title: Yup.string().trim().required("Please enter movie title").max(200, "Title is too long"),
  year: Yup.number()
    .typeError("Publishing year must be a number")
    .required("Please enter publishing year")
    .integer("Publishing year must be a whole number")
    .min(1878, "The first film was made in 1878")
    .max(CURRENT_YEAR + 10, "That year is too far in the future"),
  synopsis: Yup.string().max(2000, "Synopsis is too long"),
  tags: Yup.string().max(200, "Too many tags"),
});
