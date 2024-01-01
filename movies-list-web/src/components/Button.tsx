import classnames from "classnames";
import React from "react";

type Variant = "primary" | "secondary";

const BUTTON_VARIANTS: Record<Variant, string> = {
  primary:
    "text-white font-bold bg-primary hover:opacity-70 rounded-lg text-sm px-5 py-2.5 text-center",
  secondary:
    "font-bold text-white text-sm px-5 py-2.5 text-center border rounded-lg",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = ({
  className,
  variant = "primary",
  ...props
}: Props): JSX.Element => {
  return (
    <button
      type="button"
      className={classnames(BUTTON_VARIANTS[variant], className)}
      {...props}
    />
  );
};
