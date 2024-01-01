import classnames from "classnames";
import React from "react";

type Variant = "primary" | "secondary";

const BUTTON_VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-ink hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "border border-paper/30 text-paper hover:border-primary hover:text-primary",
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
      className={classnames(
        "rounded-lg px-5 py-2.5 text-center text-sm font-semibold transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-backgroundColor",
        BUTTON_VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
};
