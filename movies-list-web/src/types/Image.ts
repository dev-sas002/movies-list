/** A poster in the form: either a freshly dropped file or an existing URL. */
export interface Image {
  name?: string;
  type?: string;
  /** Set when the user dropped a new file. */
  file: File | null;
  /** Set when the movie already has a stored poster. */
  url?: string | null;
}
