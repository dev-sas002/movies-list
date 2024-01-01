import { HTMLProps, useId } from "react";
import classnames from "classnames";
import { ErrorMessage, useField } from "formik";

interface Props extends Omit<HTMLProps<HTMLInputElement>, "label" | "rows"> {
  name: string;
  /** Visible label. A placeholder disappears the moment a field has a value. */
  label?: string;
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
}

export const Input = ({
  name,
  label,
  multiline = false,
  rows = 4,
  className,
  type = "text",
  ...props
}: Props): JSX.Element => {
  const [field, meta, { setValue }] = useField(name);
  const generatedId = useId();
  const id = props.id ?? `${name}-${generatedId}`;
  const errorId = `${id}-error`;
  const isInvalid = meta.touched && !!meta.error;

  const controlClass = classnames(
    "block w-full rounded-lg border bg-inputColor px-3 py-2.5 text-sm text-paper placeholder:text-paper/50",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    isInvalid ? "border-error" : "border-paper/10",
    className
  );
  const describedBy = isInvalid ? { "aria-invalid": true, "aria-describedby": errorId } : {};

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-paper/70">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          className={classnames(controlClass, "resize-y")}
          {...(props as HTMLProps<HTMLTextAreaElement>)}
          {...describedBy}
          {...field}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={controlClass}
          {...props}
          {...describedBy}
          {...field}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <ErrorMessage name={name}>
        {(msg) => (
          <div id={errorId} className="mt-1.5 text-sm text-error" role="alert" aria-label={msg}>
            {msg}
          </div>
        )}
      </ErrorMessage>
    </div>
  );
};
