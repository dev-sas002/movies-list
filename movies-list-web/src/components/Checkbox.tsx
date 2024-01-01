import { HTMLProps } from "react";
import classnames from "classnames";

interface Props extends HTMLProps<HTMLInputElement> {
  label: string;
}

export const Checkbox = ({ label, className, id, name, ...props }: Props) => {
  const inputId = id ?? `checkbox-${name ?? label}`;

  return (
    <div className="flex items-center">
      <input
        id={inputId}
        name={name}
        type="checkbox"
        className={classnames(
          "w-4 h-4 border-gray-300 rounded text-primary bg-primary focus:ring-primary",
          className
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-white ms-2"
      >
        {label}
      </label>
    </div>
  );
};
