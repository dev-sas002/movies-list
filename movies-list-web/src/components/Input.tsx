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

  const controlClass = classnames(
    "block w-full rounded-lg bg-inputColor p-2.5 text-sm text-white placeholder:text-white/50",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    className,
    { "border border-error": meta.touched && !!meta.error }
  );

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          className={classnames(controlClass, "resize-y")}
          {...(props as HTMLProps<HTMLTextAreaElement>)}
          {...field}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={controlClass}
          {...props}
          {...field}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <ErrorMessage name={name}>
        {(msg) => (
          <div className="mt-1 text-sm text-error" role="alert" aria-label={msg}>
            {msg}
          </div>
        )}
      </ErrorMessage>
    </div>
  );
};
